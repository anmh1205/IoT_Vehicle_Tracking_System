/**
 * @file components/ivts-core/include/ivts_core/model/obd.h
 * @brief OBD readiness, diagnostic trouble codes and ECU state contracts.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>

/** Validity bits. Zero is a valid RPM, speed or load reading. */
#define IVTS_OBD_HAS_RPM      (1u << 0)
#define IVTS_OBD_HAS_SPEED    (1u << 1)
#define IVTS_OBD_HAS_COOLANT  (1u << 2)
#define IVTS_OBD_HAS_FUEL     (1u << 3)
#define IVTS_OBD_HAS_LOAD     (1u << 4)

/** One PID sample. Read each value only when its valid_mask bit is set. */
typedef struct {
    uint16_t rpm;        /**< PID 0x0C. */
    int16_t  coolant_c;  /**< PID 0x05, coolant temperature in degrees Celsius. */
    uint8_t  valid_mask; /**< Bit mask of IVTS_OBD_HAS_* values. */
    uint8_t  speed_kmh;  /**< PID 0x0D. */
    uint8_t  fuel_pct;   /**< PID 0x2F, 0..100. */
    uint8_t  load_pct;   /**< PID 0x04, 0..100. */
} ivts_obd_sample_t;

/** Readiness status of one service 01 PID 0x01 monitor. */

typedef enum {
    IVTS_MON_UNKNOWN = 0,
    IVTS_MON_COMPLETE,
    IVTS_MON_INCOMPLETE,
    IVTS_MON_UNSUPPORTED
} ivts_monitor_status_t;

typedef struct {
    bool    valid;               /**< True after service 01 PID 0x01 has been decoded. */
    bool    mil_on;
    bool    compression_ignition;
    uint8_t reported_dtc_count;
    /* Monitors common to petrol and diesel engines. */
    ivts_monitor_status_t misfire, fuel_system, comprehensive_components;
    /* Monitors specific to spark-ignition engines. */
    ivts_monitor_status_t catalyst, heated_catalyst, evaporative_system,
                          secondary_air_system, ac_refrigerant, oxygen_sensor,
                          oxygen_sensor_heater, egr_vvt_system;
    /* Monitors specific to compression-ignition engines. */
    ivts_monitor_status_t nmhc_catalyst, nox_aftertreatment, boost_pressure,
                          exhaust_gas_sensor, pm_filter;
} ivts_obd_readiness_t;

#define IVTS_DTC_MAX_CODES  8u   /**< Maximum retained DTC count for each query type. */
#define IVTS_DTC_CODE_SIZE  6u   /**< "P0171" + NUL. */

/** Stored, pending or permanent diagnostic trouble-code list. */

typedef struct {
    bool    valid;       /**< True after successfully reading this list, including an empty result. */
    bool    truncated;   /**< The ECU reported more than IVTS_DTC_MAX_CODES codes. */
    uint8_t count;
    char    codes[IVTS_DTC_MAX_CODES][IVTS_DTC_CODE_SIZE];
} ivts_dtc_list_t;
