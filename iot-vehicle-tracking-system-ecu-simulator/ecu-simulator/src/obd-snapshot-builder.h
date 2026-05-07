#pragma once

#include "ecu-model.h"
#include "simulation-state.h"

void build_obd_snapshot(ecu_snapshot_t &snapshot,
                        const powertrain_state_t &powertrain,
                        const diagnostic_state_t &diagnostic);
