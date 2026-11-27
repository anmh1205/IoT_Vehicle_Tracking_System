#include "cmd_handlers.h"
#include "app_priv.h"
#include "publish/outbox.h"
#include "storage/storage.h"

const char *cmd_tracking_handle(const cmd_envelope_t *command)
{
    bool enabled;
    if (!ivts_json_obj_get_bool(&command->params, "enabled", &enabled)) { return "invalid_enabled"; }
    if (enabled == g_app.tracking_enabled) { return NULL; }
    if (storage_tracking_save(enabled) != IVTS_OK) { return "persist_failed"; }
    g_app.tracking_enabled = enabled;
    app_outbox_request_status();
    return NULL;
}
