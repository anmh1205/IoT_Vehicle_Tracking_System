#include "app_state.h"

#include <stdlib.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/task.h"

#include "driver/gpio.h"

#include "esp_err.h"
#include "esp_log.h"
#include "esp_ota_ops.h"
#include "esp_sleep.h"
#include "esp_system.h"

#include "cJSON.h"

#include "adc_reader.h"
#include "ble_init.h"
#include "ble_obd.h"
#include "command_handler.h"
#include "data_formatter.h"
#include "imu_lis3dh.h"
#include "modem_gnss.h"
#include "modem_lte.h"
#include "mqtt_client.h"
#include "nvs_config.h"
#include "obd.h"
#include "offline_queue.h"
#include "pin_map.h"
#include "power_mgr.h"
#include "rtc_ds3231m.h"
#include "retry_manager.h"
#include "session_mgr.h"
#include "telemetry_counters.h"
#include "util.h"

/**
 * @file state_machine.c
 * @brief Main tracker runtime finite-state machine and subsystem orchestration.
 */

#define OBD_MODE_CURRENT_DATA 0x01
#define OBD_PID_MONITOR_STATUS 0x01
#define OBD_MODE_STORED_DTC 0x03
#define OBD_MODE_PENDING_DTC 0x07
#define OBD_MODE_PERMANENT_DTC 0x0A
#define TRACKER_BLE_RETRY_MIN_BACKOFF_MS 5000ULL
#define TRACKER_BLE_RETRY_MAX_BACKOFF_MS 120000ULL
#define TRACKER_BLE_PARKED_RETRY_MAX_BACKOFF_MS 30000ULL
#define TRACKER_NETWORK_RETRY_MIN_BACKOFF_MS 5000ULL
#define TRACKER_NETWORK_RETRY_MAX_BACKOFF_MS 90000ULL
#define TRACKER_IMU_BOOTSTRAP_RETRY_MIN_BACKOFF_MS 5000ULL
#define TRACKER_IMU_BOOTSTRAP_RETRY_MAX_BACKOFF_MS 60000ULL
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
#define TRACKER_EVENT_CODE_OBD_CONNECT_FAILED 2001
#define TRACKER_EVENT_CODE_OBD_ELM327_INIT_FAILED 2002
#define TRACKER_SLEEP_REJECT_LOG_INTERVAL_MS 10000ULL
#define TRACKER_HW_DIAG_LOG_INTERVAL_MS 15000ULL
#define TRACKER_PENDING_ACTION_DRAIN_LIMIT 4U
#define TRACKER_MODEM_POWEROFF_SETTLE_MS 250ULL

/* RTC-retained context survives deep sleep and helps OTA/session continuity. */
RTC_DATA_ATTR rtc_context_t g_rtc_context = {
    .last_state = APP_STATE_INIT,
    .boot_count = 0,
    .last_heartbeat_ts = 0,
    .ble_mac = {0},
    .ign_last_known = false,
    .last_battery_v = 0.0f,
    .ota_confirm_deadline_ms = 0,
};

typedef enum {
    TRACKER_BLE_CONNECT_RESULT_OK = 0,
    TRACKER_BLE_CONNECT_RESULT_CONNECT_FAILED,
    TRACKER_BLE_CONNECT_RESULT_ELM327_INIT_FAILED,
} tracker_ble_connect_result_code_t;

typedef struct {
    ble_obd_ctx_t *ctx;
    tracker_ble_connect_result_code_t code;
    uint64_t started_ms;
    bool prime_sample_ready;
} tracker_ble_connect_result_t;

typedef struct {
    uint64_t started_ms;
    char preferred_mac[TRACKER_MAC_ADDR_STR_LEN];
} tracker_ble_connect_task_args_t;

typedef struct {
    uint8_t mode;
    int pid;
} tracker_obd_diag_query_t;

static const char *TAG = "STATE_MACHINE";

#ifndef CONFIG_APP_PROJECT_VER
#define CONFIG_APP_PROJECT_VER "unknown"
#endif

static config_t s_config;
static telemetry_t s_telemetry;
static ble_obd_ctx_t *s_ble_ctx = NULL;
static QueueHandle_t s_ble_connect_result_queue = NULL;
static uint64_t s_last_raw_publish_ms = 0;
static uint64_t s_alarm_enter_ms = 0;
static uint64_t s_last_obd_debug_log_ms = 0;
static uint64_t s_last_obd_poll_ms = 0;
static uint64_t s_last_obd_diagnostic_poll_ms = 0;
static uint8_t s_obd_aux_pid_cursor = 0;
static uint8_t s_obd_diag_query_cursor = 0;
static uint32_t s_session_id = 1;
static uint64_t s_ignition_off_started_ms = 0;
static bool s_status_running = false;
static bool s_status_stopped = true;
#if !TRACKER_MQTT_RUNTIME_DISABLED
static bool s_mqtt_started = false;
#endif
static bool s_gnss_started = false;
static bool s_ota_confirm_checked = false;
static bool s_ota_in_progress = false;
static bool s_imu_available = false;
static retry_state_t s_ble_retry = {0};
static retry_state_t s_network_retry = {0};
static retry_state_t s_rtc_bootstrap_retry = {0};
static retry_state_t s_rtc_read_retry = {0};
static retry_state_t s_imu_bootstrap_retry = {0};
static uint64_t s_last_rtc_sync_ms = 0;
static bool s_time_trusted = false;
static uint64_t s_event_timestamp_ms = 0;
static bool s_prev_lte_initialized = false;
static bool s_lte_ever_initialized = false;
static uint32_t s_gnss_poll_fail_streak = 0;
static uint64_t s_last_gnss_rearm_ms = 0;
static uint64_t s_last_gnss_poll_ms = 0;
static bool s_hw_bootstrap_done = false;
static uint64_t s_last_sleep_reject_log_ms = 0;
static uint32_t s_sleep_blocked_count = 0;
static uint32_t s_sleep_enter_count = 0;
static uint32_t s_timer_wake_count = 0;
static uint32_t s_imu_wake_count = 0;
static uint32_t s_imu_false_wake_count = 0;
static bool s_startup_system_check_log_once = false;
static bool s_user_led_initialized = false;
static uint64_t s_user_led_cycle_started_ms = 0;
static uint64_t s_last_hw_diag_log_ms = 0;
static uint64_t s_heartbeat_started_ms = 0;
static bool s_heartbeat_raw_published = false;
static char s_current_version[TRACKER_TARGET_VERSION_MAX_LEN] = CONFIG_APP_PROJECT_VER;
static uint32_t s_metadata_seq_no = 0;
static char s_boot_id[TRACKER_BOOT_ID_LEN] = {0};
static bool s_obd_fail_alert_emitted = false;
static int s_last_obd_fail_alert_code = 0;
static uint64_t s_last_obd_fail_alert_ms = 0;
static uint64_t s_last_obd_sample_ms = 0;
static bool s_obd_elm_ready = false;
static uint64_t s_obd_fail_window_started_ms = 0;
static uint32_t s_obd_fail_window_count = 0;
static bool s_ble_connect_inflight = false;
static uint64_t s_ble_connect_started_ms = 0;
static bool s_imu_invalid_wakeup_gpio_logged = false;
static firmware_status_t s_deferred_firmware_report = {0};
static bool s_deferred_firmware_report_pending = false;
static bool s_ble_retry_last_ignition = false;

static const retry_policy_t s_ble_retry_policy = {
    .mode = RETRY_MODE_EXPONENTIAL,
    .base_delay_ms = (uint32_t)TRACKER_BLE_RETRY_MIN_BACKOFF_MS,
    .max_delay_ms = (uint32_t)TRACKER_BLE_RETRY_MAX_BACKOFF_MS,
    .max_attempts = 0,
    .jitter_ms = 0,
};

static const retry_policy_t s_ble_retry_parked_policy = {
    .mode = RETRY_MODE_EXPONENTIAL,
    .base_delay_ms = (uint32_t)TRACKER_BLE_RETRY_MIN_BACKOFF_MS,
    .max_delay_ms = (uint32_t)TRACKER_BLE_PARKED_RETRY_MAX_BACKOFF_MS,
    .max_attempts = 0,
    .jitter_ms = 0,
};

static const retry_policy_t s_network_retry_policy = {
    .mode = RETRY_MODE_EXPONENTIAL,
    .base_delay_ms = (uint32_t)TRACKER_NETWORK_RETRY_MIN_BACKOFF_MS,
    .max_delay_ms = (uint32_t)TRACKER_NETWORK_RETRY_MAX_BACKOFF_MS,
    .max_attempts = 0,
    .jitter_ms = 0,
};

static const retry_policy_t s_rtc_bootstrap_retry_policy = {
    .mode = RETRY_MODE_FIXED,
    .base_delay_ms = 1000,
    .max_delay_ms = 1000,
    .max_attempts = 0,
    .jitter_ms = 0,
};

static const retry_policy_t s_rtc_read_retry_policy = {
    .mode = RETRY_MODE_FIXED,
    .base_delay_ms = (uint32_t)TRACKER_RTC_READ_RETRY_BACKOFF_MS,
    .max_delay_ms = (uint32_t)TRACKER_RTC_READ_RETRY_BACKOFF_MS,
    .max_attempts = 0,
    .jitter_ms = 0,
};

static const retry_policy_t s_imu_bootstrap_retry_policy = {
    .mode = RETRY_MODE_EXPONENTIAL,
    .base_delay_ms = (uint32_t)TRACKER_IMU_BOOTSTRAP_RETRY_MIN_BACKOFF_MS,
    .max_delay_ms = (uint32_t)TRACKER_IMU_BOOTSTRAP_RETRY_MAX_BACKOFF_MS,
    .max_attempts = 0,
    .jitter_ms = 0,
};

/**
 * @brief Convert OBD RPM payload bytes to integer RPM.
 */
int obd_convert_rpm(int32_t *value, const uint8_t *data, size_t len) {
    if (value == NULL || data == NULL || len < 2) {
        return -1;
    }
    *value = ((data[0] << 8) | data[1]) / 4;
    return 0;
}

/**
 * @brief Convert OBD percentage payload byte to percentage.
 */
int obd_convert_percent(int32_t *value, const uint8_t *data, size_t len) {
    if (value == NULL || data == NULL || len < 1) {
        return -1;
    }
    *value = (data[0] * 100) / 255;
    return 0;
}

/**
 * @brief Convert OBD temperature payload byte to Celsius.
 */
int obd_convert_temperature(int32_t *value, const uint8_t *data, size_t len) {
    if (value == NULL || data == NULL || len < 1) {
        return -1;
    }
    *value = (int32_t)data[0] - 40;
    return 0;
}

static void state_machine_reset_dtc_list(obd_dtc_list_t *list, bool valid) {
    if (list == NULL) {
        return;
    }

    memset(list, 0, sizeof(*list));
    list->valid = valid;
}

static bool state_machine_format_dtc_code(uint8_t high, uint8_t low, char out[TRACKER_OBD_DTC_CODE_LEN]) {
    static const char families[] = {'P', 'C', 'B', 'U'};

    if (out == NULL) {
        return false;
    }
    if (high == 0 && low == 0) {
        return false;
    }

    snprintf(out,
             TRACKER_OBD_DTC_CODE_LEN,
             "%c%1X%1X%1X%1X",
             families[(high >> 6) & 0x03],
             (high >> 4) & 0x03,
             high & 0x0F,
             (low >> 4) & 0x0F,
             low & 0x0F);
    return true;
}

static void state_machine_decode_dtc_payload(obd_dtc_list_t *list, const uint8_t *data, size_t len) {
    if (list == NULL) {
        return;
    }

    state_machine_reset_dtc_list(list, true);
    if (data == NULL || len < 2) {
        return;
    }

    for (size_t i = 0; i + 1 < len && list->count < TRACKER_OBD_MAX_DTC_CODES; i += 2) {
        char dtc_code[TRACKER_OBD_DTC_CODE_LEN] = {0};
        if (!state_machine_format_dtc_code(data[i], data[i + 1], dtc_code)) {
            if (data[i] == 0 && data[i + 1] == 0) {
                break;
            }
            continue;
        }

        util_copy_string(list->codes[list->count], TRACKER_OBD_DTC_CODE_LEN, dtc_code);
        list->count += 1U;
    }
}

static obd_monitor_status_t state_machine_decode_monitor_status(uint8_t supported_bits,
                                                                uint8_t incomplete_bits,
                                                                uint8_t bit_index) {
    uint8_t mask = (uint8_t)(1U << bit_index);
    if ((supported_bits & mask) == 0U) {
        return OBD_MONITOR_STATUS_UNSUPPORTED;
    }

    return (incomplete_bits & mask) != 0U ? OBD_MONITOR_STATUS_INCOMPLETE
                                          : OBD_MONITOR_STATUS_COMPLETE;
}

