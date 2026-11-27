#include "ivts_core/payload/json_reader.h"
#include <string.h>

typedef enum {
    W_VALUE,            /* gốc, sau ':' , sau ',' trong mảng */
    W_VALUE_OR_CLOSE,   /* ngay sau '[' */
    W_KEY,              /* sau ',' trong object */
    W_KEY_OR_CLOSE,     /* ngay sau '{' */
    W_COMMA_OR_CLOSE,   /* sau một value */
    W_NOTHING           /* gốc đã xong: chỉ còn khoảng trắng */
} want_t;

typedef struct {
    const char  *js;
    size_t       len;
    size_t       pos;
    ivts_jtok_t *t;
    size_t       ntok;
    int          n;
    int          cur;       /* container đang mở, -1 = gốc */
    uint8_t      depth;
    uint8_t      max_depth;
    want_t       want;
} jp_t;

static int alloc_tok(jp_t *p, ivts_jtype_t type, size_t start, size_t end)
{
    if ((size_t)p->n >= p->ntok) { return -1; }
    ivts_jtok_t *k = &p->t[p->n];
    k->type = (uint8_t)type;
    k->start = (uint16_t)start;
    k->end = (uint16_t)end;
    k->size = 0;
    k->parent = (int16_t)p->cur;
    return p->n++;
}

static bool is_ws(char c) { return c == ' ' || c == '\t' || c == '\n' || c == '\r'; }
static bool want_value(const jp_t *p) { return p->want == W_VALUE || p->want == W_VALUE_OR_CLOSE; }

/* Một value vừa xong (hoặc container vừa đóng). */
static void value_done(jp_t *p)
{
    p->want = (p->cur < 0) ? W_NOTHING : W_COMMA_OR_CLOSE;
}

static int parse_string(jp_t *p)
{
    size_t start = ++p->pos;                     /* bỏ dấu " mở */
    for (; p->pos < p->len; p->pos++) {
        char c = p->js[p->pos];
        if (c == '"') {
            return alloc_tok(p, IVTS_JT_STR, start, p->pos) < 0 ? IVTS_ERR_FULL : IVTS_OK;
        }
        if ((unsigned char)c < 0x20u) { return IVTS_ERR_INVALID_ARG; }
        if (c == '\\') {
            if (++p->pos >= p->len) { return IVTS_ERR_INVALID_ARG; }
            char e = p->js[p->pos];
            if (e == 'u') {
                for (int i = 0; i < 4; i++) {
                    if (++p->pos >= p->len) { return IVTS_ERR_INVALID_ARG; }
                    char h = p->js[p->pos];
                    bool hex = (h >= '0' && h <= '9') || (h >= 'a' && h <= 'f') || (h >= 'A' && h <= 'F');
                    if (!hex) { return IVTS_ERR_INVALID_ARG; }
                }
            } else if (e == '\0' || strchr("\"\\/bfnrt", e) == NULL) {
                return IVTS_ERR_INVALID_ARG;
            }
        }
    }
    return IVTS_ERR_INVALID_ARG;                 /* hết input khi chuỗi chưa đóng */
}

static const char *scan_digits(const char *p, const char *end)
{
    while (p < end && *p >= '0' && *p <= '9') { p++; }
    return p;
}

static bool valid_number(const char *p, const char *end)
{
    if (p == end) { return false; }
    if (*p == '-') { p++; }
    if (p == end || *p < '0' || *p > '9') { return false; }
    p = *p == '0' ? p + 1 : scan_digits(p, end);
    if (p < end && *p == '.') {
        const char *start = ++p;
        p = scan_digits(p, end);
        if (p == start) { return false; }
    }
    if (p < end && (*p == 'e' || *p == 'E')) {
        p++;
        if (p < end && (*p == '+' || *p == '-')) { p++; }
        const char *start = p;
        p = scan_digits(p, end);
        if (p == start) { return false; }
    }
    return p == end;
}

