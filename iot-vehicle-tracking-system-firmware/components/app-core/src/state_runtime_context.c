#include "state_runtime_context.h"

#include <string.h>

/**
 * @file state_runtime_context.c
 * @brief Shared mutable runtime state for split FSM modules.
 * This translation unit belongs to the app-core orchestration layer and keeps FSM transitions, retained runtime state, and orchestration policy centralized inside app-core.
 */


/*==============================================================================
 * Global Telemetry & Config State
 *============================================================================*/

/** @brief Current runtime configuration (loaded from NVS on init). */
config_t s_config = {0};
/** @brief Latest aggregated telemetry from all sensor inputs. */
telemetry_t s_telemetry = {0};
/** @brief Active BLE OBD connection context; NULL when disconnected. */
ble_obd_ctx_t *s_ble_ctx = NULL;
/** @brief Queue for BLE connection results from async connect tasks. */
QueueHandle_t s_ble_connect_result_queue = NULL;

/*==============================================================================
 * Timing & Event Tracking
 *============================================================================*/

/** @brief Timestamp (uptime ms) of the most recent rawdata publish. */
uint64_t s_last_raw_publish_ms = 0;
/** @brief Timestamp when alarm state was entered. */
uint64_t s_alarm_enter_ms = 0;
/** @brief Timestamp of last OBD debug log emission (throttle). */
uint64_t s_last_obd_debug_log_ms = 0;
/** @brief Timestamp of last standard OBD PID poll. */
uint64_t s_last_obd_poll_ms = 0;
/** @brief Timestamp of last OBD diagnostic (extended) poll. */
uint64_t s_last_obd_diagnostic_poll_ms = 0;
/** @brief Cursor for cycling through auxiliary OBD PIDs. */
uint8_t s_obd_aux_pid_cursor = 0;
/** @brief Cursor for cycling through diagnostic queries. */
uint8_t s_obd_diag_query_cursor = 0;
/** @brief Current local session key (incremented on ignition-on boundaries). */
uint32_t s_session_id = 0;
/** @brief Canonical cloud session identifier once assigned by server. */
uint64_t s_canonical_session_id = 0;
/** @brief Session-correlation boot ID that remains stable across mid-session reboot. */
char s_session_boot_id[TRACKER_BOOT_ID_LEN] = {0};
/** @brief True when an active session was loaded from NVS and awaits ignition confirmation. */
bool s_session_restore_pending = false;
/** @brief Timestamp when ignition transitioned to OFF. */
uint64_t s_ignition_off_started_ms = 0;
/*==============================================================================
 * Subsystem Status Flags
 *============================================================================*/

/** @brief Current MQTT publish pipeline status. */
tracker_publish_status_t s_publish_status = TRACKER_PUBLISH_STATUS_STOPPED;
/** @brief Flag indicating MQTT stack has been initialized. */
bool s_mqtt_started = false;
/** @brief Flag indicating GNSS/GPS has been started. */
bool s_gnss_started = false;
/** @brief Flag indicating OTA confirm-check has been performed this boot. */
bool s_ota_confirm_checked = false;
/** @brief Flag indicating an OTA update is currently in progress. */
bool s_ota_in_progress = false;
/** @brief Flag indicating IMU (accelerometer) hardware is detected and available. */
bool s_imu_available = false;

/*==============================================================================
 * Retry State Machines
 *============================================================================*/

/** @brief Retry state for BLE connection attempts. */
retry_state_t s_ble_retry = {0};
/** @brief Retry state for network/MQTT connection attempts. */
retry_state_t s_network_retry = {0};
/** @brief Retry state for RTC bootstrap initialization. */
retry_state_t s_rtc_bootstrap_retry = {0};
/** @brief Retry state for RTC time read operations. */
retry_state_t s_rtc_read_retry = {0};
/** @brief Retry state for IMU bootstrap initialization. */
retry_state_t s_imu_bootstrap_retry = {0};
/*==============================================================================
 * RTC & Time Trust
 *============================================================================*/

/** @brief Timestamp of the last successful RTC sync. */
uint64_t s_last_rtc_sync_ms = 0;
/** @brief Flag indicating system time has been trusted (RTC synchronized). */
bool s_time_trusted = false;
/** @brief Timestamp assigned to the current event payload. */
uint64_t s_event_timestamp_ms = 0;

/*==============================================================================
 * LTE/Modem State
 *============================================================================*/

/** @brief Flag indicating LTE was initialized in the previous boot cycle. */
bool s_prev_lte_initialized = false;
/** @brief Flag indicating LTE has ever been successfully initialized. */
bool s_lte_ever_initialized = false;
/** @brief True after parked sleep requested modem low-power and wake prelude must re-arm AT. */
bool s_modem_low_power_pending_wakeup = false;

/*==============================================================================
 * GNSS State
 *============================================================================*/

/** @brief Consecutive GNSS poll failures (resets on success). */
uint32_t s_gnss_poll_fail_streak = 0;
/** @brief Timestamp of last GNSS poll re-arm attempt. */
uint64_t s_last_gnss_rearm_ms = 0;
/** @brief Timestamp of last GNSS poll. */
uint64_t s_last_gnss_poll_ms = 0;

/*==============================================================================
 * Hardware Bootstrap State
 *============================================================================*/

