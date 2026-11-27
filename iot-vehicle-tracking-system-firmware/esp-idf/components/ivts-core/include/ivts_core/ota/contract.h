/**
 * @file contract.h
 * @brief Device-cloud firmware update contract and release manifest limits.
 */
#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/payload/meta.h"

/* Buffer capacities for command and report fields, including NUL. */
#define IVTS_OTA_URL_SIZE        256u
#define IVTS_OTA_JOB_ID_SIZE     80u
#define IVTS_OTA_VERSION_SIZE    32u
#define IVTS_OTA_SHA256_HEX_SIZE 65u
#define IVTS_OTA_PART_LABEL_SIZE 17u   /* OTA partition-label buffer capacity. */

/* Allowed confirmation timeout range in seconds. */
#define IVTS_OTA_CONFIRM_DEFAULT_S 180u
#define IVTS_OTA_CONFIRM_MIN_S     60u
#define IVTS_OTA_CONFIRM_MAX_S     3600u

/* Per-stage progress percentages sent to the cloud. */
#define IVTS_OTA_PCT_ASSIGNED     0u
#define IVTS_OTA_PCT_DL_START     5u
#define IVTS_OTA_PCT_DL_MAX       90u
#define IVTS_OTA_PCT_VERIFYING    92u
#define IVTS_OTA_PCT_INSTALLING   96u
#define IVTS_OTA_PCT_CONFIRMING   99u
#define IVTS_OTA_PCT_DONE         100u

/** Lifecycle phase of one OTA job. */
typedef enum {
    IVTS_OTA_ST_ASSIGNED = 0, IVTS_OTA_ST_DOWNLOADING, IVTS_OTA_ST_VERIFYING, IVTS_OTA_ST_INSTALLING,
    IVTS_OTA_ST_REBOOTING, IVTS_OTA_ST_CONFIRMING, IVTS_OTA_ST_SUCCESS, IVTS_OTA_ST_FAILED,
    IVTS_OTA_ST_ROLLED_BACK, IVTS_OTA_ST_COUNT
} ivts_ota_status_t;

/** Error code reported by an OTA job. */
typedef enum {
    IVTS_OTA_E_NONE = 0, IVTS_OTA_E_LOW_BATTERY, IVTS_OTA_E_UNSAFE_WINDOW, IVTS_OTA_E_SOURCE_OPEN,
    IVTS_OTA_E_HTTP_STATUS, IVTS_OTA_E_SIZE_MISMATCH, IVTS_OTA_E_SOURCE_READ, IVTS_OTA_E_BEGIN,
    IVTS_OTA_E_WRITE, IVTS_OTA_E_SHA256, IVTS_OTA_E_END, IVTS_OTA_E_SET_BOOT, IVTS_OTA_E_PERSIST,
    IVTS_OTA_E_CONFIRM_TIMEOUT, IVTS_OTA_E_BAD_COMMAND, IVTS_OTA_E_COUNT
} ivts_ota_err_t;

/** @brief Return the wire name of the OTA phase. */
const char *ivts_ota_status_name(ivts_ota_status_t s);
/** @brief Return the wire name of the OTA error, or an empty string for IVTS_OTA_E_NONE. */
const char *ivts_ota_err_name(ivts_ota_err_t e);

/** OTA command with validated field types and lengths. */
typedef struct {
    char     url[IVTS_OTA_URL_SIZE];
    char     sha256_hex[IVTS_OTA_SHA256_HEX_SIZE];
    char     version[IVTS_OTA_VERSION_SIZE];
    char     job_id[IVTS_OTA_JOB_ID_SIZE];
    uint32_t size;               /**< Image size declared by the cloud. Zero skips size matching. */
    uint32_t confirm_timeout_s;  /**< Confirmation timeout clamped to the supported range. */
    bool     force;              /**< Allow installation despite version and safe-window checks. */
} ivts_ota_cmd_t;

/** Firmware status reported to the cloud. */
typedef struct {
    uint8_t  status;      /**< ivts_ota_status_t. */
    uint8_t  progress;    /**< Progress percentage from 0 through 100. */
    uint8_t  error;       /**< ivts_ota_err_t. */
    char     job_id[IVTS_OTA_JOB_ID_SIZE];
    char     target_version[IVTS_OTA_VERSION_SIZE];
    char     current_version[IVTS_OTA_VERSION_SIZE];
    char     partition[IVTS_OTA_PART_LABEL_SIZE];
} ivts_fw_status_t;

/**
 * @brief Serialize a firmware status report to JSON.
 * @param m Common message metadata.
 * @param s Firmware state and job information.
 * @param[out] buf Destination buffer.
 * @param cap Buffer capacity in bytes.
 * @param[out] len Output JSON length excluding the trailing NUL.
 * @return IVTS_OK on success, IVTS_ERR_FULL if capacity is exhausted, or
 * IVTS_ERR_INVALID_ARG when required metadata or status is absent.
 */
ivts_err_t ivts_payload_firmware(const ivts_msg_meta_t *m, const ivts_fw_status_t *s,
                                 char *buf, size_t cap, size_t *len);

/**
 * @brief Decode a 64-character SHA-256 hex string to 32 bytes.
 * @param hex Exactly 64 hexadecimal characters followed by NUL.
 * @param[out] out Decoded digest bytes.
 * @return IVTS_OK, or IVTS_ERR_INVALID_ARG for a malformed digest.
 */
ivts_err_t ivts_sha256_hex_decode(const char *hex, uint8_t out[32]);
