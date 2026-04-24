#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "app_config.h"
#include "esp_err.h"

/**
 * @file nvs_config.h
 * @brief NVS-backed persistence helpers for tracker runtime configuration.
 */

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
 * @brief OTA confirm context persisted in NVS across reboot.
 */
typedef struct {
    bool pending_confirm;
    uint32_t confirm_timeout_sec;
    uint64_t confirm_deadline_ms;
    char job_id[TRACKER_JOB_ID_MAX_LEN];
    char target_version[TRACKER_TARGET_VERSION_MAX_LEN];
    char previous_version[TRACKER_TARGET_VERSION_MAX_LEN];
    char partition[TRACKER_PARTITION_MAX_LEN];
} ota_persist_context_t;

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
