/**
 * @file str.h
 * @brief Bounded string copy and integer-clamping helpers.
 */
#pragma once
#include <stddef.h>
#include "ivts_core/base/err.h"

/**
 * @brief Copy a NUL-terminated C string to a bounded destination.
 * @param dst Destination buffer.
 * @param cap Capacity including the trailing NUL.
 * @param src NUL-terminated source.
 * @return IVTS_OK when it fits, IVTS_ERR_FULL after truncation, or
 * IVTS_ERR_INVALID_ARG for invalid inputs. A writable destination remains
 * NUL-terminated even after truncation.
 */
ivts_err_t ivts_str_copy(char *dst, size_t cap, const char *src);

/**
 * @brief Clamp @p v to [lo, hi], swapping the bounds if lo exceeds hi.
 */
int ivts_clamp_int(int v, int lo, int hi);
