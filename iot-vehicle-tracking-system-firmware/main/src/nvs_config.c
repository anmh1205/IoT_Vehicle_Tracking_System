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
#define CONFIG_TRACKER_DEFAULT_MQTT_HOST "mqtt.thingdock.dev"
#endif

#define TRACKER_LEGACY_MQTT_HOST_LOCALHOST "localhost"

#ifndef CONFIG_TRACKER_DEFAULT_MQTT_PORT
#define CONFIG_TRACKER_DEFAULT_MQTT_PORT 1883
#endif

#ifndef CONFIG_TRACKER_DEFAULT_HEARTBEAT_INTERVAL_S
#define CONFIG_TRACKER_DEFAULT_HEARTBEAT_INTERVAL_S 120
#endif

#ifndef CONFIG_TRACKER_DEFAULT_TRACKING_INTERVAL_S
#define CONFIG_TRACKER_DEFAULT_TRACKING_INTERVAL_S 1
#endif

#ifndef CONFIG_TRACKER_DEFAULT_ALARM_INTERVAL_S
#define CONFIG_TRACKER_DEFAULT_ALARM_INTERVAL_S 3
#endif

#ifndef CONFIG_TRACKER_DEFAULT_IGNITION_OFF_HOLD_MS
#define CONFIG_TRACKER_DEFAULT_IGNITION_OFF_HOLD_MS 3000
#endif

#ifndef CONFIG_TRACKER_DEFAULT_ALARM_TIMEOUT_S
#define CONFIG_TRACKER_DEFAULT_ALARM_TIMEOUT_S 300
#endif

#ifndef CONFIG_TRACKER_DEFAULT_OTA_MIN_BATTERY_MV
#define CONFIG_TRACKER_DEFAULT_OTA_MIN_BATTERY_MV 3850
#endif

#ifndef CONFIG_TRACKER_DEFAULT_IGNITION_ADC_THRESHOLD_MV
#define CONFIG_TRACKER_DEFAULT_IGNITION_ADC_THRESHOLD_MV 13000
#endif

#ifndef CONFIG_TRACKER_DEFAULT_SLEEP_ENABLED
#define CONFIG_TRACKER_DEFAULT_SLEEP_ENABLED 1
#endif

#ifndef CONFIG_TRACKER_DEFAULT_IMU_WAKEUP_ENABLED
#define CONFIG_TRACKER_DEFAULT_IMU_WAKEUP_ENABLED 0
#endif

#ifndef CONFIG_TRACKER_MODEM_APN
#define CONFIG_TRACKER_MODEM_APN "internet"
#endif

#define TRACKER_LEGACY_DEFAULT_HEARTBEAT_INTERVAL_S 900U
#define TRACKER_LEGACY_DEFAULT_TRACKING_INTERVAL_S 10U

static const char *TAG = "NVS_CONFIG";
/* Namespace and key used for whole-config blob storage. */
static const char *NVS_NAMESPACE = "tracker_cfg";
static const char *NVS_KEY = "config";
static const char *NVS_OTA_KEY = "ota_ctx_v1";

/**
 * @brief Legacy config layout before runtime policy centralization.
 */
typedef struct {
    char device_id[TRACKER_DEVICE_ID_MAX_LEN];
    char auth_token[TRACKER_AUTH_TOKEN_MAX_LEN];
    char mqtt_host[TRACKER_HOST_MAX_LEN];
    uint16_t mqtt_port;
    char mqtt_username[TRACKER_USERNAME_MAX_LEN];
    char mqtt_password[TRACKER_PASSWORD_MAX_LEN];
    uint16_t heartbeat_interval_s;
    uint16_t tracking_interval_s;
    char obd2_ble_address[TRACKER_MAC_ADDR_STR_LEN];
    bool command_subscribe_enabled;
    char apn[TRACKER_HOST_MAX_LEN];
} config_v1_t;

static uint16_t app_config_clamp_u16(uint16_t value, uint16_t min_value, uint16_t max_value) {
    return (uint16_t)util_clamp_int((int)value, (int)min_value, (int)max_value);
}

/**
 * @brief Migrate legacy config blob into current config layout.
 */
