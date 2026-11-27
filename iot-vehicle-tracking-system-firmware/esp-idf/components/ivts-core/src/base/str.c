/**
 * @file str.c
 * @brief Bounded copying and stable string names for portable error codes.
 */
#include "ivts_core/base/str.h"
#include <string.h>
#include "ivts_core/base/err.h"

ivts_err_t ivts_str_copy(char *dst, size_t cap, const char *src)
{
    if (dst == NULL || cap == 0u) {
        return IVTS_ERR_INVALID_ARG;
    }
    if (src == NULL) {
        dst[0] = '\0';
        return IVTS_ERR_INVALID_ARG;
    }

    size_t n = strlen(src);
    if (n < cap) {
        memcpy(dst, src, n + 1u);          /* Include the terminating NUL. */
        return IVTS_OK;
    }
    memcpy(dst, src, cap - 1u);            /* Truncate the copy while reserving the trailing NUL. */
    dst[cap - 1u] = '\0';
    return IVTS_ERR_FULL;
}

int ivts_clamp_int(int v, int lo, int hi)
{
    if (lo > hi) {
        int t = lo;
        lo = hi;
        hi = t;
    }
    if (v < lo) { return lo; }
    if (v > hi) { return hi; }
    return v;
}

const char *ivts_err_name(ivts_err_t e)
{
    /* Leave the switch exhaustive so -Wswitch reports enum additions without a name. */
    switch (e) {
    case IVTS_OK:                 return "IVTS_OK";
    case IVTS_ERR_FAIL:           return "IVTS_ERR_FAIL";
    case IVTS_ERR_INVALID_ARG:    return "IVTS_ERR_INVALID_ARG";
    case IVTS_ERR_INVALID_STATE:  return "IVTS_ERR_INVALID_STATE";
    case IVTS_ERR_TIMEOUT:        return "IVTS_ERR_TIMEOUT";
    case IVTS_ERR_NOT_FOUND:      return "IVTS_ERR_NOT_FOUND";
    case IVTS_ERR_FULL:           return "IVTS_ERR_FULL";
    case IVTS_ERR_IO:             return "IVTS_ERR_IO";
    case IVTS_ERR_CRC:            return "IVTS_ERR_CRC";
    case IVTS_ERR_VERSION:        return "IVTS_ERR_VERSION";
    case IVTS_ERR_COUNT:          break;
    }
    return "IVTS_ERR_UNKNOWN";
}
