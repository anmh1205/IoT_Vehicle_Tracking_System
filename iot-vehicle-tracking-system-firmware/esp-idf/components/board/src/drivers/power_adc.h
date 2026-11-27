#pragma once
#include <stdint.h>
#include "esp_err.h"

typedef struct {
    int vehicle_gpio;
    int device_gpio;
    uint32_t divider;
    uint32_t vehicle_gain_ppm;
    uint32_t device_gain_ppm;
} power_adc_cfg_t;

/* Configure both channels before the board task starts. */
esp_err_t power_adc_init(const power_adc_cfg_t *cfg);
