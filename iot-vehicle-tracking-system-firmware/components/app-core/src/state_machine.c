#include "app_state.h"

#include "state_machine_core.h"

/**
 * @file state_machine.c
 * @brief Public compatibility facade for the split tracker state machine.
 */

/**
 * @brief Initialize the state machine with runtime configuration.
 *
 * @param[in] config Pointer to runtime configuration (used to setup adapters).
 * @return ESP_OK on success, error code otherwise.
 */
esp_err_t state_machine_init(const config_t *config) {
    return state_machine_core_init(config);
}

/**
 * @brief Execute one iteration of the state machine from the given state.
 *
 * @param[in] current_state The state to transition from.
 * @return The next state to enter on the subsequent call.
 */
app_state_t state_machine_run(app_state_t current_state) {
    return state_machine_core_run(current_state);
}

/**
 * @brief Retrieve the current telemetry snapshot.
 *
 * @return The latest telemetry data collected by the state machine.
 */
telemetry_t state_machine_get_telemetry(void) {
    return state_machine_core_get_telemetry();
}
