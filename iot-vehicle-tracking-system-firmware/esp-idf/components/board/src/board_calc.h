#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/err.h"

#define DS3231_OSF 0x80u

ivts_err_t ds3231_decode_time(const uint8_t registers[7], uint64_t *unix_ms);
ivts_err_t ds3231_encode_time(uint64_t unix_ms, uint8_t registers[7]);
bool ds3231_is_trusted(uint8_t status, uint64_t unix_ms);

/* Return the index of the largest absolute component, breaking ties by axis order. */
unsigned lis3dsh_gravity_axis(const int16_t axes[3]);

/* Change in acceleration at ±2 g scale. Ignore stale baselines and motion below the noise floor. */
uint32_t lis3dsh_delta_mmps2(const int16_t previous[3], const int16_t current[3], uint64_t age_ms);

/* Convert averaged ADC pin millivolts to the input voltage with divider and trim. */
uint16_t power_adc_scale_mv(uint64_t pin_mv, uint32_t divider, uint32_t gain_ppm);
