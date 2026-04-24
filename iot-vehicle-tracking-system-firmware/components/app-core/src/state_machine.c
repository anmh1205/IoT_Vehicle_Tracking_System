#include "app_state.h"

#include "state_machine_core.h"

/**
 * @file state_machine.c
 * @brief Public compatibility facade for the split tracker state machine.
 */

esp_err_t state_machine_init(const config_t *config) {
    return state_machine_core_init(config);
}

app_state_t state_machine_run(app_state_t current_state) {
    return state_machine_core_run(current_state);
}

telemetry_t state_machine_get_telemetry(void) {
    return state_machine_core_get_telemetry();
}
