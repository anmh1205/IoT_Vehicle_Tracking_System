#include "app_state.h"

#include <stdlib.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
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
#include "imu_lis3dsh.h"
#include "modem_gnss.h"
#include "modem_lte.h"
#include "mqtt_client.h"
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
#define TRACKER_BLE_RETRY_BACKOFF_MS 10000ULL
#define TRACKER_NETWORK_RETRY_MIN_BACKOFF_MS 30000ULL
#define TRACKER_NETWORK_RETRY_MAX_BACKOFF_MS 300000ULL
#define TRACKER_OBD_DEBUG_LOG_INTERVAL_MS 1000ULL
#define TRACKER_OBD_POLL_INTERVAL_MS 1200ULL
#define TRACKER_OBD_PID_TIMEOUT_MS 700U
#define TRACKER_BLE_CONNECT_TIMEOUT_MS 12000U
#define TRACKER_RTC_SYNC_MIN_INTERVAL_MS 60000ULL
#define TRACKER_RTC_READ_RETRY_BACKOFF_MS 1000ULL
#define TRACKER_GNSS_REARM_COOLDOWN_MS 15000ULL
#define TRACKER_GNSS_FAIL_REARM_THRESHOLD 3U
#define TRACKER_MQTT_RUNTIME_DISABLED 0
#define TRACKER_USER_LED_BLINK_PERIOD_MS 3000ULL
#define TRACKER_USER_LED_ON_MS 300ULL
#define TRACKER_USER_LED_ACTIVE_LEVEL 1
#define TRACKER_METADATA_MESSAGE_ID_LEN 37
#define TRACKER_BOOT_ID_LEN 48
#define TRACKER_OBD_FAIL_ALERT_COOLDOWN_MS 300000ULL
#define TRACKER_EVENT_CODE_OBD_CONNECT_FAILED 2001
#define TRACKER_EVENT_CODE_OBD_ELM327_INIT_FAILED 2002
#define TRACKER_SLEEP_REJECT_LOG_INTERVAL_MS 10000ULL
#define TRACKER_HW_DIAG_LOG_INTERVAL_MS 15000ULL

/* RTC-retained context survives deep sleep and helps OTA/session continuity. */
RTC_DATA_ATTR rtc_context_t g_rtc_context = {
    .last_state = APP_STATE_INIT,
    .boot_count = 0,
    .last_heartbeat_ts = 0,
    .ble_mac = {0},
    .ign_last_known = false,
    .last_battery_v = 0.0f,
};

static const char *TAG = "STATE_MACHINE";

#ifndef CONFIG_APP_PROJECT_VER
#define CONFIG_APP_PROJECT_VER "unknown"
#endif

static config_t s_config;
static telemetry_t s_telemetry;
static ble_obd_ctx_t *s_ble_ctx = NULL;
static uint64_t s_last_raw_publish_ms = 0;
static uint64_t s_alarm_enter_ms = 0;
static uint64_t s_last_obd_debug_log_ms = 0;
static uint64_t s_last_obd_poll_ms = 0;
static uint32_t s_session_id = 1;
static uint64_t s_ignition_off_started_ms = 0;
static bool s_status_running = false;
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
static char s_current_version[TRACKER_TARGET_VERSION_MAX_LEN] = CONFIG_APP_PROJECT_VER;
static uint32_t s_metadata_seq_no = 0;
static char s_boot_id[TRACKER_BOOT_ID_LEN] = {0};
static bool s_obd_fail_alert_emitted = false;
static int s_last_obd_fail_alert_code = 0;
static uint64_t s_last_obd_fail_alert_ms = 0;

