#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "runtime_config.h"

/**
 * @file obd_model.h
 * @brief Shared OBD telemetry/readiness model types.
 * This header belongs to the shared kernel layer and collects the shared models, bounds, and helper contracts that multiple components reuse.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


#define TRACKER_OBD_MAX_DTC_CODES 8
#define TRACKER_OBD_DTC_CODE_LEN 6

/**
 * @brief Readiness state for an individual OBD monitor.
 */
typedef enum {
    OBD_MONITOR_STATUS_UNKNOWN = 0,
    OBD_MONITOR_STATUS_COMPLETE,
    OBD_MONITOR_STATUS_INCOMPLETE,
    OBD_MONITOR_STATUS_UNSUPPORTED,
} obd_monitor_status_t;

/**
 * @brief Decoded PID 0101 readiness and MIL snapshot.
 */
typedef struct {
    /** True once PID 0101 was decoded at least once in the current session. */
    bool valid;
    /** True when MIL bit is asserted. */
    bool mil_on;
    /** DTC count reported in PID 0101 byte A low bits. */
    uint8_t reported_dtc_count;
    /** Compression-ignition readiness profile flag. */
    bool compression_ignition;
    /** Common monitors. */
    obd_monitor_status_t misfire;
    obd_monitor_status_t fuel_system;
    obd_monitor_status_t comprehensive_components;
    /** Spark-ignition monitors. */
    obd_monitor_status_t catalyst;
    obd_monitor_status_t heated_catalyst;
    obd_monitor_status_t evaporative_system;
    obd_monitor_status_t secondary_air_system;
    obd_monitor_status_t ac_refrigerant;
    obd_monitor_status_t oxygen_sensor;
    obd_monitor_status_t oxygen_sensor_heater;
    obd_monitor_status_t egr_vvt_system;
    /** Compression-ignition monitors. */
    obd_monitor_status_t nmhc_catalyst;
    obd_monitor_status_t nox_aftertreatment;
    obd_monitor_status_t boost_pressure;
    obd_monitor_status_t exhaust_gas_sensor;
    obd_monitor_status_t pm_filter;
} obd_readiness_t;

/**
 * @brief Fixed-size DTC list snapshot for one OBD mode.
 */
typedef struct {
    /** True when the mode was queried successfully or explicitly returned no data. */
    bool valid;
    /** Number of codes stored in @p codes. */
    uint8_t count;
    /** Null-terminated five-character DTC codes (`P0171`, ...). */
    char codes[TRACKER_OBD_MAX_DTC_CODES][TRACKER_OBD_DTC_CODE_LEN];
} obd_dtc_list_t;
