#pragma once

#include "app_config.h"
#include "esp_err.h"
#include "ota_contract.h"

/**
 * @file ota_executor.h
 * @brief OTA apply and rollback entrypoints owned by the OTA domain.
 * This header belongs to the OTA domain layer and defines the OTA policy boundary that adapters and app-core use without duplicating upgrade rules.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief Progress sink invoked as the OTA flow advances through its stages.
 *
 * @param status Immutable status snapshot for the current OTA milestone.
 * @param user_ctx Opaque context pointer supplied when the callback was registered.
 */
typedef void (*ota_status_callback_t)(const firmware_status_t *status, void *user_ctx);

/**
 * @brief Commit durable post-boot confirmation state before boot promotion.
 *
 * Invoked only after the image has been fully verified and esp_ota_end()
 * succeeded, but before esp_ota_set_boot_partition().
 */
typedef esp_err_t (*ota_preboot_commit_callback_t)(const ota_command_t *cmd,
                                                   const firmware_status_t *status,
                                                   void *user_ctx);

/**
 * @brief Download, verify, and install a firmware image, then mark it bootable.
 *
 * Runs the full OTA pipeline over the modem HTTPS transport: selects the
 * inactive OTA slot, streams the image (binary or hex), validates the ESP image
 * magic byte and SHA-256 against the manifest, and only then switches the boot
 * partition. The flow is fail-safe: any error aborts the partial write so the
 * device keeps booting the currently running image.
 *
 * @param[in] cfg Runtime configuration (device identity, OTA policy thresholds).
 * @param[in] current_version Version string currently running on the device.
 * @param[in] cmd Validated OTA command (URL, size, SHA-256, job ID).
 * @param[out] out_status Status object populated through every stage.
 * @param[in] status_callback Optional progress sink (may be NULL).
 * @param[in] status_callback_ctx Opaque context forwarded to @p status_callback.
 * @param[in] preboot_commit_callback Optional durable-state gate invoked before boot promotion.
 * @param[in] preboot_commit_ctx Opaque context forwarded to @p preboot_commit_callback.
 * @return ESP_OK when the image is verified and marked for next boot, else an
 *         ESP-IDF error code with @p out_status carrying the failure reason.
 */
esp_err_t util_ota_apply_update(const config_t *cfg,
                                const char *current_version,
                                const ota_command_t *cmd,
                                firmware_status_t *out_status,
                                ota_status_callback_t status_callback,
                                void *status_callback_ctx,
                                ota_preboot_commit_callback_t preboot_commit_callback,
                                void *preboot_commit_ctx);

/**
 * @brief Switch the boot partition back to a known-good image.
 *
 * Picks a safe fallback target in priority order: the alternate OTA slot when
 * running from ota_0, otherwise the factory app, otherwise ota_0. Used to
 * recover from a bad update without requiring a fresh download.
 *
 * @param[out] out_status Status object describing the rollback outcome/partition.
 * @return ESP_OK when a boot partition was set, ESP_ERR_NOT_FOUND when no
 *         rollback target exists, or another ESP-IDF error code.
 */
esp_err_t util_ota_trigger_manual_rollback(firmware_status_t *out_status);
