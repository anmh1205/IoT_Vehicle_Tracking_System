/**
 * @file include/board/board_clock.h
 * @brief UTC calendar access and monotonic uptime.
 *
 * The app reads and sets the RTC. The modem and OTA task read it through app callbacks.
 * RTC operations may wait on the shared I2C bus. Locking covers individual transfers.
 * Read results are written directly into caller-owned outputs.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/err.h"

/**
 * @brief Read DS3231M calendar time and its trust flag.
 *
 * @param[out] unix_ms Non-null destination for Unix milliseconds at one-second resolution. Zero for an
 *       invalid date.
 * @param[out] trusted Non-null destination. True for a valid date on or after 2024-01-01 UTC with oscillator
 *       stop clear.
 * @retval IVTS_OK Both outputs are written, including when the calendar is invalid.
 * @retval IVTS_ERR_INVALID_ARG An output is missing or I2C rejects its arguments.
 * @retval IVTS_ERR_INVALID_STATE The RTC is unavailable or I2C is in an invalid state.
 * @retval IVTS_ERR_TIMEOUT The bus lock or a transfer times out.
 * @retval IVTS_ERR_NOT_FOUND I2C reports a missing resource.
 * @retval IVTS_ERR_IO Another I2C failure.
 * @note Context: App, modem or OTA task after board initialization. Each of up to two transfers has a
 *       100 ms mutex timeout and a 50 ms transfer timeout. Outputs are unchanged on an error return.
 */
ivts_err_t board_time_get(uint64_t *unix_ms, bool *trusted);

/**
 * @brief Write the DS3231M calendar, then clear its oscillator stop flag.
 *
 * @param unix_ms Unix milliseconds in years 2000 through 2099. Fractions of a second are discarded.
 * @retval IVTS_OK Calendar and status writes complete.
 * @retval IVTS_ERR_INVALID_ARG The calendar is outside the supported range or I2C rejects its arguments.
 * @retval IVTS_ERR_INVALID_STATE The RTC is unavailable or I2C is in an invalid state.
 * @retval IVTS_ERR_TIMEOUT The bus lock or a transfer times out.
 * @retval IVTS_ERR_NOT_FOUND I2C reports a missing resource.
 * @retval IVTS_ERR_IO Another I2C failure.
 * @note Context: App task after board initialization. Up to three I2C transfers, each with a 100 ms
 *       mutex timeout and 50 ms transfer timeout.
 * @warning A status access failure can leave the new calendar written with the previous trust flag.
 */
ivts_err_t board_time_set(uint64_t unix_ms);

/**
 * @brief Read monotonic time since boot.
 * @return Uptime in whole milliseconds.
 * @note Context: Task context. Non-blocking.
 */
uint64_t board_uptime_ms(void);
