#pragma once

#include "esp_err.h"
#include "host/ble_hs.h"

/**
 * @file ble_init.h
 * @brief NimBLE host stack lifecycle helpers.
 */

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
 * @brief Stop and deinitialize NimBLE stack.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t ble_stack_deinit(void);
