#pragma once

#include <stdbool.h>
#include <stdint.h>

/**
 * @file gnss_model.h
 * @brief Shared GNSS fix snapshot model used across modem and telemetry layers.
 * This header belongs to the shared kernel layer and collects the shared models, bounds, and helper contracts that multiple components reuse.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


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
