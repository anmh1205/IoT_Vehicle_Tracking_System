#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"

#include "app_state.h"
#include "ble_obd.h"
#include "ota_contract.h"
#include "retry_manager.h"

/**
 * @file state_runtime_context.h
 * @brief Shared runtime state and policy constants for split FSM modules.
 * This header belongs to the app-core orchestration layer and defines the orchestration boundary that bootstrap code and adapters rely on during runtime.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/* OBD protocol selectors reused across runtime polling flows. */
#define OBD_MODE_CURRENT_DATA 0x01
#define OBD_PID_MONITOR_STATUS 0x01
#define OBD_MODE_STORED_DTC 0x03
#define OBD_MODE_PENDING_DTC 0x07
#define OBD_MODE_PERMANENT_DTC 0x0A

/* Retry/backoff bounds for BLE, network, RTC bootstrap, and IMU bootstrap flows. */
#define TRACKER_BLE_RETRY_MIN_BACKOFF_MS 5000ULL
#define TRACKER_BLE_RETRY_MAX_BACKOFF_MS 120000ULL
#define TRACKER_BLE_PARKED_RETRY_MAX_BACKOFF_MS 30000ULL
#define TRACKER_NETWORK_RETRY_MIN_BACKOFF_MS 5000ULL
#define TRACKER_NETWORK_RETRY_MAX_BACKOFF_MS 90000ULL
#define TRACKER_IMU_BOOTSTRAP_RETRY_MIN_BACKOFF_MS 5000ULL
#define TRACKER_IMU_BOOTSTRAP_RETRY_MAX_BACKOFF_MS 60000ULL

/* Wake, heartbeat, OBD, RTC, and sleep-control timing constants. */
#define TRACKER_PARKED_WAKE_INTERVAL_CAP_S 120U
#define TRACKER_HEARTBEAT_ACTIVE_WINDOW_MS 30000ULL
#define TRACKER_BLE_CONNECT_TASK_STACK_BYTES 8192U
#define TRACKER_HEARTBEAT_OBD_STALE_WARN_MS 12000ULL
#define TRACKER_LIGHT_SLEEP_IMU_CLEAR_SETTLE_MS 25U
#define TRACKER_OBD_DEBUG_LOG_INTERVAL_MS 1000ULL
#define TRACKER_OBD_POLL_INTERVAL_MS 1200ULL
#define TRACKER_OBD_DIAGNOSTIC_POLL_INTERVAL_MS 5000ULL
#define TRACKER_OBD_PID_TIMEOUT_MS 700U
#define TRACKER_BLE_CONNECT_TIMEOUT_MS 8000U
#define TRACKER_RTC_SYNC_MIN_INTERVAL_MS 60000ULL
#define TRACKER_RTC_READ_RETRY_BACKOFF_MS 1000ULL
#define TRACKER_GNSS_REARM_COOLDOWN_MS 15000ULL
#define TRACKER_GNSS_FAIL_REARM_THRESHOLD 3U
#define TRACKER_GNSS_POLL_INTERVAL_MS 2000ULL
#define TRACKER_MQTT_RUNTIME_DISABLED 0
#define TRACKER_USER_LED_BLINK_PERIOD_MS 3000ULL
#define TRACKER_USER_LED_ON_MS 300ULL
#define TRACKER_USER_LED_ACTIVE_LEVEL 1
#define TRACKER_METADATA_MESSAGE_ID_LEN 37
#define TRACKER_BOOT_ID_LEN 48
#define TRACKER_OBD_FAIL_ALERT_COOLDOWN_MS 300000ULL
#define TRACKER_OBD_FAIL_WINDOW_MS 300000ULL
#define TRACKER_OBD_LIVE_SIGNAL_MAX_AGE_MS 30000U
#define TRACKER_IGNITION_OBD_LIVE_SAMPLE_MAX_AGE_MS 5000U
#define TRACKER_OBD_ENGINE_ON_EVIDENCE_HOLD_MS 5000U
#define TRACKER_OBD_ENGINE_ON_CONFIRMED_GRACE_MS 20000U
#define TRACKER_OBD_LIVE_ZERO_OFF_CONFIRM_MS 30000U
#define TRACKER_EVENT_CODE_OBD_CONNECT_FAILED 2001
#define TRACKER_EVENT_CODE_OBD_ELM327_INIT_FAILED 2002
#define TRACKER_SLEEP_REJECT_LOG_INTERVAL_MS 10000ULL
#define TRACKER_HW_DIAG_LOG_INTERVAL_MS 15000ULL
#define TRACKER_PENDING_ACTION_DRAIN_LIMIT 4U
#define TRACKER_MODEM_POWEROFF_SETTLE_MS 250ULL
#define TRACKER_FAKE_SLEEP_LOOP_STEP_MS 200U
#define TRACKER_OBD_SLEEP_BLOCK_MAX_AGE_MS 12000U

/** @brief Result codes returned by the async BLE connect worker. */
typedef enum {
    TRACKER_BLE_CONNECT_RESULT_OK = 0,
    TRACKER_BLE_CONNECT_RESULT_CONNECT_FAILED,
    TRACKER_BLE_CONNECT_RESULT_ELM327_INIT_FAILED,
} tracker_ble_connect_result_code_t;

/** @brief Lifecycle flag for the publish pipeline. */
typedef enum {
    TRACKER_PUBLISH_STATUS_UNKNOWN = 0,
    TRACKER_PUBLISH_STATUS_RUNNING,
    TRACKER_PUBLISH_STATUS_STOPPED,
} tracker_publish_status_t;

