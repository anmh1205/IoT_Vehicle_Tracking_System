#include "lis3dsh_calc.h"
#include <math.h>
#include <stddef.h>
#include <stdlib.h>

uint32_t lis3dsh_delta_mmps2(const int16_t previous[3], const int16_t current[3], uint64_t age_ms)
{
    float squares = 0.0f;
    for (size_t i = 0; i < 3u; i++) {
        float delta = (float)current[i] - (float)previous[i];
        squares += delta * delta;
    }
    /* ±2g: 0,06 mg/LSB. Bỏ nhiễu dưới 20 mg. */
    float delta_mg = sqrtf(squares) * 0.06f;
    return age_ms <= 20000u && delta_mg > 20.0f ? (uint32_t)(delta_mg * 9.80665f + 0.5f) : 0u;
}

unsigned lis3dsh_gravity_axis(const int16_t axes[3])
{
    unsigned gravity_axis = 0;
    for (unsigned i = 1; i < 3u; i++) {
        if (abs(axes[i]) > abs(axes[gravity_axis])) { gravity_axis = i; }
    }
    return gravity_axis;
}
