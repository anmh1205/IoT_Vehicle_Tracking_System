/**
 * @file src/payload/payload_control.c
 * @brief MQTT serialization for device status, events and firmware reports.
 *
 * The app task builds live status, session boundaries, events and firmware
 * reports in its own publish buffer. It supplies the message identity and
 * owns acknowledgement and retry policy separately from serialization.
 */
#include "payload/payload_internal.h"
#include "ivts_core/ota/contract.h"

ivts_err_t ivts_payload_event(const ivts_msg_meta_t *m, int32_t code, const char *severity,
                              const char *message, char *buf, size_t cap, size_t *len)
{
    if (m == NULL || m->device_id == NULL) { return IVTS_ERR_INVALID_ARG; }
    ivts_jw_t w;
    ivts_jw_init(&w, buf, cap);
    ivts_payload_write_header(&w, m, "v1.0.0");
    ivts_jw_str(&w, "event_type", severity != NULL ? severity : "info");
    if (code != 0) { ivts_jw_int(&w, "code", code); }
    if (message != NULL) { ivts_jw_str(&w, "message", message); }
    ivts_jw_obj_end(&w);
    return ivts_jw_finish(&w, len);
}

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

ivts_err_t ivts_payload_firmware(const ivts_msg_meta_t *m, const ivts_fw_status_t *s,
                                 char *buf, size_t cap, size_t *len)
{
    if (m == NULL || m->device_id == NULL || s == NULL) { return IVTS_ERR_INVALID_ARG; }
    ivts_jw_t w;
    ivts_jw_init(&w, buf, cap);
    ivts_payload_write_header(&w, m, "v1.0.0");
    ivts_jw_str(&w, "status", ivts_ota_status_name((ivts_ota_status_t)s->status));
    ivts_jw_uint(&w, "progress", s->progress);
    ivts_jw_str(&w, "jobId", s->job_id);
    ivts_jw_str(&w, "targetVersion", s->target_version[0] != '\0' ? s->target_version : s->current_version);
    ivts_jw_str(&w, "currentVersion", s->current_version);
    if (s->partition[0] != '\0') { ivts_jw_str(&w, "partition", s->partition); }
    if (s->error != IVTS_OTA_E_NONE) {
        ivts_jw_str(&w, "error", ivts_ota_err_name((ivts_ota_err_t)s->error));
    }
    ivts_jw_obj_end(&w);
    return ivts_jw_finish(&w, len);
}
