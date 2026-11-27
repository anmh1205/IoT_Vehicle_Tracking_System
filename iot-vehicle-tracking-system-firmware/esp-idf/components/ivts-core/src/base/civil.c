#include "ivts_core/base/civil.h"
#include <stdbool.h>
#include <stddef.h>

/* Thuật toán days_from_civil / civil_from_days (Howard Hinnant, public domain). */
static int64_t days_from_civil(int64_t y, unsigned m, unsigned d)
{
    y -= (m <= 2u) ? 1 : 0;
    int64_t era = (y >= 0 ? y : y - 399) / 400;
    unsigned yoe = (unsigned)(y - era * 400);
    unsigned mp = (m > 2u) ? m - 3u : m + 9u;
    unsigned doy = (153u * mp + 2u) / 5u + d - 1u;
    unsigned doe = yoe * 365u + yoe / 4u - yoe / 100u + doy;
    return era * 146097 + (int64_t)doe - 719468;
}

static bool leap(unsigned y) { return (y % 4u == 0u && y % 100u != 0u) || y % 400u == 0u; }

ivts_err_t ivts_civil_to_unix_ms(const ivts_civil_t *c, uint64_t *out)
{
    static const uint8_t mdays[12] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    if (c == NULL || out == NULL || c->year < 1970u || c->year > 2099u || c->month < 1u ||
        c->month > 12u || c->day < 1u || c->hour > 23u || c->min > 59u || c->sec > 59u || c->ms > 999u) {
        return IVTS_ERR_INVALID_ARG;
    }
    unsigned dim = mdays[c->month - 1u] + ((c->month == 2u && leap(c->year)) ? 1u : 0u);
    if (c->day > dim) {
        return IVTS_ERR_INVALID_ARG;
    }
    int64_t days = days_from_civil(c->year, c->month, c->day);
    *out = (uint64_t)(((days * 24 + c->hour) * 60 + c->min) * 60 + c->sec) * 1000u + c->ms;
    return IVTS_OK;
}

void ivts_unix_ms_to_civil(uint64_t unix_ms, ivts_civil_t *c)
{
    uint64_t secs = unix_ms / 1000u;
    c->ms = (uint16_t)(unix_ms % 1000u);
    int64_t z = (int64_t)(secs / 86400u) + 719468;
    uint64_t sod = secs % 86400u;
    c->hour = (uint8_t)(sod / 3600u);
    c->min = (uint8_t)((sod / 60u) % 60u);
    c->sec = (uint8_t)(sod % 60u);
    int64_t era = (z >= 0 ? z : z - 146096) / 146097;
    unsigned doe = (unsigned)(z - era * 146097);
    unsigned yoe = (doe - doe / 1460u + doe / 36524u - doe / 146096u) / 365u;
    int64_t y = (int64_t)yoe + era * 400;
    unsigned doy = doe - (365u * yoe + yoe / 4u - yoe / 100u);
    unsigned mp = (5u * doy + 2u) / 153u;
    unsigned d = doy - (153u * mp + 2u) / 5u + 1u;
    unsigned m = (mp < 10u) ? mp + 3u : mp - 9u;
    c->year = (uint16_t)(y + (m <= 2u ? 1 : 0));
    c->month = (uint8_t)m;
    c->day = (uint8_t)d;
}
