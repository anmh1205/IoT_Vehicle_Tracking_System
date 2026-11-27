/**
 * @file gnss.h
 * @brief GNSS fix fields and integer units shared by the modem and application.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>

/** Protocol source of a GNSS sample. */
typedef enum {
    IVTS_GNSS_SRC_NONE = 0,
    IVTS_GNSS_SRC_FULL,     /**< Full fix with per-constellation satellite counts. */
    IVTS_GNSS_SRC_APPROX    /**< Fallback fix without a satellite count. sats remains zero. */
} ivts_gnss_src_t;

/** Position sample with integer coordinates. */

typedef struct {
    uint64_t ts_unix_ms;       /**< UTC fix time in Unix milliseconds. Zero means unknown. */
    int32_t  lat_e7;           /**< Latitude in degrees times 10^7, in [-900000000, 900000000]. */
    int32_t  lon_e7;           /**< Longitude in degrees times 10^7, in [-1800000000, 1800000000]. */
    uint16_t speed_cm_s;       /**< Speed in centimetres per second. */
    uint16_t course_deg_x10;   /**< Course in tenths of a degree, from 0 through 3599. */
    uint8_t  sats;             /**< Number of satellites. */
    uint8_t  src;              /**< ivts_gnss_src_t stored in a fixed-width byte. */
    bool     fix_valid;        /**< False when there is no fix and position fields are invalid. */
} ivts_gnss_t;
