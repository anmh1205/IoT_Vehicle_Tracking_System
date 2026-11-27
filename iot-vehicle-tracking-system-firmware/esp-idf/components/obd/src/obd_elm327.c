/**
 * @file obd_elm327.c
 * @brief ELM327 ASCII response framing and conversion to OBD bytes.
 */
#include "obd_internal.h"
#include <ctype.h>
#include <string.h>

/* Reset the adapter before applying the remaining settings. */
const elm_init_step_t ELM_INIT_SEQ[] = {
    { "ATZ",   3000, true  },   /* Reset adapter. */
    { "ATE0",  1000, false },   /* Disable echo of ELM commands. */
    { "ATL0",  1000, false },   /* Suppress line feeds in ELM output. */
    { "ATS0",  1000, false },   /* Remove spaces between hexadecimal bytes. */
    { "ATH0",  1000, false },   /* Hide CAN headers. */
    { "ATSP0", 1000, false },   /* Let the ELM327 select the vehicle protocol automatically. */
};
const size_t ELM_INIT_SEQ_LEN = sizeof(ELM_INIT_SEQ) / sizeof(ELM_INIT_SEQ[0]);

void elm_rx_reset(elm_rx_t *r)
{
    memset(r, 0, sizeof(*r));
}

/* Ignore bytes arriving after the terminating prompt. */
bool elm_rx_feed(elm_rx_t *r, const uint8_t *data, size_t n)
{
    for (size_t i = 0; i < n && !r->complete; i++) {
        char c = (char)data[i];
        if (c == '\0') { continue; }              /* Ignore padding NUL bytes inserted by some adapters. */
        if (r->len + 1u < ELM_REPLY_MAX) {
            r->buf[r->len++] = c;
            r->buf[r->len] = '\0';
        } else {
            r->overflow = true;
        }
        if (c == '>') { r->complete = true; }
    }
    return r->complete;
}

/** @return true when @p text contains @p word, ignoring case. */
static bool contains_ci(const char *text, const char *word)
{
    size_t wl = strlen(word);
    for (const char *s = text; *s != '\0'; s++) {
        size_t i = 0;
        while (i < wl && s[i] != '\0' && toupper((unsigned char)s[i]) == toupper((unsigned char)word[i])) { i++; }
        if (i == wl) { return true; }
    }
    return false;
}

/** @return true if the response includes a line equal to "OK". */
static bool has_ok_line(const char *r)
{
    const char *line = r;
    while (*line != '\0') {
        while (*line == '\r' || *line == '\n' || *line == ' ' || *line == '\t') { line++; }
        if (toupper((unsigned char)line[0]) == 'O' && toupper((unsigned char)line[1]) == 'K') {
            const char *end = line + 2;
            while (*end == ' ' || *end == '\t') { end++; }
            if (*end == '\0' || *end == '\r' || *end == '\n' || *end == '>') { return true; }
        }
        while (*line != '\0' && *line != '\r' && *line != '\n' && *line != '>') { line++; }
        if (*line == '>') { break; }
    }
    return false;
}

bool elm_reply_valid(const char *reply, bool is_reset, bool is_at_command)
{
    if (reply == NULL || strchr(reply, '>') == NULL) { return false; }
    if (strchr(reply, '?') != NULL || contains_ci(reply, "ERROR") ||
        contains_ci(reply, "UNABLE TO CONNECT") || contains_ci(reply, "NO DATA") ||
        contains_ci(reply, "STOPPED") || contains_ci(reply, "CAN ERROR") ||
        contains_ci(reply, "BUS ERROR")) {
        return false;
    }
    if (is_reset) {
        return contains_ci(reply, "ELM327") || contains_ci(reply, "STN");
    }
    if (is_at_command) {
        return has_ok_line(reply);
    }
    for (const char *p = reply; *p != '\0'; p++) {
        if (!isspace((unsigned char)*p) && *p != '>') { return true; }
    }
    return false;
}

ivts_ecu_state_t elm_reply_ecu_state(const char *reply)
{
    if (reply == NULL) { return IVTS_ECU_UNKNOWN; }
    if (contains_ci(reply, "STOPPED")) { return IVTS_ECU_STOPPED; }
    if (contains_ci(reply, "NO DATA") || contains_ci(reply, "UNABLE TO CONNECT")) { return IVTS_ECU_NO_DATA; }
    if (elm_reply_valid(reply, false, false)) { return IVTS_ECU_LIVE; }
    return IVTS_ECU_UNKNOWN;
}

/** Return the value of a hexadecimal digit, or -1 for an invalid character. */
static int hexv(char c)
{
    if (c >= '0' && c <= '9') { return c - '0'; }
    c = (char)toupper((unsigned char)c);
    if (c >= 'A' && c <= 'F') { return c - 'A' + 10; }
    return -1;
}

/**
 * Decode the hex bytes in [s, e), skipping whitespace and an optional frame
 * index such as "0:".
 * @return Number of bytes written, or -1 for an invalid character.
 */
static int line_bytes(const char *s, const char *e, uint8_t *out, size_t cap)
{
    const char *colon = memchr(s, ':', (size_t)(e - s));
    if (colon != NULL) { s = colon + 1; }          /* "0: 41 00 ..." */
    int n = 0, hi = -1;
    for (; s < e; s++) {
        if (*s == ' ' || *s == '\t') { continue; }
        int v = hexv(*s);
        if (v < 0) { return -1; }
        if (hi < 0) { hi = v; continue; }
        if ((size_t)n < cap) { out[n] = (uint8_t)((hi << 4) | v); }
        n++;
        hi = -1;
    }
    return (hi >= 0) ? -1 : n;                     /* A single hexadecimal digit is not a data byte. */
}

ivts_err_t elm_extract_bytes(const char *reply, uint8_t mode, uint8_t *out, size_t cap, size_t *n)
{
    if (reply == NULL || out == NULL || n == NULL || cap == 0u || strchr(reply, '>') == NULL) {
        return IVTS_ERR_INVALID_ARG;
    }
    uint8_t want = (uint8_t)(mode + 0x40u);
    size_t got = 0;
    bool started = false;
    const char *s = reply;
    while (*s != '\0' && *s != '>') {
        const char *e = s;
        while (*e != '\0' && *e != '\r' && *e != '\n' && *e != '>') { e++; }
        uint8_t tmp[64];
        int k = (e > s) ? line_bytes(s, e, tmp, sizeof tmp) : -1;
        bool frame = (memchr(s, ':', (size_t)(e - s)) != NULL);
        if (k > 0 && (size_t)k <= sizeof tmp) {
            if (!started) {
                /* Find the first reply line with the response service byte, mode + 0x40. */
                for (int i = 0; i < k; i++) {
                    if (tmp[i] == want) {
                        started = true;
                        for (int j = i; j < k && got < cap; j++) { out[got++] = tmp[j]; }
                        break;
                    }
                }
            } else if (frame) {
                for (int j = 0; j < k && got < cap; j++) { out[got++] = tmp[j]; }   /* Skip the ISO-TP byte-count line. */
            } else {
                break;                                                             /* Ignore a second ECU reply in this field. */
            }
        }
        s = (*e == '\0' || *e == '>') ? e : e + 1;
    }
    *n = got;
    return started ? IVTS_OK : IVTS_ERR_NOT_FOUND;
}
