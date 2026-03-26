#pragma once

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
