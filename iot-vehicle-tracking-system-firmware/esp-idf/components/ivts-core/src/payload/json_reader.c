#include "ivts_core/payload/json_reader.h"
#include <string.h>

static bool tok_eq(const char *js, const ivts_jtok_t *k, const char *s)
{
    size_t n = strlen(s);
    return k->type == IVTS_JT_STR && (size_t)(k->end - k->start) == n &&
           memcmp(js + k->start, s, n) == 0;
}

int ivts_json_find(const char *js, const ivts_jtok_t *t, int ntok, int obj, const char *key)
{
    if (obj < 0 || obj >= ntok || t[obj].type != IVTS_JT_OBJ) { return -1; }
    /* Con trực tiếp của obj xếp theo thứ tự key, value, key, value...
     * Token con sâu hơn có parent khác nên bị bỏ qua. */
    bool at_key = true;
    for (int i = obj + 1; i < ntok; i++) {
        if (t[i].parent != obj) { continue; }
        if (at_key && tok_eq(js, &t[i], key)) {
            for (int j = i + 1; j < ntok; j++) {
                if (t[j].parent == obj) { return j; }
            }
            return -1;
        }
        at_key = !at_key;
    }
    return -1;
}

ivts_err_t ivts_json_get_str(const char *js, const ivts_jtok_t *tok, char *out, size_t cap)
{
    if (tok == NULL || tok->type != IVTS_JT_STR || out == NULL || cap == 0u) {
        return IVTS_ERR_INVALID_ARG;
    }
    size_t o = 0;
    for (size_t i = tok->start; i < tok->end; i++) {
        char c = js[i];
        if (c == '\\') {
            char e = js[++i];
            switch (e) {
            case 'n': c = '\n'; break;
            case 'r': c = '\r'; break;
            case 't': c = '\t'; break;
            case 'b': c = '\b'; break;
            case 'f': c = '\f'; break;
            case 'u': {
                unsigned v = 0;
                for (int k = 0; k < 4; k++) {
                    char h = js[++i];
                    v = (v << 4) | (unsigned)(h <= '9' ? h - '0' : (h | 0x20) - 'a' + 10);
                }
                if (v == 0u || v > 0x7Fu) { out[0] = '\0'; return IVTS_ERR_INVALID_ARG; }
                c = (char)v;
                break;
            }
            default: c = e; break;                 /* \" \\ \/ */
            }
        }
        if (o + 1u >= cap) { out[o] = '\0'; return IVTS_ERR_FULL; }
        out[o++] = c;
    }
    out[o] = '\0';
    return IVTS_OK;
}

ivts_err_t ivts_json_get_u32(const char *js, const ivts_jtok_t *tok, uint32_t *out)
{
    if (tok == NULL || tok->type != IVTS_JT_PRIM || out == NULL || tok->end == tok->start) {
        return IVTS_ERR_INVALID_ARG;
    }
    uint64_t v = 0;
    for (size_t i = tok->start; i < tok->end; i++) {
        char c = js[i];
        if (c < '0' || c > '9') { return IVTS_ERR_INVALID_ARG; }   /* không âm, không thập phân */
        v = v * 10u + (uint64_t)(c - '0');
        if (v > UINT32_MAX) { return IVTS_ERR_INVALID_ARG; }
    }
    *out = (uint32_t)v;
    return IVTS_OK;
}

ivts_err_t ivts_json_get_bool(const char *js, const ivts_jtok_t *tok, bool *out)
{
    if (tok == NULL || tok->type != IVTS_JT_PRIM || out == NULL) { return IVTS_ERR_INVALID_ARG; }
    size_t n = (size_t)(tok->end - tok->start);
    if (n == 4 && memcmp(js + tok->start, "true", 4) == 0)  { *out = true;  return IVTS_OK; }
    if (n == 5 && memcmp(js + tok->start, "false", 5) == 0) { *out = false; return IVTS_OK; }
    return IVTS_ERR_INVALID_ARG;
}
