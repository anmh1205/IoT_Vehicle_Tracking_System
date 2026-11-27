#include "ivts_core/payload/json_reader.h"
#include <string.h>

typedef enum {
    JSON_EXPECT_VALUE,            /* gốc, sau ':' , sau ',' trong mảng */
    JSON_EXPECT_VALUE_OR_CLOSE,   /* ngay sau '[' */
    JSON_EXPECT_KEY,              /* sau ',' trong object */
    JSON_EXPECT_KEY_OR_CLOSE,     /* ngay sau '{' */
    JSON_EXPECT_COMMA_OR_CLOSE,   /* sau một value */
    JSON_EXPECT_NOTHING           /* gốc đã xong: chỉ còn khoảng trắng */
} json_expect_t;

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
    json_expect_t       want;
} json_parser_t;

static int alloc_tok(json_parser_t *p, ivts_jtype_t type, size_t start, size_t end)
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
static bool want_value(const json_parser_t *p) { return p->want == JSON_EXPECT_VALUE || p->want == JSON_EXPECT_VALUE_OR_CLOSE; }

/* Một value vừa xong (hoặc container vừa đóng). */
static void value_done(json_parser_t *p)
{
    p->want = (p->cur < 0) ? JSON_EXPECT_NOTHING : JSON_EXPECT_COMMA_OR_CLOSE;
}

static ivts_err_t parse_string(json_parser_t *p)
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

static ivts_err_t parse_prim(json_parser_t *p)
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

static void count_array_item(json_parser_t *parser)
{
    if (parser->cur >= 0 && parser->t[parser->cur].type == IVTS_JT_ARR) {
        parser->t[parser->cur].size++;
    }
}

static ivts_err_t on_open(json_parser_t *parser, char character)
{
    if (!want_value(parser) || parser->depth >= parser->max_depth) { return IVTS_ERR_INVALID_ARG; }
    count_array_item(parser);

    bool is_object = character == '{';
    int token = alloc_tok(parser, is_object ? IVTS_JT_OBJ : IVTS_JT_ARR, parser->pos, 0);
    if (token < 0) { return IVTS_ERR_FULL; }

    parser->depth++;
    parser->cur = token;
    parser->want = is_object ? JSON_EXPECT_KEY_OR_CLOSE : JSON_EXPECT_VALUE_OR_CLOSE;
    return IVTS_OK;
}

static ivts_err_t on_close(json_parser_t *parser, char character)
{
    if (parser->cur < 0) { return IVTS_ERR_INVALID_ARG; }
    ivts_jtok_t *token = &parser->t[parser->cur];
    bool is_object = token->type == IVTS_JT_OBJ;
    if ((character == '}') != is_object) { return IVTS_ERR_INVALID_ARG; }
    json_expect_t empty_container = is_object ? JSON_EXPECT_KEY_OR_CLOSE : JSON_EXPECT_VALUE_OR_CLOSE;
    if (parser->want != empty_container && parser->want != JSON_EXPECT_COMMA_OR_CLOSE) { return IVTS_ERR_INVALID_ARG; }

    token->end = (uint16_t)(parser->pos + 1u);
    parser->depth--;
    parser->cur = token->parent;
    value_done(parser);
    return IVTS_OK;
}

static ivts_err_t expect_colon(json_parser_t *parser)
{
    size_t colon = parser->pos + 1u;
    while (colon < parser->len && is_ws(parser->js[colon])) { colon++; }
    if (colon >= parser->len || parser->js[colon] != ':') { return IVTS_ERR_INVALID_ARG; }
    parser->pos = colon;
    parser->want = JSON_EXPECT_VALUE;
    return IVTS_OK;
}

static ivts_err_t on_string(json_parser_t *parser)
{
    bool is_key = parser->want == JSON_EXPECT_KEY || parser->want == JSON_EXPECT_KEY_OR_CLOSE;
    if (!is_key && !want_value(parser)) { return IVTS_ERR_INVALID_ARG; }
    ivts_err_t error = parse_string(parser);
    if (error != IVTS_OK) { return error; }
    if (is_key) {
        parser->t[parser->cur].size++; /* Objects count their key-value pairs. */
        return expect_colon(parser);
    }
    count_array_item(parser);
    value_done(parser);
    return IVTS_OK;
}

static ivts_err_t on_comma(json_parser_t *parser)
{
    if (parser->want != JSON_EXPECT_COMMA_OR_CLOSE) { return IVTS_ERR_INVALID_ARG; }
    parser->want = parser->t[parser->cur].type == IVTS_JT_OBJ ? JSON_EXPECT_KEY : JSON_EXPECT_VALUE;
    return IVTS_OK;
}

static ivts_err_t on_primitive(json_parser_t *parser)
{
    if (!want_value(parser)) { return IVTS_ERR_INVALID_ARG; }
    ivts_err_t error = parse_prim(parser);
    if (error != IVTS_OK) { return error; }
    count_array_item(parser);
    value_done(parser);
    return IVTS_OK;
}

int ivts_json_parse(const char *js, size_t len, ivts_jtok_t *tokens, size_t ntok, uint8_t max_depth)
{
    if (js == NULL || tokens == NULL || ntok == 0u || len > IVTS_JSON_MAX_LEN) {
        return -IVTS_ERR_INVALID_ARG;
    }
    json_parser_t parser = { js, len, 0, tokens, ntok, 0, -1, 0, max_depth, JSON_EXPECT_VALUE };
    for (; parser.pos < len; parser.pos++) {
        char character = js[parser.pos];
        if (is_ws(character)) { continue; }
        if (parser.want == JSON_EXPECT_NOTHING) { return -IVTS_ERR_INVALID_ARG; }

        ivts_err_t error;
        switch (character) {
        case '{': case '[': error = on_open(&parser, character); break;
        case '}': case ']': error = on_close(&parser, character); break;
        case '"': error = on_string(&parser); break;
        case ',': error = on_comma(&parser); break;
        default: error = on_primitive(&parser); break;
        }
        if (error != IVTS_OK) { return -(int)error; }
    }
    return parser.want == JSON_EXPECT_NOTHING ? parser.n : -IVTS_ERR_INVALID_ARG;
}