static void state_machine_decode_readiness_payload(obd_readiness_t *readiness,
                                                   const uint8_t *data,
                                                   size_t len) {
    if (readiness == NULL) {
        return;
    }

    memset(readiness, 0, sizeof(*readiness));
    if (data == NULL || len < 4) {
        return;
    }

    uint8_t byte_a = data[0];
    uint8_t byte_b = data[1];
    uint8_t byte_c = data[2];
    uint8_t byte_d = data[3];

    readiness->valid = true;
    readiness->mil_on = (byte_a & 0x80U) != 0U;
    readiness->reported_dtc_count = byte_a & 0x7FU;
    readiness->compression_ignition = (byte_b & 0x08U) != 0U;

    uint8_t common_supported = byte_b & 0x07U;
    uint8_t common_incomplete = (byte_b >> 4) & 0x07U;
    readiness->misfire = state_machine_decode_monitor_status(common_supported, common_incomplete, 0);
    readiness->fuel_system = state_machine_decode_monitor_status(common_supported, common_incomplete, 1);
    readiness->comprehensive_components =
        state_machine_decode_monitor_status(common_supported, common_incomplete, 2);

    if (readiness->compression_ignition) {
        readiness->nmhc_catalyst = state_machine_decode_monitor_status(byte_c, byte_d, 0);
        readiness->nox_aftertreatment = state_machine_decode_monitor_status(byte_c, byte_d, 1);
        readiness->boost_pressure = state_machine_decode_monitor_status(byte_c, byte_d, 2);
        readiness->exhaust_gas_sensor = state_machine_decode_monitor_status(byte_c, byte_d, 3);
        readiness->pm_filter = state_machine_decode_monitor_status(byte_c, byte_d, 4);
        readiness->egr_vvt_system = state_machine_decode_monitor_status(byte_c, byte_d, 5);
        return;
    }

    readiness->catalyst = state_machine_decode_monitor_status(byte_c, byte_d, 0);
    readiness->heated_catalyst = state_machine_decode_monitor_status(byte_c, byte_d, 1);
    readiness->evaporative_system = state_machine_decode_monitor_status(byte_c, byte_d, 2);
    readiness->secondary_air_system = state_machine_decode_monitor_status(byte_c, byte_d, 3);
    readiness->ac_refrigerant = state_machine_decode_monitor_status(byte_c, byte_d, 4);
    readiness->oxygen_sensor = state_machine_decode_monitor_status(byte_c, byte_d, 5);
    readiness->oxygen_sensor_heater = state_machine_decode_monitor_status(byte_c, byte_d, 6);
    readiness->egr_vvt_system = state_machine_decode_monitor_status(byte_c, byte_d, 7);
}

static void state_machine_clear_obd_diagnostic_query(uint8_t mode, int pid) {
    if (mode == OBD_MODE_CURRENT_DATA && pid == OBD_PID_MONITOR_STATUS) {
        memset(&s_telemetry.obd_readiness, 0, sizeof(s_telemetry.obd_readiness));
        return;
    }

    switch (mode) {
        case OBD_MODE_STORED_DTC:
            state_machine_reset_dtc_list(&s_telemetry.obd_stored_dtc, true);
            break;
        case OBD_MODE_PENDING_DTC:
            state_machine_reset_dtc_list(&s_telemetry.obd_pending_dtc, true);
            break;
        case OBD_MODE_PERMANENT_DTC:
            state_machine_reset_dtc_list(&s_telemetry.obd_permanent_dtc, true);
            break;
        default:
            break;
    }
}

/**
 * @brief Callback for parsed OBD responses.
 *
 * @param mode Requested mode.
 * @param pid Requested PID.
 * @param data Response payload bytes.
 * @param len Payload length.
 * @param usr_ctx User context (unused).
 */
static void state_machine_obd_response_cb(uint8_t mode, int pid, const uint8_t *data, size_t len, void *usr_ctx) {
    (void)usr_ctx;

    int32_t converted = 0;
    bool updated = false;
    if (data == NULL || len == 0) {
        state_machine_clear_obd_diagnostic_query(mode, pid);
        return;
    }

    if (mode == OBD_MODE_CURRENT_DATA && pid >= 0 && (uint8_t)pid == OBD_PID_MONITOR_STATUS) {
        state_machine_decode_readiness_payload(&s_telemetry.obd_readiness, data, len);
        return;
    }

    if (mode == OBD_MODE_STORED_DTC) {
        state_machine_decode_dtc_payload(&s_telemetry.obd_stored_dtc, data, len);
        return;
    }
    if (mode == OBD_MODE_PENDING_DTC) {
        state_machine_decode_dtc_payload(&s_telemetry.obd_pending_dtc, data, len);
        return;
    }
    if (mode == OBD_MODE_PERMANENT_DTC) {
        state_machine_decode_dtc_payload(&s_telemetry.obd_permanent_dtc, data, len);
        return;
    }
    if (pid < 0) {
        return;
    }

    switch ((uint8_t)pid) {
        case 0x0C:
            if (obd_convert_rpm(&converted, data, len) == 0) {
                s_telemetry.obd_rpm = converted;
                updated = true;
            }
            break;
        case 0x0D:
            if (len >= 1) {
                s_telemetry.obd_speed = data[0];
                updated = true;
            }
            break;
        case 0x05:
            if (obd_convert_temperature(&converted, data, len) == 0) {
                s_telemetry.obd_coolant_temp = converted;
                updated = true;
            }
            break;
        case 0x2F:
            if (obd_convert_percent(&converted, data, len) == 0) {
                s_telemetry.obd_fuel_level = converted;
                updated = true;
            }
            break;
        case 0x04:
            if (obd_convert_percent(&converted, data, len) == 0) {
                s_telemetry.obd_engine_load = converted;
                updated = true;
            }
            break;
        default:
            break;
    }

    if (updated) {
        s_last_obd_sample_ms = util_uptime_ms();
    }
}

/**
 * @brief MQTT command callback forwarding payload to command parser.
 */
static void state_machine_command_callback(const char *topic, const char *payload) {
    (void)topic;
    command_handler_process(payload);
}

static void state_machine_puback_callback(int msg_id) {
    offline_queue_handle_publish_ack(msg_id);
}

static void state_machine_process_ota_command(command_action_t action);
static void state_machine_obd_refresh_fail_window(uint64_t now_ms);
static void state_machine_run_obd_diagnostic_query(ble_obd_ctx_t *ctx,
                                                   const tracker_obd_diag_query_t *query);
static void state_machine_ble_connect_task(void *arg);
static bool state_machine_handle_ble_connect_result(void);

static void state_machine_handle_pending_action(void) {
    for (uint32_t i = 0; i < TRACKER_PENDING_ACTION_DRAIN_LIMIT; ++i) {
        command_action_t action = command_handler_consume_action();
        if (action == COMMAND_ACTION_NONE) {
            return;
        }

        if (action == COMMAND_ACTION_REBOOT) {
            esp_restart();
        }

        state_machine_process_ota_command(action);
        if (s_ota_in_progress) {
            return;
        }
    }
}

/**
 * @brief Refresh telemetry snapshot from sensors/modem/OBD.
 *
 * @param read_gnss True to poll GNSS.
 * @param read_obd True to poll OBD PIDs.
 */
static bool state_machine_can_poll_gnss(void) {
    return s_gnss_started && modem_lte_is_initialized() && modem_gnss_is_query_ready();
}

static uint64_t state_machine_tracking_interval_ms(void) {
    return (uint64_t)s_config.tracking_interval_s * 1000ULL;
}

static uint64_t state_machine_alarm_interval_ms(void) {
    return (uint64_t)s_config.alarm_interval_s * 1000ULL;
}

static uint64_t state_machine_alarm_timeout_ms(void) {
    return (uint64_t)s_config.alarm_timeout_s * 1000ULL;
}

static bool state_machine_should_throttle_rawdata(void) {
    if (tracker_mqtt_is_connected()) {
        return false;
    }

    return offline_queue_should_throttle_rawdata();
}

static uint64_t state_machine_ignition_off_hold_ms(void) {
    return (uint64_t)s_config.ignition_off_hold_ms;
}

static uint16_t state_machine_parked_wake_interval_s(void) {
    uint16_t configured = s_config.heartbeat_interval_s;
    if (configured > TRACKER_PARKED_WAKE_INTERVAL_CAP_S) {
        return TRACKER_PARKED_WAKE_INTERVAL_CAP_S;
    }
    return configured;
}

static bool state_machine_imu_runtime_enabled(void) {
    return s_config.imu_wakeup_enabled;
}

static bool state_machine_should_use_light_sleep_motion_wake(void) {
    if (!state_machine_imu_runtime_enabled() || !s_imu_available) {
        return false;
    }

    if (esp_sleep_is_valid_wakeup_gpio(PIN_LIS3DH_INT)) {
        return false;
    }

    if (!s_imu_invalid_wakeup_gpio_logged) {
        ESP_LOGW(TAG,
                 "IMU wake pin gpio=%d is not RTC-capable; parked motion wake will use light sleep GPIO wake",
                 (int)PIN_LIS3DH_INT);
        s_imu_invalid_wakeup_gpio_logged = true;
    }

    return true;
}

static bool state_machine_has_recent_obd_sample(uint64_t now_ms, uint32_t max_age_ms) {
    if (s_last_obd_sample_ms == 0 || now_ms < s_last_obd_sample_ms) {
        return false;
    }

    return (now_ms - s_last_obd_sample_ms) <= (uint64_t)max_age_ms;
}

static bool state_machine_network_ready_for_heartbeat_publish(void) {
#if TRACKER_MQTT_RUNTIME_DISABLED
    return modem_lte_is_initialized() || s_network_retry.attempts > 0;
#else
    return tracker_mqtt_is_connected() || s_network_retry.attempts > 0;
#endif
}

static bool state_machine_can_arm_imu_deep_sleep_wakeup(void) {
    if (!state_machine_imu_runtime_enabled() || !s_imu_available) {
        return false;
    }

    return esp_sleep_is_valid_wakeup_gpio(PIN_LIS3DH_INT);
}

static bool state_machine_ota_start_is_safe(void) {
    if (!tracker_mqtt_is_connected()) {
        ESP_LOGW(TAG, "OTA blocked reason=mqtt_not_connected");
        return false;
    }

    if (s_telemetry.battery_bot <= 0.0f) {
        ESP_LOGW(TAG, "OTA blocked reason=battery_unavailable");
        return false;
    }

    float threshold_v = (float)s_config.ota_min_battery_mv / 1000.0f;
    if (s_telemetry.battery_bot < threshold_v) {
        ESP_LOGW(TAG,
                 "OTA blocked reason=power_unsafe battery=%.2f threshold=%.2f",
                 (double)s_telemetry.battery_bot,
                 (double)threshold_v);
        return false;
    }

    return true;
}

static bool state_machine_can_enter_sleep(const char **out_reason) {
    if (!s_config.sleep_enabled) {
        if (out_reason != NULL) {
            *out_reason = "sleep_policy_disabled";
        }
        return false;
    }

    if (s_ota_in_progress) {
        if (out_reason != NULL) {
            *out_reason = "ota_in_progress";
        }
        return false;
    }

    if (g_rtc_context.ota_pending_confirm) {
        if (out_reason != NULL) {
            *out_reason = "ota_pending_confirm";
        }
        return false;
    }

    if (s_telemetry.ignition) {
        if (out_reason != NULL) {
            *out_reason = "ignition_on";
        }
        return false;
    }

    if (s_ble_connect_inflight) {
        if (out_reason != NULL) {
            *out_reason = "ble_connect_inflight";
        }
        return false;
    }

    if (out_reason != NULL) {
        *out_reason = "ok";
    }
    return true;
}

static void state_machine_set_user_led(bool on) {
    if (PIN_USER_LED == GPIO_NUM_NC) {
        return;
    }

#if TRACKER_USER_LED_ACTIVE_LEVEL
    gpio_set_level(PIN_USER_LED, on ? 1 : 0);
#else
    gpio_set_level(PIN_USER_LED, on ? 0 : 1);
#endif
}

static void state_machine_update_user_led(void) {
    if (PIN_USER_LED == GPIO_NUM_NC) {
        return;
    }

    if (!s_user_led_initialized) {
        gpio_config_t user_led_cfg = {
            .pin_bit_mask = (1ULL << (uint32_t)PIN_USER_LED),
            .mode = GPIO_MODE_OUTPUT,
            .pull_up_en = GPIO_PULLUP_DISABLE,
            .pull_down_en = GPIO_PULLDOWN_DISABLE,
            .intr_type = GPIO_INTR_DISABLE,
        };
        ESP_ERROR_CHECK(gpio_config(&user_led_cfg));
        s_user_led_initialized = true;
        s_user_led_cycle_started_ms = util_uptime_ms();
        state_machine_set_user_led(false);
        ESP_LOGI(TAG,
                 "User LED initialized pin=%d active_level=%d blink_period_ms=%llu on_ms=%llu",
                 (int)PIN_USER_LED,
                 (int)TRACKER_USER_LED_ACTIVE_LEVEL,
                 (unsigned long long)TRACKER_USER_LED_BLINK_PERIOD_MS,
                 (unsigned long long)TRACKER_USER_LED_ON_MS);
    }

    uint64_t now_ms = util_uptime_ms();
    if (s_user_led_cycle_started_ms == 0 || now_ms < s_user_led_cycle_started_ms) {
        s_user_led_cycle_started_ms = now_ms;
    }

    while ((now_ms - s_user_led_cycle_started_ms) >= TRACKER_USER_LED_BLINK_PERIOD_MS) {
        s_user_led_cycle_started_ms += TRACKER_USER_LED_BLINK_PERIOD_MS;
    }

    bool led_on = (now_ms - s_user_led_cycle_started_ms) < TRACKER_USER_LED_ON_MS;
    state_machine_set_user_led(led_on);
}

