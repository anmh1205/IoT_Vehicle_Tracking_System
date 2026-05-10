#include "config_store_nvs.h"

#include <string.h>

#include "nvs.h"

#include "esp_log.h"

#include "nvs_store_keys.h"
#include "util.h"

/**
 * @file config_store_nvs.c
 * @brief Runtime-config blob load/save with migration and repair logic.
 * This translation unit belongs to the KV/NVS persistence adapter layer and keeps adapter-local state, migration rules, and persistence policy isolated behind the exported entry points.
 */

// File-local constants, retained state, and helper wiring stay private here so
// higher layers interact with this module through its exported contract.


#define TRACKER_LEGACY_MQTT_HOST_LOCALHOST "localhost"
#define TRACKER_LEGACY_DEFAULT_HEARTBEAT_INTERVAL_S 900U
#define TRACKER_LEGACY_DEFAULT_TRACKING_INTERVAL_S 10U

/* Logging tag for config store NVS module. */
static const char *TAG = "CONFIG_STORE_NVS";

/** Legacy config v1 structure. */
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

/**
 * @brief Clamp unsigned 16-bit value.
 */
static uint16_t config_store_clamp_u16(uint16_t value, uint16_t min_value, uint16_t max_value) {
    // Keep this public facade thin and forward the real work to the focused implementation below.
    return (uint16_t)util_clamp_int((int)value, (int)min_value, (int)max_value);
}

static void config_store_apply_legacy_v1(config_t *config, const config_v1_t *legacy) {
    // Apply store apply legacy v1 in one place so this module keeps a single authoritative writer.
    if (config == NULL || legacy == NULL) {
        return;
    }

    /*
     * Start from current defaults, then overlay only fields that existed in v1.
     * Newer fields keep safe defaults instead of inheriting zero-filled memory.
     */
    util_copy_string(config->device_id, sizeof(config->device_id), legacy->device_id);
    util_copy_string(config->auth_token, sizeof(config->auth_token), legacy->auth_token);
    util_copy_string(config->mqtt_host, sizeof(config->mqtt_host), legacy->mqtt_host);
    config->mqtt_port = legacy->mqtt_port;
    util_copy_string(config->mqtt_username, sizeof(config->mqtt_username), legacy->mqtt_username);
    util_copy_string(config->mqtt_password, sizeof(config->mqtt_password), legacy->mqtt_password);
    util_copy_string(config->obd2_ble_address, sizeof(config->obd2_ble_address), legacy->obd2_ble_address);
    config->command_subscribe_enabled = legacy->command_subscribe_enabled;
    util_copy_string(config->apn, sizeof(config->apn), legacy->apn);

    if (legacy->tracking_interval_s != 0 &&
        legacy->tracking_interval_s != TRACKER_LEGACY_DEFAULT_TRACKING_INTERVAL_S) {
        config->tracking_interval_s = config_store_clamp_u16(legacy->tracking_interval_s,
                                                             TRACKER_CONFIG_MIN_TRACKING_INTERVAL_S,
                                                             TRACKER_CONFIG_MAX_TRACKING_INTERVAL_S);
    }
    if (legacy->heartbeat_interval_s != 0 &&
        legacy->heartbeat_interval_s != TRACKER_LEGACY_DEFAULT_HEARTBEAT_INTERVAL_S) {
        config->heartbeat_interval_s = config_store_clamp_u16(legacy->heartbeat_interval_s,
                                                              TRACKER_CONFIG_MIN_HEARTBEAT_INTERVAL_S,
                                                              TRACKER_CONFIG_MAX_HEARTBEAT_INTERVAL_S);
    }
}

/**
 * @brief Save config to NVS.
 *
 * @param config Configuration.
 * @return ESP_OK on success.
 */
esp_err_t config_store_nvs_save(const config_t *config) {
    // Persist store NVS save here so later boots, retries, or recovery paths can resume cleanly.
    ESP_RETURN_ON_NULL(config, ESP_ERR_INVALID_ARG, TAG, "config is NULL");

    nvs_handle_t handle = 0;
    esp_err_t err = nvs_open(TRACKER_NVS_NAMESPACE, NVS_READWRITE, &handle);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to open NVS namespace");

    err = nvs_set_blob(handle, TRACKER_NVS_CONFIG_KEY, config, sizeof(*config));
    if (err == ESP_OK) {
        err = nvs_commit(handle);
    }
    nvs_close(handle);
    return err;
}

