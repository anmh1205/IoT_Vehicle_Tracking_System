/**
 * @file app.h
 * @brief Public entry point for starting the IVTS application and its worker tasks.
 *
 * Call once from app_main. Initialization runs on the caller and starts the
 * application task only after its dependencies are ready.
 */
#pragma once

/**
 * @brief Initialize firmware components and start the app task.
 *
 * Create the application event queue first, then initialize board and storage,
 * restore persisted state, and initialize modem, OBD and OTA. Return to the
 * startup caller after creating the app task.
 *
 * A mandatory initialization failure is logged and triggers a restart after 10
 * seconds. SD, IMU, RTC and OBD failures allow degraded operation.
 *
 * @note Call once from app_main() before starting any IVTS workers.
 */
void app_start(void);
