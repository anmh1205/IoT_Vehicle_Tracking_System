/**
 * @file include/ivts_core/ota/contract.h
 * @brief Device-cloud firmware update fields, result values and serialization.
 *
 * App command handling constructs the OTA request and the OTA task reports
 * progress using these shared values. Core supplies digest decoding and firmware
 * JSON serialization on caller-owned buffers. Manifest policy, image I/O and
 * installation are handled by the app and OTA adapter.
 */
#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/payload/meta.h"

/* Buffer capacities for command and report fields, including NUL. */
#define IVTS_OTA_URL_SIZE        256u  /**< Image source URL capacity in bytes, including NUL. */
#define IVTS_OTA_JOB_ID_SIZE     80u  /**< Job ID capacity in bytes, including NUL. */
#define IVTS_OTA_VERSION_SIZE    32u  /**< Firmware version capacity in bytes, including NUL. */
#define IVTS_OTA_SHA256_HEX_SIZE 65u  /**< Digest capacity for 64 hexadecimal digits and NUL. */
#define IVTS_OTA_PART_LABEL_SIZE 17u   /**< OTA partition label capacity in bytes, including NUL. */

/* Allowed confirmation timeout range in seconds. */
#define IVTS_OTA_CONFIRM_DEFAULT_S 180u  /**< Default image confirmation timeout in seconds. */
#define IVTS_OTA_CONFIRM_MIN_S     60u  /**< Minimum image confirmation timeout in seconds. */
#define IVTS_OTA_CONFIRM_MAX_S     3600u  /**< Maximum image confirmation timeout in seconds. */

/* Per-stage progress percentages sent to the cloud. */
#define IVTS_OTA_PCT_ASSIGNED     0u  /**< Progress percentage at job assignment. */
#define IVTS_OTA_PCT_DL_START     5u  /**< Progress percentage at download start. */
#define IVTS_OTA_PCT_DL_MAX       90u  /**< Maximum download progress percentage before verification. */
#define IVTS_OTA_PCT_VERIFYING    92u  /**< Progress percentage during verification. */
#define IVTS_OTA_PCT_INSTALLING   96u  /**< Progress percentage during installation. */
#define IVTS_OTA_PCT_CONFIRMING   99u  /**< Progress percentage while rebooting or confirming the image. */
#define IVTS_OTA_PCT_DONE         100u  /**< Final progress percentage on success. */

/** @brief Lifecycle phase of one OTA job. */
typedef enum {
    IVTS_OTA_ST_ASSIGNED = 0, /**< The OTA adapter accepts the job.
       */ IVTS_OTA_ST_DOWNLOADING, /**< The OTA task transfers image bytes.
       */ IVTS_OTA_ST_VERIFYING, /**< The OTA task checks the downloaded image.
       */ IVTS_OTA_ST_INSTALLING, /**< The OTA task prepares the image for the next boot. */
    IVTS_OTA_ST_REBOOTING, /**< The image is ready for the app to reboot.
       */ IVTS_OTA_ST_CONFIRMING, /**< The app evaluates a pending image after boot.
       */ IVTS_OTA_ST_SUCCESS, /**< The app reports the new image as successful.
       */ IVTS_OTA_ST_FAILED, /**< The job or image confirmation fails. */
    IVTS_OTA_ST_ROLLED_BACK, /**< The app reports that the target image rolled back.
       */ IVTS_OTA_ST_COUNT /**< Sentinel after the last OTA phase. */
} ivts_ota_status_t;

/** @brief Error code reported by an OTA job. */
typedef enum {
    IVTS_OTA_E_NONE = 0, /**< No OTA error.
       */ IVTS_OTA_E_LOW_BATTERY, /**< Device supply is below the OTA threshold.
       */ IVTS_OTA_E_UNSAFE_WINDOW, /**< Wire code for an unsafe update window.
       */ IVTS_OTA_E_SOURCE_OPEN, /**< Opening the HTTP source fails without a reported non-200 status. */
    IVTS_OTA_E_HTTP_STATUS, /**< The source reports a non-200 HTTP status.
       */ IVTS_OTA_E_SIZE_MISMATCH, /**< The source has zero size or differs from the declared size.
       */ IVTS_OTA_E_SOURCE_READ, /**< Reading image data fails.
       */ IVTS_OTA_E_BEGIN, /**< Starting an image write fails. */
    IVTS_OTA_E_WRITE, /**< Writing image bytes fails.
       */ IVTS_OTA_E_SHA256, /**< Hash setup, update or digest verification fails.
       */ IVTS_OTA_E_END, /**< Finalizing the image fails.
       */ IVTS_OTA_E_SET_BOOT, /**< Selecting the target boot partition fails.
       */ IVTS_OTA_E_PERSIST, /**< Saving the pending confirmation context fails. */
    IVTS_OTA_E_CONFIRM_TIMEOUT, /**< The app reports a confirmation timeout or a boot rollback.
       */ IVTS_OTA_E_BAD_COMMAND, /**< The job cannot use the supplied command or image target.
       */ IVTS_OTA_E_COUNT /**< Sentinel after the last OTA error. */
} ivts_ota_err_t;

