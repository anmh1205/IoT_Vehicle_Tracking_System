/**
 * @file src/publish/outbox.c
 * @brief Control-message scheduling and publish ACK transitions.
 *
 * The app task owns status and event intent and controls boundary retry timing. Runtime services
 * urgent firmware and motion alarm work before ordinary control messages. A boundary waits
 * behind earlier RAW records. Message producers own records and the publisher owns ACK correlation.
 */
#include "publish/publish.h"
#include "session/motion_alarm.h"
#include "app_internal.h"
#include "fw/fw_update.h"
#include "ivts_core/base/str.h"
#include "device/device.h"
#include "session/session_tracker.h"

/* The app task owns the coalesced status, event buffer and boundary retry timing. */
static bool s_status_needs_publish;
static bool s_event_needs_publish;
static char s_event_code[32];
static uint64_t s_boundary_retry_at_ms;

void app_outbox_on_status_ack(bool ok)
{
    if (ok) { app_fw_update_note_health_ack(); }
    else { app_outbox_request_status(); }
}

void app_outbox_on_boundary_ack(bool ok)
{
    if (!ok) { return; }
    app_fw_update_note_health_ack();
    if (app_session_on_ack()) { s_boundary_retry_at_ms = 0; }
}

void app_outbox_on_event_ack(bool ok)
{
    if (!ok) { s_event_needs_publish = true; }
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
    return s_status_needs_publish || s_event_needs_publish || app_session_has_unsent_boundary() ||
           app_fw_update_report_needs_publish() || app_alarm_has_unsent();
}

static bool can_publish(void)
{
    return !app_publisher_is_busy() && app_link_is_broker_up();
}

/** @brief Give a pending report exclusive service while confirming or awaiting OTA reboot. */
static bool retry_fw_report_during_update(void)
{
    if (!app_fw_update_prioritizes_report() || !app_fw_update_report_needs_publish() || !can_publish()) {
        return false;
    }
    app_messages_publish_fw_report();
    return true;
}

/** @brief Protect boundary order by replaying older RAW records before attempting the boundary. */
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

app_msg_kind_t app_outbox_pick_next_control_message(bool boundary, bool status, bool firmware, bool event)
{
    if (boundary) { return APP_MSG_BOUNDARY; }
    if (status) { return APP_MSG_STATUS; }
    if (firmware) { return APP_MSG_FW; }
    return event ? APP_MSG_EVENT : APP_MSG_NONE;
}
