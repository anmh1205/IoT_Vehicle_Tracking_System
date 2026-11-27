/**
 * @file include/ivts_core/payload/json_writer.h
 * @brief Bounded JSON serialization into a caller-owned buffer.
 *
 * MQTT builders and the app command-ACK path serialize into caller-owned buffers.
 * Writing requires no allocation or printf. The caller serializes access to each
 * writer and supplies the JSON structure. A full buffer stops byte output and
 * ivts_jw_finish() reports exhaustion.
 */
#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"

#define IVTS_JW_MAX_DEPTH 8u   /**< Number of depth slots including the root slot at depth zero. */

/** @brief Caller-owned writer and borrowed destination. Use one task at a time per writer. */
typedef struct {
    char    *buf;  /**< Destination kept writable until serialization ends. */
    size_t   cap;  /**< Destination capacity in bytes including NUL. */
    size_t   len;  /**< Number of bytes written, excluding NUL. */
    uint8_t  depth;  /**< Number of open containers, from zero through IVTS_JW_MAX_DEPTH minus one. */
    bool     full;  /**< Byte output is disabled because capacity is absent or exhausted. */
    bool     bad;          /**< Depth or decimal count error. */
    uint8_t  need_comma;   /**< Bit d is set once depth d contains an element and a comma is needed next. */
} ivts_jw_t;

/**
 * @brief Initialize a bounded JSON writer.
 * @param[out] w Required writer state. Reset on every call.
 * @param buf Caller-owned writable destination. NULL starts the writer in the full state.
 * @param cap Destination capacity in bytes including NUL. Zero starts the writer in the full state.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
void ivts_jw_init(ivts_jw_t *w, char *buf, size_t cap);
/**
 * @brief Open a JSON object.
 * @param[in,out] w Required initialized writer and its borrowed, writable buffer.
 * @param key Borrowed NUL-terminated object member name. Use NULL at the root or in an array.
 *
 * @warning Opening more than seven containers records an error.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
void ivts_jw_obj_begin(ivts_jw_t *w, const char *key);
/**
 * @brief Close the current JSON object.
 * @param[in,out] w Required initialized writer and its borrowed, writable buffer.
 *
 * @warning The caller must match ends to begins. The writer tracks depth without container types.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
void ivts_jw_obj_end(ivts_jw_t *w);
/**
 * @brief Open a JSON array.
 * @param[in,out] w Required initialized writer and its borrowed, writable buffer.
 * @param key Borrowed NUL-terminated object member name. Use NULL at the root or in an array.
 *
 * @warning Opening more than seven containers records an error.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
void ivts_jw_arr_begin(ivts_jw_t *w, const char *key);
/**
 * @brief Close the current JSON array.
 * @param[in,out] w Required initialized writer and its borrowed, writable buffer.
 *
 * @warning The caller must match ends to begins. The writer tracks depth without container types.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
void ivts_jw_arr_end(ivts_jw_t *w);
/**
 * @brief Write an escaped JSON string or a null value.
 * @param[in,out] w Required initialized writer and its borrowed, writable buffer.
 * @param key Borrowed NUL-terminated object member name. Use NULL at the root or in an array.
 * @param val Borrowed NUL-terminated source. NULL emits the JSON null literal.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
void ivts_jw_str(ivts_jw_t *w, const char *key, const char *val);
/**
 * @brief Write a signed decimal integer.
 * @param[in,out] w Required initialized writer and its borrowed, writable buffer.
 * @param key Borrowed NUL-terminated object member name. Use NULL at the root or in an array.
 * @param v Signed value, including INT64_MIN.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
void ivts_jw_int(ivts_jw_t *w, const char *key, int64_t v);
/**
 * @brief Write an unsigned decimal integer.
 * @param[in,out] w Required initialized writer and its borrowed, writable buffer.
 * @param key Borrowed NUL-terminated object member name. Use NULL at the root or in an array.
 * @param v Unsigned value, up to UINT64_MAX.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
void ivts_jw_uint(ivts_jw_t *w, const char *key, uint64_t v);
/**
 * @brief Write a JSON boolean.
 * @param[in,out] w Required initialized writer and its borrowed, writable buffer.
 * @param key Borrowed NUL-terminated object member name. Use NULL at the root or in an array.
 * @param v Value emitted as the true or false literal.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
void ivts_jw_bool(ivts_jw_t *w, const char *key, bool v);
/**
 * @brief Write a JSON null literal.
 * @param[in,out] w Required initialized writer and its borrowed, writable buffer.
 * @param key Borrowed NUL-terminated object member name. Use NULL at the root or in an array.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
void ivts_jw_null(ivts_jw_t *w, const char *key);
/**
 * @brief Write a fixed-point value as a JSON number.
 * @param[in,out] w Required initialized writer and its borrowed, writable buffer.
 * @param key Borrowed NUL-terminated object member name. Use NULL at the root or in an array.
 * @param v Signed integer numerator.
 * @param decimals Number of fractional digits, from zero through nine. Larger values record an error.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
void ivts_jw_fixed(ivts_jw_t *w, const char *key, int64_t v, uint8_t decimals);

/**
 * @brief Check writer state and report the serialized length.
 *
 * Finish checks capacity, depth and recorded API errors. Callers supply one root value and
 * match keys and container types to produce valid JSON.
 *
 * @param w Required writer borrowed for the call.
 * @param[out] len Optional byte count excluding NUL. Written only on success.
 * @retval IVTS_OK The writer has no recorded error and all containers are closed.
 * @retval IVTS_ERR_FULL The destination is missing or exhausted. This takes precedence over state errors.
 * @retval IVTS_ERR_INVALID_STATE A container is open or the writer records an API error.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
ivts_err_t ivts_jw_finish(ivts_jw_t *w, size_t *len);
