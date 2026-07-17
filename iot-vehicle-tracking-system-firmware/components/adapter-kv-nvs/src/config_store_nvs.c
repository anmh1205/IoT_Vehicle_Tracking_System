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


/* Sentinel host written by old bench builds; invalid once deployed to field hardware. */
#define TRACKER_LEGACY_MQTT_HOST_LOCALHOST "localhost"
/* Heartbeat/tracking cadences baked into legacy images, used to detect un-customized configs. */
#define TRACKER_LEGACY_DEFAULT_HEARTBEAT_INTERVAL_S 900U
#define TRACKER_LEGACY_DEFAULT_TRACKING_INTERVAL_S 10U

/* Logging tag for config store NVS module. */
static const char *TAG = "CONFIG_STORE_NVS";

/**
 * @brief Legacy config v1 on-disk layout.
 *
 * Frozen snapshot of the original persisted config struct. Kept byte-for-byte so
 * blobs written by older firmware can still be detected (by size) and migrated
 * field-by-field onto the current @ref config_t. Do not reorder/resize.
 */
typedef struct {
    char device_id[TRACKER_DEVICE_ID_MAX_LEN];       /**< Device identity string. */
    char auth_token[TRACKER_AUTH_TOKEN_MAX_LEN];     /**< Backend auth token. */
    char mqtt_host[TRACKER_HOST_MAX_LEN];            /**< MQTT broker hostname. */
    uint16_t mqtt_port;                              /**< MQTT broker TCP port. */
    char mqtt_username[TRACKER_USERNAME_MAX_LEN];    /**< MQTT login username. */
    char mqtt_password[TRACKER_PASSWORD_MAX_LEN];    /**< MQTT login password. */
    uint16_t heartbeat_interval_s;                   /**< Heartbeat cadence (seconds). */
    uint16_t tracking_interval_s;                    /**< Tracking/sample cadence (seconds). */
    char obd2_ble_address[TRACKER_MAC_ADDR_STR_LEN]; /**< OBD2 dongle BLE MAC string. */
    bool command_subscribe_enabled;                  /**< Whether downlink command topic is subscribed. */
    char apn[TRACKER_HOST_MAX_LEN];                  /**< Cellular APN string. */
} config_v1_t;

/**
 * @brief Clamp an unsigned 16-bit value into an inclusive [min, max] range.
 *
 * Routes through the shared signed clamp helper, then narrows back to uint16_t.
 * Used to keep migrated legacy cadence values within firmware-supported bounds.
 *
 * @param value     Candidate value to constrain.
 * @param min_value Lower inclusive bound.
 * @param max_value Upper inclusive bound.
 * @return The value clamped into [min_value, max_value].
 */
static uint16_t config_store_clamp_u16(uint16_t value, uint16_t min_value, uint16_t max_value) {
    return (uint16_t)util_clamp_int((int)value, (int)min_value, (int)max_value);
}

/**
 * @brief Overlay legacy v1 fields onto an already-defaulted current config.
 *
 * The caller seeds @p config with current defaults first; this routine then copies
 * only the fields that existed in v1, so config fields added after v1 retain their
 * safe defaults instead of inheriting zero-filled bytes.
 *
 * @param config Destination current-format config (pre-populated with defaults).
 * @param legacy Source legacy v1 blob read from NVS.
 */
