/**
 * @file json_fields.h
 * @brief Typed JSON field access for bounds-checked command and manifest reads.
 */
#pragma once
#include "ivts_core/payload/json_reader.h"

typedef struct {
    const char *text;
    const ivts_jtok_t *tokens;
    int count;
    int index;
} ivts_json_obj_t;

/* Read a field of a parsed object, returning true only for a value of the requested type. */
bool ivts_json_obj_get_str(const ivts_json_obj_t *object, const char *key, char *out, size_t cap);
bool ivts_json_obj_get_u64(const ivts_json_obj_t *object, const char *key, uint64_t limit, uint64_t *out);
bool ivts_json_obj_get_bool(const ivts_json_obj_t *object, const char *key, bool *out);
bool ivts_json_obj_has(const ivts_json_obj_t *object, const char *key);

/* Return whether the field exists. An invalid ID produces an empty string. */
bool ivts_json_obj_read_id(const ivts_json_obj_t *object, const char *key, char *out, size_t cap);
