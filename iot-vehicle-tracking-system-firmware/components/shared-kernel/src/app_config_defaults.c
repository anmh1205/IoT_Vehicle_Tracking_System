#include "app_config.h"

#include <string.h>

#include "sdkconfig.h"

#include "util.h"

/**
 * @file app_config_defaults.c
 * @brief Built-in runtime config defaults and validation rules.
 * This translation unit belongs to the shared kernel layer and centralizes shared primitives, validation bounds, retry helpers, and generic utilities used across components.
 */


#ifndef CONFIG_TRACKER_DEFAULT_DEVICE_ID
#define CONFIG_TRACKER_DEFAULT_DEVICE_ID "TRACKER_001"
#endif

#ifndef CONFIG_TRACKER_DEFAULT_AUTH_TOKEN
#define CONFIG_TRACKER_DEFAULT_AUTH_TOKEN "provisioning-required"
#endif

#ifndef CONFIG_TRACKER_DEFAULT_MQTT_HOST
#define CONFIG_TRACKER_DEFAULT_MQTT_HOST "mqtt.thingdock.dev"
#endif

#ifndef CONFIG_TRACKER_DEFAULT_MQTT_PORT
#define CONFIG_TRACKER_DEFAULT_MQTT_PORT 1883
#endif

#ifndef CONFIG_TRACKER_DEFAULT_HEARTBEAT_INTERVAL_S
#define CONFIG_TRACKER_DEFAULT_HEARTBEAT_INTERVAL_S 120
#endif

#ifndef CONFIG_TRACKER_DEFAULT_TRACKING_INTERVAL_S
#define CONFIG_TRACKER_DEFAULT_TRACKING_INTERVAL_S 1
#endif

#ifndef CONFIG_TRACKER_DEFAULT_ALARM_INTERVAL_S
#define CONFIG_TRACKER_DEFAULT_ALARM_INTERVAL_S 3
#endif

#ifndef CONFIG_TRACKER_DEFAULT_IGNITION_OFF_HOLD_MS
#define CONFIG_TRACKER_DEFAULT_IGNITION_OFF_HOLD_MS TRACKER_CONFIG_EFFECTIVE_MIN_IGNITION_OFF_HOLD_MS
#endif

#ifndef CONFIG_TRACKER_DEFAULT_ALARM_TIMEOUT_S
#define CONFIG_TRACKER_DEFAULT_ALARM_TIMEOUT_S 300
#endif

#ifndef CONFIG_TRACKER_DEFAULT_OTA_MIN_BATTERY_MV
#define CONFIG_TRACKER_DEFAULT_OTA_MIN_BATTERY_MV 3850
#endif

#ifndef CONFIG_TRACKER_DEFAULT_IGNITION_ADC_THRESHOLD_MV
#define CONFIG_TRACKER_DEFAULT_IGNITION_ADC_THRESHOLD_MV 13000
#endif

#ifndef CONFIG_TRACKER_DEFAULT_SLEEP_ENABLED
#define CONFIG_TRACKER_DEFAULT_SLEEP_ENABLED 1
#endif

#ifndef CONFIG_TRACKER_DEFAULT_IMU_WAKEUP_ENABLED
#define CONFIG_TRACKER_DEFAULT_IMU_WAKEUP_ENABLED 1
#endif

#ifndef CONFIG_TRACKER_MODEM_APN
#define CONFIG_TRACKER_MODEM_APN "internet"
#endif

/**
 * @brief Set default runtime configuration values.
 *
 * Populates config structure with built-in default values
 * from Kconfig or hardcoded defaults.
 *
 * @param config Output config structure (cannot be NULL).
 */
