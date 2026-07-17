#include "ota_context_store_nvs.h"

#include <string.h>

#include "nvs.h"

#include "esp_log.h"

#include "nvs_store_keys.h"
#include "util.h"

/**
 * @file ota_context_store_nvs.c
 * @brief OTA confirm-context blob persistence helpers.
 * This translation unit belongs to the KV/NVS persistence adapter layer and keeps adapter-local state, migration rules, and persistence policy isolated behind the exported entry points.
 */


/* Logging tag for OTA context store NVS module. */
static const char *TAG = "OTA_CONTEXT_STORE";

/**
 * @brief Persist the OTA confirm-context blob to NVS flash.
 *
 * Serializes the entire fixed-size context struct as a single binary blob under
 * the OTA key so the post-reboot confirm/rollback decision survives power loss.
 *
 * @param context Fully populated OTA context to store (must be non-null).
 *
 * @return ESP_OK on success, ESP_ERR_INVALID_ARG on null input, otherwise an NVS error.
 */
esp_err_t ota_context_store_nvs_save(const ota_persist_context_t *context) {
    // Reject a null context early: writing sizeof(*context) bytes from NULL would fault.
    ESP_RETURN_ON_NULL(context, ESP_ERR_INVALID_ARG, TAG, "ota context is NULL");

    // Open the tracker namespace in read-write mode so the blob can be created/overwritten.
    nvs_handle_t handle = 0;
    esp_err_t err = nvs_open(TRACKER_NVS_NAMESPACE, NVS_READWRITE, &handle);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to open NVS namespace");

    // Stage the blob write, then commit so the change is flushed to flash atomically.
    err = nvs_set_blob(handle, TRACKER_NVS_OTA_CONTEXT_KEY, context, sizeof(*context));
    if (err == ESP_OK) {
        err = nvs_commit(handle); // Only commit when the staged write succeeded.
    }
    nvs_close(handle); // Always release the handle, even on the write/commit failure path.
    return err;
}

/**
 * @brief Load the persisted OTA confirm-context blob from NVS, if present.
 *
 * Treats "no namespace" and "no key" as a clean not-found result (out_found=false),
 * since a device that never started an OTA simply has nothing stored. A blob whose
 * size does not match the current struct layout is considered incompatible (e.g.
 * after a firmware struct change) and is erased to avoid feeding garbage into the
 * OTA state machine.
 *
 * @param out_context Destination context buffer (zeroed before use, must be non-null).
 * @param out_found   Set true only when a valid, current-format context was read.
 *
 * @return ESP_OK on success or clean not-found, otherwise an NVS error.
 */
esp_err_t ota_context_store_nvs_load(ota_persist_context_t *out_context, bool *out_found) {
    ESP_RETURN_ON_NULL(out_context, ESP_ERR_INVALID_ARG, TAG, "out_context is NULL");
    ESP_RETURN_ON_NULL(out_found, ESP_ERR_INVALID_ARG, TAG, "out_found is NULL");

    // Establish a safe baseline: zeroed context and "not found" until a valid blob is read.
    memset(out_context, 0, sizeof(*out_context));
    *out_found = false;

    // Open read-only; a missing namespace just means nothing was ever persisted.
    nvs_handle_t handle = 0;
    esp_err_t err = nvs_open(TRACKER_NVS_NAMESPACE, NVS_READONLY, &handle);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        return ESP_OK; // No namespace yet -> clean "no context" result.
    }
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to open NVS namespace");

    // First probe with a NULL buffer to learn the stored blob size without copying.
    size_t stored_size = 0;
    err = nvs_get_blob(handle, TRACKER_NVS_OTA_CONTEXT_KEY, NULL, &stored_size);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        nvs_close(handle);
        return ESP_OK; // Key absent -> nothing to load.
    }
    if (err != ESP_OK) {
        nvs_close(handle);
        return err; // Real read error: propagate to caller.
    }
    if (stored_size != sizeof(*out_context)) {
        // Size mismatch means the on-flash layout no longer matches this firmware's struct.
        // Erase the stale blob so the OTA logic never parses an incompatible context.
        nvs_close(handle);
        ESP_LOGW(TAG,
                 "OTA context size mismatch in NVS stored=%lu expected=%lu; clearing key",
                 (unsigned long)stored_size,
                 (unsigned long)sizeof(*out_context));
        (void)ota_context_store_nvs_clear();
        return ESP_OK;
    }

    // Size matches: copy the blob into the output struct.
    size_t required_size = sizeof(*out_context);
    err = nvs_get_blob(handle, TRACKER_NVS_OTA_CONTEXT_KEY, out_context, &required_size);
    nvs_close(handle);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to read OTA context blob");

    // Defensively NUL-terminate every fixed-size string field in case the stored
    // bytes were not terminated, so later string operations cannot run off the end.
    out_context->job_id[TRACKER_JOB_ID_MAX_LEN - 1] = '\0';
    out_context->target_version[TRACKER_TARGET_VERSION_MAX_LEN - 1] = '\0';
    out_context->previous_version[TRACKER_TARGET_VERSION_MAX_LEN - 1] = '\0';
    out_context->partition[TRACKER_PARTITION_MAX_LEN - 1] = '\0';
    *out_found = true; // A valid, current-format context is now available to the caller.
    return ESP_OK;
}

/**
 * @brief Erase the persisted OTA confirm-context blob from NVS.
 *
 * Used after an OTA is confirmed/rolled back, or when a stale/incompatible blob
 * is detected. A missing namespace or missing key is treated as success since
 * the desired end state (no stored context) is already true.
 *
 * @return ESP_OK on success or when nothing existed to erase, otherwise an NVS error.
 */
esp_err_t ota_context_store_nvs_clear(void) {
    // Open read-write so the key can be erased; a missing namespace is already "cleared".
    nvs_handle_t handle = 0;
    esp_err_t err = nvs_open(TRACKER_NVS_NAMESPACE, NVS_READWRITE, &handle);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        return ESP_OK; // Nothing persisted yet -> already in the cleared state.
    }
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to open NVS namespace");

    // Erase the key; if it was never written, that is still the desired result.
    err = nvs_erase_key(handle, TRACKER_NVS_OTA_CONTEXT_KEY);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        nvs_close(handle);
        return ESP_OK; // Key absent -> treat as successfully cleared.
    }
    if (err == ESP_OK) {
        err = nvs_commit(handle); // Flush the erase to flash so it survives reboot.
    }
    nvs_close(handle);
    return err;
}
