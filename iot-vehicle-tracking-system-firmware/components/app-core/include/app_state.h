#pragma once

#include "esp_err.h"

#include "app_config.h"
#include "fsm_types.h"
#include "rtc_context.h"
#include "telemetry_model.h"

/**
 * @file app_state.h
 * @brief Compatibility facade for FSM, RTC, and telemetry model headers.
 * This header belongs to the app-core orchestration layer and defines the orchestration boundary that bootstrap code and adapters rely on during runtime.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/** @brief Global RTC-retained context instance. */
extern rtc_context_t g_rtc_context;

/**
 * @brief Initialize all modules needed by the runtime state machine.
 *
 * @param config Runtime configuration pointer.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t state_machine_init(const config_t *config);

/**
 * @brief Execute one state-machine iteration and return next state.
 *
 * @param current_state Current FSM state.
 *
 * @return Next FSM state.
 */
app_state_t state_machine_run(app_state_t current_state);

/**
 * @brief Return latest telemetry snapshot.
 *
 * @return Copy of current telemetry structure.
 */
telemetry_t state_machine_get_telemetry(void);
