/**
 * @file obd_poll.c
 * @brief Live OBD sampling and readiness or trouble-code snapshots.
 *
 * The OBD task owns ELM requests. Copy diagnostics under the snapshot mutex
 * and keep BLE, transport and sink operations outside the lock.
 */
#include "obd_internal.h"
#include "platform/log.h"
#include "platform/platform.h"
#include <stdio.h>
#include <string.h>

#define ECU_PROBE_MS 15000u

static bool probe_ecu(obd_session_t *session)
{
    if (!obd_session_command(session, "0100", ECU_PROBE_MS)) { return false; }
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

static platform_mutex_t s_diag_mutex;
static ivts_obd_readiness_t s_readiness;
static ivts_dtc_list_t s_dtc[3];

bool obd_diag_init(void)
{
    s_diag_mutex = platform_mutex_create();
    return s_diag_mutex != NULL;
}

static bool read_readiness(obd_session_t *session, ivts_obd_readiness_t *readiness)
{
    uint8_t bytes[64];
    size_t len;
    if (!obd_session_command(session, "0101", 3000)) { return false; }
    if (elm_extract_bytes(session->reply.buf, 0x01, bytes, sizeof bytes, &len) == IVTS_OK) {
        (void)obd_readiness_decode(bytes, len, readiness);
    }
    return true;
}

static bool read_dtc_mode(obd_session_t *session, size_t index, ivts_dtc_list_t *list)
{
    static const char *const modes[] = { "03", "07", "0A" };
    static const uint8_t mode_ids[] = { 0x03, 0x07, 0x0A };
    uint8_t bytes[64];
    size_t len;
    if (!obd_session_command(session, modes[index], 5000)) { return false; }
    if (elm_extract_bytes(session->reply.buf, mode_ids[index], bytes, sizeof bytes, &len) == IVTS_OK) {
        (void)obd_dtc_decode(bytes, len, list);
    }
    return true;
}

static void store_diag_snapshot(const ivts_obd_readiness_t *readiness, const ivts_dtc_list_t dtc[3])
{
    platform_mutex_lock(s_diag_mutex);
    s_readiness = *readiness;
    memcpy(s_dtc, dtc, sizeof s_dtc);
    platform_mutex_unlock(s_diag_mutex);
    ivts_event_t event = { .type = IVTS_EV_OBD_DIAG_READY, .ts_ms = platform_uptime_ms() };
    obd_emit(&event);
}

bool obd_diag_poll(obd_session_t *session)
{
    ivts_obd_readiness_t readiness = {0};
    ivts_dtc_list_t dtc[3] = {0};
    if (!read_readiness(session, &readiness)) { return false; }
    for (size_t i = 0; i < 3u && session->is_connected && obd_task_is_enabled(); i++) {
        if (!read_dtc_mode(session, i, &dtc[i])) { return false; }
    }
    if (!obd_task_is_enabled() || !session->is_connected) { return false; }
    store_diag_snapshot(&readiness, dtc);
    return true;
}

ivts_err_t obd_diag_copy(ivts_obd_readiness_t *rd, ivts_dtc_list_t *stored,
                         ivts_dtc_list_t *pending, ivts_dtc_list_t *permanent)
{
    if (s_diag_mutex == NULL) { return IVTS_ERR_INVALID_STATE; }
    platform_mutex_lock(s_diag_mutex);
    if (rd != NULL)        { *rd = s_readiness; }
    if (stored != NULL)    { *stored = s_dtc[0]; }
    if (pending != NULL)   { *pending = s_dtc[1]; }
    if (permanent != NULL) { *permanent = s_dtc[2]; }
    platform_mutex_unlock(s_diag_mutex);
    return IVTS_OK;
}
