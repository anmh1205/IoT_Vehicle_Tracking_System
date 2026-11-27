/**
 * @file include/storage/offline_queue.h
 * @brief Offline telemetry append, peek copy and token-checked removal.
 *
 * The app posts requests without waiting for SD. The storage task owns file and cursor mutation.
 * The app copies the peek and posts its token after acknowledgment or to discard undecodable data.
 * Count and peek copy can wait on the slot mutex. A queued request lives in RAM until it is processed.
 */
#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"

/**
 * @brief Queue an encoded offline record for SD append.
 *
 * Acceptance copies the record into the RAM work queue. Storage reports append failures asynchronously.
 *
 * @param rec Non-null encoded record, borrowed only during the copy.
 * @param len Number of bytes, from one through IVTS_RECORD_MAX_SIZE.
 * @retval IVTS_OK The request is queued.
 * @retval IVTS_ERR_INVALID_ARG The record or length is invalid.
 * @retval IVTS_ERR_INVALID_STATE SD is unavailable or the work queue is absent.
 * @retval IVTS_ERR_FULL The work queue is full.
 * @note Context: App task after startup. Non-blocking.
 */
ivts_err_t storage_queue_push(const uint8_t *rec, size_t len);
/**
 * @brief Test for an append submission or write still in progress.
 * @retval true The atomic count includes a push being posted, queued or processed.
 * @retval false No push is pending at the instant of the read.
 * @note Context: App task. Non-blocking. Completion can also mean the append failed.
 */
bool storage_queue_has_unflushed_push(void);

/**
 * @brief Queue a request to cache the oldest unread record.
 *
 * An empty queue or a full peek slot requires no new read. A new fill attempts to emit IVTS_EV_QUEUE_READY.
 *
 * @retval IVTS_OK The request is queued.
 * @retval IVTS_ERR_INVALID_STATE SD is unavailable or the work queue is absent.
 * @retval IVTS_ERR_FULL The work queue is full.
 * @note Context: App task after startup. Non-blocking.
 */
ivts_err_t storage_queue_request_peek(void);

/**
 * @brief Copy the cached record and its token under the slot mutex.
 * @param[out] out Non-null destination for the record bytes.
 * @param cap Destination capacity in bytes.
 * @param[out] len Non-null destination for the number of bytes copied.
 * @param[out] token Non-null destination for the token to pass to storage_queue_pop().
 * @retval IVTS_OK All outputs are written. The slot stays full.
 * @retval IVTS_ERR_INVALID_ARG A required output is missing or the slot mutex is absent.
 * @retval IVTS_ERR_NOT_FOUND The slot is empty.
 * @retval IVTS_ERR_FULL The destination is too small.
 * @note Context: App task. Waits on the slot mutex without a fixed timeout. Outputs are unchanged on failure.
 */
ivts_err_t storage_queue_peek_copy(uint8_t *out, size_t cap, size_t *len, uint32_t *token);

/**
 * @brief Queue token-checked removal of the cached record.
 *
 * The app chooses when a record can be removed. Storage checks the token before advancing the RAM cursor.
 * A reset can replay acknowledged records after the last durable cursor checkpoint.
 *
 * @param token Token obtained from storage_queue_peek_copy().
 * @retval IVTS_OK The request is queued for later token validation.
 * @retval IVTS_ERR_INVALID_ARG The slot mutex is absent.
 * @retval IVTS_ERR_INVALID_STATE SD is unavailable or the work queue is absent.
 * @retval IVTS_ERR_FULL The work queue is full.
 * @note Context: App task after startup. Non-blocking.
 */
ivts_err_t storage_queue_pop(uint32_t token);

/**
 * @brief Read the current pending record count.
 * @return Count including the cached peek. Zero if the slot mutex is absent.
 * @note Context: App startup or runtime task. Waits on the slot mutex without a fixed timeout.
 */
uint32_t storage_queue_count(void);
