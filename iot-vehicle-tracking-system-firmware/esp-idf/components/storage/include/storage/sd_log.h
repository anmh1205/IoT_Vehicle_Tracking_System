/**
 * @file include/storage/sd_log.h
 * @brief Asynchronous SD log append requests.
 *
 * The caller supplies a string that is copied into the storage request with zero enqueue wait.
 * The storage task owns file rotation, quota checks and write failure reporting.
 */
#pragma once
#include "ivts_core/base/err.h"

#define STORAGE_LOG_LINE_MAX 160u   /**< Maximum copied log payload in bytes, before the newline added on disk. */

/**
 * @brief Queue a copy of a log line for SD append.
 *
 * Only the first STORAGE_LOG_LINE_MAX bytes are copied. The worker adds a newline and reports write failures.
 *
 * @param line Non-null string borrowed during the bounded copy.
 * @retval IVTS_OK The log request is queued.
 * @retval IVTS_ERR_INVALID_ARG The line is NULL.
 * @retval IVTS_ERR_INVALID_STATE SD is unavailable or the work queue is absent.
 * @retval IVTS_ERR_FULL The work queue is full.
 * @note Context: Task context after startup. Non-blocking.
 */
ivts_err_t storage_log_append(const char *line);
