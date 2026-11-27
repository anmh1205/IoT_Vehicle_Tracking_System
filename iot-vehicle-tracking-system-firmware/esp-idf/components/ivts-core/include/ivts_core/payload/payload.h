/**
 * @file components/ivts-core/include/ivts_core/payload/payload.h
 * @brief MQTT JSON builders for telemetry, status, sessions and device events.
 *
 * Successful calls return IVTS_OK and the JSON length through len. A short
 * buffer remains a valid C string and returns IVTS_ERR_FULL. A missing
 * required input returns IVTS_ERR_INVALID_ARG.
 */
#pragma once

#include <stddef.h>
#include "ivts_core/base/err.h"
#include "ivts_core/model/record.h"
#include "ivts_core/model/telemetry.h"
#include "ivts_core/payload/meta.h"

#define IVTS_PAYLOAD_MAX 2048u   /**< Capacity sufficient for the largest supported payload. */

/** @brief Serialize GNSS, voltage, state and OBD data from a telemetry record. */
ivts_err_t ivts_payload_rawdata(const ivts_msg_meta_t *m, const ivts_record_t *r,
                                const ivts_telemetry_t *live,
                                char *buf, size_t cap, size_t *len);
/** @brief Serialize device status from the current app snapshot. */
ivts_err_t ivts_payload_status(const ivts_msg_meta_t *m, const ivts_telemetry_t *t,
                               const ivts_session_id_t *session, ivts_boundary_kind_t boundary, bool heartbeat,
                               char *buf, size_t cap, size_t *len);
/**
 * @brief Serialize a device event. Default severity is "info". A zero code or null message omits
 * the respective field.
 */
ivts_err_t ivts_payload_event(const ivts_msg_meta_t *m, int32_t code, const char *severity,
                              const char *message, char *buf, size_t cap, size_t *len);
