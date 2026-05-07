#pragma once

#include "command_handler.h"

/**
 * @file state_ota_runtime.h
 * @brief OTA action/confirm helpers for the tracker FSM.
 * This header belongs to the app-core orchestration layer and defines the orchestration boundary that bootstrap code and adapters rely on during runtime.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


void state_machine_handle_pending_action(void);
void state_machine_restore_ota_context_from_nvs(void);
void state_machine_try_confirm_running_firmware(void);
void state_machine_process_ota_command(command_action_t action);
