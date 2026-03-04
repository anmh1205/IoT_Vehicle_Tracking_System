#pragma once

#include "esp_err.h"
#include "host/ble_hs.h"

typedef struct {
    ble_hs_reset_fn *reset_cb;
    ble_hs_sync_fn *sync_cb;
} ble_init_config_t;

esp_err_t ble_init_stack(const ble_init_config_t *config);
esp_err_t ble_stack_init(void);
esp_err_t ble_stack_deinit(void);
