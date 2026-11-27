/**
 * @file nvs_store.h
 * @brief Synchronous access to versioned NVS records, device config and boot ID.
 *
 * The record envelope validates layout version, byte length and CRC.
 * Operations can wait on flash and return errors to callers.
 */
#pragma once
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/model/config.h"

#define STORAGE_RECORD_PAYLOAD_MAX 1537u

/* Read or commit a single versioned NVS record. Copy into the caller buffer after validation. */
ivts_err_t storage_record_load(const char *key, uint16_t version, void *buffer, size_t len);
ivts_err_t storage_record_save(const char *key, uint16_t version, const void *buffer, size_t len);

/**
 * @brief Load and validate the NVS configuration.
 *
 * On failure, fill @p out with core defaults. An absent key is normal on a new
 * device. Other failures also emit IVTS_EV_CONFIG_CORRUPT.
 *
 * @retval IVTS_OK Stored configuration loaded.
 * @retval IVTS_ERR_NOT_FOUND No stored configuration.
 * @retval IVTS_ERR_CRC A corrupt header or payload was detected.
 * @retval IVTS_ERR_VERSION Stored version or length does not match.
 * @retval IVTS_ERR_IO Another NVS operation failed.
 */
ivts_err_t storage_config_load(ivts_config_t *out);

/**
 * @brief Validate and commit the configuration as one versioned NVS blob.
 * @retval IVTS_ERR_INVALID_ARG Configuration is absent or invalid.
 */
ivts_err_t storage_config_save(const ivts_config_t *cfg);

/**
 * @brief Increment and commit the NVS boot counter, returning the new boot ID.
 */
ivts_err_t storage_boot_id_next(uint32_t *out);
