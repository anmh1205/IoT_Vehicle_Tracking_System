/**
 * @file include/ivts_core/model/obd.h
 * @brief OBD readiness, diagnostic trouble codes and ECU state contracts.
 *
 * The OBD task decodes PID samples and diagnostic snapshots from ELM327 replies.
 * Events carry PID samples by value. The app copies readiness and trouble-code
 * lists through the OBD adapter before serializing telemetry. The model defines
 * validity and units, and the adapter owns BLE transport and reply parsing.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>

/** Validity bits. Zero is a valid RPM, speed or load reading. */
#define IVTS_OBD_HAS_RPM      (1u << 0)  /**< Validity bit for the engine speed reading. */
#define IVTS_OBD_HAS_SPEED    (1u << 1)  /**< Validity bit for the vehicle speed reading. */
#define IVTS_OBD_HAS_COOLANT  (1u << 2)  /**< Validity bit for the coolant temperature reading. */
#define IVTS_OBD_HAS_FUEL     (1u << 3)  /**< Validity bit for the fuel level reading. */
#define IVTS_OBD_HAS_LOAD     (1u << 4)  /**< Validity bit for the engine load reading. */

/** @brief By-value PID sample. Read each value only when its valid_mask bit is set. */
typedef struct {
    uint16_t rpm;        /**< PID 0x0C engine speed in revolutions per minute. */
    int16_t  coolant_c;  /**< PID 0x05, coolant temperature in degrees Celsius. */
    uint8_t  valid_mask; /**< Bit mask of IVTS_OBD_HAS_* values. */
    uint8_t  speed_kmh;  /**< PID 0x0D vehicle speed in kilometres per hour. */
    uint8_t  fuel_pct;   /**< PID 0x2F, 0..100. */
    uint8_t  load_pct;   /**< PID 0x04, 0..100. */
} ivts_obd_sample_t;

/** @brief Readiness status of one service 01 PID 0x01 monitor. */

typedef enum {
    IVTS_MON_UNKNOWN = 0,  /**< The monitor is not decoded for this sample. */
    IVTS_MON_COMPLETE,  /**< The supported monitor is complete. */
    IVTS_MON_INCOMPLETE,  /**< The supported monitor is incomplete. */
    IVTS_MON_UNSUPPORTED  /**< The ECU marks the monitor unsupported. */
} ivts_monitor_status_t;

/** @brief Readiness snapshot copied from the OBD adapter into app-owned storage. */
typedef struct {
    bool    valid;               /**< True after service 01 PID 0x01 has been decoded. */
    bool    mil_on;  /**< ECU reports the malfunction indicator lamp on. */
    bool    compression_ignition;  /**< True for compression ignition, false for spark ignition. */
    uint8_t reported_dtc_count;  /**< ECU-reported trouble-code count, zero through 127. */
    /* Monitors common to petrol and diesel engines. */
    ivts_monitor_status_t misfire, /**< Misfire monitor status.
                          */ fuel_system, /**< Fuel system monitor status.
                          */ comprehensive_components; /**< Comprehensive components monitor status. */
    /* Monitors specific to spark-ignition engines. */
    ivts_monitor_status_t catalyst, /**< Catalyst monitor status.
                          */ heated_catalyst, /**< Heated catalyst monitor status.
                          */ evaporative_system, /**< Evaporative system monitor status. */
                          secondary_air_system, /**< Secondary air system monitor status.
                          */ ac_refrigerant, /**< Air conditioning refrigerant monitor status.
                          */ oxygen_sensor, /**< Oxygen sensor monitor status. */
                          oxygen_sensor_heater, /**< Oxygen sensor heater monitor status.
                          */ egr_vvt_system; /**< Exhaust gas recirculation or valve timing monitor. */
    /* Monitors specific to compression-ignition engines. */
    ivts_monitor_status_t nmhc_catalyst, /**< Non-methane hydrocarbon catalyst monitor status.
                          */ nox_aftertreatment, /**< NOx aftertreatment monitor status.
                          */ boost_pressure, /**< Boost pressure monitor status. */
                          exhaust_gas_sensor, /**< Exhaust gas sensor monitor status.
                          */ pm_filter; /**< Particulate matter filter monitor status. */
} ivts_obd_readiness_t;

#define IVTS_DTC_MAX_CODES  8u   /**< Maximum retained DTC count for each query type. */
#define IVTS_DTC_CODE_SIZE  6u   /**< "P0171" + NUL. */

/** @brief Stored, pending or permanent trouble codes copied by value into the app snapshot. */

typedef struct {
    bool    valid;       /**< True after successfully reading this list, including an empty result. */
    bool    truncated;   /**< The ECU reported more than IVTS_DTC_MAX_CODES codes. */
    uint8_t count;  /**< Number of retained codes, zero through IVTS_DTC_MAX_CODES. */
    char    codes[IVTS_DTC_MAX_CODES][IVTS_DTC_CODE_SIZE];  /**< NUL-terminated five-character codes. */
} ivts_dtc_list_t;
