#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/fsm/state.h"

/* App task. Apply the LED pattern selected for the current FSM state. */
void app_led_pattern_tick(ivts_fsm_state_t state, bool tracking_enabled, uint64_t now_ms);
