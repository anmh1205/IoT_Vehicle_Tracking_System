#pragma once

#include <stdbool.h>
#include <stdint.h>

#define TRACKER_DEVICE_ID_MAX_LEN 32
#define TRACKER_AUTH_TOKEN_MAX_LEN 64
#define TRACKER_HOST_MAX_LEN 64
#define TRACKER_USERNAME_MAX_LEN 32
#define TRACKER_PASSWORD_MAX_LEN 64
#define TRACKER_MAC_ADDR_STR_LEN 18
#define TRACKER_TARGET_VERSION_MAX_LEN 32
#define TRACKER_JOB_ID_MAX_LEN 80
#define TRACKER_OTA_URL_MAX_LEN 256
#define TRACKER_PARTITION_MAX_LEN 32
#define TRACKER_SHA256_HEX_LEN 65

typedef struct {
    char device_id[TRACKER_DEVICE_ID_MAX_LEN];
    char auth_token[TRACKER_AUTH_TOKEN_MAX_LEN];
    char mqtt_host[TRACKER_HOST_MAX_LEN];
    uint16_t mqtt_port;
    char mqtt_username[TRACKER_USERNAME_MAX_LEN];
    char mqtt_password[TRACKER_PASSWORD_MAX_LEN];
    uint16_t heartbeat_interval_s;
    uint16_t tracking_interval_s;
    char obd2_ble_address[TRACKER_MAC_ADDR_STR_LEN];
    float lvd_threshold_v;
    float lvd_hysteresis_v;
    bool command_subscribe_enabled;
    char apn[TRACKER_HOST_MAX_LEN];
} config_t;

typedef struct {
    char status[16];
    uint8_t progress;
    char job_id[TRACKER_JOB_ID_MAX_LEN];
    char target_version[TRACKER_TARGET_VERSION_MAX_LEN];
    char current_version[TRACKER_TARGET_VERSION_MAX_LEN];
    char partition[TRACKER_PARTITION_MAX_LEN];
    char error[96];
} firmware_status_t;

typedef struct {
    bool pending;
    bool rollback_pending;
    bool force;
    uint32_t size;
    uint32_t confirm_timeout_sec;
    char job_id[TRACKER_JOB_ID_MAX_LEN];
    char version[TRACKER_TARGET_VERSION_MAX_LEN];
    char url[TRACKER_OTA_URL_MAX_LEN];
    char sha256[TRACKER_SHA256_HEX_LEN];
} ota_command_t;

void app_config_set_defaults(config_t *config);
bool app_config_is_valid(const config_t *config);