static bool state_machine_try_rearm_gnss(const char *reason) {
    uint64_t now_ms = util_uptime_ms();
    if (s_last_gnss_rearm_ms != 0 && (now_ms - s_last_gnss_rearm_ms) < TRACKER_GNSS_REARM_COOLDOWN_MS) {
        return false;
    }

    s_last_gnss_rearm_ms = now_ms;
    esp_err_t off_err = modem_gnss_power_off();
    esp_err_t on_err = modem_gnss_power_on();

    if (off_err == ESP_OK && on_err == ESP_OK) {
        s_gnss_started = true;
        s_gnss_poll_fail_streak = 0;
        ESP_LOGW(TAG, "GNSS re-armed reason=%s", reason);
        return true;
    }

    ESP_LOGW(TAG,
             "GNSS re-arm failed reason=%s off=%s on=%s",
             reason,
             esp_err_to_name(off_err),
             esp_err_to_name(on_err));
    return false;
}

static bool state_machine_try_reassert_gnss_power(const char *reason) {
    uint64_t now_ms = util_uptime_ms();
    if (s_last_gnss_rearm_ms != 0 && (now_ms - s_last_gnss_rearm_ms) < TRACKER_GNSS_REARM_COOLDOWN_MS) {
        return false;
    }

    s_last_gnss_rearm_ms = now_ms;
    esp_err_t on_err = modem_gnss_power_on();
    if (on_err == ESP_OK) {
        s_gnss_started = true;
        s_gnss_poll_fail_streak = 0;
        ESP_LOGW(TAG, "GNSS power reasserted reason=%s", reason);
        return true;
    }

    ESP_LOGW(TAG,
             "GNSS power reassert failed reason=%s on=%s",
             reason,
             esp_err_to_name(on_err));
    return false;
}

static void state_machine_clear_gnss_cache(void) {
    memset(&s_telemetry.gnss, 0, sizeof(s_telemetry.gnss));
}

static void state_machine_try_start_gnss_nonblocking(void) {
    if (s_gnss_started) {
        return;
    }

    if (!modem_lte_is_initialized()) {
        return;
    }

    uint64_t now_ms = util_uptime_ms();
    if (s_last_gnss_rearm_ms != 0 &&
        now_ms > s_last_gnss_rearm_ms &&
        (now_ms - s_last_gnss_rearm_ms) < TRACKER_GNSS_REARM_COOLDOWN_MS) {
        return;
    }

    s_last_gnss_rearm_ms = now_ms;
    esp_err_t err = modem_gnss_power_on();
    if (err == ESP_OK) {
        s_gnss_started = true;
        s_gnss_poll_fail_streak = 0;
        ESP_LOGI(TAG, "GNSS power-on OK");
        return;
    }

    ESP_LOGW(TAG,
             "GNSS power-on failed err=%s (continue publish path without GNSS)",
             esp_err_to_name(err));
}

static uint32_t state_machine_next_seq_no(void) {
    s_metadata_seq_no += 1;
    if (s_metadata_seq_no == 0) {
        s_metadata_seq_no = 1;
    }
    return s_metadata_seq_no;
}

static void state_machine_fill_message_id(char *out, size_t out_size) {
    util_generate_uuid_v4(out, out_size);
}

static void state_machine_init_boot_metadata(void) {
    util_generate_boot_id(s_boot_id, sizeof(s_boot_id), g_rtc_context.boot_count);
    s_metadata_seq_no = 0;
    ESP_LOGI(TAG,
             "metadata boot initialized boot_id=%s boot_count=%lu",
             s_boot_id,
             (unsigned long)g_rtc_context.boot_count);
}

static void state_machine_bootstrap_rtc(void) {
    if (s_hw_bootstrap_done || !rtc_ds3231m_is_available()) {
        return;
    }

    uint64_t now_ms = util_uptime_ms();
    if (!retry_state_can_run(&s_rtc_bootstrap_retry, now_ms)) {
        return;
    }

    uint64_t rtc_ms = 0;
    if (rtc_ds3231m_get_time_ms(&rtc_ms) == ESP_OK && rtc_ds3231m_is_time_valid_ms(rtc_ms)) {
        s_hw_bootstrap_done = true;
        retry_state_reset(&s_rtc_bootstrap_retry);
        return;
    }

    uint64_t fallback_ms = 0;
    if (s_telemetry.gnss.fix_valid && rtc_ds3231m_is_time_valid_ms(s_telemetry.gnss.timestamp_ms)) {
        fallback_ms = s_telemetry.gnss.timestamp_ms;
    } else {
        fallback_ms = 1735689600000ULL; /* 2025-01-01T00:00:00Z */
    }

    if (rtc_ds3231m_set_time_ms(fallback_ms) == ESP_OK) {
        uint64_t verify_ms = 0;
        if (rtc_ds3231m_get_time_ms(&verify_ms) == ESP_OK && rtc_ds3231m_is_time_valid_ms(verify_ms)) {
            ESP_LOGI(TAG,
                     "RTC bootstrap OK set=%llu read=%llu",
                     (unsigned long long)fallback_ms,
                     (unsigned long long)verify_ms);
            s_hw_bootstrap_done = true;
            retry_state_reset(&s_rtc_bootstrap_retry);
            return;
        }
    }

    uint32_t delay_ms = retry_state_current_delay_ms(&s_rtc_bootstrap_retry,
                                                     &s_rtc_bootstrap_retry_policy,
                                                     now_ms);
    esp_err_t sched_err = retry_state_schedule(&s_rtc_bootstrap_retry,
                                               &s_rtc_bootstrap_retry_policy,
                                               now_ms,
                                               ESP_FAIL);
    if (sched_err == ESP_OK) {
        ESP_LOGW(TAG,
                 "retry step=rtc_bootstrap err=%s attempt=%lu next_delay_ms=%lu",
                 esp_err_to_name(ESP_FAIL),
                 (unsigned long)s_rtc_bootstrap_retry.attempts,
                 (unsigned long)delay_ms);
    }
}

static void state_machine_bootstrap_imu(void) {
    if (!state_machine_imu_runtime_enabled()) {
        return;
    }

    if (s_imu_available) {
        return;
    }

    uint64_t now_ms = util_uptime_ms();
    if (!retry_state_can_run(&s_imu_bootstrap_retry, now_ms)) {
        return;
    }

    esp_err_t imu_err = imu_init();
    if (imu_err == ESP_OK) {
        s_imu_available = true;
        retry_state_reset(&s_imu_bootstrap_retry);
        esp_err_t motion_cfg_err = imu_configure_motion_interrupt(120, 200);
        if (motion_cfg_err != ESP_OK) {
            ESP_LOGW(TAG, "imu_configure_motion_interrupt failed: %s", esp_err_to_name(motion_cfg_err));
        } else {
            ESP_LOGI(TAG, "IMU bootstrap ready (motion interrupt configured)");
        }
        return;
    }

    uint32_t delay_ms = retry_state_current_delay_ms(&s_imu_bootstrap_retry,
                                                     &s_imu_bootstrap_retry_policy,
                                                     now_ms);
    (void)retry_state_schedule(&s_imu_bootstrap_retry,
                               &s_imu_bootstrap_retry_policy,
                               now_ms,
                               imu_err);
    ESP_LOGW(TAG,
             "retry step=imu_init err=%s attempt=%lu next_delay_ms=%lu",
             esp_err_to_name(imu_err),
             (unsigned long)s_imu_bootstrap_retry.attempts,
             (unsigned long)delay_ms);
}

static void state_machine_refresh_telemetry(bool read_gnss, bool read_obd) {
    /* Always sample local board voltages first (+12V supply and backup battery). */
    float supply_raw_v = adc_read_supply_voltage();
    float batt_raw_v = adc_read_battery_voltage();
    s_telemetry.battery_top = supply_raw_v * TRACKER_ADC_SUPPLY_CALIB_GAIN;
    s_telemetry.battery_bot = batt_raw_v * TRACKER_ADC_BATT_CALIB_GAIN;
    s_telemetry.vibration = s_imu_available ? imu_get_vibration_composite() : 0;

    /* Pull selected OBD PIDs when BLE OBD session is connected. */
    if (read_obd && s_ble_ctx != NULL && ble_obd_is_connected(s_ble_ctx)) {
        uint64_t now_ms = util_uptime_ms();
        static const tracker_obd_diag_query_t s_diag_queries[] = {
            {.mode = OBD_MODE_CURRENT_DATA, .pid = OBD_PID_MONITOR_STATUS},
            {.mode = OBD_MODE_STORED_DTC, .pid = -1},
            {.mode = OBD_MODE_PENDING_DTC, .pid = -1},
            {.mode = OBD_MODE_PERMANENT_DTC, .pid = -1},
        };

        if ((now_ms - s_last_obd_poll_ms) >= TRACKER_OBD_POLL_INTERVAL_MS) {
            /*
             * Keep RPM fresh every cycle for ignition inference, but rotate the
             * remaining PIDs to avoid multi-second blocking bursts.
             */
            (void)ble_obd_rxtx(s_ble_ctx, OBD_MODE_CURRENT_DATA, 0x0C, TRACKER_OBD_PID_TIMEOUT_MS);

            static const uint8_t s_aux_pids[] = {0x05, 0x2F, 0x04};
            (void)ble_obd_rxtx(s_ble_ctx, OBD_MODE_CURRENT_DATA, 0x0D, TRACKER_OBD_PID_TIMEOUT_MS);
            uint8_t aux_pid = s_aux_pids[s_obd_aux_pid_cursor % ARRAY_SIZE(s_aux_pids)];
            (void)ble_obd_rxtx(s_ble_ctx, OBD_MODE_CURRENT_DATA, aux_pid, TRACKER_OBD_PID_TIMEOUT_MS);
            s_obd_aux_pid_cursor = (uint8_t)((s_obd_aux_pid_cursor + 1U) % ARRAY_SIZE(s_aux_pids));
            s_last_obd_poll_ms = now_ms;
        }

        if ((now_ms - s_last_obd_diagnostic_poll_ms) >= TRACKER_OBD_DIAGNOSTIC_POLL_INTERVAL_MS) {
            const tracker_obd_diag_query_t *diag_query =
                &s_diag_queries[s_obd_diag_query_cursor % ARRAY_SIZE(s_diag_queries)];
            state_machine_run_obd_diagnostic_query(s_ble_ctx, diag_query);
            s_obd_diag_query_cursor =
                (uint8_t)((s_obd_diag_query_cursor + 1U) % ARRAY_SIZE(s_diag_queries));
            s_last_obd_diagnostic_poll_ms = now_ms;
        }

        if ((now_ms - s_last_obd_debug_log_ms) >= TRACKER_OBD_DEBUG_LOG_INTERVAL_MS) {
            ESP_LOGD(TAG,
                     "OBD pid-values rpm=%ld speed=%ld coolant=%ld fuel=%ld load=%ld mil=%d dtc=%u/%u/%u",
                     (long)s_telemetry.obd_rpm,
                     (long)s_telemetry.obd_speed,
                     (long)s_telemetry.obd_coolant_temp,
                     (long)s_telemetry.obd_fuel_level,
                     (long)s_telemetry.obd_engine_load,
                     s_telemetry.obd_readiness.mil_on ? 1 : 0,
                     (unsigned)s_telemetry.obd_stored_dtc.count,
                     (unsigned)s_telemetry.obd_pending_dtc.count,
                     (unsigned)s_telemetry.obd_permanent_dtc.count);
            s_last_obd_debug_log_ms = now_ms;
        }
    }

    if (read_gnss && state_machine_can_poll_gnss()) {
        uint64_t now_ms = util_uptime_ms();
        if (s_last_gnss_poll_ms != 0 &&
            (now_ms - s_last_gnss_poll_ms) < TRACKER_GNSS_POLL_INTERVAL_MS) {
            goto telemetry_finalize;
        }
        s_last_gnss_poll_ms = now_ms;

        gnss_data_t gnss = {0};
        if (modem_gnss_get_location(&gnss) == ESP_OK) {
            s_telemetry.gnss = gnss;
            s_gnss_poll_fail_streak = 0;
        } else {
            s_gnss_poll_fail_streak += 1;
            if (s_gnss_poll_fail_streak >= TRACKER_GNSS_FAIL_REARM_THRESHOLD) {
                if (state_machine_try_rearm_gnss("poll_fail_threshold")) {
                    s_gnss_poll_fail_streak = 0;
                }
            }
        }
    }

telemetry_finalize:
    if (s_telemetry.gnss.timestamp_ms == 0) {
        s_telemetry.gnss.timestamp_ms = util_uptime_ms();
    }

    /* Ignition fallback combines OBD RPM with board-side ADC voltage threshold. */
    float ignition_threshold_v = (float)s_config.ignition_adc_threshold_mv / 1000.0f;
    bool adc_ignition = s_telemetry.battery_top >= ignition_threshold_v;
    s_telemetry.ignition = s_telemetry.obd_rpm > 0 || adc_ignition;
    s_telemetry.error_code = 0;

    uint64_t now_ms = util_uptime_ms();
    bool obd_connected = s_ble_ctx != NULL && ble_obd_is_connected(s_ble_ctx);
    s_telemetry.obd_ble_connected = obd_connected;
    s_telemetry.obd_elm_ready = s_obd_elm_ready && obd_connected;
    util_copy_string(s_telemetry.obd_ecu_state,
                     sizeof(s_telemetry.obd_ecu_state),
                     obd_connected ? ble_obd_get_last_ecu_state_label(s_ble_ctx) : "disconnected");

    if (s_last_obd_sample_ms == 0 || now_ms < s_last_obd_sample_ms) {
        s_telemetry.obd_sample_age_ms = UINT32_MAX;
    } else {
        uint64_t age_ms = now_ms - s_last_obd_sample_ms;
        s_telemetry.obd_sample_age_ms = age_ms > UINT32_MAX ? UINT32_MAX : (uint32_t)age_ms;
    }

    state_machine_obd_refresh_fail_window(now_ms);
    s_telemetry.obd_connect_fail_count_5m = s_obd_fail_window_count;

    if (s_last_hw_diag_log_ms == 0 || (now_ms - s_last_hw_diag_log_ms) >= TRACKER_HW_DIAG_LOG_INTERVAL_MS) {
        UBaseType_t stack_hwm_words = uxTaskGetStackHighWaterMark(NULL);
        ESP_LOGI(TAG,
                 "HW diag supply=%.2fV batt=%.2fV ign=%d vib=%u lte=%d mqtt=%d ble=%d gnss_fix=%d stack_hwm_words=%lu",
                 s_telemetry.battery_top,
                 s_telemetry.battery_bot,
                 s_telemetry.ignition ? 1 : 0,
                 (unsigned)s_telemetry.vibration,
                 modem_lte_is_connected() ? 1 : 0,
                 tracker_mqtt_is_connected() ? 1 : 0,
                 obd_connected ? 1 : 0,
                 s_telemetry.gnss.fix_valid ? 1 : 0,
                 (unsigned long)stack_hwm_words);
        s_last_hw_diag_log_ms = now_ms;
    }
}

