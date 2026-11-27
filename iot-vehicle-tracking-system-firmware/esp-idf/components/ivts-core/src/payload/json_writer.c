/**
 * @file json_writer.c
 * @brief Bounded JSON output with escaping and explicit buffer exhaustion.
 */
#include "ivts_core/payload/json_writer.h"
#include <string.h>

static void put_c(ivts_jw_t *w, char c)
{
    if (w->full) { return; }
    if (w->len + 1u >= w->cap) {          /* Reserve one byte for the trailing NUL. */
        w->full = true;
        return;
    }
    w->buf[w->len++] = c;
    w->buf[w->len] = '\0';
}

static void put_s(ivts_jw_t *w, const char *s)
{
    while (*s != '\0') { put_c(w, *s++); }
}

static void put_escaped(ivts_jw_t *w, const char *s)
{
    static const char hex[] = "0123456789abcdef";
    put_c(w, '"');
    for (; *s != '\0'; s++) {
        unsigned char c = (unsigned char)*s;
        switch (c) {
        case '"':  put_s(w, "\\\""); break;
        case '\\': put_s(w, "\\\\"); break;
        case '\n': put_s(w, "\\n");  break;
        case '\r': put_s(w, "\\r");  break;
        case '\t': put_s(w, "\\t");  break;
        default:
            if (c < 0x20u) {            /* Escape another control byte as \u00XX. */
                put_s(w, "\\u00");
                put_c(w, hex[c >> 4]);
                put_c(w, hex[c & 0x0Fu]);
            } else {
                put_c(w, (char)c);      /* Copy UTF-8 bytes verbatim. */
            }
        }
    }
    put_c(w, '"');
}

static void put_u64(ivts_jw_t *w, uint64_t v)
{
    char tmp[20];                       /* UINT64_MAX has 20 digits. */
    size_t n = 0;
    do {
        tmp[n++] = (char)('0' + (int)(v % 10u));
        v /= 10u;
    } while (v != 0u);
    while (n > 0u) { put_c(w, tmp[--n]); }
}

/* Emit a separator and, for an object member, a key before the value. */
static void lead(ivts_jw_t *w, const char *key)
{
    uint8_t bit = (uint8_t)(1u << w->depth);
    if (w->need_comma & bit) {
        put_c(w, ',');
    }
    w->need_comma |= bit;
    if (key != NULL) {
        put_escaped(w, key);
        put_c(w, ':');
    }
}

void ivts_jw_init(ivts_jw_t *w, char *buf, size_t cap)
{
    memset(w, 0, sizeof(*w));
    w->buf = buf;
    w->cap = cap;
    if (buf == NULL || cap == 0u) {
        w->full = true;
    } else {
        buf[0] = '\0';
    }
}

static void open_(ivts_jw_t *w, const char *key, char c)
{
    if (w->depth + 1u >= IVTS_JW_MAX_DEPTH) { w->bad = true; return; }
    lead(w, key);
    put_c(w, c);
    w->depth++;
    w->need_comma &= (uint8_t)~(1u << w->depth);
}

static void close_(ivts_jw_t *w, char c)
{
    if (w->depth == 0u) { w->bad = true; return; }
    w->need_comma &= (uint8_t)~(1u << w->depth);
    w->depth--;
    put_c(w, c);
}

void ivts_jw_obj_begin(ivts_jw_t *w, const char *key) { open_(w, key, '{'); }
void ivts_jw_obj_end(ivts_jw_t *w)                    { close_(w, '}'); }
void ivts_jw_arr_begin(ivts_jw_t *w, const char *key) { open_(w, key, '['); }
void ivts_jw_arr_end(ivts_jw_t *w)                    { close_(w, ']'); }

void ivts_jw_str(ivts_jw_t *w, const char *key, const char *val)
{
    lead(w, key);
    if (val == NULL) { put_s(w, "null"); } else { put_escaped(w, val); }
}

void ivts_jw_uint(ivts_jw_t *w, const char *key, uint64_t v)
{
    lead(w, key);
    put_u64(w, v);
}

void ivts_jw_int(ivts_jw_t *w, const char *key, int64_t v)
{
    lead(w, key);
    if (v < 0) {
        put_c(w, '-');
        /* Use an unsigned magnitude to handle INT64_MIN without signed overflow. */
        put_u64(w, (uint64_t)0 - (uint64_t)v);
    } else {
        put_u64(w, (uint64_t)v);
    }
}

void ivts_jw_bool(ivts_jw_t *w, const char *key, bool v)
{
    lead(w, key);
    put_s(w, v ? "true" : "false");
}

void ivts_jw_null(ivts_jw_t *w, const char *key)
{
    lead(w, key);
    put_s(w, "null");
}

void ivts_jw_fixed(ivts_jw_t *w, const char *key, int64_t v, uint8_t decimals)
{
    if (decimals > 9u) { w->bad = true; return; }
    lead(w, key);
    uint64_t mag = (v < 0) ? ((uint64_t)0 - (uint64_t)v) : (uint64_t)v;
    uint64_t div = 1u;
    for (uint8_t i = 0; i < decimals; i++) { div *= 10u; }
    if (v < 0) { put_c(w, '-'); }          /* Preserve the minus sign when the integer part is zero, as in -0.5. */
    put_u64(w, mag / div);
    if (decimals > 0u) {
        put_c(w, '.');
        uint64_t frac = mag % div;
        for (uint64_t d = div / 10u; d > 0u; d /= 10u) {   /* Pad fractional digits with leading zeroes. */
            put_c(w, (char)('0' + (int)((frac / d) % 10u)));
        }
    }
}

ivts_err_t ivts_jw_finish(ivts_jw_t *w, size_t *len)
{
    if (w->full) { return IVTS_ERR_FULL; }
    if (w->bad || w->depth != 0u) { return IVTS_ERR_INVALID_STATE; }
    if (len != NULL) { *len = w->len; }
    return IVTS_OK;
}
