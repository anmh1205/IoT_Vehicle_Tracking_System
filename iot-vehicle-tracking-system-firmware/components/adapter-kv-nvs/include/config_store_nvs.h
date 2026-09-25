#pragma once

#include "app_config.h"
#include "esp_err.h"

/**
 * @file config_store_nvs.h
 * @brief Internal runtime-config blob store helpers.
 * This header belongs to the KV/NVS persistence adapter layer and exposes the persistence boundary so higher layers do not depend on raw NVS keys or blob layouts.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


esp_err_t config_store_nvs_load(config_t *config);
esp_err_t config_store_nvs_save(const config_t *config);