static bool state_machine_network_time_valid(uint64_t *out_time_ms) {
    if (!s_telemetry.gnss.fix_valid) {
        return false;
    }

    uint64_t gnss_ts = s_telemetry.gnss.timestamp_ms;
    if (!rtc_ds3231m_is_time_valid_ms(gnss_ts)) {
        return false;
    }

    if (out_time_ms != NULL) {
        *out_time_ms = gnss_ts;
    }
    return true;
}

static bool state_machine_try_get_rtc_time(uint64_t now_ms, uint64_t *out_rtc_ms) {
    if (!rtc_ds3231m_is_available()) {
        return false;
    }

    if (!retry_state_can_run(&s_rtc_read_retry, now_ms)) {
        return false;
    }

    uint64_t rtc_time_ms = 0;
    if (rtc_ds3231m_get_time_ms(&rtc_time_ms) == ESP_OK && rtc_ds3231m_is_time_valid_ms(rtc_time_ms)) {
        retry_state_reset(&s_rtc_read_retry);
        if (out_rtc_ms != NULL) {
            *out_rtc_ms = rtc_time_ms;
        }
        return true;
    }

    uint32_t delay_ms = retry_state_current_delay_ms(&s_rtc_read_retry,
                                                     &s_rtc_read_retry_policy,
                                                     now_ms);
    (void)retry_state_schedule(&s_rtc_read_retry,
                               &s_rtc_read_retry_policy,
                               now_ms,
                               ESP_FAIL);
    ESP_LOGW(TAG,
             "retry step=rtc_read err=%s attempt=%lu next_delay_ms=%lu",
             esp_err_to_name(ESP_FAIL),
             (unsigned long)s_rtc_read_retry.attempts,
             (unsigned long)delay_ms);
    return false;
}

static void state_machine_update_time_source(void) {
    uint64_t now_ms = util_uptime_ms();
    uint64_t selected_time_ms = now_ms;
    bool trusted = false;

    uint64_t network_time_ms = 0;
    if (state_machine_network_time_valid(&network_time_ms)) {
        selected_time_ms = network_time_ms;
        trusted = true;

        if (rtc_ds3231m_is_available() && (now_ms - s_last_rtc_sync_ms) >= TRACKER_RTC_SYNC_MIN_INTERVAL_MS) {
            if (rtc_ds3231m_set_time_ms(network_time_ms) == ESP_OK) {
                s_last_rtc_sync_ms = now_ms;
            }
        }
    } else {
        uint64_t rtc_time_ms = 0;
        if (state_machine_try_get_rtc_time(now_ms, &rtc_time_ms)) {
            selected_time_ms = rtc_time_ms;
            trusted = true;
        }
    }

    s_event_timestamp_ms = selected_time_ms;
    s_time_trusted = trusted;
}

/**
 * @brief Format and publish rawdata payload.
 */
static void state_machine_publish_rawdata(void) {
    state_machine_update_time_source();

    char message_id[TRACKER_METADATA_MESSAGE_ID_LEN] = {0};
    state_machine_fill_message_id(message_id, sizeof(message_id));
    uint32_t seq_no = state_machine_next_seq_no();

    ESP_LOGD(TAG,
             "mqtt rawdata metadata mid=%s seq=%lu boot=%s ts=%llu",
             message_id,
             (unsigned long)seq_no,
             s_boot_id,
             (unsigned long long)s_event_timestamp_ms);

    char *payload = data_format_rawdata(&s_config,
                                        &s_telemetry,
                                        true,
                                        s_time_trusted,
                                        s_event_timestamp_ms,
                                        message_id,
                                        seq_no,
                                        s_boot_id);
    if (payload == NULL) {
        return;
    }

    if (tracker_mqtt_is_connected()) {
        esp_err_t live_err = tracker_mqtt_publish_rawdata(payload);
        if (live_err == ESP_OK) {
            cJSON_free(payload);
            s_last_raw_publish_ms = util_uptime_ms();
            return;
        }

        ESP_LOGW(TAG,
                 "mqtt rawdata live publish failed err=%s fallback=offline_queue",
                 esp_err_to_name(live_err));
    }

    (void)offline_queue_enqueue(OFFLINE_RECORD_RAWDATA,
                                payload,
                                s_telemetry.gnss.fix_valid,
                                tracker_mqtt_is_connected(),
                                s_time_trusted,
                                s_event_timestamp_ms);
    cJSON_free(payload);
    s_last_raw_publish_ms = util_uptime_ms();
}

/**
 * @brief Format and publish status payload.
 *
 * @param status Status string.
 */
static void state_machine_publish_status(const char *status) {
    state_machine_update_time_source();

    char message_id[TRACKER_METADATA_MESSAGE_ID_LEN] = {0};
    state_machine_fill_message_id(message_id, sizeof(message_id));
    uint32_t seq_no = state_machine_next_seq_no();

    ESP_LOGI(TAG,
             "mqtt status=%s metadata mid=%s seq=%lu boot=%s ts=%llu",
             status,
             message_id,
             (unsigned long)seq_no,
             s_boot_id,
             (unsigned long long)s_event_timestamp_ms);

    char *payload = data_format_status(&s_config,
                                       status,
                                       s_session_id,
                                       true,
                                       s_time_trusted,
                                       s_event_timestamp_ms,
                                       message_id,
                                       seq_no,
                                       s_boot_id);
    if (payload == NULL) {
        return;
    }

    if (tracker_mqtt_is_connected()) {
        esp_err_t live_err = tracker_mqtt_publish_status(payload);
        if (live_err == ESP_OK) {
            cJSON_free(payload);
            return;
        }

        ESP_LOGW(TAG,
                 "mqtt status live publish failed status=%s err=%s fallback=offline_queue",
                 status,
                 esp_err_to_name(live_err));
    }

    (void)offline_queue_enqueue(OFFLINE_RECORD_STATUS,
                                payload,
                                s_telemetry.gnss.fix_valid,
                                tracker_mqtt_is_connected(),
                                s_time_trusted,
                                s_event_timestamp_ms);
    cJSON_free(payload);
}

/**
 * @brief Format and publish event payload.
 */
static void state_machine_publish_event(const char *event_type, int code, const char *message) {
    state_machine_update_time_source();

    char message_id[TRACKER_METADATA_MESSAGE_ID_LEN] = {0};
    state_machine_fill_message_id(message_id, sizeof(message_id));
    uint32_t seq_no = state_machine_next_seq_no();

    ESP_LOGI(TAG,
             "mqtt event=%s code=%d metadata mid=%s seq=%lu boot=%s ts=%llu",
             event_type,
             code,
             message_id,
             (unsigned long)seq_no,
             s_boot_id,
             (unsigned long long)s_event_timestamp_ms);

    char *payload = data_format_event(&s_config,
                                      event_type,
                                      code,
                                      message,
                                      true,
                                      s_time_trusted,
                                      s_event_timestamp_ms,
                                      message_id,
                                      seq_no,
                                      s_boot_id);
    if (payload == NULL) {
        return;
    }

    if (tracker_mqtt_is_connected()) {
        esp_err_t live_err = tracker_mqtt_publish_event(payload);
        if (live_err == ESP_OK) {
            cJSON_free(payload);
            return;
        }

        ESP_LOGW(TAG,
                 "mqtt event live publish failed event=%s code=%d err=%s fallback=offline_queue",
                 event_type,
                 code,
                 esp_err_to_name(live_err));
    }

    (void)offline_queue_enqueue(OFFLINE_RECORD_EVENT,
                                payload,
                                s_telemetry.gnss.fix_valid,
                                tracker_mqtt_is_connected(),
                                s_time_trusted,
                                s_event_timestamp_ms);
    cJSON_free(payload);
}

static void state_machine_defer_firmware_report(const firmware_status_t *firmware) {
    if (firmware == NULL) {
        return;
    }

    s_deferred_firmware_report = *firmware;
    s_deferred_firmware_report_pending = true;
    ESP_LOGI(TAG,
             "defer firmware status=%s progress=%u job=%s until mqtt connected",
             firmware->status,
             (unsigned)firmware->progress,
             firmware->job_id);
}

/**
 * @brief Publish firmware payload object to firmware topic.
 *
 * @param firmware Firmware status object.
 */
static void state_machine_publish_firmware_payload(const firmware_status_t *firmware) {
    if (firmware == NULL) {
        return;
    }

    state_machine_update_time_source();

    char message_id[TRACKER_METADATA_MESSAGE_ID_LEN] = {0};
    state_machine_fill_message_id(message_id, sizeof(message_id));
    uint32_t seq_no = state_machine_next_seq_no();

    ESP_LOGI(TAG,
             "mqtt firmware status=%s progress=%u metadata mid=%s seq=%lu boot=%s ts=%llu",
             firmware->status,
             (unsigned)firmware->progress,
             message_id,
             (unsigned long)seq_no,
             s_boot_id,
             (unsigned long long)s_event_timestamp_ms);

    char *payload = data_format_firmware(&s_config,
                                         firmware,
                                         true,
                                         s_time_trusted,
                                         s_event_timestamp_ms,
                                         message_id,
                                         seq_no,
                                         s_boot_id);
    if (payload == NULL) {
        return;
    }

    if (tracker_mqtt_is_connected()) {
        esp_err_t live_err = tracker_mqtt_publish_firmware(payload);
        if (live_err == ESP_OK) {
            cJSON_free(payload);
            return;
        }

        ESP_LOGW(TAG,
                 "mqtt firmware live publish failed err=%s fallback=offline_queue",
                 esp_err_to_name(live_err));
    }

    (void)offline_queue_enqueue(OFFLINE_RECORD_FIRMWARE,
                                payload,
                                s_telemetry.gnss.fix_valid,
                                tracker_mqtt_is_connected(),
                                s_time_trusted,
                                s_event_timestamp_ms);
    cJSON_free(payload);
}

