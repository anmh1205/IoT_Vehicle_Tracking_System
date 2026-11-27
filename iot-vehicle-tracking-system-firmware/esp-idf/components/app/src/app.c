/**
 * @file app.c
 * @brief Vòng lặp chính của task "app": nhận sự kiện, chạy FSM, thực thi hành động.
 *
 * ## Mô hình thực thi
 *
 * app_task() là toàn bộ task "app" (xem app_os.c về queue, priority và stack). Mỗi vòng:
 * 1. Chờ sự kiện tối đa APP_TICK_MS. Có sự kiện thì rút cạn queue, mỗi sự kiện qua app_dispatch().
 * 2. Nếu chưa đến mốc tick kế tiếp thì quay lại bước 1; ngược lại chạy một bước FSM.
 * 3. Thực thi các hành động FSM yêu cầu (execute()), kiểm tra xác nhận OTA, ghi chẩn đoán.
 *
 * Rút cạn queue trước khi chạy FSM đảm bảo FSM thấy trạng thái mới nhất của ignition,
 * motion và link. Hành động gọi sang component khác (modem_*, obd_*, storage_*) là lệnh
 * không chặn: kết quả quay về qua queue dưới dạng sự kiện.
 *
 * ## Khi reset hoặc mất nguồn
 *
 * Ngữ cảnh OTA được lưu trước khi đổi slot và giữ đến khi broker xác nhận báo cáo cuối.
 */

#include "app_priv.h"
#include "app_timing.h"
#include <string.h>
#include "board/board.h"
#include "esp_log.h"
#include "platform/platform_reset.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "ivts_core/base/str.h"
#include "ivts_core/fsm/state.h"
#include "modem/modem.h"
#include "obd/obd.h"
#include "ota/ota.h"
#include "storage/storage.h"

app_t g_app;

static void update_led(uint64_t now)
{
    bool on = false;
    switch (g_app.fsm.state) {
    case IVTS_ST_INIT:
    case IVTS_ST_CHECK_IGN: on = now % 800u < 100u; break;
    case IVTS_ST_DRIVING:   on = g_app.tracking_enabled; break;
    case IVTS_ST_ALARM:     on = now % 400u < 200u; break;
    case IVTS_ST_PARKED:    on = now % 2500u < 100u; break;
    case IVTS_ST_HEARTBEAT: {
        uint64_t phase = now % 1500u;
        on = phase < 100u || (phase >= 300u && phase < 400u);
        break;
    }
    default: break;
    }
    board_led_set(on);
}

/**
 * @brief Cập nhật trạng thái firmware và hẹn reboot khi đã sẵn sàng.
 */
static void on_ota_progress(const ivts_event_t *ev)
{
    g_app.fw.status = ev->u.ota_progress.phase;
    g_app.fw.progress = ev->u.ota_progress.pct;
    g_app.fw.error = (uint8_t)ev->u.ota_progress.err;
    g_app.fw_dirty = true;
    if (ev->u.ota_progress.phase == IVTS_OTA_ST_REBOOTING) {
        g_app.ota_job_active = false;
        g_app.ota_reboot_ms = app_now() + OTA_REBOOT_DELAY_MS;
    } else if (ev->u.ota_progress.phase == IVTS_OTA_ST_FAILED) {
        g_app.ota_job_active = false;
        g_app.ota_report_pending = ev->u.ota_progress.err == IVTS_OTA_E_SET_BOOT;
    }
}

/**
 * @brief Quyết định chấp nhận hay rollback image OTA đang chờ xác nhận.
 *
 * Xác nhận trước hạn khi broker đang kết nối và đã PUBACK bản tin trạng thái trong lần boot này.
 */
