/**
 * @file main.c
 * @brief Application entry point for the IoT Vehicle Tracking System firmware.
 *
 * This file is the primary entry point executed on ESP32-S3 startup.
 * It delegates all initialization and runtime control to the app-core bootstrap module.
 *
 * @author IoT Vehicle Tracking System
 * @date 2026-05-01
 * This translation unit belongs to the firmware bootstrap layer and keeps the ESP-IDF entry path thin and delegates runtime behavior to app-core.
 */

// File-local constants, retained state, and helper wiring stay private here so
// higher layers interact with this module through its exported contract.


#include "tracker-app-bootstrap.h"

/**
 * @brief Main application entry point.
 *
 * Called by the ESP-IDF framework after system initialization completes.
 * Delegates all bootstrap and runtime logic to `app_core_bootstrap_run()`.
 *
 * @note This function never returns under normal operation; the system runs
 *       the state machine loop indefinitely until power-off or reset.
 */
void app_main(void) {
    // Keep this public facade thin and forward the real work to the focused implementation below.
    app_core_bootstrap_run();
}
