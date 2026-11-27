#include "ivts_core/base/str.h"
#include <string.h>

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
        memcpy(dst, src, n + 1u);          /* gồm cả NUL */
        return IVTS_OK;
    }
    memcpy(dst, src, cap - 1u);            /* cắt, chừa chỗ cho NUL */
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
