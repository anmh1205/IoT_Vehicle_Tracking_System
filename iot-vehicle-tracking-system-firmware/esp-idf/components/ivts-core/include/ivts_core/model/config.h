/**
 * @file config.h
 * @brief Persisted device configuration, validation limits and error reporting.
 *
 * The width and order of fields are part of the versioned NVS representation.
 */
#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/** String buffer capacities including NUL. */
#define IVTS_CFG_DEVICE_ID_SIZE   32u
#define IVTS_CFG_DEVICE_ID_MAX    23u   /**< Client ID length limit compatible with the deployed NVS layout. */
#define IVTS_CFG_AUTH_TOKEN_SIZE  128u
#define IVTS_CFG_HOST_SIZE        64u
#define IVTS_CFG_USERNAME_SIZE    32u
#define IVTS_CFG_PASSWORD_SIZE    64u
#define IVTS_CFG_APN_SIZE         64u
#define IVTS_CFG_BLE_ADDR_SIZE    18u   /**< "AA:BB:CC:DD:EE:FF" + NUL. */

/** Allowed ranges for numeric configuration fields. */
#define IVTS_CFG_TRACKING_S_MIN        1u
#define IVTS_CFG_TRACKING_S_MAX        3600u
#define IVTS_CFG_HEARTBEAT_S_MIN       60u
#define IVTS_CFG_HEARTBEAT_S_MAX       65535u
#define IVTS_CFG_ALARM_INTERVAL_S_MIN  1u
#define IVTS_CFG_ALARM_INTERVAL_S_MAX  60u
#define IVTS_CFG_IGN_OFF_HOLD_MS_MIN   1000u
#define IVTS_CFG_IGN_OFF_HOLD_MS_MAX   60000u
#define IVTS_CFG_ALARM_TIMEOUT_S_MIN   30u
#define IVTS_CFG_ALARM_TIMEOUT_S_MAX   3600u
#define IVTS_CFG_OTA_MIN_BATT_MV_MIN   3300u
#define IVTS_CFG_OTA_MIN_BATT_MV_MAX   4500u
#define IVTS_CFG_IGN_ADC_MV_MIN        11000u
#define IVTS_CFG_IGN_ADC_MV_MAX        15000u
#define IVTS_CFG_MQTT_PORT_MIN         1u
#define IVTS_CFG_MQTT_PORT_MAX         65535u

/**
 * Default policy fields. App Kconfig provides deployment settings such as
 * host, APN, device ID and token.
 */
#define IVTS_CFG_DEFAULT_HEARTBEAT_S      120u
#define IVTS_CFG_DEFAULT_TRACKING_S       1u
#define IVTS_CFG_DEFAULT_ALARM_INTERVAL_S 3u
#define IVTS_CFG_DEFAULT_IGN_OFF_HOLD_MS  15000u
#define IVTS_CFG_DEFAULT_ALARM_TIMEOUT_S  300u
#define IVTS_CFG_DEFAULT_OTA_MIN_BATT_MV  3850u
#define IVTS_CFG_DEFAULT_IGN_ADC_MV       13000u

/** Runtime configuration stored as one versioned NVS blob. */
typedef struct {
    char     device_id[IVTS_CFG_DEVICE_ID_SIZE];
    char     auth_token[IVTS_CFG_AUTH_TOKEN_SIZE];
    char     mqtt_host[IVTS_CFG_HOST_SIZE];
    char     mqtt_username[IVTS_CFG_USERNAME_SIZE];
    char     mqtt_password[IVTS_CFG_PASSWORD_SIZE];
    char     apn[IVTS_CFG_APN_SIZE];
    char     obd_ble_addr[IVTS_CFG_BLE_ADDR_SIZE];  /**< An empty address enables discovery by BLE service. */
    uint16_t mqtt_port;
    uint16_t heartbeat_interval_s;
    uint16_t tracking_interval_s;
    uint16_t alarm_interval_s;
    uint16_t ignition_off_hold_ms;
    uint16_t alarm_timeout_s;
    uint16_t ota_min_battery_mv;
    uint16_t ignition_adc_threshold_mv;
    bool     sleep_enabled;
    bool     imu_wakeup_enabled;
    bool     command_subscribe_enabled;
} ivts_config_t;

/** Configuration field identifier returned by ivts_config_validate(). */
typedef enum {
    IVTS_CFG_F_DEVICE_ID = 0,
    IVTS_CFG_F_AUTH_TOKEN,
    IVTS_CFG_F_MQTT_HOST,
    IVTS_CFG_F_MQTT_USERNAME,
    IVTS_CFG_F_MQTT_PASSWORD,
    IVTS_CFG_F_APN,
    IVTS_CFG_F_OBD_BLE_ADDR,
    IVTS_CFG_F_MQTT_PORT,
    IVTS_CFG_F_HEARTBEAT,
    IVTS_CFG_F_TRACKING,
    IVTS_CFG_F_ALARM_INTERVAL,
    IVTS_CFG_F_IGN_OFF_HOLD,
    IVTS_CFG_F_ALARM_TIMEOUT,
    IVTS_CFG_F_OTA_MIN_BATT,
    IVTS_CFG_F_IGN_ADC,
    IVTS_CFG_F_COUNT
} ivts_cfg_field_t;

/** Reason a configuration field is invalid. */
typedef enum {
    IVTS_CFG_R_EMPTY = 0,
    IVTS_CFG_R_TOO_LOW,
    IVTS_CFG_R_TOO_HIGH,
    IVTS_CFG_R_BAD_FORMAT      /**< Missing NUL terminator or invalid BLE address format. */
} ivts_cfg_reason_t;

/** One configuration validation issue. */
typedef struct {
    uint8_t field;    /**< ivts_cfg_field_t. */
    uint8_t reason;   /**< ivts_cfg_reason_t. */
} ivts_cfg_issue_t;

/**
 * @brief Initialize numeric policy and flag defaults.
 *
 * Strings and mqtt_port start empty. Deployment must supply provisioning
 * values before validation succeeds. Zero the entire struct, including
 * padding, so the CRC of the stored NVS blob is stable.
 *
 * @param c Destination configuration. A null pointer is ignored.
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
