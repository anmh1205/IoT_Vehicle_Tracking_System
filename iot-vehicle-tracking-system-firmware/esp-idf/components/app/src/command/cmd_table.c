#include "command/command.h"
#include <string.h>

typedef struct {
    const char *name;
    const char *(*handle)(const cmd_envelope_t *command);
    bool needs_params;
    bool awaits_completion;
} command_handler_t;

static const command_handler_t k_handlers[] = {
    { "ota_update",      cmd_ota_handle,      true,  false },
    { "update_config",   cmd_config_handle,   true,  false },
    { "enable_tracking", cmd_tracking_handle, true,  false },
    { "assign_session",  cmd_session_handle,  true,  false },
    { "request_location", cmd_location_handle, false, true },
    { "reboot",           cmd_reboot_handle,    false, false },
    { "ota_rollback",     cmd_rollback_handle,  false, false },
    { "manual_rollback",  cmd_rollback_handle,  false, false },
};

cmd_result_t cmd_table_dispatch(const cmd_envelope_t *command)
{
    if (!command->has_name) { return (cmd_result_t){ .reason = "malformed" }; }
    for (size_t i = 0; i < sizeof k_handlers / sizeof k_handlers[0]; i++) {
        const command_handler_t *handler = &k_handlers[i];
        if (strcmp(command->name, handler->name) != 0) { continue; }
        if (handler->needs_params && !command->has_params) {
            return (cmd_result_t){ .reason = "missing_params" };
        }
        const char *reason = handler->handle(command);
        return (cmd_result_t){ .reason = reason, .awaits_completion = reason == NULL && handler->awaits_completion };
    }
    return (cmd_result_t){ .reason = "unknown_command" };
}
