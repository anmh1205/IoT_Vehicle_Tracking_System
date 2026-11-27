/**
 * @file sd_log.h
 * @brief Asynchronous SD log requests and storage-task result reporting.
 */
#pragma once
#include "ivts_core/base/err.h"

#define STORAGE_LOG_LINE_MAX 160u   /**< Maximum SD log line size in bytes. */

/** @brief Queue a log append. A line exceeding STORAGE_LOG_LINE_MAX is truncated. */
ivts_err_t storage_log_append(const char *line);
