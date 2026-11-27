#include "obd_internal.h"
#include "esp_log.h"
#include "platform/platform.h"

#include <stdio.h>

#define ECU_PROBE_MS 15000u

static bool probe_ecu(obd_session_t *session)
{
    if (!obd_session_command(session, "0100", ECU_PROBE_MS)) { return false; }
    ESP_LOGD(OBD_TAG, "ELM 0100: %s", session->reply.buf);
    uint8_t b[16];
    size_t n;
    session->is_ecu_ready = elm_extract_bytes(session->reply.buf, 0x01, b, sizeof b, &n) == IVTS_OK && n >= 6u && b[1] == 0u;
    ivts_ecu_state_t ecu = elm_reply_ecu_state(session->reply.buf);
    obd_session_emit_link(true, true, session->is_ecu_ready ? IVTS_ECU_LIVE
                                     : ecu == IVTS_ECU_STOPPED ? IVTS_ECU_STOPPED : IVTS_ECU_NO_DATA);
    return true;
}

static bool read_pid(obd_session_t *session, uint8_t pid, ivts_obd_sample_t *sample, ivts_ecu_state_t *ecu)
{
    char command[5];
    snprintf(command, sizeof command, "01%02X", (unsigned)pid);
    if (!obd_session_command(session, command, 3000)) { return false; }
    ivts_ecu_state_t reply_state = elm_reply_ecu_state(session->reply.buf);
    if (reply_state == IVTS_ECU_STOPPED || reply_state == IVTS_ECU_NO_DATA) { *ecu = reply_state; }

    uint8_t bytes[16];
    size_t len;
    if (elm_extract_bytes(session->reply.buf, 0x01, bytes, sizeof bytes, &len) == IVTS_OK &&
        len >= 2u && bytes[1] == pid) {
        (void)obd_pid_decode(bytes, len, sample);
    }
    return true;
}

static void report_sample_or_ecu_state(obd_session_t *session, const ivts_obd_sample_t *sample, ivts_ecu_state_t ecu)
{
    if (sample->valid_mask != 0u) {
        obd_session_emit_link(true, true, IVTS_ECU_LIVE);
        ivts_event_t event = { .type = IVTS_EV_OBD_SAMPLE, .ts_ms = platform_uptime_ms() };
        event.u.obd_sample = *sample;
        obd_emit(&event);
    } else if (ecu != IVTS_ECU_UNKNOWN) {
        session->is_ecu_ready = false;
        obd_session_emit_link(true, true, ecu);
    }
}

bool obd_poll_sample(obd_session_t *session)
{
    if (!session->is_ecu_ready) {
        if (!probe_ecu(session)) { return false; }
        if (!session->is_ecu_ready) { return true; }
    }
    static const uint8_t pids[] = { 0x0C, 0x0D, 0x05, 0x04, 0x2F };
    ivts_obd_sample_t sample = {0};
    ivts_ecu_state_t ecu = IVTS_ECU_UNKNOWN;
    for (size_t i = 0; i < sizeof pids / sizeof pids[0] && session->is_connected && obd_task_is_enabled(); i++) {
        if (!read_pid(session, pids[i], &sample, &ecu)) { return false; }
    }
    if (!obd_task_is_enabled() || !session->is_connected) { return false; }
    report_sample_or_ecu_state(session, &sample, ecu);
    return true;
}