static void config_store_apply_legacy_v1(config_t *config, const config_v1_t *legacy) {
    // Apply store apply legacy v1 in one place so this module keeps a single authoritative writer.
    if (config == NULL || legacy == NULL) {
        return; // Defensive: never dereference null during migration.
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

    // Only migrate a tracking cadence that was explicitly customized away from the
    // legacy default; otherwise keep the (possibly newer) current default. Clamp to
    // supported bounds so an out-of-range legacy value can never be carried forward.
    if (legacy->tracking_interval_s != 0 &&
        legacy->tracking_interval_s != TRACKER_LEGACY_DEFAULT_TRACKING_INTERVAL_S) {
        config->tracking_interval_s = config_store_clamp_u16(legacy->tracking_interval_s,
                                                             TRACKER_CONFIG_MIN_TRACKING_INTERVAL_S,
                                                             TRACKER_CONFIG_MAX_TRACKING_INTERVAL_S);
    }
    // Same conditional-overlay-and-clamp rule for the heartbeat cadence.
    if (legacy->heartbeat_interval_s != 0 &&
        legacy->heartbeat_interval_s != TRACKER_LEGACY_DEFAULT_HEARTBEAT_INTERVAL_S) {
        config->heartbeat_interval_s = config_store_clamp_u16(legacy->heartbeat_interval_s,
                                                              TRACKER_CONFIG_MIN_HEARTBEAT_INTERVAL_S,
                                                              TRACKER_CONFIG_MAX_HEARTBEAT_INTERVAL_S);
    }
}

/**
 * @brief Persist the current runtime config as a single NVS blob.
 *
 * Opens the tracker namespace read/write, stores the whole @ref config_t struct
 * under the config key, and commits so the write survives power loss.
 *
 * @param config Configuration snapshot to persist (must be non-null).
 * @return ESP_OK on success, ESP_ERR_INVALID_ARG on null input, otherwise an NVS error.
 */
esp_err_t config_store_nvs_save(const config_t *config) {
    ESP_RETURN_ON_NULL(config, ESP_ERR_INVALID_ARG, TAG, "config is NULL");

    nvs_handle_t handle = 0;
    esp_err_t err = nvs_open(TRACKER_NVS_NAMESPACE, NVS_READWRITE, &handle);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to open NVS namespace");

    // Store the entire config struct as an opaque blob keyed by the config key.
    err = nvs_set_blob(handle, TRACKER_NVS_CONFIG_KEY, config, sizeof(*config));
    if (err == ESP_OK) {
        err = nvs_commit(handle); // Flush staged write to flash so it is durable.
    }
    nvs_close(handle); // Always release the handle, even on the error path.
    return err;
}

/**
 * @brief Load runtime config from NVS, migrating/repairing legacy blobs as needed.
 *
 * Resolution order:
 *  1. Seed @p config with compiled defaults (safe baseline for every path below).
 *  2. If the namespace/key is missing, write defaults back and return them.
 *  3. If the stored blob matches the current size, read it directly.
 *  4. If it matches the legacy v1 size, expand it onto defaults (size-based migration).
 *  5. Any other size is treated as corrupt: rewrite defaults.
 *  6. Validate, then apply targeted post-load fixups for known-bad legacy values.
 * When anything is migrated or repaired, the corrected config is written back so
 * the next boot reads a clean current-format blob.
 *
 * @param config Output config object (must be non-null).
 * @return ESP_OK on success, ESP_ERR_INVALID_ARG on null input, otherwise an NVS error.
 */
esp_err_t config_store_nvs_load(config_t *config) {
    ESP_RETURN_ON_NULL(config, ESP_ERR_INVALID_ARG, TAG, "config is NULL");

    // Start from compiled defaults so partial NVS reads and legacy migrations always have a safe baseline to overlay.
    app_config_set_defaults(config);

    nvs_handle_t handle = 0;
    esp_err_t err = nvs_open(TRACKER_NVS_NAMESPACE, NVS_READONLY, &handle);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        // First boot (or erased flash): no namespace yet, so seed it with defaults.
        ESP_LOGW(TAG, "NVS namespace not found, writing defaults");
        return config_store_nvs_save(config);
    }
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to open NVS namespace");

    // Query blob size first (NULL out-buffer) to decide current vs legacy vs corrupt layout.
    size_t stored_size = 0;
    err = nvs_get_blob(handle, TRACKER_NVS_CONFIG_KEY, NULL, &stored_size);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        // Namespace exists but config key does not: persist defaults.
        nvs_close(handle);
        ESP_LOGW(TAG, "Config not found, writing defaults");
        return config_store_nvs_save(config);
    }
    if (err != ESP_OK) {
        nvs_close(handle);
        ESP_LOGE(TAG, "Failed to query config blob size: %s", esp_err_to_name(err));
        return err;
    }

    bool migrated = false; // Tracks whether we must write a corrected blob back.
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
            app_config_set_defaults(config);            // Re-seed defaults before overlay.
            config_store_apply_legacy_v1(config, &legacy); // Copy v1 fields on top.
            migrated = true;                            // Force write-back of upgraded blob.
            ESP_LOGW(TAG, "Migrated runtime config from legacy blob");
        }
    } else {
        // Unknown size: neither current nor known-legacy layout, so the blob is unusable.
        nvs_close(handle);
        ESP_LOGW(TAG,
                 "Config size mismatch in NVS stored=%lu expected=%lu (or legacy=%lu), rewriting defaults",
                 (unsigned long)stored_size,
                 (unsigned long)sizeof(*config),
                 (unsigned long)sizeof(config_v1_t));
        app_config_set_defaults(config);
        return config_store_nvs_save(config);
    }
    nvs_close(handle); // Read complete; release handle before validation/fixups.

    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "Failed to read config blob");
    if (!app_config_is_valid(config)) {
        // Semantically invalid contents (even if the size matched): fall back to defaults.
        ESP_LOGW(TAG, "Invalid config in NVS, restoring defaults");
        app_config_set_defaults(config);
        return config_store_nvs_save(config);
    }

    // Post-load fixups migrate a few known bad legacy values even when the blob shape itself was readable.
    config_t defaults = {0};
    app_config_set_defaults(&defaults); // Reference defaults to copy corrected values from.
    if (strcmp(config->mqtt_host, TRACKER_LEGACY_MQTT_HOST_LOCALHOST) == 0) {
        /* Old bench images persisted localhost, which is invalid on field hardware. */
        ESP_LOGW(TAG,
                 "Legacy MQTT host '%s' detected, migrating to '%s'",
                 TRACKER_LEGACY_MQTT_HOST_LOCALHOST,
                 defaults.mqtt_host);
        util_copy_string(config->mqtt_host, sizeof(config->mqtt_host), defaults.mqtt_host);
        migrated = true;
    }

    // Detect an early "parked" image fingerprinted by the legacy heartbeat+tracking pair.
    bool legacy_cadence_pair = config->heartbeat_interval_s == TRACKER_LEGACY_DEFAULT_HEARTBEAT_INTERVAL_S &&
                               config->tracking_interval_s == TRACKER_LEGACY_DEFAULT_TRACKING_INTERVAL_S;
    if (!config->imu_wakeup_enabled && config->sleep_enabled && legacy_cadence_pair) {
        /* Preserve production parked wake behavior after migrating early parked configs. */
        ESP_LOGW(TAG, "Legacy parked config detected, enabling IMU wake for production motion wake");
        config->imu_wakeup_enabled = true;
        migrated = true;
    }

    if (config->ignition_off_hold_ms < TRACKER_CONFIG_EFFECTIVE_MIN_IGNITION_OFF_HOLD_MS) {
        // Clamp an unsafe (too-short) ignition-off debounce up to the enforced minimum.
        ESP_LOGW(TAG,
                 "Unsafe ignition OFF hold %u ms detected, migrating to %u ms",
                 (unsigned int)config->ignition_off_hold_ms,
                 (unsigned int)TRACKER_CONFIG_EFFECTIVE_MIN_IGNITION_OFF_HOLD_MS);
        config->ignition_off_hold_ms = TRACKER_CONFIG_EFFECTIVE_MIN_IGNITION_OFF_HOLD_MS;
        migrated = true;
    }

    if (migrated) {
        // Persist the upgraded/repaired config so subsequent boots skip migration entirely.
        return config_store_nvs_save(config);
    }
    return ESP_OK;
}