static void state_machine_try_flush_deferred_firmware_report(void) {
    if (!s_deferred_firmware_report_pending || !tracker_mqtt_is_connected() || s_ota_in_progress) {
        return;
    }

    state_machine_publish_firmware_payload(&s_deferred_firmware_report);
    s_deferred_firmware_report_pending = false;
}

static void state_machine_persist_ota_context(void) {
    ota_persist_context_t persisted = {0};
    persisted.pending_confirm = g_rtc_context.ota_pending_confirm;
    persisted.confirm_timeout_sec = g_rtc_context.ota_confirm_timeout_sec;
    persisted.confirm_deadline_ms = g_rtc_context.ota_confirm_deadline_ms;
    util_copy_string(persisted.job_id, sizeof(persisted.job_id), g_rtc_context.ota_job_id);
    util_copy_string(persisted.target_version,
                     sizeof(persisted.target_version),
                     g_rtc_context.ota_target_version);
    util_copy_string(persisted.previous_version,
                     sizeof(persisted.previous_version),
                     g_rtc_context.ota_previous_version);
    util_copy_string(persisted.partition, sizeof(persisted.partition), g_rtc_context.ota_partition);

    esp_err_t err = nvs_config_save_ota_context(&persisted);
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "persist ota context failed: %s", esp_err_to_name(err));
    }
}

static void state_machine_clear_persisted_ota_context(void) {
    esp_err_t err = nvs_config_clear_ota_context();
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "clear ota context failed: %s", esp_err_to_name(err));
    }
}

static void state_machine_restore_ota_context_from_nvs(void) {
    if (g_rtc_context.ota_pending_confirm) {
        return;
    }

    ota_persist_context_t persisted = {0};
    bool found = false;
    esp_err_t err = nvs_config_load_ota_context(&persisted, &found);
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "load ota context failed: %s", esp_err_to_name(err));
        return;
    }
    if (!found) {
        return;
    }
    if (!persisted.pending_confirm || util_string_empty(persisted.job_id) ||
        util_string_empty(persisted.target_version)) {
        state_machine_clear_persisted_ota_context();
        return;
    }

    g_rtc_context.ota_pending_confirm = true;
    g_rtc_context.ota_confirm_timeout_sec = persisted.confirm_timeout_sec;
    g_rtc_context.ota_confirm_deadline_ms = persisted.confirm_deadline_ms;
    util_copy_string(g_rtc_context.ota_job_id, sizeof(g_rtc_context.ota_job_id), persisted.job_id);
    util_copy_string(g_rtc_context.ota_target_version,
                     sizeof(g_rtc_context.ota_target_version),
                     persisted.target_version);
    util_copy_string(g_rtc_context.ota_previous_version,
                     sizeof(g_rtc_context.ota_previous_version),
                     persisted.previous_version);
    util_copy_string(g_rtc_context.ota_partition,
                     sizeof(g_rtc_context.ota_partition),
                     persisted.partition);

    ESP_LOGI(TAG,
             "restored ota context from nvs job=%s target=%s pending=%d",
             g_rtc_context.ota_job_id,
             g_rtc_context.ota_target_version,
             g_rtc_context.ota_pending_confirm ? 1 : 0);
}

static void state_machine_obd_refresh_fail_window(uint64_t now_ms) {
    if (s_obd_fail_window_started_ms == 0 ||
        now_ms < s_obd_fail_window_started_ms ||
        (now_ms - s_obd_fail_window_started_ms) >= TRACKER_OBD_FAIL_WINDOW_MS) {
        s_obd_fail_window_started_ms = now_ms;
        s_obd_fail_window_count = 0;
    }
}

static void state_machine_obd_record_connect_failure(uint64_t now_ms) {
    state_machine_obd_refresh_fail_window(now_ms);
    s_obd_fail_window_count += 1U;
}

static void state_machine_publish_obd_failure_event_if_needed(uint64_t now_ms,
                                                              int code,
                                                              const char *message) {
    state_machine_obd_record_connect_failure(now_ms);

    bool is_new_error_type = !s_obd_fail_alert_emitted || (s_last_obd_fail_alert_code != code);
    bool cooldown_elapsed = (now_ms - s_last_obd_fail_alert_ms) >= TRACKER_OBD_FAIL_ALERT_COOLDOWN_MS;

    if (is_new_error_type || cooldown_elapsed) {
        state_machine_publish_event("warning", code, message);
        s_obd_fail_alert_emitted = true;
        s_last_obd_fail_alert_code = code;
        s_last_obd_fail_alert_ms = now_ms;
    }
}

/**
 * @brief Build canonical firmware status struct from OTA state inputs.
 */
static void state_machine_fill_firmware_status(firmware_status_t *firmware,
                                               const char *status,
                                               uint8_t progress,
                                               const char *version,
                                               const char *job_id,
                                               const char *partition,
                                               const char *error) {
    if (firmware == NULL) {
        return;
    }

    memset(firmware, 0, sizeof(*firmware));
    util_copy_string(firmware->status, sizeof(firmware->status), status);
    firmware->progress = progress;
    util_copy_string(firmware->job_id, sizeof(firmware->job_id), job_id);
    util_copy_string(firmware->target_version, sizeof(firmware->target_version), version);
    util_copy_string(firmware->current_version, sizeof(firmware->current_version), s_current_version);
    if (!util_string_empty(partition)) {
        util_copy_string(firmware->partition, sizeof(firmware->partition), partition);
    }
    if (!util_string_empty(error)) {
        util_copy_string(firmware->error, sizeof(firmware->error), error);
    }
}

/**
 * @brief Build firmware status payload fields then publish.
 */
static void state_machine_publish_firmware_status(const char *status,
                                                  uint8_t progress,
                                                  const char *version,
                                                  const char *job_id,
                                                  const char *partition,
                                                  const char *error) {
    firmware_status_t firmware = {0};
    state_machine_fill_firmware_status(&firmware, status, progress, version, job_id, partition, error);
    state_machine_publish_firmware_payload(&firmware);
}

static void state_machine_stage_firmware_status_for_online_publish(const char *status,
                                                                   uint8_t progress,
                                                                   const char *version,
                                                                   const char *job_id,
                                                                   const char *partition,
                                                                   const char *error) {
    firmware_status_t firmware = {0};
    state_machine_fill_firmware_status(&firmware, status, progress, version, job_id, partition, error);
    state_machine_defer_firmware_report(&firmware);
}

/**
 * @brief Publish firmware status immediately when online, otherwise defer once.
 *
 * Keeping this policy in one place avoids duplicated connected/offline branching
 * across OTA confirm and rollback paths.
 */
static void state_machine_publish_or_stage_firmware_status(const char *status,
                                                           uint8_t progress,
                                                           const char *version,
                                                           const char *job_id,
                                                           const char *partition,
                                                           const char *error) {
    if (tracker_mqtt_is_connected()) {
        state_machine_publish_firmware_status(status, progress, version, job_id, partition, error);
        return;
    }

    state_machine_stage_firmware_status_for_online_publish(status,
                                                           progress,
                                                           version,
                                                           job_id,
                                                           partition,
                                                           error);
}

static void state_machine_ota_status_callback(const firmware_status_t *firmware, void *user_ctx) {
    (void)user_ctx;
    state_machine_publish_firmware_payload(firmware);
}

/**
 * @brief Attempt BLE OBD connection with retry and ELM327 initialization.
 */
static const retry_policy_t *state_machine_current_ble_retry_policy(void) {
    return s_telemetry.ignition ? &s_ble_retry_policy : &s_ble_retry_parked_policy;
}

static void state_machine_schedule_ble_retry(uint64_t now_ms, const char *reason, const retry_policy_t *policy) {
    const retry_policy_t *active_policy = policy != NULL ? policy : &s_ble_retry_policy;
    uint32_t delay_ms = retry_state_current_delay_ms(&s_ble_retry, active_policy, now_ms);
    esp_err_t sched_err = retry_state_schedule(&s_ble_retry, active_policy, now_ms, ESP_FAIL);
    if (sched_err != ESP_OK) {
        return;
    }

    if ((s_ble_retry.attempts % 10U) == 1U) {
        ESP_LOGE(TAG,
                 "retry step=%s err=%s attempt=%lu next_delay_ms=%lu",
                 reason,
                 esp_err_to_name(ESP_FAIL),
                 (unsigned long)s_ble_retry.attempts,
                 (unsigned long)delay_ms);
    }
}

static bool state_machine_prime_obd_after_connect(ble_obd_ctx_t *ctx) {
    if (ctx == NULL) {
        return false;
    }

    static const uint8_t s_prime_pids[] = {0x00, 0x0D, 0x0C, 0x05};
    uint64_t sample_before_ms = s_last_obd_sample_ms;

    for (size_t attempt = 0; attempt < 3U; ++attempt) {
        for (size_t i = 0; i < ARRAY_SIZE(s_prime_pids); ++i) {
            uint8_t pid = s_prime_pids[i];
            if (ble_obd_rxtx(ctx, OBD_MODE_CURRENT_DATA, pid, TRACKER_OBD_PID_TIMEOUT_MS) == 0 &&
                s_last_obd_sample_ms != 0 &&
                s_last_obd_sample_ms != sample_before_ms) {
                ESP_LOGI(TAG, "OBD prime sample ready pid=0x%02X", pid);
                return true;
            }
            vTaskDelay(pdMS_TO_TICKS(75));
        }
    }

    ESP_LOGW(TAG,
             "OBD prime finished without fresh PID sample after connect state=%s",
             ble_obd_get_last_ecu_state_label(ctx));
    return false;
}

static void state_machine_run_obd_diagnostic_query(ble_obd_ctx_t *ctx, const tracker_obd_diag_query_t *query) {
    if (ctx == NULL || query == NULL) {
        return;
    }

    int rc = query->pid >= 0
                 ? ble_obd_rxtx(ctx, query->mode, (uint8_t)query->pid, TRACKER_OBD_PID_TIMEOUT_MS)
                 : ble_obd_request_mode(ctx, query->mode, TRACKER_OBD_PID_TIMEOUT_MS);
    if (rc == 0) {
        return;
    }

    const char *ecu_state = ble_obd_get_last_ecu_state_label(ctx);
    bool no_data = strcmp(ecu_state, "no_data") == 0;
    if (no_data) {
        state_machine_clear_obd_diagnostic_query(query->mode, query->pid);
    }

    ESP_LOGW(TAG,
             "OBD diagnostic query failed mode=0x%02X pid=%d state=%s clear=%d",
             (unsigned)query->mode,
             query->pid,
             ecu_state,
             no_data ? 1 : 0);
}

static void state_machine_prime_obd_diagnostics_after_connect(ble_obd_ctx_t *ctx) {
    static const tracker_obd_diag_query_t s_diag_queries[] = {
        {.mode = OBD_MODE_CURRENT_DATA, .pid = OBD_PID_MONITOR_STATUS},
        {.mode = OBD_MODE_STORED_DTC, .pid = -1},
        {.mode = OBD_MODE_PENDING_DTC, .pid = -1},
        {.mode = OBD_MODE_PERMANENT_DTC, .pid = -1},
    };

    if (ctx == NULL) {
        return;
    }

    for (size_t i = 0; i < ARRAY_SIZE(s_diag_queries); ++i) {
        state_machine_run_obd_diagnostic_query(ctx, &s_diag_queries[i]);
        vTaskDelay(pdMS_TO_TICKS(75));
    }
}

static void state_machine_ble_connect_task(void *arg) {
    tracker_ble_connect_task_args_t *task_args = (tracker_ble_connect_task_args_t *)arg;
    tracker_ble_connect_result_t result = {
        .ctx = NULL,
        .code = TRACKER_BLE_CONNECT_RESULT_CONNECT_FAILED,
        .started_ms = task_args != NULL ? task_args->started_ms : util_uptime_ms(),
        .prime_sample_ready = false,
    };

    if (task_args != NULL) {
        bool use_preferred_mac = !util_string_empty(task_args->preferred_mac) &&
                                 ble_obd_set_preferred_address(task_args->preferred_mac) == ESP_OK;
        if (!use_preferred_mac) {
            ble_obd_set_preferred_address("");
        }

        ble_obd_ctx_t *ctx = ble_obd_connect(state_machine_obd_response_cb, NULL, TRACKER_BLE_CONNECT_TIMEOUT_MS);
        if (ctx != NULL) {
            if (ble_obd_elm327_init(ctx) == ESP_OK) {
                result.prime_sample_ready = state_machine_prime_obd_after_connect(ctx);
                state_machine_prime_obd_diagnostics_after_connect(ctx);
                result.ctx = ctx;
                result.code = TRACKER_BLE_CONNECT_RESULT_OK;
            } else {
                result.code = TRACKER_BLE_CONNECT_RESULT_ELM327_INIT_FAILED;
                ble_obd_disconnect(ctx);
            }
        }

        free(task_args);
    }

    if (s_ble_connect_result_queue != NULL) {
        (void)xQueueOverwrite(s_ble_connect_result_queue, &result);
    }

    vTaskDelete(NULL);
}

