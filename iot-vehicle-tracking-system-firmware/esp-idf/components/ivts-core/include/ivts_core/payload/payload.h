#pragma once

/**
 * @file payload.h
 * @brief Dựng các payload JSON gửi cloud: rawdata, status, event (firmware: ota/contract.h).
 *
 * Tất cả hàm: trả IVTS_OK và độ dài chuỗi qua @c *len; trả IVTS_ERR_FULL khi buffer không
 * đủ (buffer vẫn là chuỗi hợp lệ, kết thúc bằng NUL); trả IVTS_ERR_INVALID_ARG khi tham số
 * bắt buộc là NULL.
 */

#include <stddef.h>
#include "ivts_core/base/err.h"
#include "ivts_core/model/record.h"
#include "ivts_core/model/telemetry.h"
#include "ivts_core/payload/meta.h"

#define IVTS_PAYLOAD_MAX 2048u   /**< Kích thước buffer đủ cho mọi payload. */

/** @brief Payload telemetry (GNSS, nguồn, trạng thái, OBD) từ một record. */
ivts_err_t ivts_payload_rawdata(const ivts_msg_meta_t *m, const ivts_record_t *r,
                                const ivts_telemetry_t *live,
                                char *buf, size_t cap, size_t *len);
/** @brief Payload trạng thái thiết bị từ ảnh chụp telemetry. */
ivts_err_t ivts_payload_status(const ivts_msg_meta_t *m, const ivts_telemetry_t *t,
                               const ivts_session_id_t *session, ivts_boundary_kind_t boundary, bool heartbeat,
                               char *buf, size_t cap, size_t *len);
/** @brief Payload sự kiện. @p severity NULL được thay bằng "info"; code 0 và message NULL được bỏ qua. */
ivts_err_t ivts_payload_event(const ivts_msg_meta_t *m, int32_t code, const char *severity,
                              const char *message, char *buf, size_t cap, size_t *len);
