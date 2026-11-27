#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"

/** @brief Thêm một bản ghi đã mã hoá vào cuối queue (1..IVTS_RECORD_MAX_SIZE byte). */
ivts_err_t storage_queue_push(const uint8_t *rec, size_t len);
/** Có bản ghi đã nhận vào RAM, chưa ghi xong lên SD. */
bool storage_queue_has_unflushed_push(void);

/** @brief Yêu cầu nạp bản ghi cũ nhất vào ô peek. Khi có dữ liệu, task "storage" phát IVTS_EV_QUEUE_READY. */
ivts_err_t storage_queue_request_peek(void);

/**
 * @brief Sao chép bản ghi trong ô peek (đồng bộ, có mutex).
 * @param[out] token Mã định danh bản ghi, dùng cho storage_queue_pop().
 * @retval IVTS_ERR_NOT_FOUND Ô peek trống.
 */
ivts_err_t storage_queue_peek_copy(uint8_t *out, size_t cap, size_t *len, uint32_t *token);

/**
 * @brief Yêu cầu bỏ bản ghi đã peek, sau khi cloud ACK. Token không còn khớp (đã pop) thì bị bỏ qua.
 */
ivts_err_t storage_queue_pop(uint32_t token);

/** @return Số bản ghi còn trong queue (kể cả bản ghi trong ô peek chưa pop). */
uint32_t storage_queue_count(void);