static bool state_machine_handle_ble_connect_result(void) {
    if (s_ble_connect_result_queue == NULL) {
        return false;
    }

    bool handled = false;
    tracker_ble_connect_result_t result = {0};
    while (xQueueReceive(s_ble_connect_result_queue, &result, 0) == pdTRUE) {
        handled = true;
        s_ble_connect_inflight = false;
        s_ble_connect_started_ms = 0;

        if (result.code == TRACKER_BLE_CONNECT_RESULT_OK && result.ctx != NULL) {
            if (s_ble_ctx != NULL && s_ble_ctx != result.ctx) {
                ble_obd_disconnect(s_ble_ctx);
            }
            s_ble_ctx = result.ctx;
            s_obd_elm_ready = true;
            s_last_obd_poll_ms = 0;
            s_last_obd_diagnostic_poll_ms = 0;
            s_obd_aux_pid_cursor = 0;
            s_obd_diag_query_cursor = 0;
            s_obd_fail_alert_emitted = false;
            s_last_obd_fail_alert_code = 0;
            s_last_obd_fail_alert_ms = 0;
            retry_state_reset(&s_ble_retry);
            ESP_LOGI(TAG,
                     "BLE OBD connected + ELM327 ready duration_ms=%llu",
                     (unsigned long long)(util_uptime_ms() - result.started_ms));
            if (!result.prime_sample_ready) {
                ESP_LOGW(TAG,
                         "BLE OBD connected but ECU has not returned a fresh PID sample yet");
            }
            continue;
        }

        s_obd_elm_ready = false;
        s_ble_ctx = NULL;
        s_last_obd_sample_ms = 0;
        s_last_obd_diagnostic_poll_ms = 0;
        s_obd_diag_query_cursor = 0;
        util_copy_string(s_telemetry.obd_ecu_state, sizeof(s_telemetry.obd_ecu_state), "disconnected");
        uint64_t now_ms = util_uptime_ms();
        int event_code = result.code == TRACKER_BLE_CONNECT_RESULT_ELM327_INIT_FAILED
                             ? TRACKER_EVENT_CODE_OBD_ELM327_INIT_FAILED
                             : TRACKER_EVENT_CODE_OBD_CONNECT_FAILED;
        const char *event_reason = result.code == TRACKER_BLE_CONNECT_RESULT_ELM327_INIT_FAILED
                                       ? "obd_elm327_init_failed"
                                       : "obd_connect_failed";
        state_machine_publish_obd_failure_event_if_needed(now_ms, event_code, event_reason);
        state_machine_schedule_ble_retry(now_ms,
                                         "connect_or_ble_stack_or_elm327_init_failed",
                                         state_machine_current_ble_retry_policy());
    }

    return handled;
}

static void state_machine_try_connect_ble(void) {
    (void)state_machine_handle_ble_connect_result();
    if (s_ota_in_progress || g_rtc_context.ota_pending_confirm) {
        return;
    }

    if (s_ble_ctx != NULL && ble_obd_is_connected(s_ble_ctx)) {
        return;
    }
    if (s_ble_connect_inflight) {
        return;
    }

    uint64_t now_ms = util_uptime_ms();
    const retry_policy_t *ble_retry_policy = state_machine_current_ble_retry_policy();

    if (s_telemetry.ignition && !s_ble_retry_last_ignition) {
        /*
         * Moving from parked to driving should trigger an immediate retry window
         * instead of waiting on parked-mode backoff state.
         */
        retry_state_reset(&s_ble_retry);
    }
    s_ble_retry_last_ignition = s_telemetry.ignition;

    if (!retry_state_can_run(&s_ble_retry, now_ms)) {
        return;
    }
    if ((s_ble_retry.attempts % 5U) == 0U) {
        const char *mode = s_telemetry.ignition ? "driving" : "parked";
        ESP_LOGI(TAG,
                 "BLE connect attempt=%lu mode=%s timeout_ms=%u",
                 (unsigned long)(s_ble_retry.attempts + 1U),
                 mode,
                 (unsigned int)TRACKER_BLE_CONNECT_TIMEOUT_MS);
    }

    if (s_ble_ctx != NULL) {
        ble_obd_disconnect(s_ble_ctx);
        s_ble_ctx = NULL;
        s_obd_elm_ready = false;
        s_last_obd_sample_ms = 0;
    }

    bool has_preferred_mac = !util_string_empty(s_config.obd2_ble_address);
    if (!has_preferred_mac) {
        if ((s_ble_retry.attempts % 10U) == 0U) {
            ESP_LOGW(TAG, "BLE connect mode: auto-discover (preferred MAC missing/invalid)");
        }
    } else if ((s_ble_retry.attempts % 10U) == 0U) {
        ESP_LOGI(TAG, "BLE connect mode: preferred-mac (%s)", s_config.obd2_ble_address);
    }

    tracker_ble_connect_task_args_t *task_args = calloc(1, sizeof(*task_args));
    if (task_args == NULL) {
        s_obd_elm_ready = false;
        state_machine_publish_obd_failure_event_if_needed(
            now_ms,
            TRACKER_EVENT_CODE_OBD_CONNECT_FAILED,
            "obd_connect_failed");
        state_machine_schedule_ble_retry(now_ms,
                                         "connect_or_ble_stack_or_elm327_init_failed",
                                         ble_retry_policy);
        return;
    }

    task_args->started_ms = now_ms;
    util_copy_string(task_args->preferred_mac, sizeof(task_args->preferred_mac), s_config.obd2_ble_address);
    if (xTaskCreate(state_machine_ble_connect_task,
                    "ble_obd_conn",
                    TRACKER_BLE_CONNECT_TASK_STACK_BYTES,
                    task_args,
                    5,
                    NULL) != pdPASS) {
        free(task_args);
        s_obd_elm_ready = false;
        state_machine_publish_obd_failure_event_if_needed(
            now_ms,
            TRACKER_EVENT_CODE_OBD_CONNECT_FAILED,
            "obd_connect_failed");
        state_machine_schedule_ble_retry(now_ms,
                                         "connect_or_ble_stack_or_elm327_init_failed",
                                         ble_retry_policy);
        return;
    }

    s_ble_connect_inflight = true;
    s_ble_connect_started_ms = now_ms;
}

/**
 * @brief Bring up LTE/GNSS/MQTT network stack.
 */
static void state_machine_schedule_network_retry(uint64_t now_ms, const char *step, esp_err_t err) {
    uint32_t delay_ms = retry_state_current_delay_ms(&s_network_retry, &s_network_retry_policy, now_ms);
    esp_err_t sched_err = retry_state_schedule(&s_network_retry, &s_network_retry_policy, now_ms, err);
    if (sched_err != ESP_OK) {
        return;
    }

    ESP_LOGE(TAG,
             "retry step=%s err=%s attempt=%lu next_delay_ms=%lu",
             step,
             esp_err_to_name(err),
             (unsigned long)s_network_retry.attempts,
             (unsigned long)delay_ms);
}

static void state_machine_try_connect_network(void) {
    uint64_t now_ms = util_uptime_ms();
    if (!retry_state_can_run(&s_network_retry, now_ms)) {
        return;
    }

    modem_lte_request_connect();
    esp_err_t err = modem_lte_tick(now_ms);
    bool lte_now_initialized = modem_lte_is_initialized();
    if (err == ESP_ERR_NOT_FINISHED) {
        return;
    }
    if (err != ESP_OK) {
        s_prev_lte_initialized = false;
        state_machine_schedule_network_retry(now_ms, "modem_lte_tick", err);
        return;
    }

    if (lte_now_initialized) {
        state_machine_try_start_gnss_nonblocking();
    }

#if !TRACKER_MQTT_RUNTIME_DISABLED
    if (lte_now_initialized && (!s_mqtt_started || !tracker_mqtt_is_connected())) {
        /* Reconnect MQTT when link drops; AT backend does not use ESP-MQTT auto-reconnect. */
        err = tracker_mqtt_connect();
        if (err != ESP_OK) {
            state_machine_schedule_network_retry(now_ms, "tracker_mqtt_connect", err);
            return;
        }
        s_mqtt_started = true;
    }
#endif

    retry_state_reset(&s_network_retry);

    if (lte_now_initialized && !s_prev_lte_initialized) {
        if (s_lte_ever_initialized) {
            (void)state_machine_try_reassert_gnss_power("lte_recovered");
        }
        s_lte_ever_initialized = true;
    }
    s_prev_lte_initialized = lte_now_initialized;

#if !TRACKER_MQTT_RUNTIME_DISABLED
    if (s_config.command_subscribe_enabled && tracker_mqtt_is_connected()) {
        err = tracker_mqtt_subscribe_commands();
        if (err != ESP_OK) {
            state_machine_schedule_network_retry(now_ms, "tracker_mqtt_subscribe_commands", err);
            return;
        }
    }
#endif

    state_machine_try_flush_deferred_firmware_report();
    retry_state_reset(&s_network_retry);
}

static void state_machine_run_wake_prelude(bool allow_replay) {
    state_machine_handle_pending_action();
    bool ble_result_handled = state_machine_handle_ble_connect_result();
    state_machine_try_connect_network();
    state_machine_try_connect_ble();
    state_machine_bootstrap_rtc();
    state_machine_bootstrap_imu();
    state_machine_refresh_telemetry(true, true);
    ble_result_handled = state_machine_handle_ble_connect_result() || ble_result_handled;
    if (ble_result_handled && s_ble_ctx != NULL && ble_obd_is_connected(s_ble_ctx)) {
        state_machine_refresh_telemetry(true, true);
    }
    state_machine_handle_pending_action();
    offline_queue_set_online(tracker_mqtt_is_connected());
    if (allow_replay) {
        offline_queue_replay_tick();
    }
}

/**
 * @brief Confirm newly booted OTA image if pending confirmation flag is set.
 */
static void state_machine_try_confirm_running_firmware(void) {
    if (s_ota_confirm_checked) {
        return;
    }

    s_ota_confirm_checked = true;
    const esp_partition_t *running = esp_ota_get_running_partition();
    if (running != NULL && !util_string_empty(running->label)) {
        util_copy_string(g_rtc_context.ota_partition,
                         sizeof(g_rtc_context.ota_partition),
                         running->label);
    }

    if (!g_rtc_context.ota_pending_confirm) {
        return;
    }

    state_machine_update_time_source();
    if (g_rtc_context.ota_confirm_deadline_ms > 0 &&
        s_time_trusted &&
        s_event_timestamp_ms > g_rtc_context.ota_confirm_deadline_ms) {
        g_rtc_context.ota_pending_confirm = false;
        g_rtc_context.ota_confirm_deadline_ms = 0;
        state_machine_clear_persisted_ota_context();
        state_machine_publish_or_stage_firmware_status(TRACKER_OTA_STATUS_FAILED,
                                                       TRACKER_OTA_PROGRESS_DONE,
                                                       g_rtc_context.ota_target_version,
                                                       g_rtc_context.ota_job_id,
                                                       g_rtc_context.ota_partition,
                                                       TRACKER_OTA_ERROR_CONFIRM_TIMEOUT_EXCEEDED);
        esp_restart();
        return;
    }

    state_machine_publish_or_stage_firmware_status(TRACKER_OTA_STATUS_CONFIRMING,
                                                   TRACKER_OTA_PROGRESS_CONFIRMING,
                                                   g_rtc_context.ota_target_version,
                                                   g_rtc_context.ota_job_id,
                                                   g_rtc_context.ota_partition,
                                                   "");

    /* Mark image valid to prevent automatic rollback on next boot. */
    if (esp_ota_mark_app_valid_cancel_rollback() == ESP_OK) {
        g_rtc_context.ota_pending_confirm = false;
        g_rtc_context.ota_confirm_deadline_ms = 0;
        util_copy_string(s_current_version, sizeof(s_current_version), g_rtc_context.ota_target_version);
        state_machine_clear_persisted_ota_context();
        state_machine_publish_or_stage_firmware_status(TRACKER_OTA_STATUS_SUCCESS,
                                                       TRACKER_OTA_PROGRESS_DONE,
                                                       g_rtc_context.ota_target_version,
                                                       g_rtc_context.ota_job_id,
                                                       g_rtc_context.ota_partition,
                                                       "");
    } else {
        g_rtc_context.ota_pending_confirm = false;
        g_rtc_context.ota_confirm_deadline_ms = 0;
        state_machine_clear_persisted_ota_context();
        state_machine_publish_or_stage_firmware_status(TRACKER_OTA_STATUS_FAILED,
                                                       TRACKER_OTA_PROGRESS_DONE,
                                                       g_rtc_context.ota_target_version,
                                                       g_rtc_context.ota_job_id,
                                                       g_rtc_context.ota_partition,
                                                       TRACKER_OTA_ERROR_CONFIRM_FAILED);
    }
}

/**
 * @brief Process OTA update/rollback actions consumed from command handler.
 *
 * @param action Pending command action.
 */