static void app_config_apply_legacy_v1(config_t *config, const config_v1_t *legacy) {
    if (config == NULL || legacy == NULL) {
        return;
    }

    util_copy_string(config->device_id, sizeof(config->device_id), legacy->device_id);
    util_copy_string(config->auth_token, sizeof(config->auth_token), legacy->auth_token);
    util_copy_string(config->mqtt_host, sizeof(config->mqtt_host), legacy->mqtt_host);
    config->mqtt_port = legacy->mqtt_port;
    util_copy_string(config->mqtt_username, sizeof(config->mqtt_username), legacy->mqtt_username);
    util_copy_string(config->mqtt_password, sizeof(config->mqtt_password), legacy->mqtt_password);
    util_copy_string(config->obd2_ble_address, sizeof(config->obd2_ble_address), legacy->obd2_ble_address);
    config->command_subscribe_enabled = legacy->command_subscribe_enabled;
    util_copy_string(config->apn, sizeof(config->apn), legacy->apn);

    /*
     * Preserve non-default legacy cadence overrides only.
     * Legacy default pair (10s / 900s) is intentionally replaced by current policy defaults.
     */
    if (legacy->tracking_interval_s != 0 &&
        legacy->tracking_interval_s != TRACKER_LEGACY_DEFAULT_TRACKING_INTERVAL_S) {
        config->tracking_interval_s = app_config_clamp_u16(legacy->tracking_interval_s,
                                                           TRACKER_CONFIG_MIN_TRACKING_INTERVAL_S,
                                                           TRACKER_CONFIG_MAX_TRACKING_INTERVAL_S);
    }

    if (legacy->heartbeat_interval_s != 0 &&
        legacy->heartbeat_interval_s != TRACKER_LEGACY_DEFAULT_HEARTBEAT_INTERVAL_S) {
        config->heartbeat_interval_s = app_config_clamp_u16(legacy->heartbeat_interval_s,
                                                            TRACKER_CONFIG_MIN_HEARTBEAT_INTERVAL_S,
                                                            TRACKER_CONFIG_MAX_HEARTBEAT_INTERVAL_S);
    }
}

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
    config->alarm_interval_s = CONFIG_TRACKER_DEFAULT_ALARM_INTERVAL_S;
    config->ignition_off_hold_ms = CONFIG_TRACKER_DEFAULT_IGNITION_OFF_HOLD_MS;
    config->alarm_timeout_s = CONFIG_TRACKER_DEFAULT_ALARM_TIMEOUT_S;
    config->ota_min_battery_mv = CONFIG_TRACKER_DEFAULT_OTA_MIN_BATTERY_MV;
    config->ignition_adc_threshold_mv = CONFIG_TRACKER_DEFAULT_IGNITION_ADC_THRESHOLD_MV;
    config->sleep_enabled = CONFIG_TRACKER_DEFAULT_SLEEP_ENABLED != 0;
    config->imu_wakeup_enabled = CONFIG_TRACKER_DEFAULT_IMU_WAKEUP_ENABLED != 0;
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

    if (util_string_empty(config->apn)) {
        return false;
    }

    if (config->tracking_interval_s < TRACKER_CONFIG_MIN_TRACKING_INTERVAL_S ||
        config->tracking_interval_s > TRACKER_CONFIG_MAX_TRACKING_INTERVAL_S) {
        return false;
    }

    if (config->heartbeat_interval_s < TRACKER_CONFIG_MIN_HEARTBEAT_INTERVAL_S) {
        return false;
    }

    if (config->alarm_interval_s < TRACKER_CONFIG_MIN_ALARM_INTERVAL_S ||
        config->alarm_interval_s > TRACKER_CONFIG_MAX_ALARM_INTERVAL_S) {
        return false;
    }

    if (config->ignition_off_hold_ms < TRACKER_CONFIG_MIN_IGNITION_OFF_HOLD_MS ||
        config->ignition_off_hold_ms > TRACKER_CONFIG_MAX_IGNITION_OFF_HOLD_MS) {
        return false;
    }

    if (config->alarm_timeout_s < TRACKER_CONFIG_MIN_ALARM_TIMEOUT_S ||
        config->alarm_timeout_s > TRACKER_CONFIG_MAX_ALARM_TIMEOUT_S) {
        return false;
    }

    if (config->ota_min_battery_mv < TRACKER_CONFIG_MIN_OTA_BATTERY_MV ||
        config->ota_min_battery_mv > TRACKER_CONFIG_MAX_OTA_BATTERY_MV) {
        return false;
    }

    if (config->ignition_adc_threshold_mv < TRACKER_CONFIG_MIN_IGNITION_ADC_THRESHOLD_MV ||
        config->ignition_adc_threshold_mv > TRACKER_CONFIG_MAX_IGNITION_ADC_THRESHOLD_MV) {
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

    size_t stored_size = 0;
    err = nvs_get_blob(handle, NVS_KEY, NULL, &stored_size);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        nvs_close(handle);
        ESP_LOGW(TAG, "Config not found, writing defaults");
        return nvs_config_save(config);
    }
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to query config blob size");

    bool migrated = false;
    if (stored_size == sizeof(*config)) {
        size_t required_size = sizeof(*config);
        err = nvs_get_blob(handle, NVS_KEY, config, &required_size);
    } else if (stored_size == sizeof(config_v1_t)) {
        config_v1_t legacy = {0};
        size_t required_size = sizeof(legacy);
        err = nvs_get_blob(handle, NVS_KEY, &legacy, &required_size);
        if (err == ESP_OK) {
            app_config_set_defaults(config);
            app_config_apply_legacy_v1(config, &legacy);
            migrated = true;
            ESP_LOGW(TAG, "Migrated runtime config from legacy blob");
        }
    } else {
        nvs_close(handle);
        ESP_LOGW(TAG,
                 "Config size mismatch in NVS stored=%lu expected=%lu (or legacy=%lu), rewriting defaults",
                 (unsigned long)stored_size,
                 (unsigned long)sizeof(*config),
                 (unsigned long)sizeof(config_v1_t));
        app_config_set_defaults(config);
        return nvs_config_save(config);
    }
    nvs_close(handle);

    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to read config blob");

    /* Repair invalid data automatically by restoring defaults. */
    if (!app_config_is_valid(config)) {
        ESP_LOGW(TAG, "Invalid config in NVS, restoring defaults");
        app_config_set_defaults(config);
        return nvs_config_save(config);
    }

    if (strcmp(config->mqtt_host, TRACKER_LEGACY_MQTT_HOST_LOCALHOST) == 0) {
        ESP_LOGW(TAG,
                 "Legacy MQTT host '%s' detected, migrating to '%s'",
                 TRACKER_LEGACY_MQTT_HOST_LOCALHOST,
                 CONFIG_TRACKER_DEFAULT_MQTT_HOST);
        util_copy_string(config->mqtt_host, sizeof(config->mqtt_host), CONFIG_TRACKER_DEFAULT_MQTT_HOST);
        migrated = true;
    }

    if (migrated) {
        return nvs_config_save(config);
    }

    return ESP_OK;
}

