/**
 * @file include/ivts_core/payload/json_reader.h
 * @brief Bounded JSON tokenizer and token-based object access.
 *
 * The app command inbox tokenizes payloads before typed access. The tokenizer
 * works on offsets into the caller-owned bytes and uses a caller-supplied token
 * array. Keep both unchanged while reading the tokens. Command-specific field
 * validation remains with the caller.
 */
#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"

/** @brief Syntax category assigned to a parsed JSON token. */
typedef enum { IVTS_JT_OBJ = 1, /**< Object with key and value children.
               */ IVTS_JT_ARR, /**< Array with element children.
               */ IVTS_JT_STR, /**< Quoted string, including object keys.
               */ IVTS_JT_PRIM /**< JSON number, boolean or null. */ } ivts_jtype_t;

/** @brief Token stored in a caller-owned array and backed by the original JSON bytes. */
typedef struct {
    uint8_t  type;     /**< ivts_jtype_t. */
    uint16_t start;    /**< Start offset, after the opening quote for a string. */
    uint16_t end;      /**< End offset, at the closing quote for a string. */
    uint16_t size;     /**< Number of key/value pairs for OBJ or elements for ARR. */
    int16_t  parent;   /**< Index of the containing token, or -1 for the root. */
} ivts_jtok_t;

#define IVTS_JSON_MAX_LEN 4096u   /**< Maximum accepted JSON input length in bytes. */

/**
 * @brief Tokenize one complete JSON value within capacity and depth limits.
 * @param js Input bytes borrowed for the call. A trailing NUL is unnecessary and is excluded from len.
 * @param len Input size in bytes, at most IVTS_JSON_MAX_LEN.
 * @param[out] t Required caller-owned token array. A failure can leave partial tokens.
 * @param ntok Token array capacity in entries, greater than zero.
 * @param max_depth Maximum open containers. Zero allows only a scalar root.
 * @return Positive token count on success.
 * @retval -IVTS_ERR_FULL The token array runs out of entries.
 * @retval -IVTS_ERR_INVALID_ARG Arguments, syntax, length, depth, or trailing content are invalid.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
int ivts_json_parse(const char *js, size_t len, ivts_jtok_t *t, size_t ntok, uint8_t max_depth);

/**
 * @brief Find the first matching direct member of a parsed object.
 *
 * Matching uses the raw key bytes, including any escape spelling. Nested members are skipped.
 *
 * @param js Original JSON bytes borrowed for the call.
 * @param t Required token array for js, borrowed for the call.
 * @param ntok Number of populated tokens.
 * @param obj Candidate object token index.
 * @param key Required NUL-terminated key borrowed for the call.
 * @return Index of the matching value token, or -1 for an absent key or invalid object index or type.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
int ivts_json_find(const char *js, const ivts_jtok_t *t, int ntok, int obj, const char *key);

/**
 * @brief Decode a parsed JSON string into a NUL-terminated buffer.
 *
 * A Unicode escape must represent a nonzero ASCII byte. Unescaped non-ASCII bytes pass through.
 *
 * @param js Original JSON bytes borrowed for the call.
 * @param tok Borrowed parsed token for js. NULL is invalid.
 * @param[out] out Destination. An unsupported Unicode escape clears the string.
 * @param cap Destination capacity in bytes including NUL.
 * @retval IVTS_OK The whole string is decoded.
 * @retval IVTS_ERR_FULL Output contains a NUL-terminated prefix.
 * @retval IVTS_ERR_INVALID_ARG Token, output, capacity or Unicode escape is invalid.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
ivts_err_t ivts_json_get_str(const char *js, const ivts_jtok_t *tok, char *out, size_t cap);
/**
 * @brief Read an unsigned 32-bit decimal integer.
 * @param js Original JSON bytes borrowed for the call.
 * @param tok Borrowed parsed token for js. NULL is invalid.
 * @param[out] out Destination. Written only on success.
 * @retval IVTS_OK The primitive contains only digits and fits uint32_t.
 * @retval IVTS_ERR_INVALID_ARG Token or output is invalid, or the value has a non-digit or overflows.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
ivts_err_t ivts_json_get_u32(const char *js, const ivts_jtok_t *tok, uint32_t *out);
/**
 * @brief Read a JSON boolean literal.
 * @param js Original JSON bytes borrowed for the call.
 * @param tok Borrowed parsed token for js. NULL is invalid.
 * @param[out] out Destination. Written only on success.
 * @retval IVTS_OK The primitive is true or false.
 * @retval IVTS_ERR_INVALID_ARG Token or output is invalid, or the value is not a boolean literal.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
ivts_err_t ivts_json_get_bool(const char *js, const ivts_jtok_t *tok, bool *out);
