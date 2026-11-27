/**
 * @file json_reader.h
 * @brief Bounded JSON tokenizer and token-based object access.
 *
 * The tokenizer works on offsets into the caller-owned input and uses a
 * caller-supplied token array. Input length, nesting depth and token count are
 * bounded before fields are used by firmware command handlers.
 */
#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"

/** JSON token kind. */
typedef enum { IVTS_JT_OBJ = 1, IVTS_JT_ARR, IVTS_JT_STR, IVTS_JT_PRIM } ivts_jtype_t;

/** JSON token identified by offsets into the source buffer. */
typedef struct {
    uint8_t  type;     /**< ivts_jtype_t. */
    uint16_t start;    /**< Start offset, after the opening quote for a string. */
    uint16_t end;      /**< End offset, at the closing quote for a string. */
    uint16_t size;     /**< Number of key/value pairs for OBJ or elements for ARR. */
    int16_t  parent;   /**< Parent token index, or -1 for the root. */
} ivts_jtok_t;

#define IVTS_JSON_MAX_LEN 4096u   /**< Maximum accepted JSON input length in bytes. */

/**
 * @brief Tokenize one JSON value within the supplied capacity and depth.
 * @param js Input bytes, which need no trailing NUL.
 * @param len Input length, at most IVTS_JSON_MAX_LEN.
 * @param[out] t Caller-supplied token array.
 * @param ntok Token array capacity.
 * @param max_depth Maximum object or array nesting depth.
 * @return A positive token count, -IVTS_ERR_FULL when tokens run out, or
 * -IVTS_ERR_INVALID_ARG for malformed input, excess depth or trailing data.
 */
int ivts_json_parse(const char *js, size_t len, ivts_jtok_t *t, size_t ntok, uint8_t max_depth);

/**
 * @brief Find the value of @p key among the direct members of object @c t[obj].
 * @return Value token index, or -1 if the key is absent.
 */
int ivts_json_find(const char *js, const ivts_jtok_t *t, int ntok, int obj, const char *key);

/**
 * @brief Decode a JSON string and NUL-terminate the destination.
 * @return IVTS_OK, IVTS_ERR_FULL for truncated output, or IVTS_ERR_INVALID_ARG
 * for a non-string token or an unsupported escape.
 */
ivts_err_t ivts_json_get_str(const char *js, const ivts_jtok_t *tok, char *out, size_t cap);
/** @brief Read an unsigned 32-bit integer and reject negative, fractional or overflowing values. */
ivts_err_t ivts_json_get_u32(const char *js, const ivts_jtok_t *tok, uint32_t *out);
/** @brief Read a JSON boolean literal. */
ivts_err_t ivts_json_get_bool(const char *js, const ivts_jtok_t *tok, bool *out);
