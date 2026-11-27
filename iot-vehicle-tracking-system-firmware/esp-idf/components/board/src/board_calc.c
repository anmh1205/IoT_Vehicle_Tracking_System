#include "board_calc.h"
#include <string.h>
#include "ivts_core/base/civil.h"
#include <math.h>
#include <stddef.h>
#include <stdlib.h>

#define TRUSTED_MIN_MS UINT64_C(1704067200000) /* 2024-01-01 UTC */

static uint8_t bcd2bin(uint8_t v) { return (uint8_t)((v >> 4) * 10u + (v & 0x0Fu)); }
static uint8_t bin2bcd(uint8_t v) { return (uint8_t)(((v / 10u) << 4) | (v % 10u)); }

ivts_err_t ds3231_decode_time(const uint8_t r[7], uint64_t *unix_ms)
{
    uint8_t hour;
    if (r[2] & 0x40u) {                               /* Chế độ 12 giờ: bit 5 = PM. */
        hour = bcd2bin(r[2] & 0x1Fu) % 12u;
        if (r[2] & 0x20u) { hour = (uint8_t)(hour + 12u); }
    } else {
        hour = bcd2bin(r[2] & 0x3Fu);
    }
    ivts_civil_t c = {
        .year = (uint16_t)(2000u + bcd2bin(r[6])),     /* Bit thế kỷ (r[5] bit 7) bị bỏ qua: chỉ hỗ trợ 2000..2099. */
        .month = bcd2bin(r[5] & 0x1Fu), .day = bcd2bin(r[4] & 0x3Fu),
        .hour = hour, .min = bcd2bin(r[1] & 0x7Fu), .sec = bcd2bin(r[0] & 0x7Fu), .ms = 0,
    };
    return ivts_civil_to_unix_ms(&c, unix_ms);
}

ivts_err_t ds3231_encode_time(uint64_t unix_ms, uint8_t regs[7])
{
    ivts_civil_t c;
    ivts_unix_ms_to_civil(unix_ms, &c);
    if (c.year < 2000u || c.year > 2099u) { return IVTS_ERR_INVALID_ARG; }
    const uint8_t encoded[7] = {
        bin2bcd(c.sec), bin2bcd(c.min), bin2bcd(c.hour),    /* Bit 6 = 0: chế độ 24 giờ. */
        1u,                                                 /* Thứ trong tuần: firmware không dùng. */
        bin2bcd(c.day), bin2bcd(c.month), bin2bcd((uint8_t)(c.year - 2000u)),
    };
    memcpy(regs, encoded, sizeof encoded);
    return IVTS_OK;
}

bool ds3231_is_trusted(uint8_t status, uint64_t unix_ms)
{
    return (status & DS3231_OSF) == 0u && unix_ms >= TRUSTED_MIN_MS;
}

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

uint16_t power_adc_scale_mv(uint64_t pin_mv, uint32_t divider, uint32_t gain_ppm)
{
    uint64_t voltage_mv = pin_mv * divider * gain_ppm / 1000000u;
    return voltage_mv > UINT16_MAX ? UINT16_MAX : (uint16_t)voltage_mv;
}
