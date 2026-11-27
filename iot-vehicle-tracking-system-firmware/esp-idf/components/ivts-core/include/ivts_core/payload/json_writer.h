/**
 * @file json_writer.h
 * @brief Bounded JSON serialization into a caller-owned buffer.
 *
 * Writing requires no allocation or printf. Once the output buffer is full,
 * subsequent writes are no-ops and ivts_jw_finish() returns IVTS_ERR_FULL.
 */
#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"

#define IVTS_JW_MAX_DEPTH 8u   /**< Maximum object or array nesting depth. */

/** Writer state initialized by ivts_jw_init(). */
typedef struct {
    char    *buf;
    size_t   cap;
    size_t   len;
    uint8_t  depth;
    bool     full;
    bool     bad;          /**< API misuse such as unmatched close, excess depth or more than nine decimal places. */
    uint8_t  need_comma;   /**< Bit d is set once depth d contains an element and a comma is needed next. */
} ivts_jw_t;

/** @brief Initialize the writer. A null or zero-length buffer starts in the full state. */
void ivts_jw_init(ivts_jw_t *w, char *buf, size_t cap);
/* Use a key for an object member and NULL for a root or array value. */
void ivts_jw_obj_begin(ivts_jw_t *w, const char *key);
void ivts_jw_obj_end(ivts_jw_t *w);
void ivts_jw_arr_begin(ivts_jw_t *w, const char *key);
void ivts_jw_arr_end(ivts_jw_t *w);
void ivts_jw_str(ivts_jw_t *w, const char *key, const char *val);  /* val NULL ghi null. */
void ivts_jw_int(ivts_jw_t *w, const char *key, int64_t v);
void ivts_jw_uint(ivts_jw_t *w, const char *key, uint64_t v);
void ivts_jw_bool(ivts_jw_t *w, const char *key, bool v);
void ivts_jw_null(ivts_jw_t *w, const char *key);
/**
 * @brief Write a fixed-point number as v divided by 10 to the power of decimals.
 * @param decimals Number of fractional digits, up to nine.
 */
void ivts_jw_fixed(ivts_jw_t *w, const char *key, int64_t v, uint8_t decimals);

/**
 * @brief Finish the JSON document and report any output error.
 * @param[out] len Optional output length excluding NUL.
 * @return IVTS_OK, IVTS_ERR_FULL for buffer exhaustion, or
 * IVTS_ERR_INVALID_STATE for an unclosed container or API misuse.
 */
ivts_err_t ivts_jw_finish(ivts_jw_t *w, size_t *len);
