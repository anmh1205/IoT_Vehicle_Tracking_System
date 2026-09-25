#pragma once

#include <Arduino.h>

#include "simulation-state.h"

driver_command_t resolve_driver_command(uint32_t drive_elapsed_s);
