/**
 * @file include/ivts_core/model/config.h
 * @brief Persisted device configuration, validation limits and error reporting.
 *
 * App boot, command handling and storage use this model to fill defaults and
 * validate settings. The width and order of fields are part of the versioned
 * NVS representation. The caller owns each instance and serializes access to
 * shared data. NVS commits and Kconfig provisioning take place outside core.
 */
#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/** String buffer capacities including NUL. */
#define IVTS_CFG_DEVICE_ID_SIZE   32u  /**< Device ID capacity in bytes, including NUL. */
#define IVTS_CFG_DEVICE_ID_MAX    23u   /**< Client ID length limit compatible with the deployed NVS layout. */
#define IVTS_CFG_AUTH_TOKEN_SIZE  128u  /**< Payload authentication token capacity in bytes, including NUL. */
#define IVTS_CFG_HOST_SIZE        64u  /**< MQTT host capacity in bytes, including NUL. */
#define IVTS_CFG_USERNAME_SIZE    32u  /**< MQTT username capacity in bytes, including NUL. */
#define IVTS_CFG_PASSWORD_SIZE    64u  /**< MQTT password capacity in bytes, including NUL. */
#define IVTS_CFG_APN_SIZE         64u  /**< Cellular APN capacity in bytes, including NUL. */
#define IVTS_CFG_BLE_ADDR_SIZE    18u   /**< "AA:BB:CC:DD:EE:FF" + NUL. */

/** Allowed ranges for numeric configuration fields. */
#define IVTS_CFG_TRACKING_S_MIN        1u  /**< Minimum accepted driving telemetry interval in seconds. */
#define IVTS_CFG_TRACKING_S_MAX        3600u  /**< Maximum accepted driving telemetry interval in seconds. */
#define IVTS_CFG_HEARTBEAT_S_MIN       60u  /**< Minimum accepted parked heartbeat interval in seconds. */
#define IVTS_CFG_HEARTBEAT_S_MAX       65535u  /**< Maximum accepted parked heartbeat interval in seconds. */
#define IVTS_CFG_ALARM_INTERVAL_S_MIN  1u  /**< Minimum accepted alarm telemetry interval in seconds. */
#define IVTS_CFG_ALARM_INTERVAL_S_MAX  60u  /**< Maximum accepted alarm telemetry interval in seconds. */
#define IVTS_CFG_IGN_OFF_HOLD_MS_MIN   1000u  /**< Minimum accepted ignition OFF hold time in milliseconds. */
#define IVTS_CFG_IGN_OFF_HOLD_MS_MAX   60000u  /**< Maximum ignition OFF hold in milliseconds. */
#define IVTS_CFG_ALARM_TIMEOUT_S_MIN   30u  /**< Minimum accepted alarm residence threshold in seconds. */
#define IVTS_CFG_ALARM_TIMEOUT_S_MAX   3600u  /**< Maximum accepted alarm residence threshold in seconds. */
#define IVTS_CFG_OTA_MIN_BATT_MV_MIN   3300u  /**< Lower bound for the OTA battery threshold in mV. */
#define IVTS_CFG_OTA_MIN_BATT_MV_MAX   4500u  /**< Upper bound for the OTA battery threshold in mV. */
#define IVTS_CFG_IGN_ADC_MV_MIN        11000u  /**< Lower bound for the ignition ON threshold in mV. */
#define IVTS_CFG_IGN_ADC_MV_MAX        15000u  /**< Upper bound for the ignition ON threshold in mV. */
#define IVTS_CFG_MQTT_PORT_MIN         1u  /**< Minimum accepted broker TCP port. */
#define IVTS_CFG_MQTT_PORT_MAX         65535u  /**< Maximum accepted broker TCP port. */

/**
 * Default policy fields. App Kconfig provides deployment settings such as
 * host, APN, device ID and token.
 */
#define IVTS_CFG_DEFAULT_HEARTBEAT_S      120u  /**< Default parked heartbeat interval in seconds. */
#define IVTS_CFG_DEFAULT_TRACKING_S       1u  /**< Default driving telemetry interval in seconds. */
#define IVTS_CFG_DEFAULT_ALARM_INTERVAL_S 3u  /**< Default alarm telemetry interval in seconds. */
#define IVTS_CFG_DEFAULT_IGN_OFF_HOLD_MS  15000u  /**< Default ignition OFF hold time in milliseconds. */
#define IVTS_CFG_DEFAULT_ALARM_TIMEOUT_S  300u  /**< Default alarm residence threshold in seconds. */
#define IVTS_CFG_DEFAULT_OTA_MIN_BATT_MV  3850u  /**< Default OTA minimum battery threshold in millivolts. */
#define IVTS_CFG_DEFAULT_IGN_ADC_MV       13000u  /**< Default ignition ON voltage threshold in millivolts. */

