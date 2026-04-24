#pragma once

#include <stdbool.h>

#include "esp_err.h"
#include "nvs_config.h"

/**
 * @file ota_context_store_nvs.h
 * @brief Internal OTA context blob store helpers.
 */

esp_err_t ota_context_store_nvs_save(const ota_persist_context_t *context);
esp_err_t ota_context_store_nvs_load(ota_persist_context_t *out_context, bool *out_found);
esp_err_t ota_context_store_nvs_clear(void);
