#include "ivts_core/fsm/axes.h"

void ivts_axes_init(ivts_axes_t *a)
{
    a->ign = IVTS_IGN_UNKNOWN;
    a->candidate = IVTS_IGN_UNKNOWN;
    a->candidate_since = 0;
    a->motion = IVTS_MOTION_UNKNOWN;
    a->last_motion_ms = 0;
}

bool ivts_axes_on_power(ivts_axes_t *a, const ivts_axes_cfg_t *c, uint16_t vehicle_mv, ivts_ms_t now)
{
    uint16_t off_below = (c->hysteresis_mv < c->on_threshold_mv)
                             ? (uint16_t)(c->on_threshold_mv - c->hysteresis_mv) : 0u;
    ivts_ignition_t raw;
    if (vehicle_mv >= c->on_threshold_mv) {
        raw = IVTS_IGN_ON;
    } else if (vehicle_mv < off_below) {
        raw = IVTS_IGN_OFF;
    } else {
        /* Trong dải trễ giữ giá trị hiện tại; trước mẫu đầu tiên mặc định OFF. */
        raw = (a->ign == IVTS_IGN_UNKNOWN) ? IVTS_IGN_OFF : a->ign;
    }

    if (raw != a->candidate) {
        a->candidate = raw;
        a->candidate_since = now;
    }
    if (raw == a->ign) {
        return false;
    }
    /* Mẫu đầu tiên (từ UNKNOWN) được chấp nhận ngay: debounce chỉ áp dụng cho chuyển trạng thái,
     * nếu không boot phải chờ off_hold_ms chỉ để xác định xe đang tắt. */
    uint32_t hold = (a->ign == IVTS_IGN_UNKNOWN) ? 0u
                  : (raw == IVTS_IGN_ON) ? c->on_hold_ms : c->off_hold_ms;
    if (ivts_elapsed(now, a->candidate_since) >= hold) {
        a->ign = raw;
        return true;
    }
    return false;
}

bool ivts_axes_on_motion(ivts_axes_t *a, ivts_ms_t now)
{
    a->last_motion_ms = now;
    if (a->motion != IVTS_MOTION_MOVING) {
        a->motion = IVTS_MOTION_MOVING;
        return true;
    }
    return false;
}

bool ivts_axes_tick(ivts_axes_t *a, const ivts_axes_cfg_t *c, ivts_ms_t now)
{
    if (a->motion == IVTS_MOTION_MOVING && ivts_elapsed(now, a->last_motion_ms) >= c->motion_quiet_ms) {
        a->motion = IVTS_MOTION_STATIONARY;
        return true;
    }
    if (a->motion == IVTS_MOTION_UNKNOWN && now >= c->motion_quiet_ms) {
        a->motion = IVTS_MOTION_STATIONARY;     /* đủ lâu không có IRQ từ boot */
        return true;
    }
    return false;
}

ivts_vehicle_t ivts_axes_vehicle(const ivts_axes_t *a)
{
    bool moving = (a->motion == IVTS_MOTION_MOVING);
    bool still  = (a->motion == IVTS_MOTION_STATIONARY);
    switch (a->ign) {
    case IVTS_IGN_ON:
        return moving ? IVTS_VEH_MOVING_ON : still ? IVTS_VEH_IDLING_ON : IVTS_VEH_UNKNOWN;
    case IVTS_IGN_OFF:
        return moving ? IVTS_VEH_ROLLING_IGN_OFF : still ? IVTS_VEH_PARKED_OFF : IVTS_VEH_UNKNOWN;
    case IVTS_IGN_UNKNOWN:
        break;
    }
    return moving ? IVTS_VEH_UNKNOWN_MOVING : still ? IVTS_VEH_UNKNOWN_STATIONARY : IVTS_VEH_UNKNOWN;
}
