#include "ivts_core/ota/confirm.h"
#include <stddef.h>

ivts_confirm_t ivts_ota_confirm_decide(const ivts_ota_pending_t *p, bool healthy,
                                       uint64_t now_unix_ms, bool time_trusted, ivts_ms_t uptime_ms)
{
    if (p == NULL || !p->pending) {
        return IVTS_CONFIRM_ACCEPT;          /* Không có image đang chờ xác nhận. */
    }
    bool wall_time_expired = time_trusted && p->deadline_unix_ms != 0u && now_unix_ms >= p->deadline_unix_ms;
    if (wall_time_expired || uptime_ms >= (ivts_ms_t)p->timeout_s * 1000u) {
        return IVTS_CONFIRM_ROLLBACK;
    }
    return healthy ? IVTS_CONFIRM_ACCEPT : IVTS_CONFIRM_WAIT;
}
