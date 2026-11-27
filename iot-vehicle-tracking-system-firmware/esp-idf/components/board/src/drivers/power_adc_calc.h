#pragma once
#include <stdint.h>

/* Convert averaged ADC pin millivolts to the input voltage with divider and trim. */
uint16_t power_adc_scale_mv(uint64_t pin_mv, uint32_t divider, uint32_t gain_ppm);
