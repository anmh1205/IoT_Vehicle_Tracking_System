/**
 * @file src/services/gnss.c
 * @brief Periodic SIM7600 GNSS reads and parsing into integer fix fields.
 *
 * The modem task applies queued GNSS demand and polls when due. Link recovery can clear its cached
 * power state. Parsed fixes and no-fix reports cross into the app as by-value events.
 * The app selects the position source. The parser helpers use caller buffers and also run on the host.
 */
#include "modem_internal.h"
#include "services/services.h"
#include "at/at.h"
#include "platform/log.h"
#include <string.h>
#include "ivts_core/base/civil.h"

/* Startup clears these fields. The modem task alone records demand, power state and poll timing. */
static bool s_gnss_requested;
static bool s_gnss_on;
static uint64_t s_next_fix_at_ms;

void modem_gnss_init(void)
{
    s_gnss_requested = false;
    s_gnss_on = false;
    s_next_fix_at_ms = 0;
}

void modem_gnss_request(bool enabled) { s_gnss_requested = enabled; }
void modem_gnss_reset_power(void) { s_gnss_on = false; }

void modem_gnss_step(void)
{
    if (s_gnss_requested != s_gnss_on) {
        bool previous = s_gnss_on;
        at_result_t r = modem_at_simple(s_gnss_requested ? "AT+CGPS=1,1" : "AT+CGPS=0", 5000);
        if (r != AT_RES_OK) {
            at_cmd_t q = { .text = "AT+CGPS?", .capture = "+CGPS:", .timeout_ms = 2000 };
            int32_t on = 0;
            if (modem_at(&q) == AT_RES_OK && at_field_int(modem_at_response(), 0, &on)) {
                s_gnss_on = (on == 1);
            }
        } else {
            s_gnss_on = s_gnss_requested;
        }
        if (s_gnss_on != previous) {
            IVTS_LOGI(MODEM_TAG, "gnss power=%s requested=%s", s_gnss_on ? "on" : "off",
                      s_gnss_requested ? "on" : "off");
        }
        s_next_fix_at_ms = modem_now() + 1000;
        return;
    }
    if (!s_gnss_on || modem_now() < s_next_fix_at_ms) { return; }
    s_next_fix_at_ms = modem_now() + (uint64_t)modem_config()->gnss_period_s * 1000u;

    ivts_gnss_t g;
    at_cmd_t c = { .text = "AT+CGNSSINFO", .capture = "+CGNSSINFO:", .timeout_ms = 2000 };
    bool ok = modem_at(&c) == AT_RES_OK && gnss_parse_cgnssinfo(modem_at_response(), &g) == IVTS_OK;
    if (!ok) {
        at_cmd_t c2 = { .text = "AT+CGPSINFO", .capture = "+CGPSINFO:", .timeout_ms = 2000 };
        ok = modem_at(&c2) == AT_RES_OK && gnss_parse_cgpsinfo(modem_at_response(), &g) == IVTS_OK;
    }
    if (!ok) {
        IVTS_LOGD(MODEM_TAG, "gnss read result=fail");
        return;
    }
    IVTS_LOGD(MODEM_TAG, "gnss read fix=%s sats=%u speed=%u.%ukm/h", IVTS_LOG_YES(g.fix_valid), g.sats,
              (unsigned)(g.speed_cm_s * 36u / 1000u), (unsigned)(g.speed_cm_s * 36u / 100u % 10u));
    ivts_event_t ev = { .type = IVTS_EV_GNSS_FIX, .ts_ms = modem_now() };
    ev.u.gnss = g;
    modem_emit(&ev);
}

#define MAX_FIELDS 20u   /**< Maximum number of CSV field pointers stored by the parser. */

/** @brief Split writable CSV in place. Adjacent delimiters produce empty fields. */
static unsigned split(char *s, char *f[], unsigned max)
{
    unsigned n = 0;
    f[n++] = s;
    for (; *s != '\0' && n < max; s++) {
        if (*s == ',') {
            *s = '\0';
            f[n++] = s + 1;
        }
    }
    return n;
}

/** @brief Convert an unsigned decimal to fixed point, truncating extra fractional digits.
 * The integer-part bound keeps current callers' scaled results within uint64_t. */
