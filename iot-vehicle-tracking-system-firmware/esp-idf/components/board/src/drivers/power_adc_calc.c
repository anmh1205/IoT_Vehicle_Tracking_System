#include "power_adc_calc.h"

uint16_t power_adc_scale_mv(uint64_t pin_mv, uint32_t divider, uint32_t gain_ppm)
{
    uint64_t voltage_mv = pin_mv * divider * gain_ppm / 1000000u;
    return voltage_mv > UINT16_MAX ? UINT16_MAX : (uint16_t)voltage_mv;
}
