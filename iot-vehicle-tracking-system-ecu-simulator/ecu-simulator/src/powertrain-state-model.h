#pragma once

#include <Arduino.h>

#include "simulation-state.h"

const powertrain_config_t &default_powertrain_config();
void powertrain_state_begin(powertrain_state_t &state);
void powertrain_state_tick(powertrain_state_t &state,
                           const powertrain_config_t &config,
                           const driver_command_t &command,
                           bool ignition_on,
                           uint32_t delta_ms);
