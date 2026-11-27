/**
 * @file src/drivers/ds3231.c
 * @brief DS3231M register access and time trust evaluation.
 *
 * Board startup probes and registers the device. The app reads and sets UTC. The modem and OTA task also read
 * it.
 * The I2C mutex serializes complete calendar and status sequences. The driver calculation helpers convert
 * the calendar.
 * The calendar is written before oscillator status is cleared. The caller supplies time policy.
 */
#include "board_internal.h"
#include "drivers/drivers.h"
#include "drivers/drivers_calc.h"
#include "platform/log.h"

/*
 * The DS3231M uses address 0x68. BCD time occupies registers 0x00–0x06. Bit 7
 * of status register 0x0F is the oscillator stop flag (OSF). An asserted OSF
 * means the clock may have stopped and its time is untrusted.
 */
#define DS3231_REG_TIME    0x00   /**< First of seven BCD calendar registers. */
#define DS3231_REG_STATUS  0x0F   /**< Status register containing the oscillator stop flag. */

/* Startup assigns the I2C slot. Clock users read it after initialization. */
static board_dev_t s_device;

esp_err_t ds3231_init(board_dev_t device, uint16_t address, uint32_t speed_hz)
{
    s_device = device;
    if (!board_i2c_probe(address)) {
        IVTS_LOGW(BOARD_TAG, "rtc probe chip=DS3231M addr=0x%02x result=no_reply", address);
        return ESP_ERR_NOT_FOUND;
    }
    esp_err_t e = board_i2c_add(s_device, address, speed_hz);
    IVTS_LOGI(BOARD_TAG, "rtc probe chip=DS3231M addr=0x%02x result=%s speed=%luHz", address, IVTS_LOG_OK(e == ESP_OK),
              (unsigned long)speed_hz);
    return e;
}

ivts_err_t board_time_get(uint64_t *unix_ms, bool *trusted)
{
    if (unix_ms == NULL || trusted == NULL) { return IVTS_ERR_INVALID_ARG; }
    if (!board_rtc_ok()) { return IVTS_ERR_INVALID_STATE; }
    uint8_t r[7], st = 0;
    if (!board_i2c_lock()) { return IVTS_ERR_TIMEOUT; }
    esp_err_t e = board_i2c_read_locked(s_device, DS3231_REG_TIME, r, sizeof r);
    if (e == ESP_OK) { e = board_i2c_read_locked(s_device, DS3231_REG_STATUS, &st, 1); }
    board_i2c_unlock();
    if (e != ESP_OK) { return board_err(e); }

    if (ds3231_decode_time(r, unix_ms) != IVTS_OK) {
        *unix_ms = 0;
        *trusted = false;
        return IVTS_OK;                               /* I2C succeeded, but the calendar value is invalid. */
    }
    *trusted = ds3231_is_trusted(st, *unix_ms);
    IVTS_LOGD(BOARD_TAG, "rtc read unix_ms=%llu status=0x%02x trusted=%s", (unsigned long long)*unix_ms, st,
              IVTS_LOG_YES(*trusted));
    return IVTS_OK;
}

ivts_err_t board_time_set(uint64_t unix_ms)
{
    if (!board_rtc_ok()) { return IVTS_ERR_INVALID_STATE; }
    uint8_t r[7];
    ivts_err_t encode_error = ds3231_encode_time(unix_ms, r);
    if (encode_error != IVTS_OK) { return encode_error; }
    if (!board_i2c_lock()) { return IVTS_ERR_TIMEOUT; }
    esp_err_t e = board_i2c_write_locked(s_device, DS3231_REG_TIME, r, sizeof r);
    if (e != ESP_OK) {
        board_i2c_unlock();
        return board_err(e);
    }
    /*
     * Clear OSF after writing the date. If OSF was asserted, a power loss
     * before the clear leaves the next boot treating RTC time as untrusted.
     */
    uint8_t st = 0;
    e = board_i2c_read_locked(s_device, DS3231_REG_STATUS, &st, 1);
    if (e == ESP_OK) {
        st = (uint8_t)(st & (uint8_t)~DS3231_OSF);
        e = board_i2c_write_locked(s_device, DS3231_REG_STATUS, &st, 1);
    }
    board_i2c_unlock();
    if (e == ESP_OK) {
        IVTS_LOGI(BOARD_TAG, "rtc set unix_ms=%llu result=ok", (unsigned long long)unix_ms);
    } else {
        IVTS_LOGW(BOARD_TAG, "rtc set unix_ms=%llu result=fail err=%s", (unsigned long long)unix_ms, esp_err_to_name(e));
    }
    return board_err(e);
}
