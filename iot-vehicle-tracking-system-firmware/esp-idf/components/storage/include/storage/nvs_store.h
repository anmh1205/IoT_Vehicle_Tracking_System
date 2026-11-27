/**
 * @file include/storage/nvs_store.h
 * @brief Synchronous NVS records, configuration and boot identity.
 *
 * The app persists typed state in startup and runtime paths. The OTA worker saves its confirmation context.
 * Each call opens and closes its own NVS handle and may wait on flash. Buffers remain caller-owned.
 * The envelope checks version, length and CRC. App wrappers manage layouts and migration.
 */
#pragma once
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/model/config.h"

#define STORAGE_RECORD_PAYLOAD_MAX 1537u   /**< Maximum payload bytes per NVS record, excluding its envelope. */

/**
 * @brief Copy a versioned NVS payload after validating its envelope.
 * @param key Borrowed non-null NVS key string in the IVTS namespace.
 * @param version Expected 16-bit layout version.
 * @param[out] buffer Non-null destination of len bytes. Unchanged on failure.
 * @param len Expected payload length in bytes, up to STORAGE_RECORD_PAYLOAD_MAX.
 * @retval IVTS_OK The payload is copied.
 * @retval IVTS_ERR_INVALID_ARG An argument is missing or len exceeds the limit.
 * @retval IVTS_ERR_NOT_FOUND The namespace or key is absent.
 * @retval IVTS_ERR_CRC The header is short, the magic differs or the payload CRC mismatches.
 * @retval IVTS_ERR_VERSION Version or stored length differs from the requested layout.
 * @retval IVTS_ERR_IO Another NVS open or read failure.
 * @note Context: App startup or runtime task after NVS initialization. Synchronous flash access with no
 *       explicit timeout.
 */
ivts_err_t storage_record_load(const char *key, uint16_t version, void *buffer, size_t len);
/**
 * @brief Write and commit a versioned NVS payload.
 * @param key Borrowed non-null NVS key string in the IVTS namespace.
 * @param version 16-bit layout version to store with the payload.
 * @param buffer Non-null payload borrowed for the call.
 * @param len Payload length in bytes, up to STORAGE_RECORD_PAYLOAD_MAX.
 * @retval IVTS_OK NVS accepts the blob and commits it.
 * @retval IVTS_ERR_INVALID_ARG An argument is missing, len exceeds the limit or NVS rejects its arguments.
 * @retval IVTS_ERR_INVALID_STATE NVS reports an invalid state.
 * @retval IVTS_ERR_TIMEOUT NVS reports a timeout.
 * @retval IVTS_ERR_NOT_FOUND The SDK reports a missing resource.
 * @retval IVTS_ERR_FULL An SDK allocation fails.
 * @retval IVTS_ERR_IO Another NVS operation fails.
 * @note Context: App or OTA task, including app startup, after NVS initialization. Synchronous flash access
 *       with no explicit timeout.
 */
ivts_err_t storage_record_save(const char *key, uint16_t version, const void *buffer, size_t len);

/**
 * @brief Load device configuration through the versioned envelope.
 *
 * On storage or envelope failure, write core defaults. An absent key is normal on a new device.
 * Other load failures also attempt to emit IVTS_EV_CONFIG_CORRUPT.
 *
 * @param[out] out Non-null configuration destination. Written with the stored bytes or defaults.
 * @retval IVTS_OK The configuration envelope is valid and its payload is copied.
 * @retval IVTS_ERR_INVALID_ARG The output is missing.
 * @retval IVTS_ERR_NOT_FOUND No stored configuration.
 * @retval IVTS_ERR_CRC A corrupt header or payload was detected.
 * @retval IVTS_ERR_VERSION Stored version or length does not match.
 * @retval IVTS_ERR_IO Another NVS operation failed.
 * @note Context: App startup after NVS initialization. Synchronous flash access with no explicit timeout.
 */
ivts_err_t storage_config_load(ivts_config_t *out);

/**
 * @brief Validate and commit the configuration as one versioned NVS blob.
 * @param cfg Non-null configuration borrowed for the call.
 * @retval IVTS_OK The validated configuration is committed.
 * @retval IVTS_ERR_INVALID_ARG Configuration is missing or invalid, or NVS rejects its arguments.
 * @retval IVTS_ERR_INVALID_STATE NVS reports an invalid state.
 * @retval IVTS_ERR_TIMEOUT NVS reports a timeout.
 * @retval IVTS_ERR_NOT_FOUND The SDK reports a missing resource.
 * @retval IVTS_ERR_FULL An SDK allocation fails.
 * @retval IVTS_ERR_IO Another NVS operation fails.
 * @note Context: App task after NVS initialization. Synchronous validation and flash access with no explicit
 *       timeout.
 */
ivts_err_t storage_config_save(const ivts_config_t *cfg);

/**
 * @brief Increment and commit the persistent 32-bit boot counter.
 *
 * An absent key starts the counter at one. The increment uses unsigned wraparound.
 *
 * @param[out] out Non-null boot ID destination. Written only when the commit succeeds.
 * @retval IVTS_OK The next boot ID is committed and returned.
 * @retval IVTS_ERR_INVALID_ARG The output is missing or NVS rejects its arguments.
 * @retval IVTS_ERR_INVALID_STATE NVS reports an invalid state.
 * @retval IVTS_ERR_TIMEOUT NVS reports a timeout.
 * @retval IVTS_ERR_NOT_FOUND The SDK reports a missing resource.
 * @retval IVTS_ERR_FULL An SDK allocation fails.
 * @retval IVTS_ERR_IO Another NVS operation fails.
 * @note Context: App startup after NVS initialization. Synchronous flash access with no explicit timeout.
 * @warning Serialize callers of this read-modify-write operation.
 */
ivts_err_t storage_boot_id_next(uint32_t *out);