static void state_machine_process_ota_command(command_action_t action) {
    if (action != COMMAND_ACTION_OTA_UPDATE && action != COMMAND_ACTION_OTA_ROLLBACK) {
        return;
    }

    ota_command_t cmd = {0};
    if (!command_handler_take_ota_command(&cmd)) {
        return;
    }

    if (action == COMMAND_ACTION_OTA_ROLLBACK || cmd.rollback_pending) {
        /* Manual rollback flow. */
        firmware_status_t rollback = {0};
        util_copy_string(rollback.job_id, sizeof(rollback.job_id), g_rtc_context.ota_job_id);
        util_copy_string(rollback.target_version, sizeof(rollback.target_version), g_rtc_context.ota_previous_version);
        util_copy_string(rollback.current_version, sizeof(rollback.current_version), s_current_version);

        if (util_ota_trigger_manual_rollback(&rollback) == ESP_OK) {
            g_rtc_context.ota_pending_confirm = false;
            g_rtc_context.ota_confirm_deadline_ms = 0;
            state_machine_clear_persisted_ota_context();
            state_machine_publish_firmware_payload(&rollback);
            esp_restart();
        } else {
            g_rtc_context.ota_confirm_deadline_ms = 0;
            state_machine_publish_firmware_status(TRACKER_OTA_STATUS_FAILED,
                                                  TRACKER_OTA_PROGRESS_DONE,
                                                  g_rtc_context.ota_previous_version,
                                                  g_rtc_context.ota_job_id,
                                                  g_rtc_context.ota_partition,
                                                  TRACKER_OTA_ERROR_MANUAL_ROLLBACK_FAILED);
        }
        return;
    }

    firmware_status_t report = {0};
    util_copy_string(report.job_id, sizeof(report.job_id), cmd.job_id);
    util_copy_string(report.target_version, sizeof(report.target_version), cmd.version);
    util_copy_string(report.current_version, sizeof(report.current_version), s_current_version);

    /* OTA update flow. */
    state_machine_publish_firmware_status(TRACKER_OTA_STATUS_ASSIGNED,
                                          TRACKER_OTA_PROGRESS_ASSIGNED,
                                          cmd.version,
                                          cmd.job_id,
                                          "",
                                          "");

    if (!state_machine_ota_start_is_safe()) {
        state_machine_publish_firmware_status(TRACKER_OTA_STATUS_FAILED,
                                              TRACKER_OTA_PROGRESS_ASSIGNED,
                                              cmd.version,
                                              cmd.job_id,
                                              "",
                                              TRACKER_OTA_ERROR_UNSAFE_RUNTIME_WINDOW);
        return;
    }

    s_ota_in_progress = true;
    if (util_ota_apply_update(&s_config,
                              s_current_version,
                              &cmd,
                              &report,
                              state_machine_ota_status_callback,
                              NULL) == ESP_OK) {
        /* Persist OTA context across reboot in RTC memory for post-boot confirm. */
        util_copy_string(g_rtc_context.ota_job_id, sizeof(g_rtc_context.ota_job_id), cmd.job_id);
        util_copy_string(g_rtc_context.ota_target_version,
                         sizeof(g_rtc_context.ota_target_version),
                         cmd.version);
        util_copy_string(g_rtc_context.ota_previous_version,
                         sizeof(g_rtc_context.ota_previous_version),
                         s_current_version);
        util_copy_string(g_rtc_context.ota_partition,
                         sizeof(g_rtc_context.ota_partition),
                         report.partition);
        g_rtc_context.ota_pending_confirm = true;
        g_rtc_context.ota_confirm_timeout_sec = cmd.confirm_timeout_sec;
        state_machine_update_time_source();
        if (s_time_trusted) {
            g_rtc_context.ota_confirm_deadline_ms =
                s_event_timestamp_ms + ((uint64_t)cmd.confirm_timeout_sec * 1000ULL);
        } else {
            g_rtc_context.ota_confirm_deadline_ms = 0;
        }
        state_machine_persist_ota_context();
        esp_restart();
    } else {
        g_rtc_context.ota_confirm_deadline_ms = 0;
        s_ota_in_progress = false;
    }
}

/**
 * @brief Power down peripherals before entering any parked sleep mode.
 */
static void state_machine_shutdown_for_sleep(void) {
    /* Snapshot context into RTC memory before shutdown. */
    g_rtc_context.last_state = APP_STATE_SLEEP;
    g_rtc_context.ign_last_known = s_telemetry.ignition;
    g_rtc_context.last_battery_v = s_telemetry.battery_top;
    g_rtc_context.last_heartbeat_ts = (uint32_t)(util_uptime_ms() / 1000ULL);

    if (s_ble_ctx != NULL) {
        ble_obd_disconnect(s_ble_ctx);
        s_ble_ctx = NULL;
        s_obd_elm_ready = false;
    }

    esp_err_t ble_stack_err = ble_stack_deinit();
    if (ble_stack_err != ESP_OK) {
        ESP_LOGW(TAG, "BLE stack deinit before sleep failed: %s", esp_err_to_name(ble_stack_err));
    }

    if (s_gnss_started) {
        esp_err_t gnss_off_err = modem_gnss_power_off();
        if (gnss_off_err != ESP_OK) {
            ESP_LOGW(TAG, "GNSS power-off before sleep failed: %s", esp_err_to_name(gnss_off_err));
        }
    }
    s_gnss_started = false;
    state_machine_clear_gnss_cache();

#if !TRACKER_MQTT_RUNTIME_DISABLED
    esp_err_t mqtt_disconnect_err = tracker_mqtt_disconnect();
    if (mqtt_disconnect_err != ESP_OK) {
        ESP_LOGW(TAG, "MQTT disconnect before sleep failed: %s", esp_err_to_name(mqtt_disconnect_err));
    }
    s_mqtt_started = false;
#endif

    esp_err_t lte_disconnect_err = modem_lte_disconnect();
    if (lte_disconnect_err != ESP_OK) {
        ESP_LOGW(TAG, "LTE disconnect before sleep failed: %s", esp_err_to_name(lte_disconnect_err));
    }
    s_prev_lte_initialized = false;

    esp_err_t modem_power_off_err = modem_power_off();
    if (modem_power_off_err != ESP_OK) {
        ESP_LOGW(TAG, "Modem power-off before sleep failed: %s", esp_err_to_name(modem_power_off_err));
    } else {
        vTaskDelay(pdMS_TO_TICKS((uint32_t)TRACKER_MODEM_POWEROFF_SETTLE_MS));
    }

    offline_queue_set_online(false);

    esp_err_t dtr_sleep_err = modem_set_dtr(true);
    if (dtr_sleep_err != ESP_OK && dtr_sleep_err != ESP_ERR_NOT_SUPPORTED) {
        ESP_LOGW(TAG, "Set DTR sleep level before deep sleep failed: %s", esp_err_to_name(dtr_sleep_err));
    }
}

static void state_machine_prepare_deep_sleep_wakeup(void) {
    (void)esp_sleep_disable_wakeup_source(ESP_SLEEP_WAKEUP_ALL);
    /* Wake by motion interrupt only when the configured IMU pin is valid for deep sleep wake. */
    if (state_machine_can_arm_imu_deep_sleep_wakeup()) {
        esp_err_t wake_err = esp_sleep_enable_ext0_wakeup(PIN_LIS3DH_INT, 1);
        if (wake_err != ESP_OK) {
            ESP_LOGW(TAG,
                     "IMU ext0 wake arm failed: %s (timer-only fallback)",
                     esp_err_to_name(wake_err));
        }
    }
    uint16_t wake_interval_s = state_machine_parked_wake_interval_s();
    (void)esp_sleep_enable_timer_wakeup((uint64_t)wake_interval_s * 1000000ULL);
}

static app_state_t state_machine_enter_light_sleep(void) {
    (void)esp_sleep_disable_wakeup_source(ESP_SLEEP_WAKEUP_ALL);

    esp_err_t clear_int_err = imu_clear_motion_interrupt();
    if (clear_int_err != ESP_OK) {
        ESP_LOGW(TAG, "IMU INT clear before light sleep failed: %s", esp_err_to_name(clear_int_err));
    }
    vTaskDelay(pdMS_TO_TICKS(TRACKER_LIGHT_SLEEP_IMU_CLEAR_SETTLE_MS));

    if (imu_motion_detected()) {
        ESP_LOGW(TAG, "IMU interrupt still asserted before light sleep; skip sleep and enter alarm");
        return APP_STATE_ALARM;
    }

    esp_err_t gpio_wake_err = gpio_wakeup_enable(PIN_LIS3DH_INT, GPIO_INTR_HIGH_LEVEL);
    if (gpio_wake_err != ESP_OK) {
        ESP_LOGW(TAG, "GPIO wake arm failed gpio=%d err=%s", (int)PIN_LIS3DH_INT, esp_err_to_name(gpio_wake_err));
        return APP_STATE_CHECK_IGN;
    }

    esp_err_t sleep_gpio_err = esp_sleep_enable_gpio_wakeup();
    if (sleep_gpio_err != ESP_OK) {
        ESP_LOGW(TAG, "Light sleep GPIO wake enable failed: %s", esp_err_to_name(sleep_gpio_err));
        return APP_STATE_CHECK_IGN;
    }

    uint16_t wake_interval_s = state_machine_parked_wake_interval_s();
    esp_err_t timer_err = esp_sleep_enable_timer_wakeup((uint64_t)wake_interval_s * 1000000ULL);
    if (timer_err != ESP_OK) {
        ESP_LOGW(TAG, "Light sleep timer wake enable failed: %s", esp_err_to_name(timer_err));
        return APP_STATE_CHECK_IGN;
    }

    ESP_LOGI(TAG,
             "Entering light sleep interval_s=%u imu_gpio=%d",
             (unsigned)wake_interval_s,
             (int)PIN_LIS3DH_INT);
    esp_err_t sleep_err = esp_light_sleep_start();
    if (sleep_err != ESP_OK) {
        ESP_LOGW(TAG, "esp_light_sleep_start failed: %s", esp_err_to_name(sleep_err));
        return APP_STATE_CHECK_IGN;
    }

    esp_sleep_wakeup_cause_t wakeup = esp_sleep_get_wakeup_cause();
    ESP_LOGI(TAG, "Light sleep wakeup cause=%d", (int)wakeup);

    if (wakeup == ESP_SLEEP_WAKEUP_GPIO && state_machine_imu_runtime_enabled()) {
        return APP_STATE_ALARM;
    }
    if (wakeup == ESP_SLEEP_WAKEUP_TIMER) {
        s_heartbeat_started_ms = 0;
        s_heartbeat_raw_published = false;
        return APP_STATE_HEARTBEAT;
    }

    return APP_STATE_CHECK_IGN;
}

/**
 * @brief Initialize subsystem stack used by state machine.
 *
 * @param config Runtime configuration.
 *
 * @return ESP_OK on success, otherwise error.
 */
