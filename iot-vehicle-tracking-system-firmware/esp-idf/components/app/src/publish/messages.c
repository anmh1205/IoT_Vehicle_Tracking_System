#include "messages.h"
#include "publisher.h"
#include "app_priv.h"
#include "esp_log.h"
#include "fw_update/fw_update.h"
#include "ivts_core/payload/json_writer.h"
#include "ivts_core/payload/payload.h"
#include "link/app_link.h"
#include "session/session_tracker.h"
#include "storage/storage.h"

_Static_assert(IVTS_PAYLOAD_MAX - 1u <= MODEM_PAYLOAD_MAX, "payload phải vừa trong ô publish");

/* The modem copies the payload before returning. Only the app task uses this buffer. */
static char s_buf[IVTS_PAYLOAD_MAX];
static ivts_record_t s_live_record;

static ivts_msg_meta_t meta_now(uint32_t seq)
{
    ivts_msg_meta_t m = {
        .device_id = g_app.cfg.device_id,
        .auth_token = g_app.cfg.auth_token[0] != '\0' ? g_app.cfg.auth_token : NULL,
        .boot_id = g_app.boot_id,
        .seq = seq,
        .uptime_ms = app_now(),
    };
    m.sent_unix_ms = app_clock_unix_ms_or_zero(&m.time_trusted);
    return m;
}

static void to_queue(const ivts_record_t *r)
{
    uint8_t b[IVTS_RECORD_MAX_SIZE];
    size_t n = 0;
    if (ivts_record_encode(r, b, sizeof b, &n) != IVTS_OK) { return; }
    ivts_err_t e = storage_queue_push(b, n);
    if (e != IVTS_OK) {
        ESP_LOGW(APP_TAG, "mất bản ghi seq=%lu (%s)", (unsigned long)r->seq, ivts_err_name(e));
    }
}

void app_messages_publish_live_record(void)
{
    size_t len = 0;
    ivts_record_t r;
    app_state_make_record(&r);
    ivts_msg_meta_t m = { .device_id = g_app.cfg.device_id, .auth_token = g_app.cfg.auth_token };
    ivts_err_t error = ivts_payload_rawdata(&m, &r, app_state_get(), s_buf, sizeof s_buf, &len);
    if (!app_session_has_unsent_boundary() && storage_queue_pending() == 0u && !storage_queue_push_pending() &&
        error == IVTS_OK && app_publisher_send(APP_MSG_RAW_LIVE, MODEM_TOPIC_RAWDATA, s_buf, len)) {
        s_live_record = r;
    } else {
        to_queue(&r);                     /* Bản ghi giữ boot_id và seq đã cấp khi replay. */
    }
}

bool app_messages_publish_status(bool heartbeat)
{
    size_t len = 0;
    ivts_msg_meta_t m = meta_now(app_rtc_next_seq());
    ivts_err_t error = ivts_payload_status(&m, app_state_get(), app_session_active_id(), IVTS_BOUNDARY_NONE,
                            heartbeat, s_buf, sizeof s_buf, &len);
    return error == IVTS_OK && app_publisher_send(APP_MSG_STATUS, MODEM_TOPIC_STATUS, s_buf, len);
}

static ivts_msg_meta_t meta_from_boundary(const ivts_session_boundary_t *boundary)
{
    return (ivts_msg_meta_t){
        .device_id = g_app.cfg.device_id, .auth_token = g_app.cfg.auth_token,
        .boot_id = boundary->boot_id, .seq = boundary->seq, .sent_unix_ms = boundary->unix_ms,
        .time_trusted = boundary->unix_ms != 0u, .uptime_ms = boundary->uptime_ms,
    };
}

uint64_t app_messages_publish_session_boundary(const ivts_session_boundary_t *boundary)
{
    size_t len = 0;
    ivts_msg_meta_t m = meta_from_boundary(boundary);
    bool started = boundary->kind == IVTS_BOUNDARY_STARTED;
    ivts_telemetry_t t = {
        .ignition = started ? IVTS_IGN_ON : IVTS_IGN_OFF,
        .vehicle = started ? IVTS_VEH_UNKNOWN : IVTS_VEH_PARKED_OFF,
        .device_state = IVTS_DEV_ACTIVE,
    };
    ivts_err_t error = ivts_payload_status(&m, &t, &boundary->session, (ivts_boundary_kind_t)boundary->kind,
                            false, s_buf, sizeof s_buf, &len);
    uint64_t attempted_at_ms = app_now();
    if (error == IVTS_OK) { (void)app_publisher_send(APP_MSG_BOUNDARY, MODEM_TOPIC_STATUS, s_buf, len); }
    return attempted_at_ms;
}

