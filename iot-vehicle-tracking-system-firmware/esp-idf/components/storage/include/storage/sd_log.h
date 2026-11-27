#pragma once
#include "ivts_core/base/err.h"

#define STORAGE_LOG_LINE_MAX 160u   /**< Độ dài tối đa một dòng log và một bản ghi queue, byte. */

/** @brief Ghi thêm một dòng log; dòng dài hơn STORAGE_LOG_LINE_MAX bị cắt. */
ivts_err_t storage_log_append(const char *line);
