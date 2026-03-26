#include "nvs_config.h"

#include <string.h>

#include "sdkconfig.h"

#include "nvs.h"
#include "nvs_flash.h"

#include "esp_log.h"

#include "util.h"

/**
 * @file nvs_config.c
 * @brief Runtime configuration persistence in NVS with validation/fallback logic.
 */

#ifndef CONFIG_TRACKER_DEFAULT_DEVICE_ID
#define CONFIG_TRACKER_DEFAULT_DEVICE_ID "TRACKER_001"
#endif

#ifndef CONFIG_TRACKER_DEFAULT_AUTH_TOKEN
#define CONFIG_TRACKER_DEFAULT_AUTH_TOKEN "device-secret-token"
#endif

#ifndef CONFIG_TRACKER_DEFAULT_MQTT_HOST
#define CONFIG_TRACKER_DEFAULT_MQTT_HOST "localhost"
#endif

#ifndef CONFIG_TRACKER_DEFAULT_MQTT_PORT
#define CONFIG_TRACKER_DEFAULT_MQTT_PORT 1883
#endif

#ifndef CONFIG_TRACKER_DEFAULT_HEARTBEAT_INTERVAL_S
#define CONFIG_TRACKER_DEFAULT_HEARTBEAT_INTERVAL_S 900
#endif

#ifndef CONFIG_TRACKER_DEFAULT_TRACKING_INTERVAL_S
#define CONFIG_TRACKER_DEFAULT_TRACKING_INTERVAL_S 10
#endif

#ifndef CONFIG_TRACKER_MODEM_APN
#define CONFIG_TRACKER_MODEM_APN "internet"
#endif

static const char *TAG = "NVS_CONFIG";
/* Namespace and key used for whole-config blob storage. */
static const char *NVS_NAMESPACE = "tracker_cfg";
static const char *NVS_KEY = "config";

/**
 * @brief Populate default runtime configuration.
 *
 * @param config Output config.
 */
void app_config_set_defaults(config_t *config) {
    if (config == NULL) {
        return;
    }

    memset(config, 0, sizeof(*config));
    util_copy_string(config->device_id, sizeof(config->device_id), CONFIG_TRACKER_DEFAULT_DEVICE_ID);
    util_copy_string(config->auth_token, sizeof(config->auth_token), CONFIG_TRACKER_DEFAULT_AUTH_TOKEN);
    util_copy_string(config->mqtt_host, sizeof(config->mqtt_host), CONFIG_TRACKER_DEFAULT_MQTT_HOST);
    config->mqtt_port = CONFIG_TRACKER_DEFAULT_MQTT_PORT;
    config->heartbeat_interval_s = CONFIG_TRACKER_DEFAULT_HEARTBEAT_INTERVAL_S;
    config->tracking_interval_s = CONFIG_TRACKER_DEFAULT_TRACKING_INTERVAL_S;
    config->lvd_threshold_v = 12.0f;
    config->lvd_hysteresis_v = 12.2f;
#if defined(CONFIG_TRACKER_ENABLE_COMMAND_SUBSCRIBE)
    config->command_subscribe_enabled = CONFIG_TRACKER_ENABLE_COMMAND_SUBSCRIBE;
#else
    config->command_subscribe_enabled = true;
#endif
    util_copy_string(config->apn, sizeof(config->apn), CONFIG_TRACKER_MODEM_APN);
}

/**
 * @brief Validate runtime configuration fields and constraints.
 *
 * @param config Config pointer.
 *
 * @return true when valid, false otherwise.
 */
bool app_config_is_valid(const config_t *config) {
    if (config == NULL) {
        return false;
    }

    if (util_string_empty(config->device_id) || util_string_empty(config->auth_token)) {
        return false;
    }

    if (util_string_empty(config->mqtt_host) || config->mqtt_port == 0) {
        return false;
    }

    if (config->tracking_interval_s == 0 || config->heartbeat_interval_s == 0) {
        return false;
    }

    if (config->lvd_hysteresis_v < config->lvd_threshold_v) {
        return false;
    }

    return true;
}

/**
 * @brief Initialize NVS flash and handle version/full-page recovery.
 *
 * @return ESP_OK on success, otherwise NVS error code.
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
 * @brief Save runtime config blob into NVS.
 *
 * @param config Config pointer.
 *
 * @return ESP_OK on success, otherwise NVS error code.
 */
esp_err_t nvs_config_save(const config_t *config) {
    ESP_RETURN_ON_NULL(config, ESP_ERR_INVALID_ARG, TAG, "config is NULL");

    nvs_handle_t handle;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to open NVS namespace");

    /* Write full config struct as one atomic blob. */
    err = nvs_set_blob(handle, NVS_KEY, config, sizeof(*config));
    if (err == ESP_OK) {
        err = nvs_commit(handle);
    }

    nvs_close(handle);
    return err;
}

/**
 * @brief Load runtime config from NVS with self-healing fallback behavior.
 *
 * @param config Output config object.
 *
 * @return ESP_OK on success, otherwise error code.
 */
esp_err_t nvs_config_load(config_t *config) {
    ESP_RETURN_ON_NULL(config, ESP_ERR_INVALID_ARG, TAG, "config is NULL");

    /* Start from defaults so partial failures still yield safe values. */
    app_config_set_defaults(config);

    nvs_handle_t handle;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READONLY, &handle);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        ESP_LOGW(TAG, "NVS namespace not found, writing defaults");
        return nvs_config_save(config);
    }
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to open NVS namespace");

    size_t required_size = sizeof(*config);
    err = nvs_get_blob(handle, NVS_KEY, config, &required_size);
    nvs_close(handle);

    if (err == ESP_ERR_NVS_NOT_FOUND) {
        ESP_LOGW(TAG, "Config not found, writing defaults");
        return nvs_config_save(config);
    }

    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to read config blob");

    /* Repair invalid data automatically by restoring defaults. */
    if (!app_config_is_valid(config)) {
        ESP_LOGW(TAG, "Invalid config in NVS, restoring defaults");
        app_config_set_defaults(config);
        return nvs_config_save(config);
    }

    return ESP_OK;
}