static const retry_policy_t s_ble_retry_policy = {
    .mode = RETRY_MODE_FIXED,
    .base_delay_ms = (uint32_t)TRACKER_BLE_RETRY_BACKOFF_MS,
    .max_delay_ms = (uint32_t)TRACKER_BLE_RETRY_BACKOFF_MS,
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
    .mode = RETRY_MODE_FIXED,
    .base_delay_ms = 5000,
    .max_delay_ms = 5000,
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

/**
 * @brief Callback for parsed OBD responses.
 *
 * @param pid Requested PID.
 * @param data Response payload bytes.
 * @param len Payload length.
 * @param usr_ctx User context (unused).
 */
static void state_machine_obd_response_cb(int pid, const uint8_t *data, size_t len, void *usr_ctx) {
    (void)usr_ctx;

    int32_t converted = 0;
    if (pid < 0 || data == NULL || len == 0) {
        return;
    }

    switch ((uint8_t)pid) {
        case 0x0C:
            if (obd_convert_rpm(&converted, data, len) == 0) {
                s_telemetry.obd_rpm = converted;
            }
            break;
        case 0x0D:
            if (len >= 1) {
                s_telemetry.obd_speed = data[0];
            }
            break;
        case 0x05:
            if (obd_convert_temperature(&converted, data, len) == 0) {
                s_telemetry.obd_coolant_temp = converted;
            }
            break;
        case 0x2F:
            if (obd_convert_percent(&converted, data, len) == 0) {
                s_telemetry.obd_fuel_level = converted;
            }
            break;
        case 0x04:
            if (obd_convert_percent(&converted, data, len) == 0) {
                s_telemetry.obd_engine_load = converted;
            }
            break;
        default:
            break;
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

/**
 * @brief Refresh telemetry snapshot from sensors/modem/OBD.
 *
 * @param read_gnss True to poll GNSS.
 * @param read_obd True to poll OBD PIDs.
 */
static bool state_machine_can_poll_gnss(void) {
    return s_gnss_started && modem_lte_is_initialized();
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

static uint64_t state_machine_ignition_off_hold_ms(void) {
    return (uint64_t)s_config.ignition_off_hold_ms;
}

static bool state_machine_imu_runtime_enabled(void) {
    return s_config.imu_wakeup_enabled;
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

    if (imu_init() == ESP_OK) {
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
                               ESP_FAIL);
    ESP_LOGW(TAG,
             "retry step=imu_init err=%s attempt=%lu next_delay_ms=%lu",
             esp_err_to_name(ESP_FAIL),
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

        if ((now_ms - s_last_obd_poll_ms) >= TRACKER_OBD_POLL_INTERVAL_MS) {
            ble_obd_rxtx(s_ble_ctx, OBD_MODE_CURRENT_DATA, 0x0C, TRACKER_OBD_PID_TIMEOUT_MS);
            ble_obd_rxtx(s_ble_ctx, OBD_MODE_CURRENT_DATA, 0x0D, TRACKER_OBD_PID_TIMEOUT_MS);
            ble_obd_rxtx(s_ble_ctx, OBD_MODE_CURRENT_DATA, 0x05, TRACKER_OBD_PID_TIMEOUT_MS);
            ble_obd_rxtx(s_ble_ctx, OBD_MODE_CURRENT_DATA, 0x2F, TRACKER_OBD_PID_TIMEOUT_MS);
            ble_obd_rxtx(s_ble_ctx, OBD_MODE_CURRENT_DATA, 0x04, TRACKER_OBD_PID_TIMEOUT_MS);
            s_last_obd_poll_ms = now_ms;
        }

        if ((now_ms - s_last_obd_debug_log_ms) >= TRACKER_OBD_DEBUG_LOG_INTERVAL_MS) {
            ESP_LOGD(TAG,
                     "OBD pid-values rpm=%ld speed=%ld coolant=%ld fuel=%ld load=%ld",
                     (long)s_telemetry.obd_rpm,
                     (long)s_telemetry.obd_speed,
                     (long)s_telemetry.obd_coolant_temp,
                     (long)s_telemetry.obd_fuel_level,
                     (long)s_telemetry.obd_engine_load);
            s_last_obd_debug_log_ms = now_ms;
        }
    }

    if (read_gnss && state_machine_can_poll_gnss()) {
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

    if (s_telemetry.gnss.timestamp_ms == 0) {
        s_telemetry.gnss.timestamp_ms = util_uptime_ms();
    }

    /* Ignition fallback combines OBD RPM with board-side ADC voltage threshold. */
    float ignition_threshold_v = (float)s_config.ignition_adc_threshold_mv / 1000.0f;
    bool adc_ignition = s_telemetry.battery_top >= ignition_threshold_v;
    s_telemetry.ignition = s_telemetry.obd_rpm > 0 || adc_ignition;
    s_telemetry.error_code = 0;

    uint64_t now_ms = util_uptime_ms();
    if (s_last_hw_diag_log_ms == 0 || (now_ms - s_last_hw_diag_log_ms) >= TRACKER_HW_DIAG_LOG_INTERVAL_MS) {
        ESP_LOGI(TAG,
                 "HW diag supply=%.2fV batt=%.2fV ign=%d vib=%u lte=%d mqtt=%d ble=%d gnss_fix=%d",
                 s_telemetry.battery_top,
                 s_telemetry.battery_bot,
                 s_telemetry.ignition ? 1 : 0,
                 (unsigned)s_telemetry.vibration,
                 modem_lte_is_connected() ? 1 : 0,
                 tracker_mqtt_is_connected() ? 1 : 0,
                 (s_ble_ctx != NULL && ble_obd_is_connected(s_ble_ctx)) ? 1 : 0,
                 s_telemetry.gnss.fix_valid ? 1 : 0);
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

    (void)offline_queue_enqueue(OFFLINE_RECORD_EVENT,
                                payload,
                                s_telemetry.gnss.fix_valid,
                                tracker_mqtt_is_connected(),
                                s_time_trusted,
                                s_event_timestamp_ms);
    cJSON_free(payload);
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

    (void)offline_queue_enqueue(OFFLINE_RECORD_FIRMWARE,
                                payload,
                                s_telemetry.gnss.fix_valid,
                                tracker_mqtt_is_connected(),
                                s_time_trusted,
                                s_event_timestamp_ms);
    cJSON_free(payload);
}

static void state_machine_publish_obd_failure_event_if_needed(uint64_t now_ms,
                                                              int code,
                                                              const char *message) {
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
 * @brief Build firmware status payload fields then publish.
 */
static void state_machine_publish_firmware_status(const char *status,
                                                  uint8_t progress,
                                                  const char *version,
                                                  const char *job_id,
                                                  const char *partition,
                                                  const char *error) {
    firmware_status_t firmware = {0};
    util_copy_string(firmware.status, sizeof(firmware.status), status);
    firmware.progress = progress;
    util_copy_string(firmware.job_id, sizeof(firmware.job_id), job_id);
    util_copy_string(firmware.target_version, sizeof(firmware.target_version), version);
    util_copy_string(firmware.current_version, sizeof(firmware.current_version), s_current_version);
    if (!util_string_empty(partition)) {
        util_copy_string(firmware.partition, sizeof(firmware.partition), partition);
    }
    if (!util_string_empty(error)) {
        util_copy_string(firmware.error, sizeof(firmware.error), error);
    }

    state_machine_publish_firmware_payload(&firmware);
}

/**
 * @brief Attempt BLE OBD connection with retry and ELM327 initialization.
 */
static void state_machine_schedule_ble_retry(uint64_t now_ms, const char *reason) {
    uint32_t delay_ms = retry_state_current_delay_ms(&s_ble_retry, &s_ble_retry_policy, now_ms);
    esp_err_t sched_err = retry_state_schedule(&s_ble_retry, &s_ble_retry_policy, now_ms, ESP_FAIL);
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

static void state_machine_try_connect_ble(void) {
    if (s_ble_ctx != NULL && ble_obd_is_connected(s_ble_ctx)) {
        return;
    }

    uint64_t now_ms = util_uptime_ms();
    if (!retry_state_can_run(&s_ble_retry, now_ms)) {
        return;
    }
    if ((s_ble_retry.attempts % 5U) == 0U) {
        ESP_LOGI(TAG,
                 "BLE connect attempt=%lu timeout_ms=%u",
                 (unsigned long)(s_ble_retry.attempts + 1U),
                 (unsigned int)TRACKER_BLE_CONNECT_TIMEOUT_MS);
    }

    if (s_ble_ctx != NULL) {
        ble_obd_disconnect(s_ble_ctx);
        s_ble_ctx = NULL;
    }

    bool use_preferred_mac = !util_string_empty(s_config.obd2_ble_address) &&
                             ble_obd_set_preferred_address(s_config.obd2_ble_address) == ESP_OK;
    if (!use_preferred_mac) {
        ble_obd_set_preferred_address("");
        if ((s_ble_retry.attempts % 10U) == 0U) {
            ESP_LOGW(TAG, "BLE connect mode: auto-discover (preferred MAC missing/invalid)");
        }
    } else if ((s_ble_retry.attempts % 10U) == 0U) {
        ESP_LOGI(TAG, "BLE connect mode: preferred-mac (%s)", s_config.obd2_ble_address);
    }

    /* One connect attempt per retry window to avoid log storms. */
    s_ble_ctx = ble_obd_connect(state_machine_obd_response_cb, NULL, TRACKER_BLE_CONNECT_TIMEOUT_MS);
    if (s_ble_ctx != NULL) {
        if (ble_obd_elm327_init(s_ble_ctx) == ESP_OK) {
            ESP_LOGI(TAG, "BLE OBD connected + ELM327 ready");
            s_obd_fail_alert_emitted = false;
            s_last_obd_fail_alert_code = 0;
            s_last_obd_fail_alert_ms = 0;
            retry_state_reset(&s_ble_retry);
            return;
        }

        state_machine_publish_obd_failure_event_if_needed(
            now_ms,
            TRACKER_EVENT_CODE_OBD_ELM327_INIT_FAILED,
            "obd_elm327_init_failed");
        ble_obd_disconnect(s_ble_ctx);
        s_ble_ctx = NULL;
        state_machine_schedule_ble_retry(now_ms, "connect_or_ble_stack_or_elm327_init_failed");
        return;
    }

    state_machine_publish_obd_failure_event_if_needed(
        now_ms,
        TRACKER_EVENT_CODE_OBD_CONNECT_FAILED,
        "obd_connect_failed");
    state_machine_schedule_ble_retry(now_ms, "connect_or_ble_stack_or_elm327_init_failed");
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
    if (err == ESP_ERR_NOT_FINISHED) {
        return;
    }
    if (err != ESP_OK) {
        s_prev_lte_initialized = false;
        state_machine_schedule_network_retry(now_ms, "modem_lte_tick", err);
        return;
    }

    if (!s_gnss_started) {
        err = modem_gnss_power_on();
        if (err != ESP_OK) {
            state_machine_schedule_network_retry(now_ms, "modem_gnss_power_on", err);
            return;
        }
        s_gnss_started = true;
    }

#if !TRACKER_MQTT_RUNTIME_DISABLED
    if (s_gnss_started && (!s_mqtt_started || !tracker_mqtt_is_connected())) {
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

    bool lte_now_initialized = modem_lte_is_initialized();
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

    retry_state_reset(&s_network_retry);
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

    state_machine_publish_firmware_status("confirming",
                                          99,
                                          g_rtc_context.ota_target_version,
                                          g_rtc_context.ota_job_id,
                                          g_rtc_context.ota_partition,
                                          "");

    /* Mark image valid to prevent automatic rollback on next boot. */
    if (esp_ota_mark_app_valid_cancel_rollback() == ESP_OK) {
        g_rtc_context.ota_pending_confirm = false;
        util_copy_string(s_current_version, sizeof(s_current_version), g_rtc_context.ota_target_version);
        state_machine_publish_firmware_status("success",
                                              100,
                                              g_rtc_context.ota_target_version,
                                              g_rtc_context.ota_job_id,
                                              g_rtc_context.ota_partition,
                                              "");
    } else {
        state_machine_publish_firmware_status("failed",
                                              100,
                                              g_rtc_context.ota_target_version,
                                              g_rtc_context.ota_job_id,
                                              g_rtc_context.ota_partition,
                                              "confirm_failed");
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
            state_machine_publish_firmware_payload(&rollback);
            esp_restart();
        } else {
            state_machine_publish_firmware_status("failed",
                                                  100,
                                                  g_rtc_context.ota_previous_version,
                                                  g_rtc_context.ota_job_id,
                                                  g_rtc_context.ota_partition,
                                                  "manual_rollback_failed");
        }
        return;
    }

    firmware_status_t report = {0};
    util_copy_string(report.job_id, sizeof(report.job_id), cmd.job_id);
    util_copy_string(report.target_version, sizeof(report.target_version), cmd.version);
    util_copy_string(report.current_version, sizeof(report.current_version), s_current_version);

    /* OTA update flow. */
    state_machine_publish_firmware_status("assigned", 0, cmd.version, cmd.job_id, "", "");

    if (!state_machine_ota_start_is_safe()) {
        state_machine_publish_firmware_status("failed",
                                              0,
                                              cmd.version,
                                              cmd.job_id,
                                              "",
                                              "unsafe_runtime_window");
        return;
    }

    s_ota_in_progress = true;
    if (util_ota_apply_update(&s_config, s_current_version, &cmd, &report) == ESP_OK) {
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

        state_machine_publish_firmware_payload(&report);
        esp_restart();
    } else {
        state_machine_publish_firmware_payload(&report);
        s_ota_in_progress = false;
    }
}

/**
 * @brief Prepare peripherals and wakeup sources before deep sleep.
 */
static void state_machine_prepare_sleep(void) {
    /* Snapshot context into RTC memory before shutdown. */
    g_rtc_context.last_state = APP_STATE_SLEEP;
    g_rtc_context.ign_last_known = s_telemetry.ignition;
    g_rtc_context.last_battery_v = s_telemetry.battery_top;
    g_rtc_context.last_heartbeat_ts = (uint32_t)(util_uptime_ms() / 1000ULL);

    if (s_ble_ctx != NULL) {
        ble_obd_disconnect(s_ble_ctx);
        s_ble_ctx = NULL;
    }

    if (s_gnss_started) {
        esp_err_t gnss_off_err = modem_gnss_power_off();
        if (gnss_off_err != ESP_OK) {
            ESP_LOGW(TAG, "GNSS power-off before sleep failed: %s", esp_err_to_name(gnss_off_err));
        }
    }
    s_gnss_started = false;
    modem_lte_disconnect();
    // modem_power_off();

    (void)modem_set_dtr(true);
    gpio_set_level(PIN_MODEM_PWRKEY, 0);

    /* Wake by motion interrupt only when IMU wake policy is enabled and IMU is ready. */
    if (state_machine_imu_runtime_enabled() && s_imu_available) {
        esp_err_t wake_err = esp_sleep_enable_ext0_wakeup(PIN_LIS3DSH_INT, 1);
        if (wake_err != ESP_OK) {
            ESP_LOGW(TAG,
                     "IMU ext0 wake arm failed: %s (timer-only fallback)",
                     esp_err_to_name(wake_err));
        }
    }
    esp_sleep_enable_timer_wakeup((uint64_t)s_config.heartbeat_interval_s * 1000000ULL);
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
    s_last_hw_diag_log_ms = 0;

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
    state_machine_try_confirm_running_firmware();
    state_machine_publish_firmware_status("success", 100, s_current_version, "", "", "");
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
            state_machine_try_connect_network();
            state_machine_bootstrap_rtc();
            state_machine_bootstrap_imu();

            /*
             * Bring modem path first; BLE OBD connect can block for multiple seconds and would
             * otherwise starve LTE AT FSM tick cadence during startup.
             */
            bool lte_ready = modem_lte_is_initialized();
            if (lte_ready) {
                state_machine_try_connect_ble();
            }

            /*
             * Allow GNSS polling during startup checks once LTE stack is initialized.
             * This keeps GNSS observability active even when ignition is still off.
             */
            state_machine_refresh_telemetry(lte_ready, true);
            offline_queue_set_online(tracker_mqtt_is_connected());
            offline_queue_replay_tick();
            session_mgr_on_ignition_sample(s_telemetry.ignition, util_uptime_ms());
            g_rtc_context.ign_last_known = s_telemetry.ignition;
            return s_telemetry.ignition ? APP_STATE_DRIVING : APP_STATE_PARKED;
        }

        case APP_STATE_DRIVING: {
            /* Full online mode with high-frequency telemetry and command handling. */
            state_machine_try_connect_network();
            if (modem_lte_is_initialized()) {
                state_machine_try_connect_ble();
            }
            state_machine_refresh_telemetry(true, true);
            state_machine_bootstrap_rtc();
            state_machine_bootstrap_imu();
            offline_queue_set_online(tracker_mqtt_is_connected());
            offline_queue_replay_tick();

            session_mgr_on_ignition_sample(s_telemetry.ignition, util_uptime_ms());
            if (session_mgr_should_start()) {
                session_mgr_mark_started(util_uptime_ms());
                s_session_id = session_mgr_current_session_id();
                offline_queue_set_session(s_session_id);
            }

            if (!s_status_running) {
                state_machine_publish_status("running");
                s_status_running = true;
            }

            uint64_t now_ms = util_uptime_ms();
            bool should_publish_raw = ((now_ms - s_last_raw_publish_ms) >= state_machine_tracking_interval_ms()) ||
                                      command_handler_consume_location_request();
            if (should_publish_raw && !offline_queue_should_throttle_rawdata()) {
                state_machine_publish_rawdata();
            }

            command_action_t action = command_handler_consume_action();
            if (action == COMMAND_ACTION_REBOOT) {
                esp_restart();
            }
            state_machine_process_ota_command(action);

            bool tracking_enabled = command_handler_is_tracking_enabled();
            bool ignition_active = s_telemetry.ignition && tracking_enabled;
            if (!ignition_active && s_ignition_off_started_ms == 0) {
                s_ignition_off_started_ms = now_ms;
                state_machine_publish_status("stopped");
                s_status_running = false;
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
            /* Transition stop status before sleeping. */
            state_machine_publish_status("stopped");
            s_status_running = false;
            return APP_STATE_SLEEP;

        case APP_STATE_ALARM: {
            /* Alarm mode after motion wakeup: publish event + periodic rawdata. */
            state_machine_try_connect_network();
            state_machine_refresh_telemetry(true, false);
            offline_queue_set_online(tracker_mqtt_is_connected());
            offline_queue_replay_tick();
            state_machine_process_ota_command(command_handler_consume_action());

            if (s_alarm_enter_ms == 0) {
                s_alarm_enter_ms = util_uptime_ms();
                s_imu_wake_count += 1;
                state_machine_publish_event("warning", 1001, "motion_detected");
            }

            uint64_t now_ms = util_uptime_ms();
            if ((now_ms - s_last_raw_publish_ms) >= state_machine_alarm_interval_ms()) {
                state_machine_publish_rawdata();
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
            /* Timer wake heartbeat path: one data publish then return to sleep. */
            s_timer_wake_count += 1;
            state_machine_try_connect_network();
            state_machine_refresh_telemetry(true, false);
            offline_queue_set_online(tracker_mqtt_is_connected());
            offline_queue_replay_tick();
            state_machine_publish_rawdata();
            state_machine_publish_status("heartbeat");
            state_machine_process_ota_command(command_handler_consume_action());
            return APP_STATE_SLEEP;

        case APP_STATE_SLEEP:
            /* Sleep path is policy-driven with explicit block reasons. */
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
            state_machine_prepare_sleep();
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