static void ota_confirm_tick(void)
{
    if (!g_app.ota_confirm_pending) { return; }
    static uint64_t retry_at;
    uint64_t uptime = app_now();
    if (uptime < retry_at) { return; }
    bool trusted;
    uint64_t now = app_clock_unix_ms_or_zero(&trusted);
    bool healthy = (g_app.link == IVTS_LINK_BROKER_UP) && g_app.ota_health_acked;
    switch (ivts_ota_confirm_decide(&g_app.ota_pending, healthy, now, trusted, uptime)) {
    case IVTS_CONFIRM_ACCEPT:
        if (ota_mark_valid() == IVTS_OK) {
            g_app.ota_confirm_pending = false;
            g_app.ota_report_pending = g_app.ota_pending.job_id[0] != '\0';
            g_app.fw.status = IVTS_OTA_ST_SUCCESS;
            g_app.fw.progress = IVTS_OTA_PCT_DONE;
            (void)ivts_str_copy(g_app.fw.current_version, sizeof g_app.fw.current_version, ota_running_version());
            (void)ivts_str_copy(g_app.fw.partition, sizeof g_app.fw.partition, ota_running_partition());
            g_app.fw_dirty = true;
            ESP_LOGI(APP_TAG, "image hợp lệ: đã mark valid");
        } else {
            retry_at = uptime + OTA_MARK_VALID_RETRY_MS;
            ESP_LOGW(APP_TAG, "chưa đánh dấu được image OTA hợp lệ");
        }
        break;
    case IVTS_CONFIRM_ROLLBACK:
        ESP_LOGE(APP_TAG, "quá hạn confirm: rollback");
        (void)ota_rollback_and_reboot();
        retry_at = uptime + OTA_ROLLBACK_RETRY_MS;
        break;
    case IVTS_CONFIRM_WAIT:
        break;
    }
}

static void update_link(ivts_link_t link)
{
    if (g_app.link == link) { return; }
    g_app.link = (uint8_t)link;
    if (link == IVTS_LINK_BROKER_UP) { g_app.status_dirty = true; }
    ESP_LOGI(APP_TAG, "link -> %u", (unsigned)link);
}

/**
 * @brief Cập nhật snapshot telemetry và trạng thái app theo một sự kiện.
 *
 * Mọi sự kiện đi qua app_state_on_event() trước; phần còn lại xử lý các sự kiện làm đổi
 * trạng thái điều khiển (axes, link, publish, OTA, config).
 */
void app_dispatch(const ivts_event_t *ev)
{
    app_state_on_event(ev);
    switch (ev->type) {
    case IVTS_EV_POWER_SAMPLE:
        if (ivts_axes_on_power(&g_app.axes, &g_app.axes_cfg, ev->u.power.vehicle_mv, app_now())) {
            ESP_LOGI(APP_TAG, "ignition -> %d (%u mV)", (int)g_app.axes.ign, ev->u.power.vehicle_mv);
        }
        break;
    case IVTS_EV_MOTION_IRQ:
        (void)ivts_axes_on_motion(&g_app.axes, app_now());
        break;
    case IVTS_EV_LINK_STATE:
        update_link(modem_link_state());
        break;
    case IVTS_EV_MQTT_ACK:     app_publish_on_ack(ev); break;
    case IVTS_EV_QUEUE_READY:  app_publish_on_queue_ready(); break;
    case IVTS_EV_CONFIG_CORRUPT:
        (void)ivts_str_copy(g_app.event_code, sizeof g_app.event_code, "config_corrupt");
        g_app.event_dirty = true;
        break;
    case IVTS_EV_STORE_RESULT:
        ESP_LOGW(APP_TAG, "storage op=%u err=%s", ev->u.store_result.op,
                 ivts_err_name((ivts_err_t)ev->u.store_result.err));
        break;
    default:
        break;
    }
}

static void update_gnss(uint32_t actions)
{
    static bool state_wants_gnss;
    static bool modem_wants_gnss;
    if (actions & IVTS_ACT_GNSS_ON) { state_wants_gnss = true; }
    if (actions & IVTS_ACT_GNSS_OFF) { state_wants_gnss = false; }
    bool wanted = state_wants_gnss || app_cmd_needs_gnss();
    if (wanted != modem_wants_gnss && modem_set_gnss(wanted) == IVTS_OK) {
        modem_wants_gnss = wanted;
    }
}

/** Thực thi các hành động do FSM yêu cầu trong bước hiện tại. Các lệnh đều không chặn. */
static void execute(const ivts_fsm_out_t *o)
{
    update_gnss(o->actions);
    if (o->actions & IVTS_ACT_OBD_START) { (void)obd_start(); }
    if (o->actions & IVTS_ACT_OBD_STOP)  { (void)obd_stop(); }
    if (o->actions & IVTS_ACT_PUBLISH_STATUS) { g_app.status_dirty = true; }
    if (o->actions & IVTS_ACT_SLEEP) {
        app_sleep_enter(o);
        return;
    }
    app_publish_control_tick();
    if ((o->actions & IVTS_ACT_PUBLISH_RAW) &&
        (g_app.fsm.state != IVTS_ST_DRIVING || g_app.tracking_enabled)) {
        app_publish(PUB_RAW_LIVE);
    }
    if (o->actions & IVTS_ACT_REPLAY) { app_publish_replay_tick(); }
}

