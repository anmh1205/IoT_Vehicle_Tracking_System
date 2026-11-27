/**
 * @file str.h
 * @brief Tiện ích chuỗi và số nguyên.
 */
#pragma once
#include <stddef.h>
#include "ivts_core/base/err.h"

/**
 * @brief Sao chép chuỗi C vào buffer có kích thước cố định, luôn kết thúc bằng NUL.
 *
 * @param dst  Buffer đích.
 * @param cap  Kích thước @p dst (byte, gồm NUL).
 * @param src  Chuỗi nguồn kết thúc bằng NUL.
 * @return IVTS_OK nếu vừa; IVTS_ERR_FULL nếu bị cắt (dst vẫn là chuỗi hợp lệ);
 *         IVTS_ERR_INVALID_ARG nếu dst NULL, cap = 0 hoặc src NULL
 *         (với cap > 0 thì dst = "").
 */
ivts_err_t ivts_str_copy(char *dst, size_t cap, const char *src);

/**
 * @brief Kẹp @p v vào [lo, hi]. Nếu lo > hi thì hai biên được hoán đổi.
 */
int ivts_clamp_int(int v, int lo, int hi);
