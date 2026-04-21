#include "rtc_ds3231m.h"

#include <time.h>

#include "driver/i2c_master.h"
#include "esp_log.h"

#include "pin_map.h"
#include "util.h"

/**
 * @file rtc_ds3231m.c
 * @brief Minimal DS3231M RTC integration for trusted timestamp fallback.
 */

#define RTC_DS3231M_I2C_PORT I2C_NUM_0
#define RTC_DS3231M_I2C_FREQ_HZ 100000
#define RTC_DS3231M_I2C_ADDR 0x68
#define RTC_DS3231M_TIMEOUT_MS 100

#define RTC_REG_SECONDS 0x00
#define RTC_REG_STATUS 0x0F
#define RTC_STATUS_OSF_BIT 0x80

#define RTC_VALID_MIN_EPOCH_MS 1704067200000ULL /* 2024-01-01T00:00:00Z */
#define RTC_VALID_MAX_EPOCH_MS 4102444800000ULL /* 2100-01-01T00:00:00Z */

static const char *TAG = "RTC_DS3231M";

typedef struct {
    /** Guards one-time init so other modules can call init defensively. */
    bool initialized;
    /** Set only when the DS3231M probe/read succeeds. */
    bool available;
    /** Tracks whether the last known RTC time is plausible and oscillator-stable. */
    bool time_valid;
    /** True when this module created the I2C bus and therefore owns cleanup. */
    bool owns_bus;
    /** Shared I2C master bus used by the RTC device handle. */
    i2c_master_bus_handle_t bus_handle;
    /** Handle bound to DS3231M address 0x68. */
    i2c_master_dev_handle_t dev_handle;
} rtc_ds3231m_ctx_t;

static rtc_ds3231m_ctx_t s_ctx;

static uint8_t rtc_bcd_to_dec(uint8_t value) {
    /* DS3231M stores calendar/time fields in packed BCD, not binary. */
    return (uint8_t)(((value >> 4U) * 10U) + (value & 0x0FU));
}

static uint8_t rtc_dec_to_bcd(uint8_t value) {
    return (uint8_t)(((value / 10U) << 4U) | (value % 10U));
}

static bool rtc_is_leap_year(int year) {
    return ((year % 4) == 0 && (year % 100) != 0) || ((year % 400) == 0);
}