/** @brief Flag indicating hardware bootstrap sequence has completed. */
bool s_hw_bootstrap_done = false;
/** @brief Last timestamp when a sleep rejection log was emitted. */
uint64_t s_last_sleep_reject_log_ms = 0;
/** @brief Count of consecutive/total sleep rejections in this boot. */
uint32_t s_sleep_blocked_count = 0;
/** @brief Count of accepted sleep entries in this boot. */
uint32_t s_sleep_enter_count = 0;
/** @brief Number of timer-driven wakeups observed in this boot. */
uint32_t s_timer_wake_count = 0;
/** @brief Number of IMU-driven wakeups observed in this boot. */
uint32_t s_imu_wake_count = 0;
/** @brief Number of IMU wakeups later classified as false/benign. */
uint32_t s_imu_false_wake_count = 0;
/** @brief Ensures startup system-check banner is logged once. */
bool s_startup_system_check_log_once = false;
/** @brief True once the user LED GPIO has been configured. */
bool s_user_led_initialized = false;
/** @brief Start timestamp of the current user LED blink cycle. */
uint64_t s_user_led_cycle_started_ms = 0;
/** @brief Optional override for the user LED state machine. */
tracker_user_led_override_t s_user_led_override = TRACKER_USER_LED_OVERRIDE_NONE;
/** @brief Last timestamp when hardware diagnostics were logged. */
uint64_t s_last_hw_diag_log_ms = 0;
/** @brief Timestamp when the current heartbeat wake window started. */
uint64_t s_heartbeat_started_ms = 0;
/** @brief True once heartbeat rawdata has been published in the current window. */
bool s_heartbeat_raw_published = false;
/** @brief Firmware version currently running on this boot. */
char s_current_version[TRACKER_TARGET_VERSION_MAX_LEN] = {0};
/** @brief Monotonic metadata sequence number stamped into outbound payloads. */
uint32_t s_metadata_seq_no = 0;
/** @brief Boot identifier shared across payloads from this boot. */
char s_boot_id[TRACKER_BOOT_ID_LEN] = {0};
/** @brief Tracks whether an OBD failure alert was emitted recently. */
bool s_obd_fail_alert_emitted = false;
/** @brief Last OBD failure alert code that was emitted. */
int s_last_obd_fail_alert_code = 0;
/** @brief Timestamp of the last emitted OBD failure alert. */
uint64_t s_last_obd_fail_alert_ms = 0;
/** @brief Timestamp of the latest fresh OBD scalar sample. */
uint64_t s_last_obd_sample_ms = 0;
/** @brief Timestamp of the latest positive OBD engine-on evidence. */
uint64_t s_last_obd_engine_on_evidence_ms = 0;
/** @brief Timestamp when a live ECU first reported all zero motion/engine signals. */
uint64_t s_obd_live_zero_started_ms = 0;
/** @brief True once ELM327 initialization succeeded on the current BLE session. */
bool s_obd_elm_ready = false;
/** @brief Start timestamp of the rolling OBD failure window. */
uint64_t s_obd_fail_window_started_ms = 0;
/** @brief Number of OBD connect failures inside the current rolling window. */
uint32_t s_obd_fail_window_count = 0;
/** @brief True while an asynchronous BLE connect task is still running. */
bool s_ble_connect_inflight = false;
/** @brief Timestamp when the current BLE connect attempt started. */
uint64_t s_ble_connect_started_ms = 0;
/** @brief Suppresses repeated logs for non-RTC-capable IMU wake pins. */
bool s_imu_invalid_wakeup_gpio_logged = false;
/** @brief Deferred firmware status payload to flush when MQTT reconnects. */
firmware_status_t s_deferred_firmware_report = {0};
/** @brief True when `s_deferred_firmware_report` should publish later. */
bool s_deferred_firmware_report_pending = false;
/** @brief Previous ignition state used to reset parked/driving BLE retry cadence. */
bool s_ble_retry_last_ignition = false;
/** @brief True once ignition transition logging has an initialized previous state. */
bool s_ignition_log_initialized = false;
/** @brief Last ignition value logged by the ignition-fusion diagnostics. */
bool s_last_ignition_state = false;
/** @brief Current FSM state hint used by shared helpers outside the main switch. */
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

/**
 * @brief Reset all shared runtime state to a clean boot-time baseline.
 *
 * @param[in] config Optional runtime configuration snapshot to copy into context.
 */
void state_runtime_context_reset(const config_t *config) {
    // Clear the shared runtime snapshot here so every boot or forced re-init starts from the same clean baseline.
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
    s_session_id = 0;
    s_canonical_session_id = 0;
    memset(s_session_boot_id, 0, sizeof(s_session_boot_id));
    s_session_restore_pending = false;
    s_ignition_off_started_ms = 0;
    s_publish_status = TRACKER_PUBLISH_STATUS_STOPPED;
    s_mqtt_started = false;
    s_gnss_started = false;
    s_ota_confirm_checked = false;
    s_ota_in_progress = false;
    s_imu_available = false;
    // Retry helpers are reset as a group so earlier BLE/network/RTC failures do not bias the next runtime window.
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
    s_modem_low_power_pending_wakeup = false;
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
    s_user_led_override = TRACKER_USER_LED_OVERRIDE_NONE;
    s_last_hw_diag_log_ms = 0;
    s_heartbeat_started_ms = 0;
    s_heartbeat_raw_published = false;
    memset(s_current_version, 0, sizeof(s_current_version));
    s_metadata_seq_no = 0;
    memset(s_boot_id, 0, sizeof(s_boot_id));
    // Session and OTA-reporting state is cleared last so later publish code cannot accidentally reuse stale identifiers.
    s_obd_fail_alert_emitted = false;
    s_last_obd_fail_alert_code = 0;
    s_last_obd_fail_alert_ms = 0;
    s_last_obd_sample_ms = 0;
    s_last_obd_engine_on_evidence_ms = 0;
    s_obd_live_zero_started_ms = 0;
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
