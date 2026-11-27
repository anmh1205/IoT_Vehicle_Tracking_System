/**
 * @file board_clock.h
 * @brief UTC time access through the on-board RTC.
 *
 * Calls can wait for the shared I2C bus. A readable RTC value carries a
 * separate trust flag based on date and oscillator state.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/err.h"

/**
 * @brief Read the calendar and oscillator status from the DS3231M.
 * @param[out] unix_ms Unix time in milliseconds, or zero for an invalid date.
 * @param[out] trusted True when OSF is clear and the date is at least
 * 2024-01-01.
 * @return IVTS_OK after a read, IVTS_ERR_INVALID_STATE when RTC is
 * unavailable, or the relevant I2C error.
 */
ivts_err_t board_time_get(uint64_t *unix_ms, bool *trusted);

/**
 * @brief Write DS3231M time, then clear its oscillator stop flag.
 * @param unix_ms Unix time in milliseconds, within years 2000 through 2099.
 */
ivts_err_t board_time_set(uint64_t unix_ms);

/** @brief Read monotonic milliseconds since boot. */
uint64_t board_uptime_ms(void);