static int parse_prim(jp_t *p)
{
    size_t start = p->pos;
    for (; p->pos < p->len; p->pos++) {
        char c = p->js[p->pos];
        if (c == ',' || c == '}' || c == ']' || is_ws(c)) { break; }
        bool ok = (c >= '0' && c <= '9') || c == '-' || c == '+' || c == '.' || (c >= 'a' && c <= 'z') || c == 'E';
        if (!ok) { return IVTS_ERR_INVALID_ARG; }
    }
    size_t n = p->pos - start;
    const char *s = p->js + start;
    bool lit = (n == 4 && memcmp(s, "true", 4) == 0) || (n == 5 && memcmp(s, "false", 5) == 0) ||
               (n == 4 && memcmp(s, "null", 4) == 0);
    if (!lit && !valid_number(s, s + n)) { return IVTS_ERR_INVALID_ARG; }
    p->pos--;                                    /* vòng ngoài sẽ ++ */
    return alloc_tok(p, IVTS_JT_PRIM, start, start + n) < 0 ? IVTS_ERR_FULL : IVTS_OK;
}

int ivts_json_parse(const char *js, size_t len, ivts_jtok_t *t, size_t ntok, uint8_t max_depth)
{
    if (js == NULL || t == NULL || ntok == 0u || len > IVTS_JSON_MAX_LEN) {
        return -IVTS_ERR_INVALID_ARG;
    }
    jp_t p = { js, len, 0, t, ntok, 0, -1, 0, max_depth, W_VALUE };

    for (; p.pos < len; p.pos++) {
        char c = js[p.pos];
        if (is_ws(c)) { continue; }
        if (p.want == W_NOTHING) { return -IVTS_ERR_INVALID_ARG; }      /* rác sau gốc */

        switch (c) {
        case '{': case '[': {
            if (!want_value(&p)) { return -IVTS_ERR_INVALID_ARG; }
            if (p.depth >= p.max_depth) { return -IVTS_ERR_INVALID_ARG; }
            if (p.cur >= 0 && t[p.cur].type == IVTS_JT_ARR) { p.t[p.cur].size++; }
            int i = alloc_tok(&p, c == '{' ? IVTS_JT_OBJ : IVTS_JT_ARR, p.pos, 0);
            if (i < 0) { return -IVTS_ERR_FULL; }
            p.depth++;
            p.cur = i;
            p.want = (c == '{') ? W_KEY_OR_CLOSE : W_VALUE_OR_CLOSE;
            break;
        }
        case '}': case ']': {
            if (p.cur < 0) { return -IVTS_ERR_INVALID_ARG; }
            ivts_jtok_t *k = &t[p.cur];
            bool obj = (k->type == IVTS_JT_OBJ);
            if ((c == '}') != obj) { return -IVTS_ERR_INVALID_ARG; }
            want_t ok_open = obj ? W_KEY_OR_CLOSE : W_VALUE_OR_CLOSE;
            if (p.want != ok_open && p.want != W_COMMA_OR_CLOSE) { return -IVTS_ERR_INVALID_ARG; }
            k->end = (uint16_t)(p.pos + 1u);
            p.depth--;
            p.cur = k->parent;
            value_done(&p);
            break;
        }
        case '"': {
            bool is_key = (p.want == W_KEY || p.want == W_KEY_OR_CLOSE);
            if (!is_key && !want_value(&p)) { return -IVTS_ERR_INVALID_ARG; }
            int r = parse_string(&p);
            if (r != IVTS_OK) { return -r; }
            if (is_key) {
                p.t[p.cur].size++;                     /* object đếm theo cặp: đếm ở key */
                size_t q = p.pos + 1u;
                while (q < len && is_ws(js[q])) { q++; }
                if (q >= len || js[q] != ':') { return -IVTS_ERR_INVALID_ARG; }
                p.pos = q;
                p.want = W_VALUE;
            } else {
                if (p.cur >= 0 && t[p.cur].type == IVTS_JT_ARR) { p.t[p.cur].size++; }
                value_done(&p);
            }
            break;
        }
        case ',':
            if (p.want != W_COMMA_OR_CLOSE) { return -IVTS_ERR_INVALID_ARG; }
            p.want = (t[p.cur].type == IVTS_JT_OBJ) ? W_KEY : W_VALUE;
            break;
        default: {
            if (!want_value(&p)) { return -IVTS_ERR_INVALID_ARG; }
            int r = parse_prim(&p);
            if (r != IVTS_OK) { return -r; }
            if (p.cur >= 0 && t[p.cur].type == IVTS_JT_ARR) { p.t[p.cur].size++; }
            value_done(&p);
            break;
        }
        }
    }
    if (p.want != W_NOTHING) { return -IVTS_ERR_INVALID_ARG; }          /* rỗng / chưa đóng hết */
    return p.n;
}

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
