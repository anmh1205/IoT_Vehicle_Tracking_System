#pragma once

#include <stdbool.h>

#include "esp_err.h"
#include "nvs_config.h"

/**
 * @file ota_context_store_nvs.h
 * @brief Internal OTA context blob store helpers.
 * This header belongs to the KV/NVS persistence adapter layer and exposes the persistence boundary so higher layers do not depend on raw NVS keys or blob layouts.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


esp_err_t ota_context_store_nvs_save(const ota_persist_context_t *context);
esp_err_t ota_context_store_nvs_load(ota_persist_context_t *out_context, bool *out_found);
esp_err_t ota_context_store_nvs_clear(void);
