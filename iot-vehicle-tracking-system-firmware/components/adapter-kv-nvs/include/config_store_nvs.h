#pragma once

#include "app_config.h"
#include "esp_err.h"

/**
 * @file config_store_nvs.h
 * @brief Internal runtime-config blob store helpers.
 */

esp_err_t config_store_nvs_load(config_t *config);
esp_err_t config_store_nvs_save(const config_t *config);
