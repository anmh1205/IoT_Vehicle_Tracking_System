/**
 * @file src/payload/payload_internal.h
 * @brief Private common MQTT metadata, formatting and enum names.
 *
 * The RAW and control builders share these helpers on their local writer.
 * Inputs are borrowed and wire names refer to immutable static strings.
 * The public builders control field selection and close the message object.
 */
#pragma once
#include "ivts_core/payload/json_writer.h"
#include "ivts_core/payload/payload.h"
#include "ivts_core/model/telemetry.h"

/**
 * @brief Open the message object and write its metadata.
 *
 * Use trusted nonzero UTC time when supplied. Otherwise use uptime, with one millisecond as the minimum.
 * The caller closes the root object after adding message-specific fields.
 *
 * @param[in,out] writer Required initialized writer at the root.
 * @param meta Required borrowed metadata with a valid NUL-terminated device ID.
 * @param schema Required NUL-terminated schema version borrowed for the call.
 *
 * @note Context: Caller of a payload builder with exclusive access to its writer. Blocking: non-blocking.
 */
void ivts_payload_write_header(ivts_jw_t *writer, const ivts_msg_meta_t *meta, const char *schema);
/**
 * @brief Append session identity to the current JSON object.
 * @param[in,out] writer Required writer with an open message object.
 * @param session Borrowed session. NULL or zero local key adds no fields. Zero canonical ID is omitted.
 *
 * @note Context: Caller of a payload builder with exclusive access to its writer. Blocking: non-blocking.
 */
void ivts_payload_write_session(ivts_jw_t *writer, const ivts_session_id_t *session);
/**
 * @brief Append vehicle and device state to the current JSON object.
 *
 * The alarm device state adds a motion alert alongside the state object.
 *
 * @param[in,out] writer Required writer with an open message object.
 * @param ignition Encoded ivts_ignition_t state.
 * @param motion Encoded ivts_motion_t state.
 * @param vehicle Encoded ivts_vehicle_t state.
 * @param device Encoded ivts_device_state_t state.
 * @param sleep Encoded ivts_sleep_mode_t mode.
 *
 * @note Context: Caller of a payload builder with exclusive access to its writer. Blocking: non-blocking.
 */
void ivts_payload_write_state(ivts_jw_t *writer, uint8_t ignition, uint8_t motion, uint8_t vehicle,
                              uint8_t device, uint8_t sleep);

/**
 * @brief Return the wire name for a ignition state.
 * @param value State or mode to name.
 * @return Immutable static string, or "UNKNOWN" for an unrecognized value.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
const char *ivts_payload_ignition_name(uint8_t value);
/**
 * @brief Return the wire name for a motion state.
 * @param value State or mode to name.
 * @return Immutable static string, or "UNKNOWN" for an unrecognized value.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
const char *ivts_payload_motion_name(uint8_t value);
/**
 * @brief Return the wire name for a vehicle state.
 * @param value State or mode to name.
 * @return Immutable static string, or "UNKNOWN" for an unrecognized value.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
const char *ivts_payload_vehicle_name(uint8_t value);
/**
 * @brief Return the wire name for a device state.
 * @param value State or mode to name.
 * @return Immutable static string, or "FAULT" for an unrecognized value.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
const char *ivts_payload_device_name(ivts_device_state_t value);
/**
 * @brief Return the wire name for a ECU state.
 * @param value State or mode to name.
 * @return Immutable static string, or "unknown" for an unrecognized value.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
const char *ivts_payload_ecu_name(ivts_ecu_state_t value);
/**
 * @brief Return the wire name for a sleep mode.
 * @param value State or mode to name.
 * @return Immutable static string, or "NONE" for an unrecognized value.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
const char *ivts_payload_sleep_name(uint8_t value);
