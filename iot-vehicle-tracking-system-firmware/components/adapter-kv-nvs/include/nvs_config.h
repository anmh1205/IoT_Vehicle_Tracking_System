#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "app_config.h"
#include "esp_err.h"

/**
 * @file nvs_config.h
 * @brief NVS-backed persistence helpers for tracker runtime configuration.
 * This header belongs to the KV/NVS persistence adapter layer and exposes the persistence boundary so higher layers do not depend on raw NVS keys or blob layouts.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief Initialize NVS flash storage subsystem.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t nvs_config_init(void);

/**
 * @brief Load runtime config from NVS (and write defaults when missing/invalid).
 *
 * @param config Output config object.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t nvs_config_load(config_t *config);

/**
 * @brief Save runtime config into NVS.
 *
 * @param config Config object to persist.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t nvs_config_save(const config_t *config);

/**
 * @brief Persist the cloud-controlled tracking-enabled desired state.
 *
 * @param enabled Desired tracking state.
 * @return ESP_OK on committed persistence, otherwise an NVS error.
 */
esp_err_t nvs_config_save_tracking_enabled(bool enabled);

/**
 * @brief Load the persisted tracking-enabled desired state.
 *
 * Missing key is a clean not-found result so legacy devices retain the
 * historical default of tracking enabled.
 *
 * @param out_enabled Output state (defaults true when not found).
 * @param out_found Set true only when a persisted value exists.
 * @return ESP_OK on success/not-found, otherwise an NVS error.
 */
esp_err_t nvs_config_load_tracking_enabled(bool *out_enabled, bool *out_found);

/**
 * @brief OTA confirm context persisted in NVS across reboot.
 *
 * Captures everything the post-reboot OTA state machine needs to decide whether
 * to confirm a freshly booted image or roll back to the previous one.
 */
typedef struct {
    bool pending_confirm;                              /**< True while a booted image still awaits confirm/rollback. */
    uint32_t confirm_timeout_sec;                      /**< Allowed window (seconds) to confirm before auto-rollback. */
    uint64_t confirm_deadline_ms;                      /**< Absolute deadline (epoch ms) by which confirm must occur. */
    char job_id[TRACKER_JOB_ID_MAX_LEN];               /**< Backend OTA job identifier driving this update. */
    char target_version[TRACKER_TARGET_VERSION_MAX_LEN];   /**< Firmware version being flashed/confirmed. */
    char previous_version[TRACKER_TARGET_VERSION_MAX_LEN]; /**< Prior version, used for rollback reporting. */
    char partition[TRACKER_PARTITION_MAX_LEN];         /**< OTA partition label holding the new image. */
} ota_persist_context_t;

/** @brief Max length of the per-boot identifier string (incl. NUL). */
#define TRACKER_SESSION_BOOT_ID_LEN 48

/** @brief Number of recently accepted cloud commands retained across reconnect/reboot. */
#define TRACKER_COMMAND_DEDUPE_CACHE_LEN 32U

/**
 * @brief Persistent application-level dedupe window for cloud command IDs.
 */
typedef struct {
    uint64_t command_ids[TRACKER_COMMAND_DEDUPE_CACHE_LEN];
    uint32_t cursor;
} command_dedupe_context_t;

/**
 * @brief Session-recovery context persisted across an unexpected reset.
 *
 * Lets the device reconcile an interrupted drive/session after reboot by
 * re-linking the local session key to its canonical backend session ID.
 */
typedef struct {
    bool active;                              /**< True when a session was in progress at persist time. */
    uint32_t local_session_key;              /**< Device-local handle for the in-progress session. */
    uint64_t canonical_session_id;           /**< Backend-assigned canonical session identifier. */
    char boot_id[TRACKER_SESSION_BOOT_ID_LEN]; /**< Boot ID that owns the logical session identity. */
    bool start_boundary_pending;              /**< True until running/started is durably accepted. */
} session_persist_context_t;

/**
 * @brief Persist OTA confirmation context for post-reboot reconciliation.
 *
 * @param context OTA context to save.
 *
 * @return ESP_OK on success, otherwise NVS error.
 */
esp_err_t nvs_config_save_ota_context(const ota_persist_context_t *context);

/**
 * @brief Load persisted OTA confirmation context.
 *
 * @param out_context Output OTA context.
 * @param out_found Set true when persisted context exists and is valid.
 *
 * @return ESP_OK on success, otherwise NVS error.
 */
esp_err_t nvs_config_load_ota_context(ota_persist_context_t *out_context, bool *out_found);

/**
 * @brief Clear persisted OTA confirmation context.
 *
 * @return ESP_OK on success, otherwise NVS error.
 */
esp_err_t nvs_config_clear_ota_context(void);

/**
 * @brief Persist the active session-recovery context for post-reboot reconciliation.
 *
 * @param context Session context to save.
 *
 * @return ESP_OK on success, otherwise NVS error.
 */
esp_err_t nvs_config_save_session_context(const session_persist_context_t *context);

/**
 * @brief Load the persisted session-recovery context.
 *
 * @param out_context Output session context.
 * @param out_found Set true when a valid persisted context exists.
 *
 * @return ESP_OK on success, otherwise NVS error.
 */
esp_err_t nvs_config_load_session_context(session_persist_context_t *out_context, bool *out_found);

/**
 * @brief Clear the persisted session-recovery context.
 *
 * @return ESP_OK on success, otherwise NVS error.
 */
esp_err_t nvs_config_clear_session_context(void);

/**
 * @brief Persist the bounded recent-command dedupe window.
 */
esp_err_t nvs_config_save_command_dedupe_context(const command_dedupe_context_t *context);

/**
 * @brief Load the bounded recent-command dedupe window.
 *
 * @param out_context Output context, zeroed when no stored window exists.
 * @param out_found Set true only when a valid current-format window was loaded.
 */
esp_err_t nvs_config_load_command_dedupe_context(command_dedupe_context_t *out_context,
                                                  bool *out_found);
