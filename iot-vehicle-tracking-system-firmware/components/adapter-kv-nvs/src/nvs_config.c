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
    esp_err_t err = nvs_flash_init();
    if (err == ESP_ERR_NVS_NO_FREE_PAGES || err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
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
    return config_store_nvs_load(config);
}

/**
 * @brief Save runtime configuration to NVS.
 *
 * @param config Config to save.
 * @return ESP_OK on success, ESP_FAIL on error.
 */
esp_err_t nvs_config_save(const config_t *config) {
    return config_store_nvs_save(config);
}

/**
 * @brief Save OTA context to NVS.
 *
 * @param context OTA context to persist.
 * @return ESP_OK on success, ESP_FAIL on error.
 */
esp_err_t nvs_config_save_ota_context(const ota_persist_context_t *context) {
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
    return ota_context_store_nvs_load(out_context, out_found);
}

/**
 * @brief Clear OTA context from NVS.
 *
 * @return ESP_OK.
 */
esp_err_t nvs_config_clear_ota_context(void) {
    return ota_context_store_nvs_clear();
}

esp_err_t nvs_config_save_session_context(const session_persist_context_t *context) {
    if (context == NULL) {
        ESP_LOGE(TAG, "session context is NULL");
        return ESP_ERR_INVALID_ARG;
    }

    nvs_handle_t handle = 0;
    esp_err_t err = nvs_open(TRACKER_NVS_NAMESPACE, NVS_READWRITE, &handle);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to open NVS namespace");

    err = nvs_set_blob(handle, TRACKER_NVS_SESSION_CONTEXT_KEY, context, sizeof(*context));
    if (err == ESP_OK) {
        err = nvs_commit(handle);
    }
    nvs_close(handle);
    return err;
}

esp_err_t nvs_config_load_session_context(session_persist_context_t *out_context, bool *out_found) {
    if (out_context == NULL || out_found == NULL) {
        ESP_LOGE(TAG, "session load outputs are NULL");
        return ESP_ERR_INVALID_ARG;
    }

    memset(out_context, 0, sizeof(*out_context));
    *out_found = false;

    nvs_handle_t handle = 0;
    esp_err_t err = nvs_open(TRACKER_NVS_NAMESPACE, NVS_READONLY, &handle);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        return ESP_OK;
    }
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to open NVS namespace");

    size_t stored_size = 0;
    err = nvs_get_blob(handle, TRACKER_NVS_SESSION_CONTEXT_KEY, NULL, &stored_size);
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
                 "Session context size mismatch stored=%lu expected=%lu; clearing key",
                 (unsigned long)stored_size,
                 (unsigned long)sizeof(*out_context));
        (void)nvs_config_clear_session_context();
        return ESP_OK;
    }

    size_t required_size = sizeof(*out_context);
    err = nvs_get_blob(handle, TRACKER_NVS_SESSION_CONTEXT_KEY, out_context, &required_size);
    nvs_close(handle);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to read session context blob");

    out_context->boot_id[TRACKER_SESSION_BOOT_ID_LEN - 1] = '\0';
    *out_found = true;
    return ESP_OK;
}

esp_err_t nvs_config_clear_session_context(void) {
    nvs_handle_t handle = 0;
    esp_err_t err = nvs_open(TRACKER_NVS_NAMESPACE, NVS_READWRITE, &handle);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        return ESP_OK;
    }
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to open NVS namespace");

    err = nvs_erase_key(handle, TRACKER_NVS_SESSION_CONTEXT_KEY);
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
