/**
 * @file offline_queue.h
 * @brief Offline RAW queue requests, count and tokenized peek copy.
 *
 * The storage task owns file mutation. Callers copy a peek into their own
 * buffer and request pop with its token after successful delivery.
 */
#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"

/**
 * @brief Request append of an encoded offline record, from 1 through IVTS_RECORD_MAX_SIZE bytes.
 */
ivts_err_t storage_queue_push(const uint8_t *rec, size_t len);
/** A push was accepted into RAM and its SD request is still pending. */
bool storage_queue_has_unflushed_push(void);

/**
 * @brief Request a peek of the oldest record. A successful fill emits IVTS_EV_QUEUE_READY.
 */
ivts_err_t storage_queue_request_peek(void);

/**
 * @brief Copy the current peek slot under its mutex.
 * @param[out] token Identifier to use with storage_queue_pop().
 * @retval IVTS_ERR_NOT_FOUND No record is currently cached.
 */
ivts_err_t storage_queue_peek_copy(uint8_t *out, size_t cap, size_t *len, uint32_t *token);

/**
 * @brief Request removal of the peeked record after successful cloud delivery.
 *
 * The storage task ignores a token that has become stale.
 */
ivts_err_t storage_queue_pop(uint32_t token);

/** @return Number of pending records, including the current peek record. */
uint32_t storage_queue_count(void);
