#include "payload_common.h"

ivts_err_t ivts_payload_status(const ivts_msg_meta_t *m, const ivts_telemetry_t *t,
                               const ivts_session_id_t *session, ivts_boundary_kind_t boundary, bool heartbeat,
                               char *buf, size_t cap, size_t *len)
{
    if (m == NULL || m->device_id == NULL || t == NULL) { return IVTS_ERR_INVALID_ARG; }
    ivts_jw_t w;
    ivts_jw_init(&w, buf, cap);
    ivts_payload_write_header(&w, m, "v2.0.0");
    const char *status = "heartbeat";
    const char *boundary_name = "none";
    if (boundary == IVTS_BOUNDARY_STARTED) {
        status = "running";
        boundary_name = "started";
    } else if (boundary == IVTS_BOUNDARY_ENDED) {
        status = "stopped";
        boundary_name = "ended";
    } else if (!heartbeat) {
        if (session != NULL && session->local_key != 0u) { status = "running"; }
        else if (t->ignition == IVTS_IGN_OFF) { status = "stopped"; }
    }
    ivts_jw_str(&w, "status", status);
    ivts_jw_str(&w, "boundary_event", boundary_name);
    ivts_payload_write_session(&w, session);
    ivts_payload_write_state(&w, (uint8_t)t->ignition, (uint8_t)t->motion, (uint8_t)t->vehicle,
              (uint8_t)t->device_state, (uint8_t)t->sleep_mode);
    ivts_jw_obj_end(&w);
    return ivts_jw_finish(&w, len);
}
