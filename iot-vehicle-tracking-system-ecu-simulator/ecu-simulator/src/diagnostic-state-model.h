#pragma once

#include <Arduino.h>

#include "simulation-state.h"

uint8_t fault_profile_count();
void diagnostic_state_begin(diagnostic_state_t &state, uint8_t profile_index);
void diagnostic_state_tick(diagnostic_state_t &state, const powertrain_state_t &powertrain, uint32_t delta_ms);
