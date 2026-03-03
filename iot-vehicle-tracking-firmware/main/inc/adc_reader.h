#pragma once

#include "esp_err.h"

esp_err_t adc_reader_init(void);
float adc_read_battery_voltage(void);
void adc_reader_deinit(void);