static uint8_t rtc_days_in_month(int year, int month_1_to_12) {
    static const uint8_t days[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    if (month_1_to_12 == 2 && rtc_is_leap_year(year)) {
        return 29;
    }
    return days[month_1_to_12 - 1];
}

static esp_err_t rtc_tm_to_epoch_ms_utc(const struct tm *tm_value, uint64_t *out_ms) {
    ESP_RETURN_ON_NULL(tm_value, ESP_ERR_INVALID_ARG, TAG, "tm_value null");
    ESP_RETURN_ON_NULL(out_ms, ESP_ERR_INVALID_ARG, TAG, "out_ms null");

    int year = tm_value->tm_year + 1900;
    int month = tm_value->tm_mon + 1;
    int day = tm_value->tm_mday;

    if (year < 1970 || month < 1 || month > 12 || day < 1 || day > 31) {
        return ESP_ERR_INVALID_ARG;
    }

    uint8_t max_day = rtc_days_in_month(year, month);
    if (day > max_day || tm_value->tm_hour < 0 || tm_value->tm_hour > 23 ||
        tm_value->tm_min < 0 || tm_value->tm_min > 59 || tm_value->tm_sec < 0 ||
        tm_value->tm_sec > 59) {
        return ESP_ERR_INVALID_ARG;
    }

    /*
     * Avoid libc timezone/localtime dependencies by converting the UTC calendar
     * fields to epoch time manually.
     */
    uint64_t days = 0;
    for (int y = 1970; y < year; ++y) {
        days += rtc_is_leap_year(y) ? 366ULL : 365ULL;
    }
    for (int m = 1; m < month; ++m) {
        days += rtc_days_in_month(year, m);
    }
    days += (uint64_t)(day - 1);

    uint64_t seconds = days * 86400ULL;
    seconds += (uint64_t)tm_value->tm_hour * 3600ULL;
    seconds += (uint64_t)tm_value->tm_min * 60ULL;
    seconds += (uint64_t)tm_value->tm_sec;
    *out_ms = seconds * 1000ULL;
    return ESP_OK;
}

static esp_err_t rtc_read_regs(uint8_t reg, uint8_t *data, size_t len) {
    ESP_RETURN_ON_NULL(data, ESP_ERR_INVALID_ARG, TAG, "rtc_read_regs data null");
    ESP_RETURN_ON_NULL(s_ctx.dev_handle, ESP_ERR_INVALID_STATE, TAG, "rtc_read_regs device not ready");

    return i2c_master_transmit_receive(s_ctx.dev_handle,
                                       &reg,
                                       1,
                                       data,
                                       len,
                                       RTC_DS3231M_TIMEOUT_MS);
}

static esp_err_t rtc_write_reg(uint8_t reg, uint8_t value) {
    ESP_RETURN_ON_NULL(s_ctx.dev_handle, ESP_ERR_INVALID_STATE, TAG, "rtc_write_reg device not ready");

    uint8_t payload[2] = {reg, value};
    return i2c_master_transmit(s_ctx.dev_handle, payload, sizeof(payload), RTC_DS3231M_TIMEOUT_MS);
}

bool rtc_ds3231m_is_time_valid_ms(uint64_t time_ms) {
    return time_ms >= RTC_VALID_MIN_EPOCH_MS && time_ms < RTC_VALID_MAX_EPOCH_MS;
}

esp_err_t rtc_ds3231m_init(void) {
    if (s_ctx.initialized) {
        return s_ctx.available ? ESP_OK : ESP_FAIL;
    }

    s_ctx.owns_bus = false;
    i2c_master_bus_config_t bus_cfg = {
        .i2c_port = RTC_DS3231M_I2C_PORT,
        .sda_io_num = PIN_DS3231_SDA,
        .scl_io_num = PIN_DS3231_SCL,
        .clk_source = I2C_CLK_SRC_DEFAULT,
        .glitch_ignore_cnt = 7,
        .intr_priority = 0,
        .trans_queue_depth = 0,
        .flags.enable_internal_pullup = true,
    };

    esp_err_t err = i2c_new_master_bus(&bus_cfg, &s_ctx.bus_handle);
    if (err == ESP_OK) {
        s_ctx.owns_bus = true;
    } else if (err == ESP_ERR_INVALID_STATE) {
        /* Another driver already created the bus; attach to it instead of failing. */
        err = i2c_master_get_bus_handle(RTC_DS3231M_I2C_PORT, &s_ctx.bus_handle);
        if (err != ESP_OK) {
            ESP_LOGW(TAG, "i2c bus unavailable: %s", esp_err_to_name(err));
            s_ctx.initialized = true;
            s_ctx.available = false;
            return err;
        }
    } else {
        ESP_LOGW(TAG, "i2c_new_master_bus failed: %s", esp_err_to_name(err));
        s_ctx.initialized = true;
        s_ctx.available = false;
        return err;
    }

    i2c_device_config_t dev_cfg = {
        .dev_addr_length = I2C_ADDR_BIT_LEN_7,
        .device_address = RTC_DS3231M_I2C_ADDR,
        .scl_speed_hz = RTC_DS3231M_I2C_FREQ_HZ,
    };

    err = i2c_master_bus_add_device(s_ctx.bus_handle, &dev_cfg, &s_ctx.dev_handle);
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "i2c_master_bus_add_device failed: %s", esp_err_to_name(err));
        if (s_ctx.owns_bus) {
            i2c_del_master_bus(s_ctx.bus_handle);
            s_ctx.bus_handle = NULL;
            s_ctx.owns_bus = false;
        }
        s_ctx.initialized = true;
        s_ctx.available = false;
        return err;
    }

    uint8_t status = 0;
    err = rtc_read_regs(RTC_REG_STATUS, &status, 1);
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "DS3231M probe failed: %s", esp_err_to_name(err));
        s_ctx.available = false;
        s_ctx.time_valid = false;
    } else {
        s_ctx.available = true;
        s_ctx.time_valid = (status & RTC_STATUS_OSF_BIT) == 0;
    }

    s_ctx.initialized = true;
    ESP_LOGI(TAG, "RTC init available=%d time_valid=%d", s_ctx.available ? 1 : 0, s_ctx.time_valid ? 1 : 0);
    return s_ctx.available ? ESP_OK : ESP_FAIL;
}

bool rtc_ds3231m_is_available(void) {
    return s_ctx.available;
}

