/**
 * @file components/ivts-core/src/payload/payload_internal.h
 * @brief Private common MQTT metadata, formatting and enum names.
 */
#ifndef IVTS_CORE_PAYLOAD_INTERNAL_H
#define IVTS_CORE_PAYLOAD_INTERNAL_H
#include "ivts_core/payload/json_writer.h"
#include "ivts_core/payload/payload.h"
#include "ivts_core/model/telemetry.h"

/* Shared JSON fields for public MQTT message builders. */
void ivts_payload_write_header(ivts_jw_t *writer, const ivts_msg_meta_t *meta, const char *schema);
void ivts_payload_write_session(ivts_jw_t *writer, const ivts_session_id_t *session);
void ivts_payload_write_state(ivts_jw_t *writer, uint8_t ignition, uint8_t motion, uint8_t vehicle,
                              uint8_t device, uint8_t sleep);

/* Payload spellings are part of the cloud contract. */
const char *ivts_payload_ignition_name(uint8_t value);
const char *ivts_payload_motion_name(uint8_t value);
const char *ivts_payload_vehicle_name(uint8_t value);
const char *ivts_payload_device_name(ivts_device_state_t value);
const char *ivts_payload_ecu_name(ivts_ecu_state_t value);
const char *ivts_payload_sleep_name(uint8_t value);

#endif
