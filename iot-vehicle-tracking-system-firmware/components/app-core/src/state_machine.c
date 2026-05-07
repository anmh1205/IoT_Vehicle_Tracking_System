#include "app_state.h"

#include "state_machine_core.h"

/**
 * @file state_machine.c
 * @brief Public compatibility facade for the split tracker state machine.
 * This translation unit belongs to the app-core orchestration layer and keeps FSM transitions, retained runtime state, and orchestration policy centralized inside app-core.
 */

// File-local constants, retained state, and helper wiring stay private here so
// higher layers interact with this module through its exported contract.


/**
 * @brief Initialize the state machine with runtime configuration.
 *
 * @param[in] config Pointer to runtime configuration (used to setup adapters).
 * @return ESP_OK on success, error code otherwise.
 */
esp_err_t state_machine_init(const config_t *config) {
    // Keep the public API thin and hand initialization off to the shared core implementation.
    return state_machine_core_init(config);
}

/**
 * @brief Execute one iteration of the state machine from the given state.
 *
 * @param[in] current_state The state to transition from.
 * @return The next state to enter on the subsequent call.
 */
app_state_t state_machine_run(app_state_t current_state) {
    // Execute one cooperative FSM step through the shared core so all transitions stay centralized.
    return state_machine_core_run(current_state);
}

/**
 * @brief Retrieve the current telemetry snapshot.
 *
 * @return The latest telemetry data collected by the state machine.
 */
telemetry_t state_machine_get_telemetry(void) {
    // Keep this public facade thin and delegate the real work to the focused helper below.
    return state_machine_core_get_telemetry();
}