esp_err_t state_machine_init(const config_t *config) {
    ESP_RETURN_ON_NULL(config, ESP_ERR_INVALID_ARG, TAG, "config is NULL");

    memset(&s_telemetry, 0, sizeof(s_telemetry));
    util_copy_string(s_telemetry.obd_ecu_state, sizeof(s_telemetry.obd_ecu_state), "unknown");
    s_config = *config;
    ESP_LOGI(TAG,
             "Runtime config device=%s mqtt_host=%s mqtt_port=%u apn=%s tracking=%us heartbeat=%us alarm=%us ign_hold_ms=%u sleep=%d imu_wake=%d ota_min_mv=%u",
             s_config.device_id,
             s_config.mqtt_host,
             (unsigned int)s_config.mqtt_port,
             s_config.apn,
             (unsigned int)s_config.tracking_interval_s,
             (unsigned int)s_config.heartbeat_interval_s,
             (unsigned int)s_config.alarm_interval_s,
             (unsigned int)s_config.ignition_off_hold_ms,
             s_config.sleep_enabled ? 1 : 0,
             s_config.imu_wakeup_enabled ? 1 : 0,
             (unsigned int)s_config.ota_min_battery_mv);
    retry_state_reset(&s_ble_retry);
    retry_state_reset(&s_network_retry);
    retry_state_reset(&s_rtc_bootstrap_retry);
    retry_state_reset(&s_rtc_read_retry);
    retry_state_reset(&s_imu_bootstrap_retry);
    if (s_ble_connect_result_queue == NULL) {
        s_ble_connect_result_queue = xQueueCreate(1, sizeof(tracker_ble_connect_result_t));
    } else {
        xQueueReset(s_ble_connect_result_queue);
    }
    ESP_RETURN_ON_FALSE(s_ble_connect_result_queue != NULL, ESP_ERR_NO_MEM, TAG, "BLE result queue init failed");
    memset(&s_deferred_firmware_report, 0, sizeof(s_deferred_firmware_report));
    s_deferred_firmware_report_pending = false;

    util_set_sleep_enabled(s_config.sleep_enabled);

    if (!util_string_empty(CONFIG_APP_PROJECT_VER)) {
        util_copy_string(s_current_version, sizeof(s_current_version), CONFIG_APP_PROJECT_VER);
    }

    state_machine_init_boot_metadata();

    /* Bring up local sensors, modem, and transport modules. */
    ESP_RETURN_ON_FALSE(adc_reader_init() == ESP_OK, ESP_FAIL, TAG, "adc_reader_init failed");
    s_imu_available = false;
    if (!state_machine_imu_runtime_enabled()) {
        ESP_LOGW(TAG, "IMU wake disabled by config (timer-only parked sleep fallback)");
    }
    ESP_RETURN_ON_FALSE(power_mgr_init() == ESP_OK, ESP_FAIL, TAG, "power_mgr_init failed");

    s_time_trusted = false;
    s_event_timestamp_ms = 0;
    s_last_rtc_sync_ms = 0;
    s_prev_lte_initialized = false;
    s_lte_ever_initialized = false;
    s_gnss_poll_fail_streak = 0;
    s_last_gnss_rearm_ms = 0;
    s_last_gnss_poll_ms = 0;
    s_obd_aux_pid_cursor = 0;
    s_obd_diag_query_cursor = 0;
    s_last_obd_sample_ms = 0;
    s_last_obd_diagnostic_poll_ms = 0;
    s_obd_elm_ready = false;
    s_obd_fail_window_started_ms = 0;
    s_obd_fail_window_count = 0;
    s_ble_connect_inflight = false;
    s_ble_connect_started_ms = 0;
    s_imu_invalid_wakeup_gpio_logged = false;
    s_last_hw_diag_log_ms = 0;
    s_heartbeat_started_ms = 0;
    s_heartbeat_raw_published = false;
    s_status_running = false;
    s_status_stopped = true;
    s_ignition_off_started_ms = 0;
    s_ble_retry_last_ignition = false;

    esp_err_t rtc_init_err = rtc_ds3231m_init();
    if (rtc_init_err != ESP_OK) {
        ESP_LOGW(TAG, "rtc_ds3231m_init failed: %s (continue with fallback time)", esp_err_to_name(rtc_init_err));
    }

    bool rtc_available = false;
    bool rtc_time_valid = false;
    if (rtc_ds3231m_get_health(&rtc_available, &rtc_time_valid) == ESP_OK) {
        ESP_LOGI(TAG, "RTC health available=%d valid=%d", rtc_available ? 1 : 0, rtc_time_valid ? 1 : 0);
    }

    modem_lte_set_apn(s_config.apn);
    modem_lte_request_connect();
    ESP_RETURN_ON_FALSE(tracker_mqtt_init(&s_config) == ESP_OK, ESP_FAIL, TAG, "tracker_mqtt_init failed");
    ESP_RETURN_ON_FALSE(offline_queue_init() == ESP_OK, ESP_FAIL, TAG, "offline_queue_init failed");
    telemetry_counters_reset();
    session_mgr_init();
    tracker_mqtt_set_command_callback(state_machine_command_callback);
    tracker_mqtt_set_puback_callback(state_machine_puback_callback);

    if (s_config.command_subscribe_enabled) {
        command_handler_init(&s_config);
    }

    /* Handle post-OTA confirmation and publish initial firmware status on boot. */
    state_machine_restore_ota_context_from_nvs();
    bool had_pending_confirm = g_rtc_context.ota_pending_confirm;
    state_machine_try_confirm_running_firmware();
    if (!had_pending_confirm) {
        state_machine_publish_firmware_status(TRACKER_OTA_STATUS_SUCCESS,
                                              TRACKER_OTA_PROGRESS_DONE,
                                              s_current_version,
                                              "",
                                              "",
                                              "");
    }
    return ESP_OK;
}

/**
 * @brief Execute one finite-state-machine iteration.
 *
 * @param current_state Current state.
 *
 * @return Next state.
 */
app_state_t state_machine_run(app_state_t current_state) {
    state_machine_update_user_led();
    util_set_sleep_enabled(s_config.sleep_enabled);

    switch (current_state) {
        case APP_STATE_INIT:
            g_rtc_context.last_state = APP_STATE_INIT;
            offline_queue_set_online(tracker_mqtt_is_connected());
            return APP_STATE_CHECK_IGN;

        case APP_STATE_CHECK_IGN: {
            /*
             * Startup whole-system check: keep network/RTC bootstrap alive even while
             * ignition is off so modem FSM can progress beyond initial power pulse.
             */
            if (!s_startup_system_check_log_once) {
                ESP_LOGI(TAG, "Startup system check: ADC/BLE/RTC/LTE/MQTT");
                s_startup_system_check_log_once = true;
            }
            state_machine_run_wake_prelude(false);
            session_mgr_on_ignition_sample(s_telemetry.ignition, util_uptime_ms());
            g_rtc_context.ign_last_known = s_telemetry.ignition;

            return s_telemetry.ignition ? APP_STATE_DRIVING : APP_STATE_PARKED;
        }

        case APP_STATE_DRIVING: {
            /* Full online mode with high-frequency telemetry and command handling. */
            state_machine_run_wake_prelude(true);

            session_mgr_on_ignition_sample(s_telemetry.ignition, util_uptime_ms());
            if (session_mgr_should_start()) {
                session_mgr_mark_started(util_uptime_ms());
                s_session_id = session_mgr_current_session_id();
                offline_queue_set_session(s_session_id);
            }

            if (!s_status_running) {
                state_machine_publish_status("running");
                s_status_running = true;
                s_status_stopped = false;
            }

            uint64_t now_ms = util_uptime_ms();
            bool should_publish_raw = ((now_ms - s_last_raw_publish_ms) >= state_machine_tracking_interval_ms()) ||
                                      command_handler_consume_location_request();
            if (should_publish_raw && !state_machine_should_throttle_rawdata()) {
                state_machine_publish_rawdata();
            }

            if (modem_lte_is_initialized()) {
                state_machine_try_connect_ble();
            }

            bool tracking_enabled = command_handler_is_tracking_enabled();
            bool ignition_active = s_telemetry.ignition && tracking_enabled;
            if (!ignition_active && s_ignition_off_started_ms == 0) {
                s_ignition_off_started_ms = now_ms;
                state_machine_publish_status("stopped");
                s_status_running = false;
                s_status_stopped = true;
            }

            if (ignition_active) {
                s_ignition_off_started_ms = 0;
            }

            if (s_ignition_off_started_ms != 0 &&
                (now_ms - s_ignition_off_started_ms) >= state_machine_ignition_off_hold_ms()) {
                offline_queue_stop_session(true);
                session_mgr_mark_stopped(now_ms);
                s_ignition_off_started_ms = 0;
                return APP_STATE_PARKED;
            }

            return APP_STATE_DRIVING;
        }

        case APP_STATE_PARKED:
            /*
             * Parked transitions still need one best-effort publish window so the
             * wake sequence finishes as: wake -> modem/sensors -> MQTT publish -> sleep.
             */
            if (!s_status_stopped) {
                state_machine_publish_status("stopped");
                s_status_stopped = true;
            }
            s_status_running = false;
            if (s_heartbeat_started_ms == 0) {
                s_heartbeat_started_ms = util_uptime_ms();
                s_heartbeat_raw_published = false;
            }
            return APP_STATE_HEARTBEAT;

        case APP_STATE_ALARM: {
            /* Alarm mode after motion wakeup: publish event + periodic rawdata. */
            state_machine_run_wake_prelude(true);

            if (s_alarm_enter_ms == 0) {
                s_alarm_enter_ms = util_uptime_ms();
                s_imu_wake_count += 1;
                state_machine_publish_event("warning", 1001, "motion_detected");
            }

            uint64_t now_ms = util_uptime_ms();
            if ((now_ms - s_last_raw_publish_ms) >= state_machine_alarm_interval_ms()) {
                state_machine_publish_rawdata();
            }

            if (modem_lte_is_initialized()) {
                state_machine_try_connect_ble();
            }

            if (s_telemetry.ignition) {
                s_alarm_enter_ms = 0;
                return APP_STATE_DRIVING;
            }

            bool alarm_timeout = (now_ms - s_alarm_enter_ms) >= state_machine_alarm_timeout_ms();
            if (!state_machine_imu_runtime_enabled() || !s_imu_available || !imu_motion_detected() || alarm_timeout) {
                if (!alarm_timeout) {
                    s_imu_false_wake_count += 1;
                }
                s_alarm_enter_ms = 0;
                return APP_STATE_PARKED;
            }

            return APP_STATE_ALARM;
        }

        case APP_STATE_HEARTBEAT:
            /*
             * Timer wake heartbeat path:
             * bring modem up first, read local hardware while transport settles,
             * publish one best-effort parked sample, then return to deep sleep.
             */
            if (s_heartbeat_started_ms == 0) {
                s_heartbeat_started_ms = util_uptime_ms();
                s_heartbeat_raw_published = false;
                s_timer_wake_count += 1;
            }
            state_machine_run_wake_prelude(false);

            uint64_t now_ms = util_uptime_ms();
            bool heartbeat_timeout = (now_ms - s_heartbeat_started_ms) >= TRACKER_HEARTBEAT_ACTIVE_WINDOW_MS;
            bool obd_connected = s_ble_ctx != NULL && ble_obd_is_connected(s_ble_ctx);
            bool network_ready = state_machine_network_ready_for_heartbeat_publish();
            bool gnss_publish_ready = !s_gnss_started || s_telemetry.gnss.fix_valid || heartbeat_timeout;
            if (!s_heartbeat_raw_published &&
                (!s_ble_connect_inflight || heartbeat_timeout) &&
                (network_ready || heartbeat_timeout) &&
                gnss_publish_ready) {
                if (!state_machine_should_throttle_rawdata()) {
                    state_machine_publish_rawdata();
                } else {
                    ESP_LOGW(TAG,
                             "heartbeat rawdata throttled while offline queue is near quota; publishing status only");
                }

                if (!state_machine_has_recent_obd_sample(now_ms, TRACKER_HEARTBEAT_OBD_STALE_WARN_MS)) {
                    if (strcmp(s_telemetry.obd_ecu_state, "stopped") == 0) {
                        ESP_LOGI(TAG,
                                 "heartbeat publish without fresh OBD sample because ECU state=%s",
                                 s_telemetry.obd_ecu_state);
                    } else {
                        ESP_LOGW(TAG,
                                 "heartbeat publish without fresh OBD sample connected=%d state=%s age_ms=%lu",
                                 obd_connected ? 1 : 0,
                                 s_telemetry.obd_ecu_state,
                                 (unsigned long)s_telemetry.obd_sample_age_ms);
                    }
                }

                state_machine_publish_status("heartbeat");
                s_heartbeat_raw_published = true;
            }

            if (s_heartbeat_raw_published && !heartbeat_timeout && offline_queue_has_pending_ack()) {
                return APP_STATE_HEARTBEAT;
            }

            if (s_heartbeat_raw_published || heartbeat_timeout) {
                s_heartbeat_started_ms = 0;
                s_heartbeat_raw_published = false;
                return APP_STATE_SLEEP;
            }
            return APP_STATE_HEARTBEAT;

        case APP_STATE_SLEEP:
            /* Sleep path is policy-driven with explicit block reasons. */
            (void)state_machine_handle_ble_connect_result();
            const char *reason = "ok";
            if (!state_machine_can_enter_sleep(&reason)) {
                s_sleep_blocked_count += 1;
                uint64_t now_ms = util_uptime_ms();
                if (s_last_sleep_reject_log_ms == 0 ||
                    (now_ms - s_last_sleep_reject_log_ms) >= TRACKER_SLEEP_REJECT_LOG_INTERVAL_MS) {
                    ESP_LOGW(TAG,
                             "Sleep blocked reason=%s blocked_count=%lu",
                             reason,
                             (unsigned long)s_sleep_blocked_count);
                    s_last_sleep_reject_log_ms = now_ms;
                }
                return APP_STATE_CHECK_IGN;
            }

            s_sleep_enter_count += 1;
            ESP_LOGI(TAG,
                     "Sleep accepted enter_count=%lu timer_wake_count=%lu imu_wake_count=%lu false_wake_count=%lu",
                     (unsigned long)s_sleep_enter_count,
                     (unsigned long)s_timer_wake_count,
                     (unsigned long)s_imu_wake_count,
                     (unsigned long)s_imu_false_wake_count);
            state_machine_shutdown_for_sleep();
            if (state_machine_should_use_light_sleep_motion_wake()) {
                return state_machine_enter_light_sleep();
            }
            state_machine_prepare_deep_sleep_wakeup();
            esp_deep_sleep_start();
            return APP_STATE_SLEEP;

        default:
            return APP_STATE_INIT;
    }
}

/**
 * @brief Return current telemetry snapshot copy.
 *
 * @return Telemetry structure.
 */
telemetry_t state_machine_get_telemetry(void) {
    return s_telemetry;
}
