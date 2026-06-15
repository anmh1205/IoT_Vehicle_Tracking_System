#pragma once

#include "command_handler.h"

/**
 * @file state_ota_runtime.h
 * @brief OTA action/confirm helpers for the tracker FSM.
 * This header belongs to the app-core orchestration layer and defines the orchestration boundary that bootstrap code and adapters rely on during runtime.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief Drain queued command actions that can run in the current wake loop.
 *
 * Processes a bounded number of actions per call so command traffic cannot
 * starve telemetry, retry, or sleep logic. Handles config apply, reboot,
 * session assignment, and OTA command dispatch.
 */
void state_machine_handle_pending_action(void);
/**
 * @brief Restore any pending OTA confirm context persisted in NVS at boot.
 *
 * Lets the firmware resume the authoritative confirm/timeout flow after a crash
 * or watchdog reset where RTC memory alone is not sufficient. No-op when a
 * confirm is already pending or no valid context is stored.
 */
void state_machine_restore_ota_context_from_nvs(void);
/**
 * @brief Confirm (or reject) the running firmware once per boot after OTA.
 *
 * Restores persisted context, enforces the confirm deadline when trusted time
 * is available, emits confirming/success/failure status, and asks ESP-IDF to
 * mark the new partition valid (cancelling rollback) or reboots on failure.
 */
void state_machine_try_confirm_running_firmware(void);
/**
 * @brief Execute a staged OTA update or rollback command.
 *
 * Ignores non-OTA actions. Publishes lifecycle status, enforces the safe-start
 * gate, performs the flash write or manual rollback, and persists confirm
 * context before rebooting into the new image.
 *
 * @param action OTA-related command action to process.
 */
void state_machine_process_ota_command(command_action_t action);
