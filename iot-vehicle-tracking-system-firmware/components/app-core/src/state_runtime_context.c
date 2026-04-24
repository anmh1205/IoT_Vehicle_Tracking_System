#include "state_runtime_context.h"

#include <string.h>

/**
 * @file state_runtime_context.c
 * @brief Shared mutable runtime state for split FSM modules.
 */

config_t s_config = {0};
telemetry_t s_telemetry = {0};
ble_obd_ctx_t *s_ble_ctx = NULL;
QueueHandle_t s_ble_connect_result_queue = NULL;
uint64_t s_last_raw_publish_ms = 0;
uint64_t s_alarm_enter_ms = 0;
uint64_t s_last_obd_debug_log_ms = 0;
uint64_t s_last_obd_poll_ms = 0;
uint64_t s_last_obd_diagnostic_poll_ms = 0;
uint8_t s_obd_aux_pid_cursor = 0;
uint8_t s_obd_diag_query_cursor = 0;
uint32_t s_session_id = 1;
uint64_t s_ignition_off_started_ms = 0;
tracker_publish_status_t s_publish_status = TRACKER_PUBLISH_STATUS_STOPPED;
bool s_mqtt_started = false;
bool s_gnss_started = false;
bool s_ota_confirm_checked = false;
bool s_ota_in_progress = false;
bool s_imu_available = false;
retry_state_t s_ble_retry = {0};
retry_state_t s_network_retry = {0};
retry_state_t s_rtc_bootstrap_retry = {0};
retry_state_t s_rtc_read_retry = {0};
retry_state_t s_imu_bootstrap_retry = {0};
uint64_t s_last_rtc_sync_ms = 0;
bool s_time_trusted = false;
uint64_t s_event_timestamp_ms = 0;
bool s_prev_lte_initialized = false;
bool s_lte_ever_initialized = false;
uint32_t s_gnss_poll_fail_streak = 0;
uint64_t s_last_gnss_rearm_ms = 0;
uint64_t s_last_gnss_poll_ms = 0;
bool s_hw_bootstrap_done = false;
uint64_t s_last_sleep_reject_log_ms = 0;
uint32_t s_sleep_blocked_count = 0;
uint32_t s_sleep_enter_count = 0;
uint32_t s_timer_wake_count = 0;
uint32_t s_imu_wake_count = 0;
uint32_t s_imu_false_wake_count = 0;
bool s_startup_system_check_log_once = false;
bool s_user_led_initialized = false;
uint64_t s_user_led_cycle_started_ms = 0;
uint64_t s_last_hw_diag_log_ms = 0;
uint64_t s_heartbeat_started_ms = 0;
bool s_heartbeat_raw_published = false;
char s_current_version[TRACKER_TARGET_VERSION_MAX_LEN] = {0};
uint32_t s_metadata_seq_no = 0;
char s_boot_id[TRACKER_BOOT_ID_LEN] = {0};
bool s_obd_fail_alert_emitted = false;
int s_last_obd_fail_alert_code = 0;
uint64_t s_last_obd_fail_alert_ms = 0;
uint64_t s_last_obd_sample_ms = 0;
bool s_obd_elm_ready = false;
uint64_t s_obd_fail_window_started_ms = 0;
uint32_t s_obd_fail_window_count = 0;
bool s_ble_connect_inflight = false;
uint64_t s_ble_connect_started_ms = 0;
bool s_imu_invalid_wakeup_gpio_logged = false;
firmware_status_t s_deferred_firmware_report = {0};
bool s_deferred_firmware_report_pending = false;
bool s_ble_retry_last_ignition = false;
bool s_ignition_log_initialized = false;
bool s_last_ignition_state = false;
app_state_t s_runtime_state_hint = APP_STATE_INIT;

const retry_policy_t g_state_ble_retry_policy = {
    .mode = RETRY_MODE_EXPONENTIAL,
    .base_delay_ms = (uint32_t)TRACKER_BLE_RETRY_MIN_BACKOFF_MS,
    .max_delay_ms = (uint32_t)TRACKER_BLE_RETRY_MAX_BACKOFF_MS,
    .max_attempts = 0,
    .jitter_ms = 0,
};

const retry_policy_t g_state_ble_retry_parked_policy = {
    .mode = RETRY_MODE_EXPONENTIAL,
    .base_delay_ms = (uint32_t)TRACKER_BLE_RETRY_MIN_BACKOFF_MS,
    .max_delay_ms = (uint32_t)TRACKER_BLE_PARKED_RETRY_MAX_BACKOFF_MS,
    .max_attempts = 0,
    .jitter_ms = 0,
};