esp_err_t config_store_nvs_load(config_t *config) {
    // Rehydrate store NVS load here so later logic reads one coherent snapshot after reset or sleep.
    ESP_RETURN_ON_NULL(config, ESP_ERR_INVALID_ARG, TAG, "config is NULL");

    // Start from compiled defaults so partial NVS reads and legacy migrations always have a safe baseline to overlay.
    app_config_set_defaults(config);

    nvs_handle_t handle = 0;
    esp_err_t err = nvs_open(TRACKER_NVS_NAMESPACE, NVS_READONLY, &handle);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        ESP_LOGW(TAG, "NVS namespace not found, writing defaults");
        return config_store_nvs_save(config);
    }
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to open NVS namespace");

    size_t stored_size = 0;
    err = nvs_get_blob(handle, TRACKER_NVS_CONFIG_KEY, NULL, &stored_size);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        nvs_close(handle);
        ESP_LOGW(TAG, "Config not found, writing defaults");
        return config_store_nvs_save(config);
    }
    if (err != ESP_OK) {
        nvs_close(handle);
        ESP_LOGE(TAG, "Failed to query config blob size: %s", esp_err_to_name(err));
        return err;
    }

    bool migrated = false;
    if (stored_size == sizeof(*config)) {
        // Current-format blobs can be copied straight into the runtime config snapshot.
        size_t required_size = sizeof(*config);
        err = nvs_get_blob(handle, TRACKER_NVS_CONFIG_KEY, config, &required_size);
    } else if (stored_size == sizeof(config_v1_t)) {
        // Legacy blobs are expanded onto fresh defaults so newer fields still end up with valid values.
        config_v1_t legacy = {0};
        size_t required_size = sizeof(legacy);
        err = nvs_get_blob(handle, TRACKER_NVS_CONFIG_KEY, &legacy, &required_size);
        if (err == ESP_OK) {
            app_config_set_defaults(config);
            config_store_apply_legacy_v1(config, &legacy);
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
        return config_store_nvs_save(config);
    }
    nvs_close(handle);

    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to read config blob");
    if (!app_config_is_valid(config)) {
        ESP_LOGW(TAG, "Invalid config in NVS, restoring defaults");
        app_config_set_defaults(config);
        return config_store_nvs_save(config);
    }

    // Post-load fixups migrate a few known bad legacy values even when the blob shape itself was readable.
    config_t defaults = {0};
    app_config_set_defaults(&defaults);
    if (strcmp(config->mqtt_host, TRACKER_LEGACY_MQTT_HOST_LOCALHOST) == 0) {
        /* Old bench images persisted localhost, which is invalid on field hardware. */
        ESP_LOGW(TAG,
                 "Legacy MQTT host '%s' detected, migrating to '%s'",
                 TRACKER_LEGACY_MQTT_HOST_LOCALHOST,
                 defaults.mqtt_host);
        util_copy_string(config->mqtt_host, sizeof(config->mqtt_host), defaults.mqtt_host);
        migrated = true;
    }

    bool legacy_cadence_pair = config->heartbeat_interval_s == TRACKER_LEGACY_DEFAULT_HEARTBEAT_INTERVAL_S &&
                               config->tracking_interval_s == TRACKER_LEGACY_DEFAULT_TRACKING_INTERVAL_S;
    if (!config->imu_wakeup_enabled && config->sleep_enabled && legacy_cadence_pair) {
        /* Preserve production parked wake behavior after migrating early parked configs. */
        ESP_LOGW(TAG, "Legacy parked config detected, enabling IMU wake for production motion wake");
        config->imu_wakeup_enabled = true;
        migrated = true;
    }

    if (config->ignition_off_hold_ms < TRACKER_CONFIG_EFFECTIVE_MIN_IGNITION_OFF_HOLD_MS) {
        ESP_LOGW(TAG,
                 "Unsafe ignition OFF hold %u ms detected, migrating to %u ms",
                 (unsigned int)config->ignition_off_hold_ms,
                 (unsigned int)TRACKER_CONFIG_EFFECTIVE_MIN_IGNITION_OFF_HOLD_MS);
        config->ignition_off_hold_ms = TRACKER_CONFIG_EFFECTIVE_MIN_IGNITION_OFF_HOLD_MS;
        migrated = true;
    }

    if (migrated) {
        return config_store_nvs_save(config);
    }
    return ESP_OK;
}
