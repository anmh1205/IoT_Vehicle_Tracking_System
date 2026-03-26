#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "esp_err.h"

/**
 * @file modem_gnss.h
 * @brief GNSS control and parsing API via modem AT commands.
 */

/**
 * @brief Parsed GNSS fix snapshot.
 */
typedef struct {
    /** Latitude in decimal degrees. */
    double latitude;
    /** Longitude in decimal degrees. */
    double longitude;
    /** Ground speed in km/h. */
    float speed_kmh;
    /** Course over ground in degrees. */
    float course_deg;
    /** Number of tracked satellites (aggregated). */
    uint8_t satellites;
    /** Timestamp in milliseconds. */
    uint64_t timestamp_ms;
    /** True when modem reports valid fix. */
    bool fix_valid;
} gnss_data_t;

/**
 * @brief Power on modem GNSS engine.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_gnss_power_on(void);

/**
 * @brief Power off modem GNSS engine.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_gnss_power_off(void);

/**
 * @brief Check last cached fix validity.
 *
 * @return true when the last parsed GNSS sample had valid fix.
 */
bool modem_gnss_has_fix(void);

/**
 * @brief Query modem for current GNSS information and parse result.
 *
 * @param data Output GNSS structure.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_gnss_get_location(gnss_data_t *data);
