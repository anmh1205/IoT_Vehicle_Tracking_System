#include "app_config.h"

#include <string.h>

#include "sdkconfig.h"

#include "util.h"

/**
 * @file app_config_defaults.c
 * @brief Built-in runtime config defaults and validation rules.
 * This translation unit belongs to the shared kernel layer and centralizes shared primitives, validation bounds, retry helpers, and generic utilities used across components.
 */


/*
 * Built-in fallback defaults. Each value is normally supplied by Kconfig
 * (menuconfig -> generated sdkconfig); the #ifndef guards provide hardcoded
 * fallbacks so the unit still compiles and yields a sane config when a given
 * Kconfig symbol is not defined for the current build target.
 */

/* Default device identifier; expected to be overwritten during provisioning. */
#ifndef CONFIG_TRACKER_DEFAULT_DEVICE_ID
#define CONFIG_TRACKER_DEFAULT_DEVICE_ID "TRACKER_001"
#endif

/* Placeholder auth token; the sentinel value signals the device is unprovisioned. */
#ifndef CONFIG_TRACKER_DEFAULT_AUTH_TOKEN
#define CONFIG_TRACKER_DEFAULT_AUTH_TOKEN "provisioning-required"
#endif

/* Default MQTT broker hostname for telemetry/command transport. */
#ifndef CONFIG_TRACKER_DEFAULT_MQTT_HOST
#define CONFIG_TRACKER_DEFAULT_MQTT_HOST "mqtt.thingdock.dev"
#endif

/* Default MQTT TCP port (1883 = plain MQTT, no TLS). */
#ifndef CONFIG_TRACKER_DEFAULT_MQTT_PORT
#define CONFIG_TRACKER_DEFAULT_MQTT_PORT 1883
#endif

/* Heartbeat cadence (seconds) used while parked/sleeping to prove liveness. */
#ifndef CONFIG_TRACKER_DEFAULT_HEARTBEAT_INTERVAL_S
#define CONFIG_TRACKER_DEFAULT_HEARTBEAT_INTERVAL_S 120
#endif

/* Telemetry upload cadence (seconds) while actively driving. */
#ifndef CONFIG_TRACKER_DEFAULT_TRACKING_INTERVAL_S
#define CONFIG_TRACKER_DEFAULT_TRACKING_INTERVAL_S 1
#endif

/* Telemetry upload cadence (seconds) while in motion-alarm mode. */
#ifndef CONFIG_TRACKER_DEFAULT_ALARM_INTERVAL_S
#define CONFIG_TRACKER_DEFAULT_ALARM_INTERVAL_S 3
#endif

/* Debounce hold (ms) after ignition-off before committing to the parked/sleep flow.
 * Defaults to the effective minimum to avoid premature sleep on brief dropouts. */
#ifndef CONFIG_TRACKER_DEFAULT_IGNITION_OFF_HOLD_MS
#define CONFIG_TRACKER_DEFAULT_IGNITION_OFF_HOLD_MS TRACKER_CONFIG_EFFECTIVE_MIN_IGNITION_OFF_HOLD_MS
#endif

/* Max time (seconds) alarm mode stays active without sustained motion. */
#ifndef CONFIG_TRACKER_DEFAULT_ALARM_TIMEOUT_S
#define CONFIG_TRACKER_DEFAULT_ALARM_TIMEOUT_S 300
#endif

/* Minimum battery (mV) required to permit an OTA update, guarding against
 * a brownout mid-flash that could brick the device. */
#ifndef CONFIG_TRACKER_DEFAULT_OTA_MIN_BATTERY_MV
#define CONFIG_TRACKER_DEFAULT_OTA_MIN_BATTERY_MV 3850
#endif

/* Supply-voltage threshold (mV) for the ADC-based ignition fallback detection. */
#ifndef CONFIG_TRACKER_DEFAULT_IGNITION_ADC_THRESHOLD_MV
#define CONFIG_TRACKER_DEFAULT_IGNITION_ADC_THRESHOLD_MV 13000
#endif

/* Whether deep-sleep policy is enabled by default (1 = enabled). */
#ifndef CONFIG_TRACKER_DEFAULT_SLEEP_ENABLED
#define CONFIG_TRACKER_DEFAULT_SLEEP_ENABLED 1
#endif

