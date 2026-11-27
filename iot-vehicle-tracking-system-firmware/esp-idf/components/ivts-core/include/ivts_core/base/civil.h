/**
 * @file civil.h
 * @brief Conversion between UTC calendar values and Unix milliseconds.
 *
 * The conversion is independent of the local time zone, locale and time_t
 * width.
 */
#pragma once
#include <stdint.h>
#include "ivts_core/base/err.h"

/** UTC date and time in the Gregorian calendar. */
typedef struct {
    uint16_t year;    /**< 1970..2099 */
    uint8_t  month;   /**< 1..12 */
    uint8_t  day;     /**< 1..31 */
    uint8_t  hour, min, sec;
    uint16_t ms;      /**< 0..999 */
} ivts_civil_t;

/**
 * @brief Convert UTC calendar fields into Unix milliseconds.
 * @param c Input calendar fields.
 * @param[out] out Unix time in milliseconds.
 * @return IVTS_OK, or IVTS_ERR_INVALID_ARG for a null pointer, out-of-range
 * field or invalid date such as April 31.
 */
ivts_err_t ivts_civil_to_unix_ms(const ivts_civil_t *c, uint64_t *out);

/**
 * @brief Convert Unix milliseconds into UTC calendar fields.
 * @param unix_ms Unix time in milliseconds.
 * @param[out] c Required result pointer.
 */
void ivts_unix_ms_to_civil(uint64_t unix_ms, ivts_civil_t *c);