/** Thân task "app": xem mô tả ở đầu file. */
static void app_task(void *arg)
{
    (void)arg;
    board_wake_t bw = board_wake_cause();
    ivts_wake_t wake = (bw == BOARD_WAKE_IMU) ? IVTS_WAKE_MOTION
                     : (bw == BOARD_WAKE_TIMER) ? IVTS_WAKE_TIMER : IVTS_WAKE_POWER_ON;
    ivts_axes_init(&g_app.axes);
    ivts_fsm_init(&g_app.fsm, app_now(), wake);
    uint64_t next_tick = 0;

    /* Vẫn chờ queue và xử lý sự kiện khi FSM đang fake sleep. */
    while (true) {
        ivts_event_t ev;
        if (app_os_receive(&ev, APP_TICK_MS)) {
            app_dispatch(&ev);
            while (app_os_receive(&ev, 0)) { app_dispatch(&ev); }    /* Rút cạn queue rồi mới chạy FSM. */
        }
        uint64_t now = app_now();
        if (now < next_tick) { continue; }
        next_tick = now + APP_TICK_MS;

        update_link(modem_link_state());
        app_publish_poll();
        if (ota_progress_take(&ev)) { on_ota_progress(&ev); }
        if (g_app.ota_reboot_ms != 0u && now >= g_app.ota_reboot_ms) { platform_restart("ota_reboot"); }
        app_cmd_handle();
        app_cmd_tick();

        (void)ivts_axes_tick(&g_app.axes, &g_app.axes_cfg, now);
        if (g_app.provisioned) { app_session_tick(); }
        bool linked = g_app.link == IVTS_LINK_BROKER_UP;
        ivts_fsm_in_t in = {
            .now = now, .ignition = g_app.axes.ign, .motion = g_app.axes.motion, .wake = g_app.fsm.wake,
            .link_up = linked,
            .link_expected = g_app.provisioned,
            .publish_idle = !g_app.pub_inflight && !storage_queue_push_pending(),
            .control_pending = g_app.status_dirty || g_app.session.count != 0u || g_app.fw_dirty ||
                               g_app.alarm.seq != 0u || app_cmd_pending(),
            .queue_pending = storage_queue_pending(),
            .ota_active = g_app.ota_job_active || g_app.ota_confirm_pending || g_app.ota_reboot_ms != 0u ||
                          app_cmd_blocks_sleep(),
        };
        ivts_fsm_out_t out;
        ivts_app_state_t before = g_app.fsm.state;
        ivts_fsm_step(&g_app.fsm, &g_app.fsm_cfg, &in, &out);
        if (out.changed) {
            ESP_LOGI(APP_TAG, "state %s -> %s", ivts_app_state_name(before), ivts_app_state_name(g_app.fsm.state));
            app_state_set_device(ivts_fsm_device_state(g_app.fsm.state), IVTS_SLEEP_NONE);
            if (g_app.fsm.state == IVTS_ST_ALARM) { app_publish_latch_alarm(); }
        }
        if (g_app.ota_job_active || g_app.ota_confirm_pending || g_app.ota_reboot_ms != 0u) {
            app_state_set_device(IVTS_DEV_OTA, IVTS_SLEEP_NONE);
        } else if (g_app.fsm.state != IVTS_ST_SLEEP) {
            app_state_set_device(ivts_fsm_device_state(g_app.fsm.state), IVTS_SLEEP_NONE);
        }
        update_led(now);
        execute(&out);
        ota_confirm_tick();
        app_diag_tick(now);
    }
}

/* Xem app.h. */
void app_start(void)
{
    if (!app_init_all() || !app_os_start_task(app_task)) {
        ESP_LOGE(APP_TAG, "init lỗi không cứu được: restart sau 10 s");
        vTaskDelay(pdMS_TO_TICKS(INIT_RESTART_DELAY_MS));
        platform_restart("init_failed");
    }
}
