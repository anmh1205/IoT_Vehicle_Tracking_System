/**
 * @file include/app/app.h
 * @brief Public entry point for starting IVTS firmware.
 *
 * Call once from app_main() in task context. Initialization runs on that task and starts
 * the app runtime after composing its dependencies. Worker tasks use the private runtime
 * event sink. This interface exposes no shared buffers or runtime controls.
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
/**
 * @brief Initialize firmware components and start the app task.
 *
 * Create the app event queue before starting producers, restore persistent state and configure the adapters.
 * SD, IMU, RTC and OBD initialization failures allow degraded operation.
 *
 * @note Context: Startup task. Blocking: performs hardware and storage initialization synchronously. On
 * mandatory failure it delays 10 seconds before restart.
 * @warning Call once from app_main(). A successful return means the app task has been created.
 */
void app_start(void);
