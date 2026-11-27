#pragma once
#include "ivts_core/payload/json_writer.h"
#include "ivts_core/payload/payload.h"

/* Shared JSON fields for public MQTT message builders. */
void ivts_payload_write_header(ivts_jw_t *writer, const ivts_msg_meta_t *meta, const char *schema);
void ivts_payload_write_session(ivts_jw_t *writer, const ivts_session_id_t *session);
void ivts_payload_write_state(ivts_jw_t *writer, uint8_t ignition, uint8_t motion, uint8_t vehicle,
                              uint8_t device, uint8_t sleep);
