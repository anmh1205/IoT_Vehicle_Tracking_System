#include "nvs_config.h"

#include <string.h>

#include "nvs.h"
#include "nvs_flash.h"

#include "esp_check.h"
#include "esp_log.h"

#include "config_store_nvs.h"
#include "nvs_store_keys.h"
#include "ota_context_store_nvs.h"

/**
 * @file nvs_config.c
 * @brief Compatibility facade for runtime config and OTA NVS stores.
 * This translation unit belongs to the KV/NVS persistence adapter layer and keeps adapter-local state, migration rules, and persistence policy isolated behind the exported entry points.
 */


/* Logging tag for NVS configuration module. */
static const char *TAG = "NVS_CONFIG";

/**
 * @brief Initialize NVS flash storage.
 *
 * Initializes NVS. Handles version upgrade by erasing
 * if new version is found.
 *
 * @return ESP_OK on success, ESP_FAIL on error.
 */
esp_err_t nvs_config_init(void) {
    // First attempt to bring up the default NVS partition.
    esp_err_t err = nvs_flash_init();
    if (err == ESP_ERR_NVS_NO_FREE_PAGES || err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        // Either the partition is full of stale entries or it was written by a newer
        // NVS format than this build understands. Both are unrecoverable in place,
        // so erase the partition and re-initialize from a clean state.
        ESP_LOGW(TAG, "NVS re-init required, erasing...");
        ESP_ERROR_CHECK(nvs_flash_erase());
        err = nvs_flash_init();
    }
    return err;
}

/**
 * @brief Load runtime configuration from NVS.
 *
 * @param config Output config structure.
 * @return ESP_OK on success, ESP_FAIL on error.
 */
esp_err_t nvs_config_load(config_t *config) {
    // Thin facade: delegate to the dedicated runtime-config store (handles defaults/migration).
    return config_store_nvs_load(config);
}

/**
 * @brief Save runtime configuration to NVS.
 *
 * @param config Config to save.
 * @return ESP_OK on success, ESP_FAIL on error.
 */
esp_err_t nvs_config_save(const config_t *config) {
    // Thin facade: delegate to the dedicated runtime-config store.
    return config_store_nvs_save(config);
}

/**
 * @brief Save OTA context to NVS.
 *
 * @param context OTA context to persist.
 * @return ESP_OK on success, ESP_FAIL on error.
 */
esp_err_t nvs_config_save_ota_context(const ota_persist_context_t *context) {
    // Thin facade: delegate to the OTA-context blob store.
    return ota_context_store_nvs_save(context);
}

/**
 * @brief Load OTA context from NVS.
 *
 * @param out_context Output for loaded context.
 * @param out_found Output flag indicating if context was found.
 * @return ESP_OK on success, ESP_FAIL on error.
 */
esp_err_t nvs_config_load_ota_context(ota_persist_context_t *out_context, bool *out_found) {
    // Thin facade: delegate to the OTA-context blob store.
    return ota_context_store_nvs_load(out_context, out_found);
}

/**
 * @brief Clear OTA context from NVS.
 *
 * @return ESP_OK.
 */
esp_err_t nvs_config_clear_ota_context(void) {
    // Thin facade: delegate to the OTA-context blob store.
    return ota_context_store_nvs_clear();
}

/**
 * @brief Persist the active session-recovery context to NVS.
 *
 * Stores the boot/session identifiers as a single binary blob so the device can
 * reconcile an interrupted drive/session after an unexpected reset.
 *
 * @param context Session context to persist (must be non-null).
 *
 * @return ESP_OK on success, ESP_ERR_INVALID_ARG on null input, otherwise an NVS error.
 */
esp_err_t nvs_config_save_session_context(const session_persist_context_t *context) {
    // Guard against a null pointer before attempting a sizeof(*context) blob write.
    if (context == NULL) {
        ESP_LOGE(TAG, "session context is NULL");
        return ESP_ERR_INVALID_ARG;
    }

    // Open the shared tracker namespace read-write to create/overwrite the session blob.
    nvs_handle_t handle = 0;
    esp_err_t err = nvs_open(TRACKER_NVS_NAMESPACE, NVS_READWRITE, &handle);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to open NVS namespace");

    // Stage the blob, then commit so the session survives a power cut.
    err = nvs_set_blob(handle, TRACKER_NVS_SESSION_CONTEXT_KEY, context, sizeof(*context));
    if (err == ESP_OK) {
        err = nvs_commit(handle); // Commit only when the staged write succeeded.
    }
    nvs_close(handle);
    return err;
}

