#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "esp_err.h"

/**
 * @file rtc_ds3231m.h
 * @brief DS3231M RTC driver interface for trusted timestamp fallback.
 */

esp_err_t rtc_ds3231m_init(void);
bool rtc_ds3231m_is_available(void);

esp_err_t rtc_ds3231m_get_time_ms(uint64_t *out_time_ms);
esp_err_t rtc_ds3231m_set_time_ms(uint64_t time_ms);

esp_err_t rtc_ds3231m_get_health(bool *available, bool *time_valid);
bool rtc_ds3231m_is_time_valid_ms(uint64_t time_ms);
