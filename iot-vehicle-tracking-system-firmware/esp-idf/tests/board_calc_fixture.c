#include <assert.h>
#include <string.h>
#include "drivers/ds3231_calc.h"
#include "drivers/lis3dsh_calc.h"
#include "drivers/power_adc_calc.h"

static void test_rtc(void)
{
    const uint64_t midnight_ms = UINT64_C(1704067200000);
    uint8_t regs[7] = { 0x00, 0x00, 0x52, 0x01, 0x01, 0x01, 0x24 };
    uint64_t unix_ms;
    assert(ds3231_decode_time(regs, &unix_ms) == IVTS_OK && unix_ms == midnight_ms);
    regs[2] = 0x72; /* 12 PM in 12-hour mode. */
    assert(ds3231_decode_time(regs, &unix_ms) == IVTS_OK && unix_ms == midnight_ms + 43200000u);
    assert(ds3231_encode_time(unix_ms, regs) == IVTS_OK && regs[2] == 0x12);
    assert(ds3231_is_trusted(0, midnight_ms));
    assert(!ds3231_is_trusted(DS3231_OSF, midnight_ms));
    assert(!ds3231_is_trusted(0, midnight_ms - 1u));
    assert(ds3231_encode_time(0, regs) == IVTS_ERR_INVALID_ARG);

    const uint64_t leap_day_ms = UINT64_C(1709251198000);
    const uint8_t leap_regs[] = { 0x58, 0x59, 0x23, 0x01, 0x29, 0x02, 0x24 };
    assert(ds3231_encode_time(leap_day_ms, regs) == IVTS_OK);
    assert(memcmp(regs, leap_regs, sizeof regs) == 0);
    assert(ds3231_decode_time(regs, &unix_ms) == IVTS_OK && unix_ms == leap_day_ms);
    regs[6] = 0x23;
    assert(ds3231_decode_time(regs, &unix_ms) != IVTS_OK);
}

static void test_imu(void)
{
    const int16_t baseline[3] = { 0, 0, 16384 };
    const int16_t moved[3] = { 1000, 0, 16384 };
    const int16_t noise[3] = { 100, 0, 16384 };
    const int16_t ties[3] = { 32767, INT16_MIN, INT16_MIN };
    assert(lis3dsh_gravity_axis(baseline) == 2u);
    assert(lis3dsh_gravity_axis(ties) == 1u);
    assert(lis3dsh_delta_mmps2(baseline, noise, 100) == 0u);
    assert(lis3dsh_delta_mmps2(baseline, moved, 20000) == 588u);
    assert(lis3dsh_delta_mmps2(baseline, moved, 20001) == 0u);
}

static void test_adc(void)
{
    assert(power_adc_scale_mv(0, 11, 1020070) == 0u);
    assert(power_adc_scale_mv(1000, 11, 1020070) == 11220u);
    assert(power_adc_scale_mv(1000, 11, 1019950) == 11219u);
    assert(power_adc_scale_mv(6000, 11, 1020070) == UINT16_MAX);
}

int main(void)
{
    test_rtc();
    test_imu();
    test_adc();
    return 0;
}
