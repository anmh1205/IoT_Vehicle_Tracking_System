#pragma once

/**
 * @file fsm_types.h
 * @brief Main tracker finite-state-machine state definitions.
 */

/**
 * @brief Main runtime states of the tracker finite-state machine.
 */
typedef enum {
    /** Boot-time initialization. */
    APP_STATE_INIT = 0,
    /** Decide ignition state and first transition. */
    APP_STATE_CHECK_IGN,
    /** Vehicle is moving, high-frequency telemetry enabled. */
    APP_STATE_DRIVING,
    /** Vehicle is stopped, waiting for sleep transition. */
    APP_STATE_PARKED,
    /** Motion alarm mode after wake on IMU interrupt. */
    APP_STATE_ALARM,
    /** Periodic timer wakeup mode for heartbeat/telemetry. */
    APP_STATE_HEARTBEAT,
    /** Deep-sleep preparation and entry. */
    APP_STATE_SLEEP,
} app_state_t;
