#pragma once

#include "app_state.h"

/**
 * @file state_machine_core.h
 * @brief Internal state-machine core entrypoints used by the public facade.
 * This header belongs to the app-core orchestration layer and defines the orchestration boundary that bootstrap code and adapters rely on during runtime.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief Initialize the tracker FSM core and all subsystems it orchestrates.
 *
 * Resets shared runtime state, brings up board drivers (ADC, power, RTC),
 * seeds modem/MQTT/offline-queue transport, and restores any persisted
 * session/OTA context before the first iteration runs.
 *
 * @param[in] config Runtime configuration snapshot (must not be NULL).
 * @return ESP_OK on success; an ESP-IDF error code if a required subsystem
 *         failed to initialize or @p config was NULL.
 */
esp_err_t state_machine_core_init(const config_t *config);

/**
 * @brief Execute exactly one cooperative iteration of the tracker FSM.
 *
 * Updates the user LED, dispatches to the handler for @p current_state, then
 * logs the resulting transition and (optionally) a health snapshot.
 *
 * @param[in] current_state State to evaluate this iteration.
 * @return Next FSM state to evaluate on the subsequent call.
 */
app_state_t state_machine_core_run(app_state_t current_state);

/**
 * @brief Return the latest aggregated telemetry snapshot held by app-core.
 *
 * @return Copy of the current telemetry structure.
 */
telemetry_t state_machine_core_get_telemetry(void);
