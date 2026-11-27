/**
 * @file src/command/cmd_session.c
 * @brief Tracking, session assignment and on-demand location command handlers.
 *
 * The app task updates tracking after a successful NVS write and delegates session identity
 * to the session tracker. A location request holds GNSS demand until its modem result or deadline.
 * The publisher owns the RAW transaction through its modem result, even after the command times out.
 */
#include "command/command.h"
#include "ivts_core/payload/meta.h"
#include "publish/publish.h"
#include "session/session_tracker.h"
#include "persist/persist.h"
#include "device/device.h"
#include "storage/storage.h"
#include "app_internal.h"
#include "session/telemetry.h"

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

/* Startup clears location state. The app task owns it until command completion. */
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

/** @brief Release GNSS demand and queue the final command result once. */
static void complete_location(const char *reason)
{
    s_awaiting_publish_ack = false;
    s_deadline_at_ms = 0;
    cmd_inbox_complete(reason);
}

void app_cmd_on_location_ack(bool ok)
{
    if (!s_awaiting_publish_ack) { return; }
    /* The app can dispatch a modem result before running the deadline tick. */
    if (app_now() >= s_deadline_at_ms) {
        complete_location("location_publish_timeout");
    } else {
        complete_location(ok ? NULL : "location_publish_failed");
    }
}

void cmd_location_tick(uint64_t now_ms)
{
    if (s_deadline_at_ms == 0u) { return; }
    if (now_ms >= s_deadline_at_ms) {
        bool fixed = s_awaiting_publish_ack || app_telemetry_view()->gnss.fix_valid;
        complete_location(fixed ? "location_publish_timeout" : "location_unavailable");
    } else if (!s_awaiting_publish_ack && app_telemetry_view()->gnss.fix_valid) {
        s_awaiting_publish_ack = app_messages_publish_location();
    }
}
