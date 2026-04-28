#pragma once

/**
 * @file tracker-app-bootstrap.h
 * @brief Top-level firmware bootstrap entrypoint owned by the app-core component.
 */

/**
 * @brief Start the tracker firmware runtime.
 *
 * This entrypoint validates injected runtime ports, loads persisted
 * configuration, derives the initial wake state, and then enters the main FSM
 * loop.
 */
void app_core_bootstrap_run(void);
