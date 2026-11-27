#include "payload_common.h"
#include "ivts_core/ota/contract.h"

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
