#include "board_priv.h"
#include <string.h>
#include "esp_log.h"
#include "ivts_core/base/civil.h"

/* DS3231M: địa chỉ I2C 0x68; thanh ghi 0x00..0x06 là giờ dạng BCD; thanh ghi 0x0F là status,
 * bit 7 (OSF) bật khi dao động từng dừng, nghĩa là giờ không còn đáng tin. */
#define DS3231_ADDR        0x68
#define DS3231_REG_TIME    0x00
#define DS3231_REG_STATUS  0x0F
#define DS3231_OSF         0x80
#define TRUSTED_MIN_MS     1704067200000ull   /* 2024-01-01T00:00:00Z: giờ nhỏ hơn mốc này bị coi là chưa được đặt. */

static uint8_t bcd2bin(uint8_t v) { return (uint8_t)((v >> 4) * 10u + (v & 0x0Fu)); }
static uint8_t bin2bcd(uint8_t v) { return (uint8_t)(((v / 10u) << 4) | (v % 10u)); }

static ivts_err_t ds3231_decode_time(const uint8_t r[7], uint64_t *unix_ms)
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

static ivts_err_t ds3231_encode_time(uint64_t unix_ms, uint8_t regs[7])
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

static bool ds3231_is_trusted(uint8_t status, uint64_t unix_ms)
{
    return (status & DS3231_OSF) == 0u && unix_ms >= TRUSTED_MIN_MS;
}

esp_err_t board_rtc_init(void)
{
    if (!board_i2c_probe(DS3231_ADDR)) {
        ESP_LOGW(BOARD_TAG, "DS3231M không trả lời 0x%02x", DS3231_ADDR);
        return ESP_ERR_NOT_FOUND;
    }
    return board_i2c_add(BOARD_DEV_RTC, DS3231_ADDR, 100000);
}

ivts_err_t board_time_get(uint64_t *unix_ms, bool *trusted)
{
    if (unix_ms == NULL || trusted == NULL) { return IVTS_ERR_INVALID_ARG; }
    if (!board_rtc_ok()) { return IVTS_ERR_INVALID_STATE; }
    uint8_t r[7], st = 0;
    esp_err_t e = board_i2c_read(BOARD_DEV_RTC, DS3231_REG_TIME, r, sizeof r);
    if (e == ESP_OK) { e = board_i2c_read(BOARD_DEV_RTC, DS3231_REG_STATUS, &st, 1); }
    if (e != ESP_OK) { return board_err(e); }

    if (ds3231_decode_time(r, unix_ms) != IVTS_OK) {
        *unix_ms = 0;
        *trusted = false;
        return IVTS_OK;                               /* Đọc được nhưng giá trị không phải ngày hợp lệ. */
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
    esp_err_t e = board_i2c_write(BOARD_DEV_RTC, DS3231_REG_TIME, r, sizeof r);
    if (e != ESP_OK) { return board_err(e); }
    /* OSF được xoá sau khi ghi giờ: nếu mất nguồn giữa hai lệnh, OSF vẫn bật và giờ tiếp tục
     * bị coi là không đáng tin ở lần boot sau. */
    uint8_t st = 0;
    e = board_i2c_read(BOARD_DEV_RTC, DS3231_REG_STATUS, &st, 1);
    if (e == ESP_OK) {
        st = (uint8_t)(st & (uint8_t)~DS3231_OSF);
        e = board_i2c_write(BOARD_DEV_RTC, DS3231_REG_STATUS, &st, 1);
    }
    return board_err(e);
}
