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

esp_err_t ota_context_store_nvs_save(const ota_persist_context_t *context) {
    ESP_RETURN_ON_NULL(context, ESP_ERR_INVALID_ARG, TAG, "ota context is NULL");

    nvs_handle_t handle = 0;
    esp_err_t err = nvs_open(TRACKER_NVS_NAMESPACE, NVS_READWRITE, &handle);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to open NVS namespace");

    err = nvs_set_blob(handle, TRACKER_NVS_OTA_CONTEXT_KEY, context, sizeof(*context));
    if (err == ESP_OK) {
        err = nvs_commit(handle);
    }
    nvs_close(handle);
    return err;
}

esp_err_t ota_context_store_nvs_load(ota_persist_context_t *out_context, bool *out_found) {
    ESP_RETURN_ON_NULL(out_context, ESP_ERR_INVALID_ARG, TAG, "out_context is NULL");
    ESP_RETURN_ON_NULL(out_found, ESP_ERR_INVALID_ARG, TAG, "out_found is NULL");

    memset(out_context, 0, sizeof(*out_context));
    *out_found = false;

    nvs_handle_t handle = 0;
    esp_err_t err = nvs_open(TRACKER_NVS_NAMESPACE, NVS_READONLY, &handle);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        return ESP_OK;
    }
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to open NVS namespace");

    size_t stored_size = 0;
    err = nvs_get_blob(handle, TRACKER_NVS_OTA_CONTEXT_KEY, NULL, &stored_size);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        nvs_close(handle);
        return ESP_OK;
    }
    if (err != ESP_OK) {
        nvs_close(handle);
        return err;
    }
    if (stored_size != sizeof(*out_context)) {
        nvs_close(handle);
        ESP_LOGW(TAG,
                 "OTA context size mismatch in NVS stored=%lu expected=%lu; clearing key",
                 (unsigned long)stored_size,
                 (unsigned long)sizeof(*out_context));
        (void)ota_context_store_nvs_clear();
        return ESP_OK;
    }

    size_t required_size = sizeof(*out_context);
    err = nvs_get_blob(handle, TRACKER_NVS_OTA_CONTEXT_KEY, out_context, &required_size);
    nvs_close(handle);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to read OTA context blob");

    out_context->job_id[TRACKER_JOB_ID_MAX_LEN - 1] = '\0';
    out_context->target_version[TRACKER_TARGET_VERSION_MAX_LEN - 1] = '\0';
    out_context->previous_version[TRACKER_TARGET_VERSION_MAX_LEN - 1] = '\0';
    out_context->partition[TRACKER_PARTITION_MAX_LEN - 1] = '\0';
    *out_found = true;
    return ESP_OK;
}

esp_err_t ota_context_store_nvs_clear(void) {
    nvs_handle_t handle = 0;
    esp_err_t err = nvs_open(TRACKER_NVS_NAMESPACE, NVS_READWRITE, &handle);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        return ESP_OK;
    }
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to open NVS namespace");

    err = nvs_erase_key(handle, TRACKER_NVS_OTA_CONTEXT_KEY);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        nvs_close(handle);
        return ESP_OK;
    }
    if (err == ESP_OK) {
        err = nvs_commit(handle);
    }
    nvs_close(handle);
    return err;
}
