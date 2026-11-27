/**
 * @file app_sleep.c
 * @brief Thực thi quyết định ngủ của FSM: tắt modem và OBD, lưu ngữ cảnh RTC, gọi board_sleep().
 *
 * Quyết định ngủ nằm trong FSM thuần (ivts-core). File này chỉ thực thi. Mọi lời gọi esp_sleep_*
 * nằm trong board_power.c, không gọi ở đây.
 *
 * ## Mô hình thực thi
 *
 * app_sleep_enter() chạy trong task "app", gọi từ execute() trong app.c.
 * - Light sleep: board_sleep() chặn task "app" và cả hệ thống (CPU ngủ) đến khi có nguồn thức;
 *   khi trả về, task tiếp tục ngay trong hàm này.
 * - Deep sleep: board_sleep() không trả về; CPU reset khi thức và app_init_all() chạy lại.
 * - Fake sleep: chỉ đổi trạng thái thiết bị, không tắt gì; FSM tự thoát khi hết hạn.
 *
 * Trong lúc tắt modem, task "app" tiếp tục xử lý sự kiện để nhận biết ignition hoặc IMU.
 *
 * ## Khi reset hoặc mất nguồn
 *
 * Ngữ cảnh RTC (boot_id, seq) được lưu ngay trước khi ngủ. Mất nguồn trong lúc ngủ thì
 * ngữ cảnh hỏng, app_rtc_ctx_load() từ chối và boot_id mới được cấp từ NVS.
 */

#include "app_priv.h"
#include "link/app_link.h"
#include "app_timing.h"
#include "board/board.h"
#include "esp_log.h"
#include "modem/modem.h"
#include "obd/obd.h"
#include "storage/storage.h"

/**
 * @brief Chờ task modem ngắt MQTT và phát xong xung tắt nguồn, kể cả nếu link đã mất từ trước.
 *
 * Khi xung PWRKEY được nhả, board có thể ngủ trong lúc SIM7600 hoàn tất tắt.
 * Task modem chịu trách nhiệm chờ phần cứng sẵn sàng nếu board thức sớm.
 */
static bool wait_modem_stop(void)
{
    uint64_t end = app_now() + MODEM_STOP_WAIT_MS;
    ivts_event_t ev;
    while (!modem_is_stopped() && app_now() < end) {
        if (app_os_receive(&ev, APP_TICK_MS)) { app_dispatch(&ev); }
    }
    if (!modem_is_stopped()) { return false; }
    while (app_os_receive(&ev, 0)) { app_dispatch(&ev); }
    (void)app_link_update(IVTS_LINK_DOWN);
    return true;
}

static bool stop_radios(void)
{
    (void)obd_stop();
    return modem_is_stopped() || (modem_set_link(false) == IVTS_OK && wait_modem_stop());
}

static bool can_sleep_now(const ivts_fsm_out_t *out, bool modem_stopped, bool *motion)
{
    bool ble_stopped = obd_is_stopped();
    if (!ble_stopped) { ESP_LOGW(APP_TAG, "BLE còn bật, hoãn ngủ"); }
    (void)ivts_axes_tick(&g_app.axes, &g_app.axes_cfg, app_now());
    *motion = out->sleep_arm_motion && g_app.axes.motion == IVTS_MOTION_MOVING;
    return modem_stopped && ble_stopped && g_app.axes.ign != IVTS_IGN_ON && !*motion;
}

static void abort_sleep(ivts_wake_t reason)
{
    ivts_fsm_woke(&g_app.fsm, app_now(), reason);
    if (g_app.provisioned) { (void)modem_set_link(true); }
}

static board_wake_t enter_hw_sleep(const ivts_fsm_out_t *out)
{
    app_rtc_ctx_save(g_app.boot_id, app_rtc_current_seq(), (uint8_t)g_app.fsm.state);

    board_sleep_req_t req = {
        .deep = (out->sleep_mode == IVTS_SLEEP_DEEP),
        .seconds = out->sleep_s,
        .arm_imu = out->sleep_arm_motion,
    };
    ESP_LOGI(APP_TAG, "sleep mode=%d %lus imu=%d", (int)out->sleep_mode, (unsigned long)req.seconds, req.arm_imu);
    return board_sleep(&req);           /* Deep sleep: không trả về. */
}

static void resume_after_wake(board_wake_t cause)
{
    ivts_wake_t why = (cause == BOARD_WAKE_IMU) ? IVTS_WAKE_MOTION
                    : (cause == BOARD_WAKE_TIMER) ? IVTS_WAKE_TIMER : IVTS_WAKE_OTHER;
    ESP_LOGI(APP_TAG, "woke %d", (int)why);
    ivts_fsm_woke(&g_app.fsm, app_now(), why);
    app_state_set_device(IVTS_DEV_WAKING, IVTS_SLEEP_NONE);
    if (g_app.provisioned) { (void)modem_set_link(true); }
}

/**
 * @brief Đưa thiết bị vào chế độ ngủ do FSM chỉ định, rồi báo FSM khi đã thức.
 * @param out Kết quả bước FSM, cung cấp sleep_mode, sleep_s và sleep_arm_motion.
 * @note Deep sleep không trả về. Light sleep trả về sau khi thức; modem được bật lại.
 */
void app_sleep_enter(const ivts_fsm_out_t *out)
{
    app_state_set_device(IVTS_DEV_SLEEPING, out->sleep_mode);
    if (out->sleep_mode == IVTS_SLEEP_FAKE) {
        ESP_LOGI(APP_TAG, "fake sleep %lus", (unsigned long)out->sleep_s);
        return;                                   /* FSM tự thoát khỏi trạng thái SLEEP khi hết hạn. */
    }
    bool stopped = stop_radios();
    bool motion;
    if (!can_sleep_now(out, stopped, &motion)) {
        abort_sleep(motion ? IVTS_WAKE_MOTION : IVTS_WAKE_OTHER);
        return;
    }
    resume_after_wake(enter_hw_sleep(out));
}