esp_err_t rtc_ds3231m_get_time_ms(uint64_t *out_time_ms) {
    ESP_RETURN_ON_NULL(out_time_ms, ESP_ERR_INVALID_ARG, TAG, "out_time_ms null");
    ESP_RETURN_ON_FALSE(s_ctx.available, ESP_ERR_INVALID_STATE, TAG, "RTC unavailable");

    uint8_t regs[7] = {0};
    esp_err_t read_err = rtc_read_regs(RTC_REG_SECONDS, regs, sizeof(regs));
    if (read_err != ESP_OK) {
        s_ctx.time_valid = false;
        return ESP_FAIL;
    }

    struct tm tm_value = {0};
    tm_value.tm_sec = (int)rtc_bcd_to_dec((uint8_t)(regs[0] & 0x7FU));
    tm_value.tm_min = (int)rtc_bcd_to_dec((uint8_t)(regs[1] & 0x7FU));

    if ((regs[2] & 0x40U) != 0U) {
        /* Bit 6 selects 12-hour mode; bit 5 then carries AM/PM state. */
        int hour = (int)rtc_bcd_to_dec((uint8_t)(regs[2] & 0x1FU));
        bool pm = (regs[2] & 0x20U) != 0U;
        tm_value.tm_hour = pm ? (hour % 12) + 12 : (hour % 12);
    } else {
        tm_value.tm_hour = (int)rtc_bcd_to_dec((uint8_t)(regs[2] & 0x3FU));
    }

    tm_value.tm_mday = (int)rtc_bcd_to_dec((uint8_t)(regs[4] & 0x3FU));
    tm_value.tm_mon = (int)rtc_bcd_to_dec((uint8_t)(regs[5] & 0x1FU)) - 1;
    tm_value.tm_year = 100 + (int)rtc_bcd_to_dec(regs[6]);

    uint64_t epoch_ms = 0;
    esp_err_t conv_err = rtc_tm_to_epoch_ms_utc(&tm_value, &epoch_ms);
    if (conv_err != ESP_OK) {
        ESP_LOGW(TAG,
                 "RTC epoch conversion failed y=%d m=%d d=%d hh=%d mm=%d ss=%d raw=[%02X %02X %02X %02X %02X %02X %02X]",
                 tm_value.tm_year + 1900,
                 tm_value.tm_mon + 1,
                 tm_value.tm_mday,
                 tm_value.tm_hour,
                 tm_value.tm_min,
                 tm_value.tm_sec,
                 regs[0],
                 regs[1],
                 regs[2],
                 regs[3],
                 regs[4],
                 regs[5],
                 regs[6]);
        s_ctx.time_valid = false;
        return ESP_ERR_INVALID_STATE;
    }

    *out_time_ms = epoch_ms;
    s_ctx.time_valid = rtc_ds3231m_is_time_valid_ms(*out_time_ms);
    if (!s_ctx.time_valid) {
        ESP_LOGW(TAG, "RTC read out-of-range ms=%llu", (unsigned long long)*out_time_ms);
        return ESP_ERR_INVALID_STATE;
    }
    return ESP_OK;
}

esp_err_t rtc_ds3231m_set_time_ms(uint64_t time_ms) {
    ESP_RETURN_ON_FALSE(s_ctx.available, ESP_ERR_INVALID_STATE, TAG, "RTC unavailable");
    ESP_RETURN_ON_FALSE(rtc_ds3231m_is_time_valid_ms(time_ms), ESP_ERR_INVALID_ARG, TAG, "RTC set invalid time");

    time_t epoch_s = (time_t)(time_ms / 1000ULL);
    struct tm tm_value = {0};
    ESP_RETURN_ON_NULL(gmtime_r(&epoch_s, &tm_value), ESP_FAIL, TAG, "RTC gmtime failed");

    uint8_t regs[8] = {
        RTC_REG_SECONDS,
        rtc_dec_to_bcd((uint8_t)tm_value.tm_sec),
        rtc_dec_to_bcd((uint8_t)tm_value.tm_min),
        rtc_dec_to_bcd((uint8_t)tm_value.tm_hour),
        rtc_dec_to_bcd((uint8_t)(tm_value.tm_wday == 0 ? 7 : tm_value.tm_wday)),
        rtc_dec_to_bcd((uint8_t)tm_value.tm_mday),
        rtc_dec_to_bcd((uint8_t)(tm_value.tm_mon + 1)),
        rtc_dec_to_bcd((uint8_t)(tm_value.tm_year - 100)),
    };

    esp_err_t write_err = i2c_master_transmit(s_ctx.dev_handle,
                                              regs,
                                              sizeof(regs),
                                              RTC_DS3231M_TIMEOUT_MS);

    ESP_RETURN_ON_FALSE(write_err == ESP_OK, ESP_FAIL, TAG, "RTC write time failed");

    uint8_t status = 0;
    if (rtc_read_regs(RTC_REG_STATUS, &status, 1) == ESP_OK) {
        /* Clear OSF after a successful write so subsequent reads can be trusted again. */
        (void)rtc_write_reg(RTC_REG_STATUS, (uint8_t)(status & (uint8_t)(~RTC_STATUS_OSF_BIT)));
    }

    s_ctx.time_valid = true;
    ESP_LOGI(TAG, "RTC set time ms=%llu", (unsigned long long)time_ms);
    return ESP_OK;
}

esp_err_t rtc_ds3231m_get_health(bool *available, bool *time_valid) {
    ESP_RETURN_ON_NULL(available, ESP_ERR_INVALID_ARG, TAG, "available null");
    ESP_RETURN_ON_NULL(time_valid, ESP_ERR_INVALID_ARG, TAG, "time_valid null");

    *available = s_ctx.available;
    *time_valid = s_ctx.time_valid;
    return ESP_OK;
}
