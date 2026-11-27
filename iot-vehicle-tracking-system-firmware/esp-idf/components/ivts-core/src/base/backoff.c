#include "ivts_core/base/backoff.h"
#include <stddef.h>

#define BACKOFF_MAX_SHIFT 31u

uint32_t ivts_backoff_ms(const ivts_backoff_t *p, uint32_t attempt, uint32_t seed)
{
    if (p == NULL) {
        return 1u;
    }

    uint64_t base = (p->base_ms != 0u) ? (uint64_t)p->base_ms : 1u;
    uint64_t max  = ((uint64_t)p->max_ms < base) ? base : (uint64_t)p->max_ms;

    /* base < 2^32 và shift <= 31  =>  base << shift < 2^63: không tràn uint64.
     * Chặn shift vì dịch >= độ rộng kiểu là UB. */
    uint32_t shift = (attempt < BACKOFF_MAX_SHIFT) ? attempt : BACKOFF_MAX_SHIFT;
    uint64_t curve = base << shift;
    if (curve > max) {
        curve = max;
    }

    /* Jitter cộng SAU khi cap để đội xe không dồn về đúng một mốc ở max. */
    uint64_t total = curve + ((uint64_t)seed % ((uint64_t)p->jitter_ms + 1u));
    return (total > UINT32_MAX) ? UINT32_MAX : (uint32_t)total;
}