/** @brief Optional override for the user LED state machine. */
typedef enum {
    TRACKER_USER_LED_OVERRIDE_NONE = 0,
    TRACKER_USER_LED_OVERRIDE_ON,
    TRACKER_USER_LED_OVERRIDE_OFF,
} tracker_user_led_override_t;

/** @brief Mailbox payload sent back from the async BLE connect worker. */
typedef struct {
    ble_obd_ctx_t *ctx;
    tracker_ble_connect_result_code_t code;
    uint64_t started_ms;
    bool prime_sample_ready;
    bool preferred_from_rtc;
} tracker_ble_connect_result_t;

/** @brief Arguments passed into the async BLE connect worker task. */
typedef struct {
    uint64_t started_ms;
    char preferred_mac[TRACKER_MAC_ADDR_STR_LEN];
    bool preferred_from_rtc;
} tracker_ble_connect_task_args_t;

/** @brief One diagnostic OBD query scheduled by the runtime poller. */
typedef struct {
    uint8_t mode;
    int pid;
} tracker_obd_diag_query_t;

/* Shared runtime state exported across split FSM source files. */
extern config_t s_config;
extern telemetry_t s_telemetry;
extern ble_obd_ctx_t *s_ble_ctx;
extern QueueHandle_t s_ble_connect_result_queue;
extern uint64_t s_last_raw_publish_ms;
extern uint64_t s_alarm_enter_ms;
extern uint64_t s_last_obd_debug_log_ms;
extern uint64_t s_last_obd_poll_ms;
extern uint64_t s_last_obd_diagnostic_poll_ms;
extern uint8_t s_obd_aux_pid_cursor;
extern uint8_t s_obd_diag_query_cursor;
extern uint32_t s_session_id;
extern uint64_t s_canonical_session_id;
extern char s_session_boot_id[TRACKER_BOOT_ID_LEN];
extern bool s_session_restore_pending;
extern uint64_t s_ignition_off_started_ms;
extern tracker_publish_status_t s_publish_status;
extern bool s_mqtt_started;
extern bool s_gnss_started;
extern bool s_ota_confirm_checked;
extern bool s_ota_in_progress;
extern bool s_imu_available;
extern retry_state_t s_ble_retry;
extern retry_state_t s_network_retry;
extern retry_state_t s_rtc_bootstrap_retry;
extern retry_state_t s_rtc_read_retry;
extern retry_state_t s_imu_bootstrap_retry;
extern uint64_t s_last_rtc_sync_ms;
extern bool s_time_trusted;
extern uint64_t s_event_timestamp_ms;
extern bool s_prev_lte_initialized;
extern bool s_lte_ever_initialized;
extern bool s_modem_low_power_pending_wakeup;
extern uint32_t s_gnss_poll_fail_streak;
extern uint64_t s_last_gnss_rearm_ms;
extern uint64_t s_last_gnss_poll_ms;
extern bool s_hw_bootstrap_done;
extern uint64_t s_last_sleep_reject_log_ms;
extern uint32_t s_sleep_blocked_count;
extern uint32_t s_sleep_enter_count;
extern uint32_t s_timer_wake_count;
extern uint32_t s_imu_wake_count;
extern uint32_t s_imu_false_wake_count;
extern bool s_startup_system_check_log_once;
extern bool s_user_led_initialized;
extern uint64_t s_user_led_cycle_started_ms;
extern tracker_user_led_override_t s_user_led_override;
extern uint64_t s_last_hw_diag_log_ms;
extern uint64_t s_heartbeat_started_ms;
extern bool s_heartbeat_raw_published;
extern char s_current_version[TRACKER_TARGET_VERSION_MAX_LEN];
extern uint32_t s_metadata_seq_no;
extern char s_boot_id[TRACKER_BOOT_ID_LEN];
extern bool s_obd_fail_alert_emitted;
extern int s_last_obd_fail_alert_code;
extern uint64_t s_last_obd_fail_alert_ms;
extern uint64_t s_last_obd_sample_ms;
extern uint64_t s_last_obd_engine_on_evidence_ms;
extern uint64_t s_obd_live_zero_started_ms;
extern bool s_obd_elm_ready;
extern uint64_t s_obd_fail_window_started_ms;
extern uint32_t s_obd_fail_window_count;
extern bool s_ble_connect_inflight;
extern uint64_t s_ble_connect_started_ms;
extern bool s_imu_invalid_wakeup_gpio_logged;
extern firmware_status_t s_deferred_firmware_report;
extern bool s_deferred_firmware_report_pending;
extern bool s_ble_retry_last_ignition;
extern bool s_ignition_log_initialized;
extern bool s_last_ignition_state;
extern app_state_t s_runtime_state_hint;

/* Shared retry policies used by non-blocking bootstrap/runtime recovery paths. */
extern const retry_policy_t g_state_ble_retry_policy;
extern const retry_policy_t g_state_ble_retry_parked_policy;
extern const retry_policy_t g_state_network_retry_policy;
extern const retry_policy_t g_state_rtc_bootstrap_retry_policy;
extern const retry_policy_t g_state_rtc_read_retry_policy;
extern const retry_policy_t g_state_imu_bootstrap_retry_policy;

/** @brief Reset all shared runtime state before the FSM starts a fresh session. */
void state_runtime_context_reset(const config_t *config);
