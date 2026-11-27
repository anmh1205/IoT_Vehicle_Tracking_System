/**
 * @file include/ivts_core/model/telemetry.h
 * @brief Portable vehicle measurements, device state and telemetry snapshots.
 *
 * The app task owns its snapshot and builds payloads and console status from it.
 * Board, modem and OBD supply observations by value or through their snapshot
 * APIs. The app telemetry module owns freshness and snapshot updates.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/model/gnss.h"
#include "ivts_core/model/obd.h"

/** @brief Debounced ignition state. */
typedef enum { IVTS_IGN_UNKNOWN = 0, /**< No initial ignition observation.
       */ IVTS_IGN_OFF, /**< Debounced ignition is off.
       */ IVTS_IGN_ON /**< Debounced ignition is on. */ } ivts_ignition_t;
/** @brief Vehicle motion state inferred from the IMU. */
typedef enum { IVTS_MOTION_UNKNOWN = 0, /**< The axis has no motion result yet.
       */ IVTS_MOTION_STATIONARY, /**< The motion quiet interval elapses.
       */ IVTS_MOTION_MOVING /**< An IMU interrupt indicates motion. */ } ivts_motion_t;

/** @brief Vehicle state derived from ignition and motion. */
typedef enum {
    IVTS_VEH_UNKNOWN = 0,  /**< Motion is unknown. */
    IVTS_VEH_PARKED_OFF,  /**< Ignition is off and motion is stationary. */
    IVTS_VEH_ROLLING_IGN_OFF,  /**< Ignition is off and motion is detected. */
    IVTS_VEH_IDLING_ON,  /**< Ignition is on and motion is stationary. */
    IVTS_VEH_MOVING_ON,  /**< Ignition is on and motion is detected. */
    IVTS_VEH_UNKNOWN_STATIONARY,  /**< Ignition is unknown and motion is stationary. */
    IVTS_VEH_UNKNOWN_MOVING  /**< Ignition is unknown and motion is detected. */
} ivts_vehicle_t;

/** @brief Device state reported to the cloud. */
typedef enum {
    IVTS_DEV_BOOTING = 0,  /**< The app FSM is initializing. */
    IVTS_DEV_ACTIVE,  /**< The app is driving, parked or servicing a heartbeat. */
    IVTS_DEV_SLEEP_PREPARE,  /**< The FSM requests sleep. */
    IVTS_DEV_SLEEPING,  /**< The app sleep controller enters the selected sleep path. */
    IVTS_DEV_WAKING,  /**< The FSM checks ignition after startup or wake. */
    IVTS_DEV_ALARM,  /**< The app FSM is in its motion alarm state. */
    IVTS_DEV_OTA,  /**< The app reports OTA activity. */
    IVTS_DEV_FAULT  /**< The FSM state has no defined device state mapping. */
} ivts_device_state_t;

/** @brief Reported sleep mode. Simulated sleep keeps the hardware powered. */
typedef enum { IVTS_SLEEP_NONE = 0, /**< No sleep mode is selected.
       */ IVTS_SLEEP_FAKE, /**< The FSM simulates sleep while hardware stays powered.
       */ IVTS_SLEEP_LIGHT, /**< The board uses light sleep.
       */ IVTS_SLEEP_DEEP /**< The board uses deep sleep. */ } ivts_sleep_mode_t;

/** @brief ECU activity inferred from ELM327 results. */
typedef enum {
    IVTS_ECU_UNKNOWN = 0,  /**< The OBD path has no classified ECU result yet. */
    IVTS_ECU_DISCONNECTED,  /**< The OBD BLE session is disconnected. */
    IVTS_ECU_LIVE,  /**< The ECU supplies a live PID sample. */
    IVTS_ECU_STOPPED,  /**< The ELM327 reports STOPPED. */
    IVTS_ECU_NO_DATA  /**< The OBD poll produces no usable ECU data. */
} ivts_ecu_state_t;

/**
 * @brief App-owned device snapshot. The telemetry module is the sole writer and the
 * app task builds outgoing payloads from this snapshot.
 */
typedef struct {
    ivts_gnss_t          gnss;  /**< Most recent GNSS observation with current fix validity. */
    ivts_obd_sample_t    obd;  /**< Most recent OBD PID sample with per-field validity. */
    ivts_obd_readiness_t obd_readiness;  /**< Latest copied ECU readiness snapshot. */
    ivts_dtc_list_t      dtc_stored, /**< Latest stored trouble codes.
                        */ dtc_pending, /**< Latest pending trouble codes.
                        */ dtc_permanent; /**< Latest permanent trouble codes. */
    uint32_t imu_accel_delta_mmps2;   /**< Peak deviation in mm/s^2 since the last consumption. */
    uint32_t obd_sample_age_ms;  /**< OBD sample age in ms, or UINT32_MAX when unavailable or saturated. */
    uint32_t obd_connect_fail_5m;  /**< Count of observed BLE connected-to-disconnected transitions. */
    int32_t  error_code;  /**< Error field. The app telemetry path leaves it at zero. */
    uint16_t vehicle_mv;  /**< Latest vehicle supply reading in millivolts. */
    uint16_t device_mv;  /**< Latest device supply reading in millivolts. */
    ivts_ignition_t     ignition;  /**< Debounced ignition axis state. */
    ivts_motion_t       motion;  /**< Inferred vehicle motion axis state. */
    ivts_vehicle_t      vehicle;  /**< Vehicle state derived from ignition and motion. */
    ivts_device_state_t device_state;  /**< App-reported device state. */
    ivts_sleep_mode_t   sleep_mode;  /**< App-reported sleep mode. */
    ivts_ecu_state_t    obd_ecu_state;  /**< Latest ECU state reported by the OBD adapter. */
    bool obd_ble_connected;  /**< True while the OBD BLE link is connected. */
    bool obd_elm_ready;  /**< True when the OBD adapter reports the ELM327 ready. */
} ivts_telemetry_t;