const retry_policy_t g_state_network_retry_policy = {
    .mode = RETRY_MODE_EXPONENTIAL,
    .base_delay_ms = (uint32_t)TRACKER_NETWORK_RETRY_MIN_BACKOFF_MS,
    .max_delay_ms = (uint32_t)TRACKER_NETWORK_RETRY_MAX_BACKOFF_MS,
    .max_attempts = 0,
    .jitter_ms = 0,
};

const retry_policy_t g_state_rtc_bootstrap_retry_policy = {
    .mode = RETRY_MODE_FIXED,
    .base_delay_ms = 1000,
    .max_delay_ms = 1000,
    .max_attempts = 0,
    .jitter_ms = 0,
};

const retry_policy_t g_state_rtc_read_retry_policy = {
    .mode = RETRY_MODE_FIXED,
    .base_delay_ms = (uint32_t)TRACKER_RTC_READ_RETRY_BACKOFF_MS,
    .max_delay_ms = (uint32_t)TRACKER_RTC_READ_RETRY_BACKOFF_MS,
    .max_attempts = 0,
    .jitter_ms = 0,
};

const retry_policy_t g_state_imu_bootstrap_retry_policy = {
    .mode = RETRY_MODE_EXPONENTIAL,
    .base_delay_ms = (uint32_t)TRACKER_IMU_BOOTSTRAP_RETRY_MIN_BACKOFF_MS,
    .max_delay_ms = (uint32_t)TRACKER_IMU_BOOTSTRAP_RETRY_MAX_BACKOFF_MS,
    .max_attempts = 0,
    .jitter_ms = 0,
};

void state_runtime_context_reset(const config_t *config) {
    memset(&s_telemetry, 0, sizeof(s_telemetry));
    s_config = (config != NULL) ? *config : (config_t){0};
    s_ble_ctx = NULL;
    s_last_raw_publish_ms = 0;
    s_alarm_enter_ms = 0;
    s_last_obd_debug_log_ms = 0;
    s_last_obd_poll_ms = 0;
    s_last_obd_diagnostic_poll_ms = 0;
    s_obd_aux_pid_cursor = 0;
    s_obd_diag_query_cursor = 0;
    s_session_id = 1;
    s_ignition_off_started_ms = 0;
    s_publish_status = TRACKER_PUBLISH_STATUS_STOPPED;
    s_mqtt_started = false;
    s_gnss_started = false;
    s_ota_confirm_checked = false;
    s_ota_in_progress = false;
    s_imu_available = false;
    retry_state_reset(&s_ble_retry);
    retry_state_reset(&s_network_retry);
    retry_state_reset(&s_rtc_bootstrap_retry);
    retry_state_reset(&s_rtc_read_retry);
    retry_state_reset(&s_imu_bootstrap_retry);
    s_last_rtc_sync_ms = 0;
    s_time_trusted = false;
    s_event_timestamp_ms = 0;
    s_prev_lte_initialized = false;
    s_lte_ever_initialized = false;
    s_gnss_poll_fail_streak = 0;
    s_last_gnss_rearm_ms = 0;
    s_last_gnss_poll_ms = 0;
    s_hw_bootstrap_done = false;
    s_last_sleep_reject_log_ms = 0;
    s_sleep_blocked_count = 0;
    s_sleep_enter_count = 0;
    s_timer_wake_count = 0;
    s_imu_wake_count = 0;
    s_imu_false_wake_count = 0;
    s_startup_system_check_log_once = false;
    s_user_led_initialized = false;
    s_user_led_cycle_started_ms = 0;
    s_last_hw_diag_log_ms = 0;
    s_heartbeat_started_ms = 0;
    s_heartbeat_raw_published = false;
    memset(s_current_version, 0, sizeof(s_current_version));
    s_metadata_seq_no = 0;
    memset(s_boot_id, 0, sizeof(s_boot_id));
    s_obd_fail_alert_emitted = false;
    s_last_obd_fail_alert_code = 0;
    s_last_obd_fail_alert_ms = 0;
    s_last_obd_sample_ms = 0;
    s_obd_elm_ready = false;
    s_obd_fail_window_started_ms = 0;
    s_obd_fail_window_count = 0;
    s_ble_connect_inflight = false;
    s_ble_connect_started_ms = 0;
    s_imu_invalid_wakeup_gpio_logged = false;
    memset(&s_deferred_firmware_report, 0, sizeof(s_deferred_firmware_report));
    s_deferred_firmware_report_pending = false;
    s_ble_retry_last_ignition = false;
    s_ignition_log_initialized = false;
    s_last_ignition_state = false;
    s_runtime_state_hint = APP_STATE_INIT;
}