bool app_messages_publish_event(const char *event_code)
{
    size_t len = 0;
    ivts_msg_meta_t m = meta_now(app_rtc_next_seq());
    ivts_err_t error = ivts_payload_event(&m, 0, "warning", event_code, s_buf, sizeof s_buf, &len);
    return error == IVTS_OK && app_publisher_send(APP_MSG_EVENT, MODEM_TOPIC_EVENTS, s_buf, len);
}

static ivts_msg_meta_t meta_from_alarm(const ivts_motion_alarm_t *alarm)
{
    return (ivts_msg_meta_t){
        .device_id = g_app.cfg.device_id, .auth_token = g_app.cfg.auth_token,
        .boot_id = alarm->boot_id, .seq = alarm->seq, .sent_unix_ms = alarm->unix_ms,
        .time_trusted = alarm->unix_ms != 0u, .uptime_ms = alarm->uptime_ms,
    };
}

void app_messages_publish_motion_alarm(const ivts_motion_alarm_t *alarm)
{
    size_t len = 0;
    ivts_msg_meta_t m = meta_from_alarm(alarm);
    ivts_err_t error = ivts_payload_event(&m, 1001, "warning", "motion_detected", s_buf, sizeof s_buf, &len);
    if (error == IVTS_OK) { (void)app_publisher_send(APP_MSG_ALARM, MODEM_TOPIC_EVENTS, s_buf, len); }
}

void app_messages_publish_fw_report(void)
{
    size_t len = 0;
    ivts_msg_meta_t m = meta_now(app_rtc_next_seq());
    ivts_err_t error = ivts_payload_firmware(&m, app_fw_update_report(), s_buf, sizeof s_buf, &len);
    if (error == IVTS_OK && app_publisher_send(APP_MSG_FW, MODEM_TOPIC_FIRMWARE, s_buf, len)) { app_fw_update_report_sent(); }
}

bool app_messages_publish_command_ack(const char *command_id, const char *status, const char *response)
{
    char boot[IVTS_BOOT_ID_SIZE];
    ivts_boot_id_format(boot, g_app.boot_id);
    ivts_jw_t w;
    ivts_jw_init(&w, s_buf, sizeof s_buf);
    ivts_jw_obj_begin(&w, NULL);
    ivts_jw_str(&w, "command_id", command_id);
    ivts_jw_str(&w, "status", status);
    ivts_jw_str(&w, "boot_id", boot);
    if (response != NULL) { ivts_jw_str(&w, "response", response); }
    ivts_jw_obj_end(&w);
    size_t len = 0;
    return ivts_jw_finish(&w, &len) == IVTS_OK && app_publisher_send(APP_MSG_CMD_ACK, MODEM_TOPIC_CMD_ACK, s_buf, len);
}

bool app_messages_publish_location(void)
{
    const ivts_telemetry_t *telemetry = app_state_get();
    if (!telemetry->gnss.fix_valid || app_session_has_unsent_boundary() || app_publisher_is_busy() ||
        !app_link_is_broker_up()) { return false; }

    ivts_record_t record;
    app_state_make_record(&record);
    if (!record.gnss.fix_valid) { return false; }
    ivts_msg_meta_t m = { .device_id = g_app.cfg.device_id, .auth_token = g_app.cfg.auth_token };
    size_t len;
    return ivts_payload_rawdata(&m, &record, telemetry, s_buf, sizeof s_buf, &len) == IVTS_OK &&
           app_publisher_send(APP_MSG_LOCATION, MODEM_TOPIC_RAWDATA, s_buf, len);
}

bool app_messages_publish_replay_record(const ivts_record_t *record)
{
    ivts_msg_meta_t meta = { .device_id = g_app.cfg.device_id, .auth_token = g_app.cfg.auth_token };
    size_t len = 0;
    return ivts_payload_rawdata(&meta, record, NULL, s_buf, sizeof s_buf, &len) == IVTS_OK &&
           app_publisher_send(APP_MSG_RAW_REPLAY, MODEM_TOPIC_RAWDATA, s_buf, len);
}

void app_messages_on_live_ack(bool ok)
{
    if (!ok) { to_queue(&s_live_record); }
}
