#include "app_task.h"
#include "app_dispatch.h"
#include "fsm_actions.h"
#include "alarm/motion_alarm.h"
#include "app_clock.h"
#include "app_log.h"
#include "app_timing.h"
#include "board/board_power.h"
#include "command/command.h"
#include "device/app_device.h"
#include "diag/app_diag.h"
#include "esp_log.h"
#include "fw_update/fw_update.h"
#include "link/app_link.h"
#include "power/led_pattern.h"
#include "power/sleep_controller.h"
#include "publish/outbox.h"
#include "publish/publisher.h"
#include "session/session_tracker.h"
#include "storage/storage.h"
#include "telemetry/telemetry_snapshot.h"

static ivts_axes_t s_axes;
static ivts_axes_cfg_t s_axes_cfg;
static ivts_fsm_t s_fsm;
static ivts_fsm_cfg_t s_fsm_cfg;

void app_task_set_config(const ivts_axes_cfg_t *axes_cfg, const ivts_fsm_cfg_t *fsm_cfg)
{
    s_axes_cfg = *axes_cfg;
    s_fsm_cfg = *fsm_cfg;
}

void app_task_on_power_sample(uint16_t vehicle_mv)
{
    if (ivts_axes_on_power(&s_axes, &s_axes_cfg, vehicle_mv, app_now())) {
        ESP_LOGI(APP_TAG, "ignition -> %d (%u mV)", (int)s_axes.ign, vehicle_mv);
    }
}

void app_task_on_motion(void)
{
    (void)ivts_axes_on_motion(&s_axes, app_now());
}

static void drain_events(void)
{
    if (app_dispatch_next(APP_TICK_MS)) {
        while (app_dispatch_next(0)) {}
    }
}

static void run_periodic_services(uint64_t now)
{
    app_dispatch_refresh_link();
    app_publisher_poll();
    app_fw_update_poll(now);
    app_telemetry_set_axes(&s_axes);
    app_telemetry_refresh(now);
    app_cmd_handle();
    app_cmd_tick();

    if (ivts_axes_tick(&s_axes, &s_axes_cfg, now)) { app_telemetry_set_axes(&s_axes); }
    if (app_device_is_provisioned()) { app_session_tick(s_axes.ign, app_device_tracking_enabled(), app_device_boot_id()); }
}

static ivts_fsm_in_t collect_fsm_input(uint64_t now)
{
    bool linked = app_link_is_broker_up();
    return (ivts_fsm_in_t){
        .now = now, .ignition = s_axes.ign, .motion = s_axes.motion, .wake = s_fsm.wake,
        .link_up = linked,
        .link_expected = app_device_is_provisioned(),
        .publish_idle = !app_publisher_is_busy() && !storage_queue_push_pending(),
        .control_pending = app_outbox_has_unsent_control() || app_cmd_pending(),
        .queue_pending = storage_queue_pending(),
        .ota_active = app_fw_update_in_progress() ||
                      app_cmd_blocks_sleep(),
    };
}

static void apply_fsm_transition(const ivts_fsm_out_t *out, ivts_app_state_t before)
{
    if (out->changed) {
        ESP_LOGI(APP_TAG, "state %s -> %s", ivts_app_state_name(before), ivts_app_state_name(s_fsm.state));
        if (s_fsm.state == IVTS_ST_ALARM) { app_alarm_latch(app_device_is_provisioned(), app_device_boot_id()); }
    }
}

static void refresh_device_state(bool changed)
{
    if (app_fw_update_in_progress()) {
        app_telemetry_set_device(IVTS_DEV_OTA, IVTS_SLEEP_NONE);
    } else if (changed || s_fsm.state != IVTS_ST_SLEEP) {
        app_telemetry_set_device(ivts_fsm_device_state(s_fsm.state), IVTS_SLEEP_NONE);
    }
}

void app_task_run(void *arg)
{
    (void)arg;
    board_wake_t bw = board_wake_cause();
    ivts_wake_t wake = (bw == BOARD_WAKE_IMU) ? IVTS_WAKE_MOTION
                     : (bw == BOARD_WAKE_TIMER) ? IVTS_WAKE_TIMER : IVTS_WAKE_POWER_ON;
    ivts_axes_init(&s_axes);
    ivts_fsm_init(&s_fsm, app_now(), wake);
    uint64_t next_tick = 0;

    /* Vẫn chờ queue và xử lý sự kiện khi FSM đang fake sleep. */
    while (true) {
        drain_events();
        uint64_t now = app_now();
        if (now < next_tick) { continue; }
        next_tick = now + APP_TICK_MS;

        if (app_sleep_poll(&s_fsm, &s_axes, &s_axes_cfg, now)) {
            app_publisher_poll();
            app_led_pattern_tick(s_fsm.state, app_device_tracking_enabled(), now);
            app_diag_tick(now);
            continue;
        }
        run_periodic_services(now);
        ivts_fsm_in_t in = collect_fsm_input(now);
        ivts_fsm_out_t out;
        ivts_app_state_t before = s_fsm.state;
        ivts_fsm_step(&s_fsm, &s_fsm_cfg, &in, &out);
        apply_fsm_transition(&out, before);
        refresh_device_state(out.changed);
        app_led_pattern_tick(s_fsm.state, app_device_tracking_enabled(), now);
        app_fsm_actions_execute(&out, &s_fsm, &s_axes, &s_axes_cfg);
        app_fw_update_confirm_tick();
        app_diag_tick(now);
    }
}
