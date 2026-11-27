#include "ivts_core/fsm/fsm.h"
#include <string.h>

const char *ivts_app_state_name(ivts_app_state_t s)
{
    switch (s) {
    case IVTS_ST_INIT:      return "INIT";
    case IVTS_ST_CHECK_IGN: return "CHECK_IGN";
    case IVTS_ST_DRIVING:   return "DRIVING";
    case IVTS_ST_PARKED:    return "PARKED";
    case IVTS_ST_ALARM:     return "ALARM";
    case IVTS_ST_HEARTBEAT: return "HEARTBEAT";
    case IVTS_ST_SLEEP:     return "SLEEP";
    case IVTS_ST_COUNT:     break;
    }
    return "UNKNOWN";
}

ivts_device_state_t ivts_fsm_device_state(ivts_app_state_t s)
{
    switch (s) {
    case IVTS_ST_INIT:      return IVTS_DEV_BOOTING;
    case IVTS_ST_CHECK_IGN: return IVTS_DEV_WAKING;
    case IVTS_ST_ALARM:     return IVTS_DEV_ALARM;
    case IVTS_ST_SLEEP:     return IVTS_DEV_SLEEP_PREPARE;
    case IVTS_ST_DRIVING:
    case IVTS_ST_PARKED:
    case IVTS_ST_HEARTBEAT: return IVTS_DEV_ACTIVE;
    case IVTS_ST_COUNT:     break;
    }
    return IVTS_DEV_FAULT;
}

void ivts_fsm_init(ivts_fsm_t *f, ivts_ms_t now, ivts_wake_t wake)
{
    memset(f, 0, sizeof(*f));
    f->state = IVTS_ST_INIT;
    f->entered_ms = now;
    f->wake = wake;
}

static void go(ivts_fsm_t *f, ivts_fsm_out_t *out, ivts_app_state_t s, ivts_ms_t now)
{
    f->state = s;
    f->sleep_mode = IVTS_SLEEP_NONE;
    f->entered_ms = now;
    f->status_sent = false;
    f->last_raw_ms = 0;
    out->changed = true;
}

void ivts_fsm_woke(ivts_fsm_t *f, ivts_ms_t now, ivts_wake_t wake)
{
    f->state = IVTS_ST_CHECK_IGN;
    f->sleep_mode = IVTS_SLEEP_NONE;
    f->entered_ms = now;
    f->status_sent = false;
    f->wake = wake;
}

/* Phát RAW theo chu kỳ, tính từ lần phát trước (lần đầu phát ngay). */
static void periodic_raw(ivts_fsm_t *f, ivts_fsm_out_t *out, ivts_ms_t now, uint32_t period)
{
    if (f->last_raw_ms == 0u || ivts_elapsed(now, f->last_raw_ms) >= period) {
        out->actions |= IVTS_ACT_PUBLISH_RAW;
        f->last_raw_ms = (now == 0u) ? 1u : now;   /* 0 dành cho "chưa phát" */
    }
}

static void status_once(ivts_fsm_t *f, ivts_fsm_out_t *out, ivts_ms_t now)
{
    if (!f->status_sent) {
        out->actions |= IVTS_ACT_PUBLISH_STATUS;
        f->status_sent = true;
        f->last_status_ms = now;
    }
}

/* Thiết bị đã provision chờ broker trong cửa sổ thức để heartbeat có cơ hội được gửi. */
static bool drained(const ivts_fsm_in_t *in)
{
    if (in->ota_active || !in->publish_idle) { return false; }
    return in->link_up ? in->queue_pending == 0u && !in->control_pending : !in->link_expected;
}

static void enter_sleep(ivts_fsm_t *f, const ivts_fsm_cfg_t *c, ivts_fsm_out_t *out, ivts_ms_t now)
{
    go(f, out, IVTS_ST_SLEEP, now);
    out->actions |= IVTS_ACT_SLEEP | IVTS_ACT_GNSS_OFF;
    out->sleep_s = c->heartbeat_s;
    if (!c->sleep_enabled) {
        out->sleep_mode = IVTS_SLEEP_FAKE;       /* thức nhưng hành xử như đang ngủ */
        out->sleep_arm_motion = c->imu_wakeup_enabled;
    } else if (c->imu_wakeup_enabled && !c->deep_wake_on_motion) {
        /* Chân INT không phải RTC GPIO: deep sleep không thể thức theo motion.
         * Muốn giữ cảnh báo trộm thì phải dùng light sleep (tốn dòng hơn). */
        out->sleep_mode = IVTS_SLEEP_LIGHT;
        out->sleep_arm_motion = true;
    } else {
        out->sleep_mode = IVTS_SLEEP_DEEP;
        out->sleep_arm_motion = c->imu_wakeup_enabled;
    }
    f->sleep_mode = out->sleep_mode;
}

