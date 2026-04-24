#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "fsm_types.h"
#include "gnss_model.h"
#include "obd_model.h"

/**
 * @file telemetry_model.h
 * @brief Runtime telemetry axes and aggregated telemetry snapshot types.
 */

typedef enum {
    TRACKER_IGNITION_STATE_UNKNOWN = 0,
    TRACKER_IGNITION_STATE_OFF,
    TRACKER_IGNITION_STATE_ON,
} tracker_ignition_state_t;

typedef enum {
    TRACKER_MOTION_STATE_UNKNOWN = 0,
    TRACKER_MOTION_STATE_STATIONARY,
    TRACKER_MOTION_STATE_MOVING,
} tracker_motion_state_t;

typedef enum {
    TRACKER_VEHICLE_STATE_UNKNOWN = 0,
    TRACKER_VEHICLE_STATE_PARKED_OFF,
    TRACKER_VEHICLE_STATE_ROLLING_IGN_OFF,
    TRACKER_VEHICLE_STATE_IDLING_ON,
    TRACKER_VEHICLE_STATE_MOVING_ON,
    TRACKER_VEHICLE_STATE_UNKNOWN_STATIONARY,
    TRACKER_VEHICLE_STATE_UNKNOWN_MOVING,
} tracker_vehicle_state_t;

typedef enum {
    TRACKER_DEVICE_STATE_BOOTING = 0,
    TRACKER_DEVICE_STATE_ACTIVE,
    TRACKER_DEVICE_STATE_SLEEP_PREPARE,
    TRACKER_DEVICE_STATE_SLEEPING,
    TRACKER_DEVICE_STATE_WAKING,
    TRACKER_DEVICE_STATE_ALARM,
    TRACKER_DEVICE_STATE_OTA,
    TRACKER_DEVICE_STATE_FAULT,
} tracker_device_state_t;

typedef enum {
    TRACKER_SLEEP_MODE_NONE = 0,
    TRACKER_SLEEP_MODE_FAKE,
    TRACKER_SLEEP_MODE_LIGHT,
    TRACKER_SLEEP_MODE_DEEP,
} tracker_sleep_mode_t;

/**
 * @brief Aggregated telemetry snapshot used for payload formatting.
 */
typedef struct {
    /** GNSS sensor fields. */
    gnss_data_t gnss;
    /** Primary battery voltage. */
    float battery_top;
    /** Backup battery voltage placeholder. */
    float battery_bot;
    /** Composite vibration score (0..1000). */
    uint16_t vibration;
    /** Derived ignition state. */
    bool ignition;
    /** Canonical ignition axis for cloud/runtime contracts. */
    tracker_ignition_state_t ignition_state;
    /** Canonical motion axis for cloud/runtime contracts. */
    tracker_motion_state_t motion_state;
    /** Canonical derived vehicle state for cloud/runtime contracts. */
    tracker_vehicle_state_t vehicle_state;
    /** Canonical device runtime axis for cloud/runtime contracts. */
    tracker_device_state_t device_state;
    /** Explicit sleep mode currently associated with device runtime. */
    tracker_sleep_mode_t sleep_mode;
    /** Generic error code for telemetry stream. */
    int error_code;
    /** Engine RPM from OBD PID 0x0C. */
    int32_t obd_rpm;
    /** Vehicle speed from OBD PID 0x0D. */
    int32_t obd_speed;
    /** Coolant temperature from OBD PID 0x05. */
    int32_t obd_coolant_temp;
    /** Fuel level percentage from OBD PID 0x2F. */
    int32_t obd_fuel_level;
    /** Engine load percentage from OBD PID 0x04. */
    int32_t obd_engine_load;
    /** Current BLE OBD link state. */
    bool obd_ble_connected;
    /** ELM327 initialization state for current BLE session. */
    bool obd_elm_ready;
    /** Latest ECU/session state derived from OBD adapter responses. */
    char obd_ecu_state[24];
    /** Age of latest successful OBD sample in milliseconds. */
    uint32_t obd_sample_age_ms;
    /** Number of OBD connect/init failures in the latest 5-minute window. */
    uint32_t obd_connect_fail_count_5m;
    /** Latest decoded MIL/readiness state from PID 0101. */
    obd_readiness_t obd_readiness;
    /** Latest stored DTCs from mode 03. */
    obd_dtc_list_t obd_stored_dtc;
    /** Latest pending DTCs from mode 07. */
    obd_dtc_list_t obd_pending_dtc;
    /** Latest permanent DTCs from mode 0A. */
    obd_dtc_list_t obd_permanent_dtc;
} telemetry_t;
