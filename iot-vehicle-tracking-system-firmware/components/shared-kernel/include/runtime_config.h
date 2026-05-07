#pragma once

#include <stdbool.h>
#include <stdint.h>

/**
 * @file runtime_config.h
 * @brief Shared runtime configuration limits and persisted config model.
 * This header belongs to the shared kernel layer and collects the shared models, bounds, and helper contracts that multiple components reuse.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/** @brief Maximum length for unique tracker device ID (including null terminator). */
#define TRACKER_DEVICE_ID_MAX_LEN 32
/** @brief Maximum length for auth token sent in telemetry payloads. */
#define TRACKER_AUTH_TOKEN_MAX_LEN 64
/** @brief Maximum length for MQTT host or APN-like host strings. */
#define TRACKER_HOST_MAX_LEN 64
/** @brief Maximum length for MQTT username. */
#define TRACKER_USERNAME_MAX_LEN 32
/** @brief Maximum length for MQTT password. */
#define TRACKER_PASSWORD_MAX_LEN 64
/** @brief Maximum length for BLE MAC string (`AA:BB:CC:DD:EE:FF`). */
#define TRACKER_MAC_ADDR_STR_LEN 18
/** @brief Maximum length for firmware semantic version string. */
#define TRACKER_TARGET_VERSION_MAX_LEN 32
/** @brief Maximum length for OTA job ID. */
#define TRACKER_JOB_ID_MAX_LEN 80
/** @brief Maximum length for OTA HTTPS URL. */
#define TRACKER_OTA_URL_MAX_LEN 256
/** @brief Maximum length for OTA partition label. */
#define TRACKER_PARTITION_MAX_LEN 32
/** @brief Length of SHA-256 hex string with null terminator. */
#define TRACKER_SHA256_HEX_LEN 65
/** @brief ADC calibration gain for +12V supply channel (measured 12.2V vs raw 11.96V). */
#define TRACKER_ADC_SUPPLY_CALIB_GAIN 1.02007f
/** @brief ADC calibration gain for battery channel (measured 4.09V vs raw 4.01V). */
#define TRACKER_ADC_BATT_CALIB_GAIN 1.01995f

/** @brief Runtime config bounds shared by parser + validator. */
#define TRACKER_CONFIG_MIN_TRACKING_INTERVAL_S 1U
#define TRACKER_CONFIG_MAX_TRACKING_INTERVAL_S 3600U
#define TRACKER_CONFIG_MIN_HEARTBEAT_INTERVAL_S 60U
#define TRACKER_CONFIG_MAX_HEARTBEAT_INTERVAL_S 65535U
#define TRACKER_CONFIG_MIN_ALARM_INTERVAL_S 1U
#define TRACKER_CONFIG_MAX_ALARM_INTERVAL_S 60U
#define TRACKER_CONFIG_MIN_IGNITION_OFF_HOLD_MS 1000U
#define TRACKER_CONFIG_MAX_IGNITION_OFF_HOLD_MS 60000U
#define TRACKER_CONFIG_MIN_ALARM_TIMEOUT_S 30U
#define TRACKER_CONFIG_MAX_ALARM_TIMEOUT_S 3600U
#define TRACKER_CONFIG_MIN_OTA_BATTERY_MV 3300U
#define TRACKER_CONFIG_MAX_OTA_BATTERY_MV 4500U
#define TRACKER_CONFIG_MIN_IGNITION_ADC_THRESHOLD_MV 11000U
#define TRACKER_CONFIG_MAX_IGNITION_ADC_THRESHOLD_MV 15000U

/**
 * @brief Runtime configuration persisted in NVS and used by all modules.
 */
typedef struct {
    /** Unique tracker device identifier. */
    char device_id[TRACKER_DEVICE_ID_MAX_LEN];
    /** Authentication token included in telemetry payloads. */
    char auth_token[TRACKER_AUTH_TOKEN_MAX_LEN];
    /** MQTT broker hostname or IPv4/IPv6 literal. */
    char mqtt_host[TRACKER_HOST_MAX_LEN];
    /** MQTT broker TCP port. */
    uint16_t mqtt_port;
    /** MQTT username credential. */
    char mqtt_username[TRACKER_USERNAME_MAX_LEN];
    /** MQTT password credential. */
    char mqtt_password[TRACKER_PASSWORD_MAX_LEN];
    /** Interval between heartbeat wakeups while sleeping (seconds). */
    uint16_t heartbeat_interval_s;
    /** Interval between raw telemetry uploads while driving (seconds). */
    uint16_t tracking_interval_s;
    /** Interval between alarm-mode raw telemetry uploads (seconds). */
    uint16_t alarm_interval_s;
    /** Delay before entering parked/sleep flow after ignition-off (milliseconds). */
    uint16_t ignition_off_hold_ms;
    /** Maximum time to keep alarm mode active without sustained motion (seconds). */
    uint16_t alarm_timeout_s;
    /** Minimum battery-cell voltage required before accepting OTA start (millivolts). */
    uint16_t ota_min_battery_mv;
    /** Supply-voltage threshold for ADC ignition fallback (millivolts). */
    uint16_t ignition_adc_threshold_mv;
    /** Enable deep-sleep policy when runtime is eligible. */
    bool sleep_enabled;
    /** Enable IMU motion wakeup path when hardware proof is available. */
    bool imu_wakeup_enabled;
    /** Preferred OBD BLE peripheral address. Empty means auto-discover. */
    char obd2_ble_address[TRACKER_MAC_ADDR_STR_LEN];
    /** Enable command topic subscription from cloud. */
    bool command_subscribe_enabled;
    /** Cellular APN used for PDP context creation. */
    char apn[TRACKER_HOST_MAX_LEN];
} config_t;