/**
 * @brief Return the wire name of an OTA phase.
 * @param s OTA phase to name.
 * @return Immutable static name, or "unknown" for the sentinel or an unrecognized value.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
const char *ivts_ota_status_name(ivts_ota_status_t s);
/**
 * @brief Return the wire name of an OTA error.
 * @param e OTA error to name.
 * @return Static name, empty for IVTS_OTA_E_NONE or "unknown" for other undefined values.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
const char *ivts_ota_err_name(ivts_ota_err_t e);

/** @brief App-parsed OTA request copied by value to the OTA task. */
typedef struct {
    char     url[IVTS_OTA_URL_SIZE];  /**< NUL-terminated HTTPS image source URL. */
    char     sha256_hex[IVTS_OTA_SHA256_HEX_SIZE];  /**< NUL-terminated 64-digit expected SHA-256 digest. */
    char     version[IVTS_OTA_VERSION_SIZE];  /**< NUL-terminated target firmware version. */
    char     job_id[IVTS_OTA_JOB_ID_SIZE];  /**< NUL-terminated cloud job ID. */
    uint32_t size;               /**< Image size declared by the cloud. Zero skips size matching. */
    uint32_t confirm_timeout_s;  /**< Confirmation timeout clamped to the supported range. */
    bool     force;              /**< Bypass the app checks for the running version and ignition window. */
} ivts_ota_cmd_t;

/** @brief App-owned firmware status snapshot borrowed for cloud reporting. */
typedef struct {
    uint8_t  status;      /**< ivts_ota_status_t. */
    uint8_t  progress;    /**< Progress percentage from 0 through 100. */
    uint8_t  error;       /**< ivts_ota_err_t. */
    char     job_id[IVTS_OTA_JOB_ID_SIZE];  /**< NUL-terminated cloud job ID. */
    char     target_version[IVTS_OTA_VERSION_SIZE];  /**< NUL-terminated target, or empty for current version. */
    char     current_version[IVTS_OTA_VERSION_SIZE];  /**< NUL-terminated running firmware version. */
    char     partition[IVTS_OTA_PART_LABEL_SIZE];  /**< NUL-terminated partition label. Empty omits it. */
} ivts_fw_status_t;

/**
 * @brief Serialize a firmware status report to JSON.
 *
 * An empty target version falls back to the current version. An empty partition and a no-error
 * result omit their corresponding fields. Message identity derives from the supplied metadata.
 *
 * @param m Required metadata with a non-NULL NUL-terminated device ID, borrowed for the call.
 * @param s Required firmware status with NUL-terminated fields, borrowed for the call.
 * @param[out] buf Caller-owned output. On exhaustion a writable buffer contains a NUL-terminated prefix.
 * @param cap Output capacity in bytes including NUL.
 * @param[out] len Optional JSON byte count excluding NUL. Written only on success.
 * @retval IVTS_OK The report fits and is serialized.
 * @retval IVTS_ERR_FULL The buffer is NULL, zero-capacity or too small.
 * @retval IVTS_ERR_INVALID_ARG Required metadata, device ID or status is NULL. Outputs are untouched.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
ivts_err_t ivts_payload_firmware(const ivts_msg_meta_t *m, const ivts_fw_status_t *s,
                                 char *buf, size_t cap, size_t *len);

/**
 * @brief Decode a SHA-256 hex string to 32 bytes.
 * @param hex Required NUL-terminated string of exactly 64 hexadecimal digits, borrowed for the call.
 * @param[out] out Required 32-byte destination. A malformed string may leave a partial or complete write.
 * @retval IVTS_OK All 32 digest bytes are decoded.
 * @retval IVTS_ERR_INVALID_ARG A pointer is NULL or the digest is malformed.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
ivts_err_t ivts_sha256_hex_decode(const char *hex, uint8_t out[32]);
