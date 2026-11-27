/**
 * @file ds3231.c
 * @brief DS3231M RTC register access and trusted time reporting.
 *
 * Use the shared I2C adapter for register transactions and pure BCD conversion
 * helpers for the calendar representation.
 */
#include "board_internal.h"
#include "drivers/drivers.h"
#include "board_calc.h"
#include "esp_log.h"

/*
 * The DS3231M uses address 0x68. BCD time occupies registers 0x00–0x06. Bit 7
 * of status register 0x0F is the oscillator stop flag (OSF). An asserted OSF
 * means the clock may have stopped and its time is untrusted.
 */
#define DS3231_REG_TIME    0x00
#define DS3231_REG_STATUS  0x0F

static board_dev_t s_device;

esp_err_t ds3231_init(board_dev_t device, uint16_t address, uint32_t speed_hz)
{
    s_device = device;
    if (!board_i2c_probe(address)) {
        ESP_LOGW(BOARD_TAG, "DS3231M không trả lời 0x%02x", address);
        return ESP_ERR_NOT_FOUND;
    }
    return board_i2c_add(s_device, address, speed_hz);
}

ivts_err_t board_time_get(uint64_t *unix_ms, bool *trusted)
{
    if (unix_ms == NULL || trusted == NULL) { return IVTS_ERR_INVALID_ARG; }
    if (!board_rtc_ok()) { return IVTS_ERR_INVALID_STATE; }
    uint8_t r[7], st = 0;
    esp_err_t e = board_i2c_read(s_device, DS3231_REG_TIME, r, sizeof r);
    if (e == ESP_OK) { e = board_i2c_read(s_device, DS3231_REG_STATUS, &st, 1); }
    if (e != ESP_OK) { return board_err(e); }

    if (ds3231_decode_time(r, unix_ms) != IVTS_OK) {
        *unix_ms = 0;
        *trusted = false;
        return IVTS_OK;                               /* I2C succeeded, but the calendar value is invalid. */
    }
    *trusted = ds3231_is_trusted(st, *unix_ms);
    return IVTS_OK;
}

ivts_err_t board_time_set(uint64_t unix_ms)
{
    if (!board_rtc_ok()) { return IVTS_ERR_INVALID_STATE; }
    uint8_t r[7];
    ivts_err_t encode_error = ds3231_encode_time(unix_ms, r);
    if (encode_error != IVTS_OK) { return encode_error; }
    esp_err_t e = board_i2c_write(s_device, DS3231_REG_TIME, r, sizeof r);
    if (e != ESP_OK) { return board_err(e); }
    /*
     * Clear OSF after writing the date. A power loss between the writes can
     * leave OSF asserted so the next boot continues treating RTC time as
     * untrusted.
     */
    uint8_t st = 0;
    e = board_i2c_read(s_device, DS3231_REG_STATUS, &st, 1);
    if (e == ESP_OK) {
        st = (uint8_t)(st & (uint8_t)~DS3231_OSF);
        e = board_i2c_write(s_device, DS3231_REG_STATUS, &st, 1);
    }
    return board_err(e);
}
