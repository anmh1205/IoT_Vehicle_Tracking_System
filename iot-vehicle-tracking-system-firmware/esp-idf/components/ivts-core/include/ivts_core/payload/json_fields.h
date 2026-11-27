/**
 * @file include/ivts_core/payload/json_fields.h
 * @brief Typed JSON field access for bounds-checked command and manifest reads.
 *
 * App command and manifest handlers use these accessors after tokenization.
 * The view borrows the original JSON bytes and token array. Access is synchronous
 * and keeps no pointers. Command-specific validation remains with the handlers.
 */
#pragma once
#include "ivts_core/payload/json_reader.h"

/** @brief Borrowed view over a parsed JSON object. Keep both backing arrays valid while in use. */
typedef struct {
    const char *text;  /**< Original JSON bytes used to produce the tokens. */
    const ivts_jtok_t *tokens;  /**< Token array returned by tokenization. */
    int count;  /**< Number of populated tokens. */
    int index;  /**< Token index of the target object. */
} ivts_json_obj_t;

/**
 * @brief Read and decode a string member.
 * @param object Required parsed view borrowed for the call.
 * @param key Required NUL-terminated field name compared to the raw key bytes.
 * @param[out] out Destination. False can leave a truncated prefix or an empty string.
 * @param cap Destination capacity in bytes including NUL.
 * @retval true The string fits and decodes into out.
 * @retval false The key is absent, its value is unsuitable, or the output is NULL or too small.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
bool ivts_json_obj_get_str(const ivts_json_obj_t *object, const char *key, char *out, size_t cap);
/**
 * @brief Read a decimal integer from a member.
 *
 * The value may be a JSON integer or a string of raw ASCII digits. A string can contain leading zeroes.
 *
 * @param object Required parsed view borrowed for the call.
 * @param key Required NUL-terminated field name compared to the raw key bytes.
 * @param limit Inclusive maximum accepted value.
 * @param[out] out Required result. Written only on success.
 * @retval true The field contains digits and fits within limit.
 * @retval false The field is absent, has a different form, or exceeds limit.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
bool ivts_json_obj_get_u64(const ivts_json_obj_t *object, const char *key, uint64_t limit, uint64_t *out);
/**
 * @brief Read a boolean member.
 * @param object Required parsed view borrowed for the call.
 * @param key Required NUL-terminated field name compared to the raw key bytes.
 * @param[out] out Boolean result. Written only on success.
 * @retval true The field contains a boolean literal and out is writable.
 * @retval false The field is absent, has a different type, or out is NULL.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
bool ivts_json_obj_get_bool(const ivts_json_obj_t *object, const char *key, bool *out);
/**
 * @brief Check whether an object has a member by name.
 * @param object Required parsed view borrowed for the call.
 * @param key Required NUL-terminated field name compared to the raw key bytes.
 * @retval true A matching direct member exists.
 * @retval false No matching direct member exists or the view index does not identify an object.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
bool ivts_json_obj_has(const ivts_json_obj_t *object, const char *key);

/**
 * @brief Read an ID while distinguishing absence from an invalid value.
 *
 * A present ID can be a decoded string or a positive unsigned decimal primitive. An unusable
 * value produces an empty string when the output has capacity.
 *
 * @param object Required parsed view borrowed for the call.
 * @param key Required NUL-terminated field name compared to the raw key bytes.
 * @param[out] out Caller-owned destination, required if cap is positive. Unchanged for a missing field.
 * @param cap Capacity in bytes including NUL. Zero checks presence only.
 * @retval true The member exists, even if its value cannot be used as an ID.
 * @retval false The member is absent.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
bool ivts_json_obj_read_id(const ivts_json_obj_t *object, const char *key, char *out, size_t cap);