static ivts_err_t parse_fixed(const char *s, unsigned scale, uint64_t *out)
{
    uint64_t ip = 0, fp = 0;
    unsigned fd = 0;
    if (*s < '0' || *s > '9') { return IVTS_ERR_INVALID_ARG; }
    while (*s >= '0' && *s <= '9') {
        ip = ip * 10u + (uint64_t)(*s++ - '0');
        if (ip > 100000000u) { return IVTS_ERR_INVALID_ARG; }
    }
    if (*s == '.') {
        s++;
        while (*s >= '0' && *s <= '9') {
            if (fd < scale) { fp = fp * 10u + (uint64_t)(*s - '0'); fd++; }
            s++;
        }
    }
    if (*s != '\0') { return IVTS_ERR_INVALID_ARG; }
    while (fd < scale) { fp *= 10u; fd++; }
    uint64_t mul = 1;
    for (unsigned i = 0; i < scale; i++) { mul *= 10u; }
    *out = ip * mul + fp;
    return IVTS_OK;
}

ivts_err_t gnss_nmea_to_e7(const char *ddmm, char hemi, int32_t *out)
{
    uint64_t v;                                    /* NMEA degrees and minutes scaled by 10^6. */
    if (ddmm == NULL || out == NULL || parse_fixed(ddmm, 6, &v) != IVTS_OK) {
        return IVTS_ERR_INVALID_ARG;
    }
    uint64_t deg = v / 100000000u;                 /* Degree component from the leading two or three digits. */
    uint64_t min_u = v % 100000000u;               /* Minute component scaled by 10^6. */
    if (min_u >= 60000000u) { return IVTS_ERR_INVALID_ARG; }
    /* Convert scaled minutes to degrees times 10^7, rounding to the nearest integer. */
    uint64_t e7 = deg * 10000000u + (min_u * 10u + 30u) / 60u;
    bool lat = (hemi == 'N' || hemi == 'S');
    if (!lat && hemi != 'E' && hemi != 'W') { return IVTS_ERR_INVALID_ARG; }
    if (e7 > (lat ? 900000000u : 1800000000u)) { return IVTS_ERR_INVALID_ARG; }
    *out = (hemi == 'S' || hemi == 'W') ? -(int32_t)e7 : (int32_t)e7;
    return IVTS_OK;
}

/** @brief Decode two decimal digits validated by the caller. */
static int two(const char *s) { return (s[0] - '0') * 10 + (s[1] - '0'); }

/** @brief Check the first @p n characters for decimal digits after the caller checks the length. */
static bool digits(const char *s, size_t n)
{
    for (size_t i = 0; i < n; i++) { if (s[i] < '0' || s[i] > '9') { return false; } }
    return true;
}

ivts_err_t gnss_datetime_to_unix_ms(const char *ddmmyy, const char *hhmmss, uint64_t *out)
{
    if (ddmmyy == NULL || hhmmss == NULL || out == NULL || strlen(ddmmyy) != 6u ||
        strlen(hhmmss) < 6u || !digits(ddmmyy, 6) || !digits(hhmmss, 6)) {
        return IVTS_ERR_INVALID_ARG;
    }
    ivts_civil_t c = {
        .year = (uint16_t)(2000 + two(ddmmyy + 4)), .month = (uint8_t)two(ddmmyy + 2),
        .day = (uint8_t)two(ddmmyy), .hour = (uint8_t)two(hhmmss), .min = (uint8_t)two(hhmmss + 2),
        .sec = (uint8_t)two(hhmmss + 4), .ms = 0,
    };
    if (hhmmss[6] == '.') {                        /* Use up to three fractional digits. */
        unsigned mul = 100, ms = 0;
        for (const char *p = hhmmss + 7; *p >= '0' && *p <= '9' && mul > 0u; p++, mul /= 10u) {
            ms += (unsigned)(*p - '0') * mul;
        }
        c.ms = (uint16_t)ms;
    }
    return ivts_civil_to_unix_ms(&c, out);
}

/** @brief Decode the shared coordinate, UTC, speed and course fields.
 * The record includes an altitude column that this parser skips. Optional values can stay zero. */
