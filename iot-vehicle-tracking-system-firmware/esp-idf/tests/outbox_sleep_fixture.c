#include <assert.h>
#include <string.h>
#include "app_internal.h"
#include "command/command.h"
#include "device/device.h"
#include "ivts_core/fsm/fsm.h"
#include "persist/persist.h"
#include "publish/publish.h"
#include "session/motion_alarm.h"
#include "session/session_tracker.h"
#include "session/telemetry.h"

static uint64_t s_now_ms = 1u;
static bool s_link_up = true;
static uint32_t s_modem_tx_id;
static unsigned s_publish_count;
static unsigned s_receipt_writes;
static const char *s_command_json;
static const char *s_ack_status;
static const char *s_ack_reason;
static ivts_telemetry_t s_telemetry;

uint64_t app_now(void) { return s_now_ms; }
bool app_link_is_broker_up(void) { return s_link_up; }
const ivts_telemetry_t *app_telemetry_view(void) { return &s_telemetry; }

ivts_err_t modem_publish(modem_topic_t topic, const char *payload, size_t len, uint32_t tx_id)
{
    (void)topic;
    assert(payload != NULL && len > 0u && s_modem_tx_id == 0u);
    s_modem_tx_id = tx_id;
    s_publish_count++;
    return IVTS_OK;
}

static void dispatch_result(uint32_t tx_id, bool ok)
{
    if (s_modem_tx_id == tx_id) { s_modem_tx_id = 0; }
    ivts_event_t event = { .type = IVTS_EV_MQTT_ACK };
    event.u.mqtt_ack.tx_id = tx_id;
    event.u.mqtt_ack.ok = ok ? 1u : 0u;
    app_publisher_on_ack(&event);
}

bool app_messages_publish_event(const char *event_code)
{
    assert(strcmp(event_code, "config_corrupt") == 0);
    return app_publisher_send(APP_MSG_EVENT, MODEM_TOPIC_EVENTS, event_code, strlen(event_code));
}

bool app_messages_publish_location(void)
{
    return app_publisher_send(APP_MSG_LOCATION, MODEM_TOPIC_RAWDATA, "{}", 2u);
}

bool app_messages_publish_command_ack(const char *id, const char *status, const char *reason)
{
    assert(strcmp(id, "77") == 0);
    s_ack_status = status;
    s_ack_reason = reason;
    return app_publisher_send(APP_MSG_CMD_ACK, MODEM_TOPIC_CMD_ACK, "{}", 2u);
}

ivts_err_t modem_cmd_take(char *out, size_t cap, size_t *len)
{
    if (s_command_json == NULL) { return IVTS_ERR_NOT_FOUND; }
    *len = strlen(s_command_json);
    assert(*len < cap);
    memcpy(out, s_command_json, *len + 1u);
    s_command_json = NULL;
    return IVTS_OK;
}

ivts_err_t app_records_command_receipts_load(ivts_cmd_receipts_t *out)
{
    *out = (ivts_cmd_receipts_t){0};
    return IVTS_ERR_NOT_FOUND;
}

ivts_err_t app_records_command_receipts_save(const ivts_cmd_receipts_t *receipts)
{
    (void)receipts;
    s_receipt_writes++;
    return IVTS_OK;
}

bool app_session_has_unsent_boundary(void) { return false; }
const ivts_session_boundary_t *app_session_oldest_boundary(void) { return NULL; }
bool app_fw_update_report_needs_publish(void) { return false; }
bool app_fw_update_prioritizes_report(void) { return false; }
bool app_alarm_has_unsent(void) { return false; }
bool app_alarm_tick(void) { return false; }
const ivts_motion_alarm_t *app_alarm_view(void) { return NULL; }
bool app_device_tracking_enabled(void) { return true; }
void app_device_set_tracking_enabled(bool enabled) { (void)enabled; }
void app_messages_publish_motion_alarm(const ivts_motion_alarm_t *alarm) { (void)alarm; }
void app_messages_publish_fw_report(void) {}
bool app_messages_publish_status(bool heartbeat) { (void)heartbeat; return false; }
uint64_t app_messages_publish_session_boundary(const ivts_session_boundary_t *boundary)
{
    (void)boundary;
    return s_now_ms;
}
app_replay_result_t app_replay_until(const ivts_session_boundary_t *boundary)
{
    (void)boundary;
    return REPLAY_EMPTY;
}
bool app_session_assign(uint32_t local_key, const char *boot_id, uint64_t canonical_id, bool *active_changed)
{
    (void)local_key;
    (void)boot_id;
    (void)canonical_id;
    *active_changed = false;
    return false;
}
ivts_err_t app_records_tracking_save(bool enabled) { (void)enabled; return IVTS_OK; }

void cmd_restart_init(void) {}
void cmd_restart_tick(uint64_t now_ms) { (void)now_ms; }
void cmd_restart_on_checkpoint(uint64_t now_ms) { (void)now_ms; }
void cmd_restart_on_ack(void) {}
bool cmd_restart_is_scheduled(void) { return false; }
const char *cmd_ota_handle(const cmd_envelope_t *command) { (void)command; return "unused"; }
const char *cmd_config_handle(const cmd_envelope_t *command) { (void)command; return "unused"; }
const char *cmd_reboot_handle(const cmd_envelope_t *command) { (void)command; return "unused"; }
const char *cmd_rollback_handle(const cmd_envelope_t *command) { (void)command; return "unused"; }

