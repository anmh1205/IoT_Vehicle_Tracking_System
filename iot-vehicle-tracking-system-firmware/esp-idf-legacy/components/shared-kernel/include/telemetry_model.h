#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "fsm_types.h"
#include "gnss_model.h"
#include "obd_model.h"

/**
 * @file telemetry_model.h
 * @brief Runtime telemetry axes and aggregated telemetry snapshot types.
 * This header belongs to the shared kernel layer and collects the shared models, bounds, and helper contracts that multiple components reuse.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief Ignition axis: whether the vehicle key/ignition line is energized.
 */
typedef enum {
    TRACKER_IGNITION_STATE_UNKNOWN = 0,  /**< Not yet determined (e.g. at boot before first read). */
    TRACKER_IGNITION_STATE_OFF,          /**< Ignition confirmed OFF. */
    TRACKER_IGNITION_STATE_ON,           /**< Ignition confirmed ON. */
} tracker_ignition_state_t;

/**
 * @brief Motion axis: whether the device is physically moving, per IMU/GNSS.
 */
typedef enum {
    TRACKER_MOTION_STATE_UNKNOWN = 0,    /**< Motion not yet classified. */
    TRACKER_MOTION_STATE_STATIONARY,     /**< No significant movement detected. */
    TRACKER_MOTION_STATE_MOVING,         /**< Sustained movement detected. */
} tracker_motion_state_t;

/**
 * @brief Derived vehicle state combining the ignition and motion axes.
 *
 * This is the fused, higher-level interpretation reported to the cloud; the
 * `UNKNOWN_*` variants cover cases where ignition is indeterminate but motion
 * is known (e.g. ADC fallback in use).
 */
typedef enum {
    TRACKER_VEHICLE_STATE_UNKNOWN = 0,            /**< Neither axis resolved yet. */
    TRACKER_VEHICLE_STATE_PARKED_OFF,             /**< Ignition off and stationary (normal parked). */
    TRACKER_VEHICLE_STATE_ROLLING_IGN_OFF,        /**< Moving with ignition off (towed/coasting/theft). */
    TRACKER_VEHICLE_STATE_IDLING_ON,              /**< Ignition on but stationary (engine idling). */
    TRACKER_VEHICLE_STATE_MOVING_ON,              /**< Ignition on and moving (normal driving). */
    TRACKER_VEHICLE_STATE_UNKNOWN_STATIONARY,     /**< Ignition unknown, confirmed stationary. */
    TRACKER_VEHICLE_STATE_UNKNOWN_MOVING,         /**< Ignition unknown, confirmed moving. */
} tracker_vehicle_state_t;

/**
 * @brief Device runtime lifecycle state (mirrors the firmware FSM phase).
 */
typedef enum {
    TRACKER_DEVICE_STATE_BOOTING = 0,    /**< Powering up / initializing peripherals. */
    TRACKER_DEVICE_STATE_ACTIVE,         /**< Fully awake, sampling and publishing telemetry. */
    TRACKER_DEVICE_STATE_SLEEP_PREPARE,  /**< Flushing work and arming wakeup sources before sleep. */
    TRACKER_DEVICE_STATE_SLEEPING,       /**< In a low-power sleep mode. */
    TRACKER_DEVICE_STATE_WAKING,         /**< Resuming from sleep, restoring context. */
    TRACKER_DEVICE_STATE_ALARM,          /**< Motion alarm triggered while parked. */
    TRACKER_DEVICE_STATE_OTA,            /**< Performing a firmware over-the-air update. */
    TRACKER_DEVICE_STATE_FAULT,          /**< Unrecoverable error condition. */
} tracker_device_state_t;

/**
 * @brief Sleep strategy currently selected for the device.
 */
typedef enum {
    TRACKER_SLEEP_MODE_NONE = 0,  /**< Not sleeping. */
    TRACKER_SLEEP_MODE_FAKE,      /**< Stay powered but idle (debug/simulated sleep, no real power saving). */
    TRACKER_SLEEP_MODE_LIGHT,     /**< Light sleep: CPU paused, RAM retained, fast wake. */
    TRACKER_SLEEP_MODE_DEEP,      /**< Deep sleep: most domains off, wake via RTC/IMU, lowest power. */
} tracker_sleep_mode_t;

/**
 * @brief Aggregated telemetry snapshot used for payload formatting.
 */
typedef struct {
    /** GNSS sensor fields. */
    gnss_data_t gnss;
    /** Vehicle-side +12V supply / main battery voltage. */
    float vehicle_battery;
    /** Tracker backup battery voltage. */
    float device_battery;
    /** Peak IMU acceleration delta for the publish window, in m/s^2. */
    float imu_accel_delta_mps2;
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
