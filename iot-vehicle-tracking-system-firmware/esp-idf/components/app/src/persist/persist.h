#pragma once
#include "ivts_core/event/event.h"
#include "ivts_core/model/command.h"
#include "ivts_core/model/session.h"
#include "ivts_core/ota/confirm.h"
#include <stdbool.h>
#include <stdint.h>

/* Typed records with the established NVS keys and layouts. Calls may block on flash. */
ivts_err_t app_records_ota_confirm_ctx_load(ivts_ota_confirm_ctx_t *out);
ivts_err_t app_records_ota_confirm_ctx_save(const ivts_ota_confirm_ctx_t *p);
ivts_err_t app_records_command_receipts_load(ivts_cmd_receipts_t *out);
ivts_err_t app_records_command_receipts_save(const ivts_cmd_receipts_t *receipts);
ivts_err_t app_records_restart_intent_load(ivts_restart_intent_t *out);
ivts_err_t app_records_restart_intent_save(const ivts_restart_intent_t *intent);
ivts_err_t app_records_tracking_load(bool *enabled);
ivts_err_t app_records_tracking_save(bool enabled);
ivts_err_t app_records_session_load(ivts_session_state_t *state);
ivts_err_t app_records_session_save(const ivts_session_state_t *state);
ivts_err_t app_records_alarm_load(ivts_motion_alarm_t *alarm);
ivts_err_t app_records_alarm_save(const ivts_motion_alarm_t *alarm);

/* Restore boot identity from a validated RTC context after deep-sleep reset. */
bool app_rtc_ctx_load(uint32_t *boot_id, uint32_t *seq);
/* Save boot identity and sequence immediately before sleep. */
void app_rtc_ctx_save(uint32_t boot_id, uint32_t seq, uint8_t last_state);