static bool parked_wants_sleep(ivts_fsm_t *fsm)
{
    const ivts_fsm_cfg_t cfg = { .parked_settle_ms = PARKED_SETTLE_MS, .awake_max_ms = AWAKE_MAX_MS };
    const ivts_fsm_in_t in = {
        .now = s_now_ms, .ignition = IVTS_IGN_OFF, .link_up = s_link_up, .link_expected = true,
        .publish_idle = !app_publisher_is_busy(), .control_pending = app_outbox_has_unsent_control(),
    };
    ivts_fsm_out_t out;
    ivts_fsm_step(fsm, &cfg, &in, &out);
    return (out.actions & IVTS_ACT_SLEEP) != 0u;
}

static void check_event(void)
{
    ivts_fsm_t fsm = { .state = IVTS_ST_PARKED, .status_sent = true };
    s_now_ms = PARKED_SETTLE_MS;
    assert(!app_outbox_has_unsent_control());
    app_outbox_request_event("config_corrupt");
    assert(app_outbox_has_unsent_control());
    assert(!parked_wants_sleep(&fsm));

    app_outbox_tick(false);
    assert(s_publish_count == 1u && !app_outbox_has_unsent_control());
    assert(!parked_wants_sleep(&fsm));
    dispatch_result(s_modem_tx_id, false);
    assert(app_outbox_has_unsent_control() && !parked_wants_sleep(&fsm));
    app_outbox_tick(false);
    assert(s_publish_count == 2u);
    dispatch_result(s_modem_tx_id, true);
    assert(parked_wants_sleep(&fsm));
}

static void check_offline(void)
{
    ivts_fsm_t fsm = { .state = IVTS_ST_PARKED, .status_sent = true };
    s_link_up = false;
    app_outbox_request_event("config_corrupt");
    s_now_ms = AWAKE_MAX_MS - 1u;
    app_outbox_tick(false);
    assert(s_publish_count == 0u && app_outbox_has_unsent_control());
    assert(!parked_wants_sleep(&fsm));
    s_now_ms++;
    assert(parked_wants_sleep(&fsm));
}

static void check_location_timeout(bool result_before_tick)
{
    const uint64_t deadline_at_ms = s_now_ms + LOCATION_TIMEOUT_MS;
    app_cmd_init();
    s_command_json = "{\"command_id\":\"77\",\"command\":\"request_location\"}";
    app_cmd_handle();
    app_cmd_tick();
    assert(app_cmd_needs_gnss() && s_publish_count == 0u);

    s_now_ms = deadline_at_ms - 1u;
    s_telemetry.gnss.fix_valid = true;
    app_cmd_tick();
    assert(s_publish_count == 1u && s_ack_status == NULL && app_cmd_blocks_sleep());
    uint32_t location_tx_id = s_modem_tx_id;

    s_now_ms = deadline_at_ms;
    s_telemetry.gnss.fix_valid = false;
    if (result_before_tick) { dispatch_result(location_tx_id, true); }
    app_cmd_tick();
    assert(!app_cmd_needs_gnss() && !app_cmd_blocks_sleep() && app_cmd_pending());
    assert(s_ack_status != NULL && strcmp(s_ack_status, "failed") == 0);
    assert(s_ack_reason != NULL && strcmp(s_ack_reason, "location_publish_timeout") == 0);
    if (!result_before_tick) {
        assert(s_publish_count == 1u && app_publisher_is_busy());
        s_now_ms++;
        dispatch_result(location_tx_id, true);
        app_cmd_tick();
    }

    assert(s_publish_count == 2u && app_publisher_is_busy());
    assert(strcmp(s_ack_status, "failed") == 0 && strcmp(s_ack_reason, "location_publish_timeout") == 0);
    dispatch_result(location_tx_id, false);
    assert(app_publisher_is_busy() && app_cmd_pending());
    dispatch_result(s_modem_tx_id, true);
    app_cmd_tick();
    assert(!app_cmd_pending() && s_publish_count == 2u && s_receipt_writes == 0u);
}

int main(int argc, char **argv)
{
    static const app_msg_ack_fn handlers[APP_MSG_COUNT] = {
        [APP_MSG_EVENT] = app_outbox_on_event_ack,
        [APP_MSG_LOCATION] = app_cmd_on_location_ack,
        [APP_MSG_CMD_ACK] = app_cmd_on_ack,
    };
    assert(argc == 2);
    app_publisher_set_ack_handlers(handlers);
    if (strcmp(argv[1], "event") == 0) { check_event(); }
    else if (strcmp(argv[1], "offline") == 0) { check_offline(); }
    else if (strcmp(argv[1], "location-pending") == 0) { check_location_timeout(false); }
    else if (strcmp(argv[1], "location-ack-first") == 0) { check_location_timeout(true); }
    else { assert(false); }
    return 0;
}
