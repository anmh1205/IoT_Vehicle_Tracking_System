/**
 * @file include/ivts_core/model/gnss.h
 * @brief GNSS fix fields and integer units shared by the modem and application.
 *
 * The modem task fills a GNSS sample and emits it by value. The app task owns
 * its snapshot and uses it in telemetry and status. GNSS query scheduling and
 * fix aging are handled by the modem and app respectively.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>

/** @brief Protocol source of a GNSS sample, including no source. */
typedef enum {
    IVTS_GNSS_SRC_NONE = 0,  /**< No GNSS query source is recorded. */
    IVTS_GNSS_SRC_FULL,     /**< Full GNSS query format, which can include satellite counts. */
    IVTS_GNSS_SRC_APPROX    /**< Fallback GNSS query format without a satellite count. sats remains zero. */
} ivts_gnss_src_t;

/** @brief Position sample with integer coordinates, owned and copied by value by its callers. */

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
