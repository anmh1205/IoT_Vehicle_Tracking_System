/**
 * @file include/ivts_core/base/str.h
 * @brief Bounded string copy and integer-clamping helpers.
 *
 * App provisioning and reporting and the modem AT engine use the bounded copy.
 * The helpers operate on values and caller-owned storage. They retain no pointers
 * and leave validation of field-specific formats to the caller.
 */
#pragma once
#include <stddef.h>
#include "ivts_core/base/err.h"

/**
 * @brief Copy a NUL-terminated C string to a bounded destination.
 * @param[out] dst Destination buffer. Any writable destination is NUL-terminated on return.
 * @param cap Capacity in bytes including NUL. Zero is invalid.
 * @param src NUL-terminated source borrowed for the call. A NULL source clears a writable destination.
 * @retval IVTS_OK The entire string fits.
 * @retval IVTS_ERR_FULL The output contains a truncated string.
 * @retval IVTS_ERR_INVALID_ARG A pointer is NULL or cap is zero.
 *
 * @warning Source and destination must not overlap.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
ivts_err_t ivts_str_copy(char *dst, size_t cap, const char *src);

/**
 * @brief Clamp a value to inclusive integer bounds.
 * @param v Value to clamp.
 * @param lo One endpoint of the interval.
 * @param hi Other endpoint. Reversed endpoints are accepted.
 * @return The clamped value.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
int ivts_clamp_int(int v, int lo, int hi);
