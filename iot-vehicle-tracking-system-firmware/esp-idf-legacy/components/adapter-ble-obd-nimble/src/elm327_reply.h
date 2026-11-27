#pragma once

#include <stdbool.h>
#include <ctype.h>
#include <string.h>

/* Transport-neutral validation of a completed (prompt-terminated) ELM327 reply.
 * Notification fragments must be combined before invoking this parser. */
static inline bool elm327_contains_ci(const char *text, const char *word) {
    if (text == NULL || word == NULL || *word == '\0') return false;
    for (const char *start = text; *start != '\0'; ++start) {
        const char *t = start;
        const char *w = word;
        while (*t != '\0' && *w != '\0' &&
               toupper((unsigned char)*t) == toupper((unsigned char)*w)) {
            ++t;
            ++w;
        }
        if (*w == '\0') return true;
    }
    return false;
}

static inline bool elm327_has_ok_line(const char *response) {
    if (response == NULL) return false;
    const char *line = response;
    while (*line != '\0') {
        while (*line == '\r' || *line == '\n' || *line == ' ' || *line == '\t') ++line;
        if (toupper((unsigned char)line[0]) == 'O' &&
            toupper((unsigned char)line[1]) == 'K' &&
            (line[2] == '\0' || line[2] == '\r' || line[2] == '\n' ||
             line[2] == ' ' || line[2] == '\t' || line[2] == '>')) {
            return true;
        }
        while (*line != '\0' && *line != '\r' && *line != '\n' && *line != '>') ++line;
        if (*line == '>') break;
    }
    return false;
}

static inline bool elm327_reply_valid(
    const char *response, bool is_reset, bool is_at_command
) {
    if (response == NULL || strchr(response, '>') == NULL) return false;
    if (strchr(response, '?') != NULL ||
        elm327_contains_ci(response, "ERROR") ||
        elm327_contains_ci(response, "UNABLE TO CONNECT") ||
        elm327_contains_ci(response, "NO DATA") ||
        elm327_contains_ci(response, "STOPPED") ||
        elm327_contains_ci(response, "CAN ERROR") ||
        elm327_contains_ci(response, "BUS ERROR")) {
        return false;
    }
    if (is_reset) {
        return elm327_contains_ci(response, "ELM327") ||
               elm327_contains_ci(response, "STN");
    }
    if (is_at_command) return elm327_has_ok_line(response);

    /* Generic raw commands can return data instead of an AT acknowledgement. */
    for (const char *p = response; *p != '\0'; ++p) {
        if (!isspace((unsigned char)*p) && *p != '>') return true;
    }
    return false;
}
