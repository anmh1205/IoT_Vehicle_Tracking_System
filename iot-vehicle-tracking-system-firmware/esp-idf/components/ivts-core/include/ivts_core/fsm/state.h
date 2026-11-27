/**
 * @file include/ivts_core/fsm/state.h
 * @brief Application FSM state identifiers and their display names.
 *
 * App state handlers use these identifiers for transitions. The app status
 * formatter and transition log use their immutable string names. The FSM
 * interface maps these states to the device states reported to the cloud.
 */
#pragma once

/** @brief Application states used by the app task for transitions and effects. */
typedef enum {
    IVTS_ST_INIT = 0,  /**< The FSM starts before the first step requests GNSS. */
    IVTS_ST_CHECK_IGN,   /**< Wait for an ignition measurement after startup or wake. */
    IVTS_ST_DRIVING,     /**< Ignition is on. Publish driving telemetry. */
    IVTS_ST_PARKED,      /**< Ignition is off. Wait until sleep conditions are met. */
    IVTS_ST_ALARM,       /**< Motion triggers the alarm path while ignition is off or unknown. */
    IVTS_ST_HEARTBEAT,   /**< A timer wake requests heartbeat status before returning to sleep. */
    IVTS_ST_SLEEP,       /**< Sleep requested. Await a wake or reboot via deep sleep. */
    IVTS_ST_COUNT  /**< Sentinel after the last application state. */
} ivts_fsm_state_t;

/**
 * @brief Return the stable name of an FSM state.
 * @param s State identifier to name.
 * @return Immutable static string, or "UNKNOWN" for the sentinel or an unrecognized value.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
const char *ivts_fsm_state_name(ivts_fsm_state_t s);
