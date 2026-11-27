#pragma once
#include <stdint.h>

/* Return the index of the largest absolute component, breaking ties by axis order. */
unsigned lis3dsh_gravity_axis(const int16_t axes[3]);

/* Change in acceleration at ±2 g scale. Ignore stale baselines and motion below the noise floor. */
uint32_t lis3dsh_delta_mmps2(const int16_t previous[3], const int16_t current[3], uint64_t age_ms);