/**
 * @brief Load the persisted session-recovery context from NVS, if present.
 *
 * Mirrors the OTA-context loader: a missing namespace/key yields a clean
 * "not found" result, and a blob whose size does not match the current struct
 * layout is erased so stale data can never be misinterpreted after a firmware
 * struct change.
 *
 * @param out_context Destination context buffer (zeroed first, must be non-null).
 * @param out_found   Set true only when a valid, current-format context was read.
 *
 * @return ESP_OK on success or clean not-found, otherwise an NVS error.
 */
esp_err_t nvs_config_load_session_context(session_persist_context_t *out_context, bool *out_found) {
    // Both outputs are required; bail out before touching NVS if either is null.
    if (out_context == NULL || out_found == NULL) {
        ESP_LOGE(TAG, "session load outputs are NULL");
        return ESP_ERR_INVALID_ARG;
    }

    // Safe baseline: zeroed context and "not found" until a valid blob is confirmed.
    memset(out_context, 0, sizeof(*out_context));
    *out_found = false;

    // Open read-only; absent namespace simply means no session was ever stored.
    nvs_handle_t handle = 0;
    esp_err_t err = nvs_open(TRACKER_NVS_NAMESPACE, NVS_READONLY, &handle);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        return ESP_OK;
    }
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to open NVS namespace");

    // Probe the stored size with a NULL buffer before allocating/copying.
    size_t stored_size = 0;
    err = nvs_get_blob(handle, TRACKER_NVS_SESSION_CONTEXT_KEY, NULL, &stored_size);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        nvs_close(handle);
        return ESP_OK; // Key absent -> nothing to recover.
    }
    if (err != ESP_OK) {
        nvs_close(handle);
        return err; // Genuine read error.
    }
    if (stored_size != sizeof(*out_context)) {
        // Layout changed across firmware versions: discard the incompatible blob.
        nvs_close(handle);
        ESP_LOGW(TAG,
                 "Session context size mismatch stored=%lu expected=%lu; clearing key",
                 (unsigned long)stored_size,
                 (unsigned long)sizeof(*out_context));
        (void)nvs_config_clear_session_context();
        return ESP_OK;
    }

    // Size matches the current struct: copy the blob into the caller's buffer.
    size_t required_size = sizeof(*out_context);
    err = nvs_get_blob(handle, TRACKER_NVS_SESSION_CONTEXT_KEY, out_context, &required_size);
    nvs_close(handle);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to read session context blob");

    // Defensively terminate the boot-id string in case stored bytes were not NUL-terminated.
    out_context->boot_id[TRACKER_SESSION_BOOT_ID_LEN - 1] = '\0';
    *out_found = true;
    return ESP_OK;
}

/**
 * @brief Erase the persisted session-recovery context from NVS.
 *
 * Called once a session has been reconciled (or abandoned). A missing
 * namespace or key is treated as success since the cleared end-state is met.
 *
 * @return ESP_OK on success or when nothing existed to erase, otherwise an NVS error.
 */
esp_err_t nvs_config_clear_session_context(void) {
    // Open read-write to erase; absent namespace already satisfies "cleared".
    nvs_handle_t handle = 0;
    esp_err_t err = nvs_open(TRACKER_NVS_NAMESPACE, NVS_READWRITE, &handle);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        return ESP_OK;
    }
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to open NVS namespace");

    // Erase the key; a never-written key is still the desired cleared result.
    err = nvs_erase_key(handle, TRACKER_NVS_SESSION_CONTEXT_KEY);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        nvs_close(handle);
        return ESP_OK;
    }
    if (err == ESP_OK) {
        err = nvs_commit(handle); // Persist the erase so it survives reboot.
    }
    nvs_close(handle);
    return err;
}