esp_err_t nvs_config_save_ota_context(const ota_persist_context_t *context) {
    ESP_RETURN_ON_NULL(context, ESP_ERR_INVALID_ARG, TAG, "ota context is NULL");

    nvs_handle_t handle;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to open NVS namespace");

    err = nvs_set_blob(handle, NVS_OTA_KEY, context, sizeof(*context));
    if (err == ESP_OK) {
        err = nvs_commit(handle);
    }

    nvs_close(handle);
    return err;
}

esp_err_t nvs_config_load_ota_context(ota_persist_context_t *out_context, bool *out_found) {
    ESP_RETURN_ON_NULL(out_context, ESP_ERR_INVALID_ARG, TAG, "out_context is NULL");
    ESP_RETURN_ON_NULL(out_found, ESP_ERR_INVALID_ARG, TAG, "out_found is NULL");

    memset(out_context, 0, sizeof(*out_context));
    *out_found = false;

    nvs_handle_t handle;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READONLY, &handle);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        return ESP_OK;
    }
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to open NVS namespace");

    size_t stored_size = 0;
    err = nvs_get_blob(handle, NVS_OTA_KEY, NULL, &stored_size);
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
        (void)nvs_config_clear_ota_context();
        return ESP_OK;
    }

    size_t required_size = sizeof(*out_context);
    err = nvs_get_blob(handle, NVS_OTA_KEY, out_context, &required_size);
    nvs_close(handle);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to read OTA context blob");

    out_context->job_id[TRACKER_JOB_ID_MAX_LEN - 1] = '\0';
    out_context->target_version[TRACKER_TARGET_VERSION_MAX_LEN - 1] = '\0';
    out_context->previous_version[TRACKER_TARGET_VERSION_MAX_LEN - 1] = '\0';
    out_context->partition[TRACKER_PARTITION_MAX_LEN - 1] = '\0';
    *out_found = true;
    return ESP_OK;
}

esp_err_t nvs_config_clear_ota_context(void) {
    nvs_handle_t handle;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        return ESP_OK;
    }
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to open NVS namespace");

    err = nvs_erase_key(handle, NVS_OTA_KEY);
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
