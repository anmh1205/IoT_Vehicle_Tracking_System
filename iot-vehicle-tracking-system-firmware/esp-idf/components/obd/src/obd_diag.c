#include "obd_internal.h"
#include "platform/platform.h"

#include <string.h>

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
