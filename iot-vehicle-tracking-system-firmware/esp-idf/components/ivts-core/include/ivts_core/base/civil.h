/**
 * @file include/ivts_core/base/civil.h
 * @brief Conversion between UTC calendar values and Unix milliseconds.
 *
 * Board RTC conversion, modem time handling and app status formatting use
 * these helpers. The caller owns the fields and timestamps and supplies UTC.
 * The conversion is independent of the local time zone, locale and time_t width.
 */
#pragma once
#include <stdint.h>
#include "ivts_core/base/err.h"

/** @brief Caller-owned UTC date and time in the Gregorian calendar. */
typedef struct {
    uint16_t year;    /**< Year. Calendar-to-Unix conversion accepts 1970 through 2099. */
    uint8_t  month;   /**< 1..12 */
    uint8_t  day;     /**< Day, 1 through the last day of the month. */
    uint8_t  hour, /**< Hour, 0 through 23. */ min, /**< Minute, 0 through 59.
                         */ sec; /**< Second, 0 through 59. */
    uint16_t ms;      /**< 0..999 */
} ivts_civil_t;

/**
 * @brief Convert UTC calendar fields into Unix milliseconds.
 * @param c Required calendar fields borrowed for the call.
 * @param[out] out Required Unix time in milliseconds. Written only on success.
 * @retval IVTS_OK The calendar date and time convert successfully.
 * @retval IVTS_ERR_INVALID_ARG A pointer is NULL or a field or calendar date is out of range.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
ivts_err_t ivts_civil_to_unix_ms(const ivts_civil_t *c, uint64_t *out);

/**
 * @brief Convert Unix milliseconds into UTC calendar fields.
 * @param unix_ms Unix time in milliseconds. The calendar year must fit uint16_t.
 * @param[out] c Required caller-owned result. All calendar fields are written.
 *
 * @warning The year is stored in 16 bits and the conversion does not check for overflow.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
void ivts_unix_ms_to_civil(uint64_t unix_ms, ivts_civil_t *c);
