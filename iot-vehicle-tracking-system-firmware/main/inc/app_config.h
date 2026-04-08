#pragma once

#include <stdbool.h>
#include <stdint.h>

/**
 * @file app_config.h
 * @brief Shared configuration and OTA payload data models for the tracker firmware.
 */

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
    /** Preferred OBD BLE peripheral address. Empty means auto-discover. */
    char obd2_ble_address[TRACKER_MAC_ADDR_STR_LEN];
    /** Enable command topic subscription from cloud. */
    bool command_subscribe_enabled;
    /** Cellular APN used for PDP context creation. */
    char apn[TRACKER_HOST_MAX_LEN];
} config_t;

/**
 * @brief Firmware status payload published to `.../firmware` topic.
 */
typedef struct {
    /** Lifecycle status (`assigned`, `downloading`, `success`, `failed`, ...). */
    char status[16];
    /** Completion percentage from 0..100. */
    uint8_t progress;
    /** OTA job identifier. */
    char job_id[TRACKER_JOB_ID_MAX_LEN];
    /** Target firmware version requested by backend. */
    char target_version[TRACKER_TARGET_VERSION_MAX_LEN];
    /** Currently running firmware version. */
    char current_version[TRACKER_TARGET_VERSION_MAX_LEN];
    /** OTA partition label used for the downloaded image. */
    char partition[TRACKER_PARTITION_MAX_LEN];
    /** Error text when status is `failed`. */
    char error[96];
} firmware_status_t;

/**
 * @brief Parsed OTA command payload received from cloud.
 */
typedef struct {
    /** True when update command is queued for processing. */
    bool pending;
    /** True when rollback command is queued for processing. */
    bool rollback_pending;
    /** If true, allow update even if version checks would normally block. */
    bool force;
    /** Expected firmware image size in bytes. */
    uint32_t size;
    /** Maximum time to wait for post-boot confirmation (seconds). */
    uint32_t confirm_timeout_sec;
    /** OTA job identifier. */
    char job_id[TRACKER_JOB_ID_MAX_LEN];
    /** Desired firmware version. */
    char version[TRACKER_TARGET_VERSION_MAX_LEN];
    /** HTTPS URL used to download firmware binary. */
    char url[TRACKER_OTA_URL_MAX_LEN];
    /** Expected SHA-256 hex digest of firmware binary. */
    char sha256[TRACKER_SHA256_HEX_LEN];
} ota_command_t;

/**
 * @brief Fill configuration structure with safe built-in defaults.
 *
 * @param config Output config pointer to initialize.
 */
void app_config_set_defaults(config_t *config);

/**
 * @brief Validate configuration for required fields and constraints.
 *
 * @param config Config pointer to validate.
 *
 * @return true when configuration can be used by runtime modules.
 * @return false when required fields are missing or out of range.
 */
bool app_config_is_valid(const config_t *config);
