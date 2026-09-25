#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "runtime_config.h"

/**
 * @file ota_contract.h
 * @brief OTA payload contract, status strings, and progress/error constants.
 * This header belongs to the device-cloud contract layer and describes the payload contract that firmware and cloud services must interpret the same way.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/** @brief OTA confirm timeout defaults and bounds (seconds). */
#define TRACKER_OTA_CONFIRM_TIMEOUT_DEFAULT_SEC 180U
#define TRACKER_OTA_CONFIRM_TIMEOUT_MIN_SEC 60U
#define TRACKER_OTA_CONFIRM_TIMEOUT_MAX_SEC 3600U

/** @brief Canonical firmware lifecycle status strings used in MQTT/cloud contract. */
#define TRACKER_OTA_STATUS_ASSIGNED "assigned"
#define TRACKER_OTA_STATUS_DOWNLOADING "downloading"
#define TRACKER_OTA_STATUS_VERIFYING "verifying"
#define TRACKER_OTA_STATUS_INSTALLING "installing"
#define TRACKER_OTA_STATUS_REBOOTING "rebooting"
#define TRACKER_OTA_STATUS_CONFIRMING "confirming"
#define TRACKER_OTA_STATUS_SUCCESS "success"
#define TRACKER_OTA_STATUS_FAILED "failed"
#define TRACKER_OTA_STATUS_ROLLED_BACK "rolled_back"

/** @brief OTA progress milestones aligned with device state transitions. */
#define TRACKER_OTA_PROGRESS_ASSIGNED 0U
#define TRACKER_OTA_PROGRESS_DOWNLOADING_START 5U
#define TRACKER_OTA_PROGRESS_DOWNLOADING_MAX 90U
#define TRACKER_OTA_PROGRESS_VERIFYING 92U
#define TRACKER_OTA_PROGRESS_INSTALLING 96U
#define TRACKER_OTA_PROGRESS_CONFIRMING 99U
#define TRACKER_OTA_PROGRESS_DONE 100U

/** @brief Canonical OTA error codes surfaced to cloud/backend. */
#define TRACKER_OTA_ERROR_APPLY_FAILED "ota_apply_failed"
#define TRACKER_OTA_ERROR_HTTP_INIT_FAILED "http_init_failed"
#define TRACKER_OTA_ERROR_HTTP_CONFIG_FAILED "http_config_failed"
#define TRACKER_OTA_ERROR_HTTP_SSL_CONFIG_FAILED "http_ssl_config_failed"
#define TRACKER_OTA_ERROR_HTTP_ACTION_FAILED "http_action_failed"
#define TRACKER_OTA_ERROR_HTTP_ACTION_TIMEOUT "http_action_timeout"
#define TRACKER_OTA_ERROR_HTTP_STATUS_NOT_200 "http_status_not_200"
#define TRACKER_OTA_ERROR_HTTP_EMPTY_BODY "http_empty_body"
#define TRACKER_OTA_ERROR_OTA_BEGIN_FAILED "ota_begin_failed"
#define TRACKER_OTA_ERROR_HTTP_READ_FAILED "http_read_failed"
#define TRACKER_OTA_ERROR_HTTP_READ_PARSE_FAILED "http_read_parse_failed"
#define TRACKER_OTA_ERROR_HTTP_HEX_DECODE_FAILED "http_hex_decode_failed"
#define TRACKER_OTA_ERROR_OTA_WRITE_FAILED "ota_write_failed"
#define TRACKER_OTA_ERROR_HTTP_SIZE_MISMATCH "http_size_mismatch"
#define TRACKER_OTA_ERROR_HTTP_INVALID_IMAGE "http_invalid_image"
#define TRACKER_OTA_ERROR_SHA256_MISMATCH "sha256_mismatch"
#define TRACKER_OTA_ERROR_OTA_END_FAILED "ota_end_failed"
#define TRACKER_OTA_ERROR_SET_BOOT_PARTITION_FAILED "set_boot_partition_failed"
#define TRACKER_OTA_ERROR_CONTEXT_PERSIST_FAILED "confirm_context_persist_failed"
#define TRACKER_OTA_ERROR_CONFIRM_TIMEOUT_EXCEEDED "confirm_timeout_exceeded"
#define TRACKER_OTA_ERROR_CONFIRM_FAILED "confirm_failed"
#define TRACKER_OTA_ERROR_MANUAL_ROLLBACK_FAILED "manual_rollback_failed"
#define TRACKER_OTA_ERROR_UNSAFE_RUNTIME_WINDOW "unsafe_runtime_window"

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
