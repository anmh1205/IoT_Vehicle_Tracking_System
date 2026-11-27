#include "app_records.h"
#include "storage/nvs_store.h"

#include <string.h>

#define OTA_KEY "ota"
#define OTA_VERSION 3u

_Static_assert(sizeof(ivts_cmd_receipts_t) == STORAGE_RECORD_PAYLOAD_MAX, "receipt layout must match the NVS blob limit");
_Static_assert(sizeof(ivts_restart_intent_t) == 65u, "restart intent layout must match NVS");

ivts_err_t app_records_ota_confirm_ctx_load(ivts_ota_confirm_ctx_t *out)
{
    if (out == NULL) { return IVTS_ERR_INVALID_ARG; }
    memset(out, 0, sizeof *out);
    ivts_err_t r = storage_record_load(OTA_KEY, OTA_VERSION, out, sizeof *out);
    if (r == IVTS_ERR_VERSION) {
        r = storage_record_load(OTA_KEY, 2u, out, offsetof(ivts_ota_confirm_ctx_t, target_partition));
    }
    return r;
}

ivts_err_t app_records_ota_confirm_ctx_save(const ivts_ota_confirm_ctx_t *p)
{
    if (p == NULL) { return IVTS_ERR_INVALID_ARG; }
    return storage_record_save(OTA_KEY, OTA_VERSION, p, sizeof *p);
}

ivts_err_t app_records_command_receipts_load(ivts_cmd_receipts_t *out)
{
    if (out == NULL) { return IVTS_ERR_INVALID_ARG; }
    ivts_err_t r = storage_record_load("cmd_receipts", 1, out, sizeof *out);
    if (r != IVTS_OK) {
        memset(out, 0, sizeof *out);
        return r;
    }
    if (out->next >= IVTS_CMD_RECEIPTS_COUNT) { return IVTS_ERR_CRC; }
    for (size_t i = 0; i < IVTS_CMD_RECEIPTS_COUNT; i++) {
        if (memchr(out->id[i], '\0', IVTS_CMD_ID_SIZE) == NULL) { return IVTS_ERR_CRC; }
    }
    return IVTS_OK;
}

ivts_err_t app_records_command_receipts_save(const ivts_cmd_receipts_t *receipts)
{
    if (receipts == NULL || receipts->next >= IVTS_CMD_RECEIPTS_COUNT) { return IVTS_ERR_INVALID_ARG; }
    return storage_record_save("cmd_receipts", 1, receipts, sizeof *receipts);
}

ivts_err_t app_records_restart_intent_load(ivts_restart_intent_t *out)
{
    if (out == NULL) { return IVTS_ERR_INVALID_ARG; }
    memset(out, 0, sizeof *out);
    ivts_err_t r = storage_record_load("reboot_id", 2, out, sizeof *out);
    if (r == IVTS_ERR_VERSION) { r = storage_record_load("reboot_id", 1, out->id, sizeof out->id); }
    if (r == IVTS_OK &&
        (memchr(out->id, '\0', sizeof out->id) == NULL ||
         memchr(out->rollback_origin, '\0', sizeof out->rollback_origin) == NULL)) { return IVTS_ERR_CRC; }
    return r;
}

ivts_err_t app_records_restart_intent_save(const ivts_restart_intent_t *intent)
{
    if (intent == NULL) { return IVTS_ERR_INVALID_ARG; }
    return storage_record_save("reboot_id", 2, intent, sizeof *intent);
}

ivts_err_t app_records_tracking_load(bool *enabled)
{
    uint8_t value = 1;
    ivts_err_t r = storage_record_load("tracking", 1, &value, sizeof value);
    *enabled = value == 1u && (r == IVTS_OK || r == IVTS_ERR_NOT_FOUND);
    return r;
}

ivts_err_t app_records_tracking_save(bool enabled)
{
    uint8_t value = enabled ? 1u : 0u;
    return storage_record_save("tracking", 1, &value, sizeof value);
}

ivts_err_t app_records_session_load(ivts_session_state_t *state)
{
    ivts_err_t r = storage_record_load("session", 1, state, sizeof *state);
    if (r == IVTS_OK && state->count > IVTS_SESSION_OUTBOX_SIZE) { r = IVTS_ERR_INVALID_STATE; }
    if (r != IVTS_OK) { memset(state, 0, sizeof *state); }
    return r;
}

ivts_err_t app_records_session_save(const ivts_session_state_t *state)
{
    return storage_record_save("session", 1, state, sizeof *state);
}

ivts_err_t app_records_alarm_load(ivts_motion_alarm_t *alarm)
{
    ivts_err_t r = storage_record_load("motion_alarm", 1, alarm, sizeof *alarm);
    if (r != IVTS_OK) { memset(alarm, 0, sizeof *alarm); }
    return r;
}

ivts_err_t app_records_alarm_save(const ivts_motion_alarm_t *alarm)
{
    return storage_record_save("motion_alarm", 1, alarm, sizeof *alarm);
}
