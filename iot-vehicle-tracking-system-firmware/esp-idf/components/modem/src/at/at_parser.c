/**
 * @file at_parser.c
 * @brief Incremental UART framing for response lines, prompts and raw bytes.
 *
 * Caller-owned parser state survives reads that split lines or data blocks. No
 * reads or writes are issued by the parser itself.
 */
#include "at/at.h"
#include <string.h>

/*
 * Known URC prefixes. Late +CMQTTPUB and +CMQTTCONNECT responses remain
 * associated with the active command through final_prefix.
 */
static const char *const k_urc[] = {
    "+CMQTTRXSTART:", "+CMQTTRXTOPIC:", "+CMQTTRXPAYLOAD:", "+CMQTTRXEND:",
    "+CMQTTCONNLOST:", "+CMQTTNONET", "+CGEV:", "+CPIN:", "RDY", "SMS DONE",
    "PB DONE", "+HTTPACTION:", "NO CARRIER",
};

void at_parser_init(at_parser_t *p)
{
    memset(p, 0, sizeof(*p));
}

void at_parser_expect_raw(at_parser_t *p, size_t n)
{
    p->raw_left = n;
    p->len = 0;
    p->unit_done = false;
}

at_unit_t at_parser_feed(at_parser_t *p, uint8_t b)
{
    /* The caller consumed the prior unit. Reuse the buffer for the next one. */
    if (p->unit_done) {
        p->unit_done = false;
        p->len = 0;
    }
    /*
     * A trailing LF belongs to its CR-terminated header even if dispatch
     * entered raw mode after processing the header.
     */
    if (p->skip_lf) {
        p->skip_lf = false;
        if (b == '\n') { return AT_UNIT_NONE; }
    }
    if (p->skip_prompt_space) {
        p->skip_prompt_space = false;
        if (b == ' ') { return AT_UNIT_NONE; }
    }
    if (p->raw_left > 0u) {
        p->buf[p->len++] = (char)b;
        p->raw_left--;
        if (p->raw_left == 0u || p->len == AT_LINE_MAX) {
            p->unit_done = true;
            return AT_UNIT_DATA;               /* The caller reads buf and len before the next feed. */
        }
        return AT_UNIT_NONE;
    }

    if (b == '\r' || b == '\n') {
        if (p->overflow) {
            p->len = 0;
            p->overflow = false;
            p->skip_lf = (b == '\r');
            return AT_UNIT_NONE;
        }
        if (p->len == 0u) {
            return AT_UNIT_NONE;               /* Ignore an empty CR or LF line. */
        }
        p->buf[p->len] = '\0';
        p->skip_lf = (b == '\r');
        p->unit_done = true;
        return AT_UNIT_LINE;
    }
    if (b == '>' && p->len == 0u && !p->overflow) {
        p->skip_prompt_space = true;
        return AT_UNIT_PROMPT;                 /* The data prompt is not followed by CRLF. */
    }
    if (b != '\0' && p->len + 1u < AT_LINE_MAX && !p->overflow) {
        p->buf[p->len++] = (char)b;
    } else {
        p->overflow = true;
    }
    return AT_UNIT_NONE;
}

bool at_has_prefix(const char *line, const char *prefix)
{
    return strncmp(line, prefix, strlen(prefix)) == 0;
}

at_line_kind_t at_classify(const char *line)
{
    if (strcmp(line, "OK") == 0) { return AT_LINE_OK; }
    if (strcmp(line, "ERROR") == 0 || at_has_prefix(line, "+CME ERROR:") ||
        at_has_prefix(line, "+CMS ERROR:")) {
        return AT_LINE_ERROR;
    }
    for (size_t i = 0; i < sizeof(k_urc) / sizeof(k_urc[0]); i++) {
        if (at_has_prefix(line, k_urc[i])) { return AT_LINE_URC; }
    }
    return AT_LINE_INFO;
}

bool at_field_int(const char *line, unsigned idx, int32_t *out)
{
    const char *s = strchr(line, ':');
    if (s == NULL) { return false; }
    s++;
    for (unsigned i = 0; i < idx; i++) {
        s = strchr(s, ',');
        if (s == NULL) { return false; }
        s++;
    }
    while (*s == ' ') { s++; }
    bool neg = (*s == '-');
    if (neg) { s++; }
    if (*s < '0' || *s > '9') { return false; }
    int64_t v = 0;
    while (*s >= '0' && *s <= '9') {
        v = v * 10 + (*s++ - '0');
        if (v > (int64_t)INT32_MAX + (neg ? 1 : 0)) { return false; }
    }
    while (*s == ' ') { s++; }
    if (*s != '\0' && *s != ',') { return false; }
    *out = (int32_t)(neg ? -v : v);
    return true;
}