void app_config_set_defaults(config_t *config) {
    if (config == NULL) {
        return;
    }

    memset(config, 0, sizeof(*config));
    util_copy_string(config->device_id, sizeof(config->device_id), CONFIG_TRACKER_DEFAULT_DEVICE_ID);
    util_copy_string(config->auth_token, sizeof(config->auth_token), CONFIG_TRACKER_DEFAULT_AUTH_TOKEN);
    util_copy_string(config->mqtt_host, sizeof(config->mqtt_host), CONFIG_TRACKER_DEFAULT_MQTT_HOST);
    config->mqtt_port = CONFIG_TRACKER_DEFAULT_MQTT_PORT;
    config->heartbeat_interval_s = CONFIG_TRACKER_DEFAULT_HEARTBEAT_INTERVAL_S;
    config->tracking_interval_s = CONFIG_TRACKER_DEFAULT_TRACKING_INTERVAL_S;
    config->alarm_interval_s = CONFIG_TRACKER_DEFAULT_ALARM_INTERVAL_S;
    config->ignition_off_hold_ms = CONFIG_TRACKER_DEFAULT_IGNITION_OFF_HOLD_MS;
    config->alarm_timeout_s = CONFIG_TRACKER_DEFAULT_ALARM_TIMEOUT_S;
    config->ota_min_battery_mv = CONFIG_TRACKER_DEFAULT_OTA_MIN_BATTERY_MV;
    config->ignition_adc_threshold_mv = CONFIG_TRACKER_DEFAULT_IGNITION_ADC_THRESHOLD_MV;
    config->sleep_enabled = CONFIG_TRACKER_DEFAULT_SLEEP_ENABLED != 0;
    config->imu_wakeup_enabled = CONFIG_TRACKER_DEFAULT_IMU_WAKEUP_ENABLED != 0;
#if defined(CONFIG_TRACKER_ENABLE_COMMAND_SUBSCRIBE)
    config->command_subscribe_enabled = CONFIG_TRACKER_ENABLE_COMMAND_SUBSCRIBE;
#else
    config->command_subscribe_enabled = true;
#endif
    util_copy_string(config->apn, sizeof(config->apn), CONFIG_TRACKER_MODEM_APN);
}

/**
 * @brief Validate runtime configuration.
 *
 * Checks that all required fields are present and within
 * valid ranges. Used before applying config from NVS.
 *
 * @param config Config to validate.
 * @return true if valid, false if any field is invalid.
 */
bool app_config_is_valid(const config_t *config) {
    if (config == NULL) {
        return false;
    }
    if (util_string_empty(config->device_id) || util_string_empty(config->auth_token)) {
        return false;
    }
    if (util_string_empty(config->mqtt_host) || config->mqtt_port == 0) {
        return false;
    }
    if (util_string_empty(config->apn)) {
        return false;
    }
    if (config->tracking_interval_s < TRACKER_CONFIG_MIN_TRACKING_INTERVAL_S ||
        config->tracking_interval_s > TRACKER_CONFIG_MAX_TRACKING_INTERVAL_S) {
        return false;
    }
    if (config->heartbeat_interval_s < TRACKER_CONFIG_MIN_HEARTBEAT_INTERVAL_S) {
        return false;
    }
    if (config->alarm_interval_s < TRACKER_CONFIG_MIN_ALARM_INTERVAL_S ||
        config->alarm_interval_s > TRACKER_CONFIG_MAX_ALARM_INTERVAL_S) {
        return false;
    }
    if (config->ignition_off_hold_ms < TRACKER_CONFIG_MIN_IGNITION_OFF_HOLD_MS ||
        config->ignition_off_hold_ms > TRACKER_CONFIG_MAX_IGNITION_OFF_HOLD_MS) {
        return false;
    }
    if (config->alarm_timeout_s < TRACKER_CONFIG_MIN_ALARM_TIMEOUT_S ||
        config->alarm_timeout_s > TRACKER_CONFIG_MAX_ALARM_TIMEOUT_S) {
        return false;
    }
    if (config->ota_min_battery_mv < TRACKER_CONFIG_MIN_OTA_BATTERY_MV ||
        config->ota_min_battery_mv > TRACKER_CONFIG_MAX_OTA_BATTERY_MV) {
        return false;
    }
    if (config->ignition_adc_threshold_mv < TRACKER_CONFIG_MIN_IGNITION_ADC_THRESHOLD_MV ||
        config->ignition_adc_threshold_mv > TRACKER_CONFIG_MAX_IGNITION_ADC_THRESHOLD_MV) {
        return false;
    }
    return true;
}
