#include "cmd_handlers.h"
#include "ivts_core/payload/meta.h"
#include "publish/outbox.h"
#include "session/session_tracker.h"

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
