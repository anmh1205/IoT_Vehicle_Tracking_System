#include "command/command.h"
#include "ivts_core/payload/meta.h"
#include "publish/publish.h"
#include "session_tracker.h"
#include "persist/persist.h"
#include "device/device.h"
#include "storage/storage.h"

const char *cmd_session_handle(const cmd_envelope_t *command)
{
    uint64_t local, canonical;
    char boot[IVTS_BOOT_ID_SIZE];
    if (!ivts_json_obj_get_u64(&command->params, "local_session_key", UINT32_MAX, &local) ||
        !ivts_json_obj_get_u64(&command->params, "canonical_session_id", IVTS_SESSION_MAX_CANONICAL_ID, &canonical) ||
        !ivts_json_obj_get_str(&command->params, "boot_id", boot, sizeof boot)) { return "invalid_session"; }
    bool active_changed;
    if (!app_session_assign((uint32_t)local, boot, canonical, &active_changed)) { return "session_not_current"; }
    if (active_changed) { app_outbox_request_status(); }
    return NULL;
}

const char *cmd_tracking_handle(const cmd_envelope_t *command)
{
    bool enabled;
    if (!ivts_json_obj_get_bool(&command->params, "enabled", &enabled)) { return "invalid_enabled"; }
    if (enabled == app_device_tracking_enabled()) { return NULL; }
    if (app_records_tracking_save(enabled) != IVTS_OK) { return "persist_failed"; }
    app_device_set_tracking_enabled(enabled);
    app_outbox_request_status();
    return NULL;
}
