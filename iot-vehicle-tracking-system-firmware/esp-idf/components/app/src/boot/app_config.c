#include "app_config.h"
#include "app_timing.h"
#include "board/board.h"
#include "runtime/app_task.h"
#include "sdkconfig.h"

void app_config_apply(const ivts_config_t *c)
{
    bool real_sleep = c->sleep_enabled;
#if CONFIG_IVTS_FORCE_FAKE_SLEEP
    real_sleep = false;
#endif
    const ivts_axes_cfg_t axes_cfg = {
        .on_threshold_mv = c->ignition_adc_threshold_mv,
        .hysteresis_mv = CONFIG_IVTS_IGNITION_HYST_MV,
        .on_hold_ms = CONFIG_IVTS_IGNITION_ON_HOLD_MS,
        .off_hold_ms = c->ignition_off_hold_ms,
        .motion_quiet_ms = MOTION_QUIET_MS,
    };
    const ivts_fsm_cfg_t fsm_cfg = {
        .tracking_ms = (uint32_t)c->tracking_interval_s * 1000u,
        .alarm_ms = (uint32_t)c->alarm_interval_s * 1000u,
        .alarm_timeout_ms = (uint32_t)c->alarm_timeout_s * 1000u,
        .heartbeat_s = c->heartbeat_interval_s,
        .status_ms = STATUS_PERIOD_MS,
        .check_ign_max_ms = CHECK_IGN_MAX_MS,
        .parked_settle_ms = PARKED_SETTLE_MS,
        .awake_max_ms = AWAKE_MAX_MS,
        .sleep_enabled = real_sleep,
        .imu_wakeup_enabled = c->imu_wakeup_enabled && board_imu_ok(),
        .deep_wake_on_motion = board_motion_deep_wake_capable(),
    };
    app_task_set_config(&axes_cfg, &fsm_cfg);
}
