#include "payload_common.h"

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
