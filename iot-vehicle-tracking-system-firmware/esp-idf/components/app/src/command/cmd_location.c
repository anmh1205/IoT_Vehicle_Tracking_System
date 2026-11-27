#include "command.h"
#include "cmd_handlers.h"
#include "app_priv.h"
#include "app_timing.h"
#include "publish/messages.h"

static uint64_t s_deadline_at_ms;
static bool s_awaiting_publish_ack;

void cmd_location_init(void)
{
    s_deadline_at_ms = 0;
    s_awaiting_publish_ack = false;
}

const char *cmd_location_handle(const cmd_envelope_t *command)
{
    (void)command;
    s_deadline_at_ms = app_now() + LOCATION_TIMEOUT_MS;
    return NULL;
}

bool app_cmd_needs_gnss(void)
{
    return s_deadline_at_ms != 0u;
}

void app_cmd_on_location_ack(bool ok)
{
    if (!s_awaiting_publish_ack) { return; }
    s_awaiting_publish_ack = false;
    s_deadline_at_ms = 0;
    cmd_inbox_complete(ok ? NULL : "location_publish_failed");
}

void cmd_location_tick(uint64_t now)
{
    if (s_deadline_at_ms != 0u && !s_awaiting_publish_ack) {
        bool fixed = app_state_get()->gnss.fix_valid;
        if (now >= s_deadline_at_ms) {
            s_deadline_at_ms = 0;
            cmd_inbox_complete(fixed ? "location_publish_timeout" : "location_unavailable");
        } else if (fixed) {
            s_awaiting_publish_ack = app_messages_publish_location();
        }
    }
}