/* Whether IMU motion-wakeup is enabled by default (1 = enabled). */
#ifndef CONFIG_TRACKER_DEFAULT_IMU_WAKEUP_ENABLED
#define CONFIG_TRACKER_DEFAULT_IMU_WAKEUP_ENABLED 1
#endif

/* Default cellular APN used when bringing up the PDP context. */
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
    // Defensive NULL guard: never dereference a missing output pointer.
    if (config == NULL) {
        return;
    }

    // Zero the whole struct first so any field not explicitly set below (e.g.
    // mqtt_username/password, obd2_ble_address) is left as a clean empty default.
    memset(config, 0, sizeof(*config));
    // String fields use bounded copies to guarantee null-termination within capacity.
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
    // Kconfig booleans arrive as ints; normalize to bool via the != 0 comparison.
    config->sleep_enabled = CONFIG_TRACKER_DEFAULT_SLEEP_ENABLED != 0;
    config->imu_wakeup_enabled = CONFIG_TRACKER_DEFAULT_IMU_WAKEUP_ENABLED != 0;
#if defined(CONFIG_TRACKER_ENABLE_COMMAND_SUBSCRIBE)
    // Honor the build-time choice for cloud command subscription when defined...
    config->command_subscribe_enabled = CONFIG_TRACKER_ENABLE_COMMAND_SUBSCRIBE;
#else
    // ...otherwise default to enabled so the device can receive remote commands.
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
    // A NULL config can never be valid.
    if (config == NULL) {
        return false;
    }
    // Identity and credentials must be present: an empty device_id or auth_token
    // means the device is unprovisioned and cannot authenticate to the cloud.
    if (util_string_empty(config->device_id) || util_string_empty(config->auth_token)) {
        return false;
    }
    // Transport endpoint must be complete: a host string and a non-zero port.
    if (util_string_empty(config->mqtt_host) || config->mqtt_port == 0) {
        return false;
    }
    // Cellular APN is required to establish the PDP context for connectivity.
    if (util_string_empty(config->apn)) {
        return false;
    }
    // Each numeric field below is range-checked against shared bounds so a
    // corrupted or malicious NVS blob cannot drive the runtime out of spec.
    if (config->tracking_interval_s < TRACKER_CONFIG_MIN_TRACKING_INTERVAL_S ||
        config->tracking_interval_s > TRACKER_CONFIG_MAX_TRACKING_INTERVAL_S) {
        return false;
    }
    // Heartbeat only has a floor: it must not be so frequent it defeats sleep,
    // but an arbitrarily long heartbeat is acceptable.
    if (config->heartbeat_interval_s < TRACKER_CONFIG_MIN_HEARTBEAT_INTERVAL_S) {
        return false;
    }
    if (config->alarm_interval_s < TRACKER_CONFIG_MIN_ALARM_INTERVAL_S ||
        config->alarm_interval_s > TRACKER_CONFIG_MAX_ALARM_INTERVAL_S) {
        return false;
    }
    // Ignition-off hold debounces noisy ignition signals; bound it to avoid both
    // instant sleep and never-sleeping behavior.
    if (config->ignition_off_hold_ms < TRACKER_CONFIG_MIN_IGNITION_OFF_HOLD_MS ||
        config->ignition_off_hold_ms > TRACKER_CONFIG_MAX_IGNITION_OFF_HOLD_MS) {
        return false;
    }
    if (config->alarm_timeout_s < TRACKER_CONFIG_MIN_ALARM_TIMEOUT_S ||
        config->alarm_timeout_s > TRACKER_CONFIG_MAX_ALARM_TIMEOUT_S) {
        return false;
    }
    // OTA battery floor must sit within the supported cell-voltage envelope so
    // the brownout guard is neither trivially passable nor impossible to meet.
    if (config->ota_min_battery_mv < TRACKER_CONFIG_MIN_OTA_BATTERY_MV ||
        config->ota_min_battery_mv > TRACKER_CONFIG_MAX_OTA_BATTERY_MV) {
        return false;
    }
    // ADC ignition threshold must lie in the calibrated supply-voltage window.
    if (config->ignition_adc_threshold_mv < TRACKER_CONFIG_MIN_IGNITION_ADC_THRESHOLD_MV ||
        config->ignition_adc_threshold_mv > TRACKER_CONFIG_MAX_IGNITION_ADC_THRESHOLD_MV) {
        return false;
    }
    // All required fields present and every bounded field in range -> usable.
    return true;
}
