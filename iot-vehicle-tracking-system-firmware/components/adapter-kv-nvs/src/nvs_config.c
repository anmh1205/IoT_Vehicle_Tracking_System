#include "nvs_config.h"

#include "nvs_flash.h"

#include "esp_log.h"

#include "config_store_nvs.h"
#include "ota_context_store_nvs.h"

/**
 * @file nvs_config.c
 * @brief Compatibility facade for runtime config and OTA NVS stores.
 */

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
