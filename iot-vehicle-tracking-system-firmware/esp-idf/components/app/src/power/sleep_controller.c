#include "sleep_controller.h"
#include "app_clock.h"
#include "app_log.h"
#include "app_msg_seq.h"
#include "device/app_device.h"
#include "persist/rtc_context.h"
#include "telemetry/telemetry_snapshot.h"
#include "link/app_link.h"
#include "app_timing.h"
#include "board/board.h"
#include "esp_log.h"
#include "modem/modem.h"
#include "obd/obd.h"

typedef enum {
    APP_SLEEP_IDLE,
    SLEEP_STOPPING_RADIOS,
} app_sleep_phase_t;

static app_sleep_phase_t s_phase;
static uint64_t s_modem_stop_deadline_at_ms;
static ivts_fsm_out_t s_sleep_request;

static bool can_sleep_now(const ivts_fsm_out_t *out, bool modem_stopped,
                          ivts_axes_t *axes, const ivts_axes_cfg_t *axes_cfg, bool *motion)
{
    bool ble_stopped = obd_is_stopped();
    if (!ble_stopped) { ESP_LOGW(APP_TAG, "BLE còn bật, hoãn ngủ"); }
    (void)ivts_axes_tick(axes, axes_cfg, app_now());
    *motion = out->sleep_arm_motion && axes->motion == IVTS_MOTION_MOVING;
    return modem_stopped && ble_stopped && axes->ign != IVTS_IGN_ON && !*motion;
}

static void abort_sleep(ivts_fsm_t *fsm, ivts_wake_t reason)
{
    ivts_fsm_woke(fsm, app_now(), reason);
    if (app_device_is_provisioned()) { (void)modem_set_link(true); }
}

static board_wake_t enter_hw_sleep(const ivts_fsm_out_t *out, ivts_app_state_t state)
{
    app_rtc_ctx_save(app_device_boot_id(), app_msg_seq_current(), (uint8_t)state);

    board_sleep_req_t req = {
        .deep = (out->sleep_mode == IVTS_SLEEP_DEEP),
        .seconds = out->sleep_s,
        .arm_imu = out->sleep_arm_motion,
    };
    ESP_LOGI(APP_TAG, "sleep mode=%d %lus imu=%d", (int)out->sleep_mode, (unsigned long)req.seconds, req.arm_imu);
    return board_sleep(&req);           /* Deep sleep: không trả về. */
}

static void resume_after_wake(ivts_fsm_t *fsm, board_wake_t cause)
{
    ivts_wake_t why = (cause == BOARD_WAKE_IMU) ? IVTS_WAKE_MOTION
                    : (cause == BOARD_WAKE_TIMER) ? IVTS_WAKE_TIMER : IVTS_WAKE_OTHER;
    ESP_LOGI(APP_TAG, "woke %d", (int)why);
    ivts_fsm_woke(fsm, app_now(), why);
    app_telemetry_set_device(IVTS_DEV_WAKING, IVTS_SLEEP_NONE);
    if (app_device_is_provisioned()) { (void)modem_set_link(true); }
}

static void finish_sleep_request(const ivts_fsm_out_t *out, bool stopped, ivts_fsm_t *fsm,
                                 ivts_axes_t *axes, const ivts_axes_cfg_t *axes_cfg)
{
    bool motion;
    if (!can_sleep_now(out, stopped, axes, axes_cfg, &motion)) {
        abort_sleep(fsm, motion ? IVTS_WAKE_MOTION : IVTS_WAKE_OTHER);
        return;
    }
    resume_after_wake(fsm, enter_hw_sleep(out, fsm->state));
}

void app_sleep_enter(const ivts_fsm_out_t *out, ivts_fsm_t *fsm, ivts_axes_t *axes,
                     const ivts_axes_cfg_t *axes_cfg)
{
    app_telemetry_set_device(IVTS_DEV_SLEEPING, out->sleep_mode);
    if (out->sleep_mode == IVTS_SLEEP_FAKE) {
        ESP_LOGI(APP_TAG, "fake sleep %lus", (unsigned long)out->sleep_s);
        return;
    }
    (void)obd_stop();
    if (modem_is_stopped()) {
        finish_sleep_request(out, true, fsm, axes, axes_cfg);
    } else if (modem_set_link(false) != IVTS_OK) {
        finish_sleep_request(out, false, fsm, axes, axes_cfg);
    } else {
        s_sleep_request = *out;
        s_modem_stop_deadline_at_ms = app_now() + MODEM_STOP_WAIT_MS;
        s_phase = SLEEP_STOPPING_RADIOS;
    }
}

bool app_sleep_poll(ivts_fsm_t *fsm, ivts_axes_t *axes, const ivts_axes_cfg_t *axes_cfg, uint64_t now_ms)
{
    if (s_phase != SLEEP_STOPPING_RADIOS) { return false; }

    bool stopped = modem_is_stopped();
    if (!stopped && now_ms < s_modem_stop_deadline_at_ms) { return true; }
    s_phase = APP_SLEEP_IDLE;
    if (stopped) {
        (void)app_link_update(IVTS_LINK_DOWN);
    } else {
        ESP_LOGW(APP_TAG, "modem chưa dừng, hoãn ngủ");
    }
    finish_sleep_request(&s_sleep_request, stopped, fsm, axes, axes_cfg);
    return true;
}
