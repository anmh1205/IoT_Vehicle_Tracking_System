/**
 * @file include/ivts_core/payload/payload.h
 * @brief MQTT JSON builders for telemetry, status, sessions and device events.
 *
 * The app publish path builds live and replayed messages into its own buffer.
 * Builders borrow metadata, strings and snapshots for the call. Publication,
 * retry and acknowledgement are handled by the app and modem. A short
 * writable buffer contains a NUL-terminated JSON prefix.
 */
#pragma once

#include <stddef.h>
#include "ivts_core/base/err.h"
#include "ivts_core/model/record.h"
#include "ivts_core/model/telemetry.h"
#include "ivts_core/payload/meta.h"

#define IVTS_PAYLOAD_MAX 2048u   /**< Payload buffer capacity used by the app, in bytes including NUL. */

/**
 * @brief Serialize telemetry from a captured record.
 *
 * The record supplies message identity, timestamps, session and captured fields for both live and replay
 * messages. A live snapshot contributes OBD channel, quality and diagnostic details when supplied.
 *
 * @param m Required metadata with a non-NULL NUL-terminated device ID, borrowed for the call.
 * @param r Required captured record borrowed for the call.
 * @param live Optional current snapshot borrowed for the call. Pass NULL for offline replay.
 * @param[out] buf Caller-owned output. Exhaustion leaves a NUL-terminated prefix when writable.
 * @param cap Output capacity in bytes including NUL.
 * @param[out] len Optional JSON byte count excluding NUL. Written only on success.
 * @retval IVTS_OK The payload is serialized.
 * @retval IVTS_ERR_FULL The buffer is NULL, zero-capacity or too small.
 * @retval IVTS_ERR_INVALID_ARG Required metadata, device ID or record is NULL. Outputs are untouched.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
ivts_err_t ivts_payload_rawdata(const ivts_msg_meta_t *m, const ivts_record_t *r,
                                const ivts_telemetry_t *live,
                                char *buf, size_t cap, size_t *len);
/**
 * @brief Serialize device and session status.
 *
 * A start or end boundary overrides normal status selection. Otherwise a heartbeat is the default.
 * With heartbeat false, an active local session reports running. Without a session, ignition OFF reports stopped.
 *
 * @param m Required metadata with a non-NULL NUL-terminated device ID, borrowed for the call.
 * @param t Required telemetry snapshot borrowed for the call.
 * @param session Optional borrowed session. NULL or a zero local key omits session fields.
 * @param boundary Start or end boundary, or IVTS_BOUNDARY_NONE for ordinary status.
 * @param heartbeat Select heartbeat status in the absence of a start or end boundary.
 * @param[out] buf Caller-owned output. Exhaustion leaves a NUL-terminated prefix when writable.
 * @param cap Output capacity in bytes including NUL.
 * @param[out] len Optional JSON byte count excluding NUL. Written only on success.
 * @retval IVTS_OK The payload is serialized.
 * @retval IVTS_ERR_FULL The buffer is NULL, zero-capacity or too small.
 * @retval IVTS_ERR_INVALID_ARG Required metadata, device ID or snapshot is NULL. Outputs are untouched.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
ivts_err_t ivts_payload_status(const ivts_msg_meta_t *m, const ivts_telemetry_t *t,
                               const ivts_session_id_t *session, ivts_boundary_kind_t boundary, bool heartbeat,
                               char *buf, size_t cap, size_t *len);
/**
 * @brief Serialize a device event.
 * @param m Required metadata with a non-NULL NUL-terminated device ID, borrowed for the call.
 * @param code Event code. Zero omits the field.
 * @param severity Borrowed NUL-terminated event type. NULL selects "info".
 * @param message Borrowed NUL-terminated message. NULL omits the field.
 * @param[out] buf Caller-owned output. Exhaustion leaves a NUL-terminated prefix when writable.
 * @param cap Output capacity in bytes including NUL.
 * @param[out] len Optional JSON byte count excluding NUL. Written only on success.
 * @retval IVTS_OK The payload is serialized.
 * @retval IVTS_ERR_FULL The buffer is NULL, zero-capacity or too small.
 * @retval IVTS_ERR_INVALID_ARG Required metadata or device ID is NULL. Outputs are untouched.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
ivts_err_t ivts_payload_event(const ivts_msg_meta_t *m, int32_t code, const char *severity,
                              const char *message, char *buf, size_t cap, size_t *len);
