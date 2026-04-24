#pragma once

#include "app_state.h"

/**
 * @file state_machine_core.h
 * @brief Internal state-machine core entrypoints used by the public facade.
 */

esp_err_t state_machine_core_init(const config_t *config);
app_state_t state_machine_core_run(app_state_t current_state);
telemetry_t state_machine_core_get_telemetry(void);
