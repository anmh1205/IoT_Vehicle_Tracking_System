#pragma once

#include "esp_err.h"
#include "host/ble_hs.h"

/**
 * @file ble_init.h
 * @brief NimBLE host stack lifecycle helpers.
 * This header belongs to the BLE OBD NimBLE adapter layer and exposes the adapter boundary so higher layers do not depend on hardware- or transport-private details.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief Optional callback configuration for BLE host initialization.
 */
typedef struct {
    /** Called by NimBLE when stack resets unexpectedly. */
    ble_hs_reset_fn *reset_cb;
    /** Called when host sync with controller is complete. */
    ble_hs_sync_fn *sync_cb;
} ble_init_config_t;

/**
 * @brief Initialize NimBLE stack with user-provided callbacks.
 *
 * @param config Callback configuration.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t ble_init_stack(const ble_init_config_t *config);

/**
 * @brief Initialize NimBLE stack with built-in default callbacks.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t ble_stack_init(void);

/**
 * @brief Read current NimBLE stack lifecycle flag.
 *
 * @return true when stack init completed and deinit has not run yet.
 */
bool ble_stack_is_started(void);

/**
 * @brief Stop and deinitialize NimBLE stack.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t ble_stack_deinit(void);
