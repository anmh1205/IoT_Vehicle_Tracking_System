/**
 * @file state.h
 * @brief Application FSM state identifiers and device-state mappings.
 */
#pragma once

/** Application state identifiers used for transitions and actions. */
typedef enum {
    IVTS_ST_INIT = 0,
    IVTS_ST_CHECK_IGN,   /**< Wait for an ignition measurement after startup or wake. */
    IVTS_ST_DRIVING,     /**< Ignition is on. Publish driving telemetry. */
    IVTS_ST_PARKED,      /**< Ignition is off. Wait until sleep conditions are met. */
    IVTS_ST_ALARM,       /**< Motion was detected with ignition off. */
    IVTS_ST_HEARTBEAT,   /**< Wake by timer, publish a heartbeat and go back to sleep. */
    IVTS_ST_SLEEP,       /**< Sleep requested. Await a wake or reboot via deep sleep. */
    IVTS_ST_COUNT
} ivts_fsm_state_t;

/** @brief Return the stable non-null name of an FSM state. */
const char *ivts_fsm_state_name(ivts_fsm_state_t s);
