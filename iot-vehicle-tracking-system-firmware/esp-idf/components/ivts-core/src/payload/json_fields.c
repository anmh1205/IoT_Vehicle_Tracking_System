/**
 * @file json_fields.c
 * @brief Typed object-field validation on tokenized JSON input.
 */
#include "ivts_core/payload/json_fields.h"
#include <string.h>

static int field_index(const ivts_json_obj_t *object, const char *key)
{
    return ivts_json_find(object->text, object->tokens, object->count, object->index, key);
}

bool ivts_json_obj_has(const ivts_json_obj_t *object, const char *key)
{
    return field_index(object, key) >= 0;
}

bool ivts_json_obj_get_str(const ivts_json_obj_t *object, const char *key, char *out, size_t cap)
{
    int i = field_index(object, key);
    return i >= 0 && ivts_json_get_str(object->text, &object->tokens[i], out, cap) == IVTS_OK;
}

bool ivts_json_obj_get_u64(const ivts_json_obj_t *object, const char *key, uint64_t limit, uint64_t *out)
{
    int i = field_index(object, key);
    if (i < 0 || (object->tokens[i].type != IVTS_JT_PRIM && object->tokens[i].type != IVTS_JT_STR) ||
        object->tokens[i].start == object->tokens[i].end) { return false; }
    uint64_t value = 0u;
    for (size_t pos = object->tokens[i].start; pos < object->tokens[i].end; pos++) {
        char c = object->text[pos];
        if (c < '0' || c > '9') { return false; }
        uint64_t digit = (uint64_t)(c - '0');
        if (digit > limit || value > (limit - digit) / 10u) { return false; }
        value = value * 10u + digit;
    }
    *out = value;
    return true;
}

bool ivts_json_obj_get_bool(const ivts_json_obj_t *object, const char *key, bool *out)
{
    int i = field_index(object, key);
    return i >= 0 && ivts_json_get_bool(object->text, &object->tokens[i], out) == IVTS_OK;
}

bool ivts_json_obj_read_id(const ivts_json_obj_t *object, const char *key, char *out, size_t cap)
{
    int index = field_index(object, key);
    if (index < 0) { return false; }
    if (cap == 0u) { return true; }
    out[0] = '\0';

    const ivts_jtok_t *token = &object->tokens[index];
    if (token->type == IVTS_JT_STR) {
        if (ivts_json_get_str(object->text, token, out, cap) != IVTS_OK) { out[0] = '\0'; }
    } else if (token->type == IVTS_JT_PRIM) {
        size_t len = (size_t)(token->end - token->start);
        const char *raw = &object->text[token->start];
        if (len == 0u || len >= cap || raw[0] == '0') { return true; }
        for (size_t i = 0; i < len; i++) {
            if (raw[i] < '0' || raw[i] > '9') { return true; }
        }
        memcpy(out, raw, len);
        out[len] = '\0';
    }
    return true;
}