void ivts_fsm_step(ivts_fsm_t *f, const ivts_fsm_cfg_t *c, const ivts_fsm_in_t *in, ivts_fsm_out_t *out)
{
    memset(out, 0, sizeof(*out));
    ivts_ms_t now = in->now;
    ivts_ms_t in_state = ivts_elapsed(now, f->entered_ms);
    bool ign_on  = (in->ignition == IVTS_IGN_ON);
    bool moving  = (in->motion == IVTS_MOTION_MOVING);

    /* Có mạng và còn hàng tồn: xin replay ở mọi state thức (app tự chặn trùng). */
    if (in->link_up && in->queue_pending > 0u && f->state != IVTS_ST_SLEEP) {
        out->actions |= IVTS_ACT_REPLAY;
    }

    switch (f->state) {
    case IVTS_ST_INIT:
        go(f, out, IVTS_ST_CHECK_IGN, now);
        out->actions |= IVTS_ACT_GNSS_ON;
        break;

    case IVTS_ST_CHECK_IGN:
        if (ign_on) {
            go(f, out, IVTS_ST_DRIVING, now);
            out->actions |= IVTS_ACT_OBD_START | IVTS_ACT_GNSS_ON;
        } else if (in->ignition == IVTS_IGN_OFF || in_state >= c->check_ign_max_ms) {
            if (f->wake == IVTS_WAKE_MOTION || moving) {
                go(f, out, IVTS_ST_ALARM, now);
                out->actions |= IVTS_ACT_GNSS_ON;
            } else if (f->wake == IVTS_WAKE_TIMER) {
                go(f, out, IVTS_ST_HEARTBEAT, now);
            } else {
                go(f, out, IVTS_ST_PARKED, now);
            }
        }
        break;

    case IVTS_ST_DRIVING:
        if (!ign_on && in->ignition == IVTS_IGN_OFF) {   /* axes đã debounce OFF */
            go(f, out, IVTS_ST_PARKED, now);
            out->actions |= IVTS_ACT_OBD_STOP;
            break;
        }
        periodic_raw(f, out, now, c->tracking_ms);
        if (!f->status_sent || ivts_elapsed(now, f->last_status_ms) >= c->status_ms) {
            out->actions |= IVTS_ACT_PUBLISH_STATUS;
            f->status_sent = true;
            f->last_status_ms = now;
        }
        break;

    case IVTS_ST_PARKED:
        if (ign_on) {
            go(f, out, IVTS_ST_DRIVING, now);
            out->actions |= IVTS_ACT_OBD_START | IVTS_ACT_GNSS_ON;
            break;
        }
        if (moving && in_state > 0u) {
            go(f, out, IVTS_ST_ALARM, now);
            out->actions |= IVTS_ACT_GNSS_ON;
            break;
        }
        status_once(f, out, now);
        if (in_state >= c->parked_settle_ms &&
            (drained(in) || (in_state >= c->awake_max_ms && in->publish_idle)) && !in->ota_active) {
            enter_sleep(f, c, out, now);
        }
        break;

    case IVTS_ST_ALARM:
        if (ign_on) {
            go(f, out, IVTS_ST_DRIVING, now);
            out->actions |= IVTS_ACT_OBD_START;
            break;
        }
        periodic_raw(f, out, now, c->alarm_ms);
        status_once(f, out, now);
        /* Thoát khi đã yên lặng đủ alarm_timeout (axes đã chuyển STATIONARY sau motion_quiet). */
        if (!moving && in_state >= c->alarm_timeout_ms) {
            go(f, out, IVTS_ST_PARKED, now);
        }
        break;

    case IVTS_ST_HEARTBEAT:
        if (ign_on) {
            go(f, out, IVTS_ST_DRIVING, now);
            out->actions |= IVTS_ACT_OBD_START | IVTS_ACT_GNSS_ON;
            break;
        }
        if (moving) {
            go(f, out, IVTS_ST_ALARM, now);
            out->actions |= IVTS_ACT_GNSS_ON;
            break;
        }
        status_once(f, out, now);
        if ((drained(in) && in_state > 0u && (out->actions & IVTS_ACT_PUBLISH_STATUS) == 0u) ||
            (in_state >= c->awake_max_ms && in->publish_idle && !in->ota_active)) {
            enter_sleep(f, c, out, now);
        }
        break;

    case IVTS_ST_SLEEP:
        if (f->sleep_mode != IVTS_SLEEP_FAKE) { break; }
        if (ign_on || c->sleep_enabled || (moving && c->imu_wakeup_enabled)) {
            ivts_wake_t wake = !ign_on && moving && c->imu_wakeup_enabled ? IVTS_WAKE_MOTION : IVTS_WAKE_OTHER;
            ivts_fsm_woke(f, now, wake);
            out->changed = true;
        } else if (in_state >= (ivts_ms_t)c->heartbeat_s * 1000u) {
            ivts_fsm_woke(f, now, IVTS_WAKE_TIMER);
            out->changed = true;
        }
        break;

    case IVTS_ST_COUNT:
        go(f, out, IVTS_ST_CHECK_IGN, now);
        break;
    }
}
