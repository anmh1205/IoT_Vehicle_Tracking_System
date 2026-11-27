#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "app_state.h"

/**
 * @file state_led_control.h
 * @brief User LED pattern controller for FSM state visualization.
 */

/** @brief Drive the user LED pattern based on the current FSM state. */
void state_led_update(app_state_t app_state);

/** @brief Force the user LED on regardless of FSM state. */
void state_led_force_on(void);

/** @brief Force the user LED off regardless of FSM state. */
void state_led_force_off(void);

/** @brief Resume normal pattern-driven LED behavior. */
void state_led_resume_pattern(void);
