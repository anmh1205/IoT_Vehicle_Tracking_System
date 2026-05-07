#pragma once

/**
 * @file tracker-app-bootstrap.h
 * @brief Top-level firmware bootstrap entrypoint owned by the app-core component.
 * This header belongs to the app-core orchestration layer and defines the orchestration boundary that bootstrap code and adapters rely on during runtime.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief Start the tracker firmware runtime.
 *
 * This entrypoint validates injected runtime ports, loads persisted
 * configuration, derives the initial wake state, and then enters the main FSM
 * loop.
 */
void app_core_bootstrap_run(void);
