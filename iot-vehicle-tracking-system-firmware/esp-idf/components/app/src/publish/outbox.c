#include "outbox.h"
#include "messages.h"
#include "outbox_calc.h"
#include "publisher.h"
#include "replay.h"
#include "alarm/motion_alarm.h"
#include "app_clock.h"
#include "app_priv.h"
#include "command/command.h"
#include "app_timing.h"
#include "fw_update/fw_update.h"
#include "ivts_core/base/str.h"
#include "link/app_link.h"
#include "session/session_tracker.h"

static bool s_status_needs_publish;
static bool s_event_needs_publish;
static char s_event_code[32];
static uint64_t s_boundary_retry_at_ms;

static void on_status_ack(bool ok)
{
    if (ok) { app_fw_update_note_health_ack(); }
    else { app_outbox_request_status(); }
}

static void on_boundary_ack(bool ok)
{
    if (!ok) { return; }
    app_fw_update_note_health_ack();
    if (app_session_on_ack()) { s_boundary_retry_at_ms = 0; }
}

static void on_event_ack(bool ok)
{
    if (!ok) { s_event_needs_publish = true; }
}

void app_outbox_init(void)
{
    static const app_msg_ack_fn handlers[APP_MSG_COUNT] = {
        [APP_MSG_RAW_LIVE] = app_messages_on_live_ack,
        [APP_MSG_RAW_REPLAY] = app_replay_on_ack,
        [APP_MSG_LOCATION] = app_cmd_on_location_ack,
        [APP_MSG_STATUS] = on_status_ack,
        [APP_MSG_BOUNDARY] = on_boundary_ack,
        [APP_MSG_EVENT] = on_event_ack,
        [APP_MSG_ALARM] = app_alarm_on_ack,
        [APP_MSG_FW] = app_fw_update_on_report_acked,
        [APP_MSG_CMD_ACK] = app_cmd_on_ack,
    };
    app_publisher_set_ack_handlers(handlers);
}

void app_outbox_request_status(void)
{
    s_status_needs_publish = true;
}

void app_outbox_request_event(const char *event_code)
{
    (void)ivts_str_copy(s_event_code, sizeof s_event_code, event_code);
    s_event_needs_publish = true;
}

bool app_outbox_has_unsent_control(void)
{
    return s_status_needs_publish || app_session_has_unsent_boundary() ||
           app_fw_update_report_needs_publish() || app_alarm_has_unsent() || app_cmd_pending();
}

static bool can_publish(void)
{
    return !app_publisher_is_busy() && app_link_is_broker_up();
}

static bool retry_fw_report_during_update(void)
{
    if (!app_fw_update_prioritizes_report() || !app_fw_update_report_needs_publish() || !can_publish()) {
        return false;
    }
    app_messages_publish_fw_report();
    return true;
}

static void publish_boundary(const ivts_session_boundary_t *boundary)
{
    if (app_replay_until(boundary) == REPLAY_BUSY || app_now() < s_boundary_retry_at_ms) { return; }
    s_boundary_retry_at_ms = app_messages_publish_session_boundary(boundary) + BOUNDARY_RETRY_MS;
}

void app_outbox_tick(bool heartbeat)
{
    if (retry_fw_report_during_update()) { return; }
    if (app_alarm_tick() && can_publish()) { app_messages_publish_motion_alarm(app_alarm_view()); }
    if (!can_publish()) { return; }

    const ivts_session_boundary_t *boundary = app_session_oldest_boundary();
    switch (app_outbox_pick_next_control_message(boundary != NULL, s_status_needs_publish,
                                                app_fw_update_report_needs_publish(), s_event_needs_publish)) {
    case APP_MSG_BOUNDARY: publish_boundary(boundary); break;
    case APP_MSG_STATUS:
        if (app_messages_publish_status(heartbeat)) { s_status_needs_publish = false; }
        break;
    case APP_MSG_FW: app_messages_publish_fw_report(); break;
    case APP_MSG_EVENT:
        if (app_messages_publish_event(s_event_code)) { s_event_needs_publish = false; }
        break;
    default: break;
    }
}
