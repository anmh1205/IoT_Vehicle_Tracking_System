#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "esp_err.h"

/**
 * @file rtc_ds3231m.h
 * @brief DS3231M RTC driver interface for trusted timestamp fallback.
 * This header belongs to the DS3231M RTC adapter layer and exposes the RTC boundary so higher layers do not depend on register- or I2C-private details.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief Initialize the RTC driver and probe DS3231M availability.
 *
 * @return ESP_OK when the RTC responds, otherwise an initialization/probe error.
 */
esp_err_t rtc_ds3231m_init(void);

/**
 * @brief Report whether the RTC was detected during initialization.
 *
 * @return true when the device is available for read/write operations.
 */
bool rtc_ds3231m_is_available(void);

/**
 * @brief Read RTC time and convert it to UTC epoch milliseconds.
 *
 * @param out_time_ms Destination for the converted UTC timestamp.
 *
 * @return ESP_OK on success, otherwise an RTC transport or validation error.
 */
esp_err_t rtc_ds3231m_get_time_ms(uint64_t *out_time_ms);

/**
 * @brief Set RTC time from a UTC epoch-millisecond value.
 *
 * @param time_ms UTC timestamp in milliseconds.
 *
 * @return ESP_OK on success, otherwise an RTC transport or validation error.
 */
esp_err_t rtc_ds3231m_set_time_ms(uint64_t time_ms);

/**
 * @brief Return the latest cached RTC availability and time-valid flags.
 *
 * @param available Receives RTC presence status.
 * @param time_valid Receives current time-valid status.
 *
 * @return ESP_OK on success or ESP_ERR_INVALID_ARG on null outputs.
 */
esp_err_t rtc_ds3231m_get_health(bool *available, bool *time_valid);

/**
 * @brief Validate whether an epoch-millisecond value is plausible for this project.
 *
 * @param time_ms UTC timestamp in milliseconds.
 *
 * @return true when the timestamp falls inside the firmware's accepted range.
 */
bool rtc_ds3231m_is_time_valid_ms(uint64_t time_ms);