/** @brief Runtime settings owned by the caller and stored as one versioned NVS blob. */
typedef struct {
    char     device_id[IVTS_CFG_DEVICE_ID_SIZE];  /**< Device ID, 1 to 23 bytes plus NUL. */
    char     auth_token[IVTS_CFG_AUTH_TOKEN_SIZE];  /**< Required NUL-terminated payload token. */
    char     mqtt_host[IVTS_CFG_HOST_SIZE];  /**< Required NUL-terminated MQTT broker host. */
    char     mqtt_username[IVTS_CFG_USERNAME_SIZE];  /**< NUL-terminated broker username or empty. */
    char     mqtt_password[IVTS_CFG_PASSWORD_SIZE];  /**< NUL-terminated broker password or empty. */
    char     apn[IVTS_CFG_APN_SIZE];  /**< Required NUL-terminated cellular access point name. */
    char     obd_ble_addr[IVTS_CFG_BLE_ADDR_SIZE];  /**< An empty address enables discovery by BLE service. */
    uint16_t mqtt_port;  /**< Broker TCP port, 1 through 65535. */
    uint16_t heartbeat_interval_s;  /**< Parked heartbeat interval, 60 through 65535 seconds. */
    uint16_t tracking_interval_s;  /**< Driving telemetry interval, 1 through 3600 seconds. */
    uint16_t alarm_interval_s;  /**< Alarm telemetry interval, 1 through 60 seconds. */
    uint16_t ignition_off_hold_ms;  /**< Ignition OFF debounce, 1000 through 60000 milliseconds. */
    uint16_t alarm_timeout_s;  /**< Minimum alarm residence, 30 through 3600 seconds. */
    uint16_t ota_min_battery_mv;  /**< Minimum device supply for OTA, 3300 through 4500 millivolts. */
    uint16_t ignition_adc_threshold_mv;  /**< Ignition ON threshold, 11000 to 15000 mV. */
    bool     sleep_enabled;  /**< True to permit hardware sleep. False selects simulated sleep. */
    bool     imu_wakeup_enabled;  /**< True to permit waking on IMU motion. */
    bool     command_subscribe_enabled;  /**< True to enable the modem command subscription. */
} ivts_config_t;

/**
 * @brief Validate device configuration field formats and numeric ranges.
 *
 * The function can report multiple issues for one field. The caller supplies provisioning before validation.
 *
 * @param c Configuration borrowed for the call. NULL returns one issue without writing an issue entry.
 * @param[out] out Optional array. The first min(cap, issue count) entries are written for a non-NULL c.
 * @param cap Issue array capacity in elements. Ignored when out is NULL.
 * @return Total issue count, which may exceed cap. Zero means all checks pass.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
/** @brief Field identifiers reported by ivts_config_validate(). */
typedef enum {
    IVTS_CFG_F_DEVICE_ID = 0,  /**< Device ID fails its length, format or presence check. */
    IVTS_CFG_F_AUTH_TOKEN,  /**< Authentication token is empty or lacks a terminator. */
    IVTS_CFG_F_MQTT_HOST,  /**< Broker host is empty or fails its format check. */
    IVTS_CFG_F_MQTT_USERNAME,  /**< Broker username fails its format check. */
    IVTS_CFG_F_MQTT_PASSWORD,  /**< Broker password fails its format check. */
    IVTS_CFG_F_APN,  /**< Cellular APN is empty or fails its format check. */
    IVTS_CFG_F_OBD_BLE_ADDR,  /**< BLE address fails its format check. */
    IVTS_CFG_F_MQTT_PORT,  /**< Broker port is outside the allowed range. */
    IVTS_CFG_F_HEARTBEAT,  /**< Heartbeat interval is outside the allowed range. */
    IVTS_CFG_F_TRACKING,  /**< Driving telemetry interval is outside the allowed range. */
    IVTS_CFG_F_ALARM_INTERVAL,  /**< Alarm telemetry interval is outside the allowed range. */
    IVTS_CFG_F_IGN_OFF_HOLD,  /**< Ignition OFF hold is outside the allowed range. */
    IVTS_CFG_F_ALARM_TIMEOUT,  /**< Alarm residence threshold is outside the allowed range. */
    IVTS_CFG_F_OTA_MIN_BATT,  /**< OTA battery threshold is outside the allowed range. */
    IVTS_CFG_F_IGN_ADC,  /**< Ignition ON threshold is outside the allowed range. */
    IVTS_CFG_F_COUNT  /**< Sentinel after the last field identifier. */
} ivts_cfg_field_t;

/** @brief Reason a configuration field is invalid. */
typedef enum {
    IVTS_CFG_R_EMPTY = 0,  /**< A required string is empty. */
    IVTS_CFG_R_TOO_LOW,  /**< The numeric value is below its inclusive minimum. */
    IVTS_CFG_R_TOO_HIGH,  /**< The numeric value exceeds its inclusive maximum. */
    IVTS_CFG_R_BAD_FORMAT      /**< A string lacks a terminator or contains bytes disallowed for its field. */
} ivts_cfg_reason_t;

/** @brief One validation issue in a caller-owned result array. */
typedef struct {
    uint8_t field;    /**< ivts_cfg_field_t. */
    uint8_t reason;   /**< ivts_cfg_reason_t. */
} ivts_cfg_issue_t;

/**
 * @brief Initialize numeric policy and flag defaults.
 *
 * Strings and mqtt_port start empty. App provisioning supplies deployment values.
 * The function clears struct padding because storage checksums the entire configuration.
 *
 * @param[out] c Caller-owned destination. NULL is ignored.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
void ivts_config_defaults(ivts_config_t *c);

/**
 * @brief Validate a device configuration.
 * @param c Configuration to validate.
 * @param[out] out Optional array for at most cap issues.
 * @param cap Number of elements available in out.
 * @return Total number of issues, which may exceed cap. Zero means the
 * configuration is valid. A null configuration reports one issue.
 */
size_t ivts_config_validate(const ivts_config_t *c, ivts_cfg_issue_t *out, size_t cap);