static ivts_err_t fill_common(char *f[], unsigned i, unsigned n, ivts_gnss_t *g)
{
    if (i + 9u > n) { return IVTS_ERR_INVALID_ARG; }
    if (gnss_nmea_to_e7(f[i], f[i + 1][0], &g->lat_e7) != IVTS_OK ||
        gnss_nmea_to_e7(f[i + 2], f[i + 3][0], &g->lon_e7) != IVTS_OK) {
        return IVTS_ERR_INVALID_ARG;
    }
    if (f[i + 1][0] != 'N' && f[i + 1][0] != 'S') { return IVTS_ERR_INVALID_ARG; }
    if (f[i + 3][0] != 'E' && f[i + 3][0] != 'W') { return IVTS_ERR_INVALID_ARG; }
    uint64_t ts = 0;
    if (gnss_datetime_to_unix_ms(f[i + 4], f[i + 5], &ts) == IVTS_OK) {
        g->ts_unix_ms = ts;
    }
    uint64_t v;
    if (f[i + 7][0] != '\0' && parse_fixed(f[i + 7], 3, &v) == IVTS_OK) {
        /* Convert milliknots to cm/s using 514444 / 10^7. */
        uint64_t cms = (v * 514444u + 5000000u) / 10000000u;
        g->speed_cm_s = (cms > UINT16_MAX) ? UINT16_MAX : (uint16_t)cms;
    }
    if (f[i + 8][0] != '\0' && parse_fixed(f[i + 8], 1, &v) == IVTS_OK && v < 3600u) {
        g->course_deg_x10 = (uint16_t)v;
    }
    g->fix_valid = true;
    return IVTS_OK;
}

/** @brief Validate framing and split a writable copy so the AT response remains intact. */
static ivts_err_t prepare(const char *line, const char *prefix, char *buf, size_t cap,
                          char *f[], unsigned *n, ivts_gnss_t *out)
{
    if (line == NULL || out == NULL) { return IVTS_ERR_INVALID_ARG; }
    size_t pl = strlen(prefix);
    if (strncmp(line, prefix, pl) != 0) { return IVTS_ERR_INVALID_ARG; }
    const char *s = line + pl;
    while (*s == ' ') { s++; }
    if (strlen(s) >= cap) { return IVTS_ERR_INVALID_ARG; }
    strcpy(buf, s);
    memset(out, 0, sizeof(*out));
    *n = split(buf, f, MAX_FIELDS);
    return IVTS_OK;
}

ivts_err_t gnss_parse_cgnssinfo(const char *line, ivts_gnss_t *out)
{
    char buf[160];
    char *f[MAX_FIELDS];
    unsigned n;
    ivts_err_t e = prepare(line, "+CGNSSINFO:", buf, sizeof buf, f, &n, out);
    if (e != IVTS_OK) { return e; }
    out->src = IVTS_GNSS_SRC_FULL;
    if (f[0][0] == '\0') { return IVTS_OK; }           /* The module reported no fix. */

    /*
     * Locate latitude using the N/S and E/W markers. Some SIM7600 firmware
     * includes additional satellite constellation fields before the
     * coordinates.
     */
    unsigned lat = 0;
    for (unsigned i = 1; i + 3u < n; i++) {
        char h1 = f[i + 1][0], h2 = f[i + 3][0];
        if ((h1 == 'N' || h1 == 'S') && f[i + 1][1] == '\0' && (h2 == 'E' || h2 == 'W') && f[i + 3][1] == '\0') {
            lat = i;
            break;
        }
    }
    if (lat < 2u) { return IVTS_ERR_INVALID_ARG; }
    unsigned sats = 0;
    /* Satellite counts start after the mode and end before latitude. */
    for (unsigned i = 1; i < lat; i++) {
        uint64_t v;
        if (f[i][0] != '\0' && parse_fixed(f[i], 0, &v) == IVTS_OK) { sats += (unsigned)v; }
    }
    out->sats = (uint8_t)(sats > 255u ? 255u : sats);
    return fill_common(f, lat, n, out);
}

ivts_err_t gnss_parse_cgpsinfo(const char *line, ivts_gnss_t *out)
{
    char buf[160];
    char *f[MAX_FIELDS];
    unsigned n;
    ivts_err_t e = prepare(line, "+CGPSINFO:", buf, sizeof buf, f, &n, out);
    if (e != IVTS_OK) { return e; }
    out->src = IVTS_GNSS_SRC_APPROX;                   /* This fallback format reports no satellite count. */
    if (f[0][0] == '\0') { return IVTS_OK; }
    return fill_common(f, 0, n, out);
}
