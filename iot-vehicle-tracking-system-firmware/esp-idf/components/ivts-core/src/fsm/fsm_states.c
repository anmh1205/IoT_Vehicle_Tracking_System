/**
 * @file fsm_states.c
 * @brief State-specific transitions, sleep predicates and requested effects.
 */
#include "fsm/fsm_internal.h"

static void go(ivts_fsm_t *f, ivts_fsm_out_t *out, ivts_fsm_state_t s, ivts_ms_t now)
{
    f->state = s;
    f->sleep_mode = IVTS_SLEEP_NONE;
    f->entered_ms = now;
    f->status_sent = false;
    f->last_raw_ms = 0;
    out->changed = true;
}

/* Publish RAW at the configured interval, starting immediately on entry. */
static void periodic_raw(ivts_fsm_t *f, ivts_fsm_out_t *out, ivts_ms_t now, uint32_t period)
{
    if (f->last_raw_ms == 0u || ivts_elapsed(now, f->last_raw_ms) >= period) {
        out->actions |= IVTS_ACT_PUBLISH_RAW;
        f->last_raw_ms = (now == 0u) ? 1u : now;   /* Zero represents an unsent RAW timestamp. */
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

/* Give a provisioned device the awake window to connect and send its heartbeat. */
static bool drained(const ivts_fsm_in_t *in)
{
    if (in->ota_active || !in->publish_idle) { return false; }
    return in->link_up ? in->offline_record_count == 0u && !in->control_pending : !in->link_expected;
}

static void enter_sleep(ivts_fsm_t *f, const ivts_fsm_cfg_t *c, ivts_fsm_out_t *out, ivts_ms_t now)
{
    go(f, out, IVTS_ST_SLEEP, now);
    out->actions |= IVTS_ACT_SLEEP | IVTS_ACT_GNSS_OFF;
    out->sleep_s = c->heartbeat_s;
    if (!c->sleep_enabled) {
        out->sleep_mode = IVTS_SLEEP_FAKE;       /* Keep the hardware powered while the FSM is in simulated sleep. */
        out->sleep_arm_motion = c->imu_wakeup_enabled;
    } else if (c->imu_wakeup_enabled && !c->deep_wake_on_motion) {
        /*
         * The IMU interrupt GPIO cannot wake deep sleep on this board.
         */
        out->sleep_mode = IVTS_SLEEP_LIGHT;
        out->sleep_arm_motion = true;
    } else {
        out->sleep_mode = IVTS_SLEEP_DEEP;
        out->sleep_arm_motion = c->imu_wakeup_enabled;
    }
    f->sleep_mode = out->sleep_mode;
}

static void enter_driving(ivts_fsm_t *fsm, ivts_fsm_out_t *out, ivts_ms_t now, bool start_gnss)
{
    go(fsm, out, IVTS_ST_DRIVING, now);
    out->actions |= IVTS_ACT_OBD_START;
    if (start_gnss) { out->actions |= IVTS_ACT_GNSS_ON; }
}

static void enter_alarm(ivts_fsm_t *fsm, ivts_fsm_out_t *out, ivts_ms_t now)
{
    go(fsm, out, IVTS_ST_ALARM, now);
    out->actions |= IVTS_ACT_GNSS_ON;
}

static bool parked_may_sleep(const ivts_fsm_cfg_t *cfg, const ivts_fsm_in_t *in, ivts_ms_t in_state)
{
    return in_state >= cfg->parked_settle_ms &&
           (drained(in) || (in_state >= cfg->awake_max_ms && in->publish_idle)) && !in->ota_active;
}

static bool heartbeat_may_sleep(const ivts_fsm_cfg_t *cfg, const ivts_fsm_in_t *in,
                                const ivts_fsm_out_t *out, ivts_ms_t in_state)
{
    return (drained(in) && in_state > 0u && (out->actions & IVTS_ACT_PUBLISH_STATUS) == 0u) ||
           (in_state >= cfg->awake_max_ms && in->publish_idle && !in->ota_active);
}

static void step_init(ivts_fsm_t *fsm, const ivts_fsm_in_t *in, ivts_fsm_out_t *out)
{
    go(fsm, out, IVTS_ST_CHECK_IGN, in->now);
    out->actions |= IVTS_ACT_GNSS_ON;
}

static void step_check_ign(ivts_fsm_t *fsm, const ivts_fsm_cfg_t *cfg,
                           const ivts_fsm_in_t *in, ivts_fsm_out_t *out)
{
    if (in->ignition == IVTS_IGN_ON) {
        enter_driving(fsm, out, in->now, true);
        return;
    }
    ivts_ms_t in_state = ivts_elapsed(in->now, fsm->entered_ms);
    if (in->ignition != IVTS_IGN_OFF && in_state < cfg->check_ign_max_ms) { return; }
    if (fsm->wake == IVTS_WAKE_MOTION || in->motion == IVTS_MOTION_MOVING) {
        enter_alarm(fsm, out, in->now);
    } else if (fsm->wake == IVTS_WAKE_TIMER) {
        go(fsm, out, IVTS_ST_HEARTBEAT, in->now);
    } else {
        go(fsm, out, IVTS_ST_PARKED, in->now);
    }
}

static void step_driving(ivts_fsm_t *fsm, const ivts_fsm_cfg_t *cfg,
                         const ivts_fsm_in_t *in, ivts_fsm_out_t *out)
{
    if (in->ignition == IVTS_IGN_OFF) {
        go(fsm, out, IVTS_ST_PARKED, in->now);
        out->actions |= IVTS_ACT_OBD_STOP;
        return;
    }
    periodic_raw(fsm, out, in->now, cfg->tracking_ms);
    if (!fsm->status_sent || ivts_elapsed(in->now, fsm->last_status_ms) >= cfg->status_ms) {
        out->actions |= IVTS_ACT_PUBLISH_STATUS;
        fsm->status_sent = true;
        fsm->last_status_ms = in->now;
    }
}

static void step_parked(ivts_fsm_t *fsm, const ivts_fsm_cfg_t *cfg,
                        const ivts_fsm_in_t *in, ivts_fsm_out_t *out)
{
    if (in->ignition == IVTS_IGN_ON) {
        enter_driving(fsm, out, in->now, true);
        return;
    }
    ivts_ms_t in_state = ivts_elapsed(in->now, fsm->entered_ms);
    if (in->motion == IVTS_MOTION_MOVING && in_state > 0u) {
        enter_alarm(fsm, out, in->now);
        return;
    }
    status_once(fsm, out, in->now);
    if (parked_may_sleep(cfg, in, in_state)) { enter_sleep(fsm, cfg, out, in->now); }
}

static void step_alarm(ivts_fsm_t *fsm, const ivts_fsm_cfg_t *cfg,
                       const ivts_fsm_in_t *in, ivts_fsm_out_t *out)
{
    if (in->ignition == IVTS_IGN_ON) {
        enter_driving(fsm, out, in->now, false);
        return;
    }
    periodic_raw(fsm, out, in->now, cfg->alarm_ms);
    status_once(fsm, out, in->now);
    if (in->motion != IVTS_MOTION_MOVING && ivts_elapsed(in->now, fsm->entered_ms) >= cfg->alarm_timeout_ms) {
        go(fsm, out, IVTS_ST_PARKED, in->now);
    }
}

static void step_heartbeat(ivts_fsm_t *fsm, const ivts_fsm_cfg_t *cfg,
                           const ivts_fsm_in_t *in, ivts_fsm_out_t *out)
{
    if (in->ignition == IVTS_IGN_ON) {
        enter_driving(fsm, out, in->now, true);
        return;
    }
    if (in->motion == IVTS_MOTION_MOVING) {
        enter_alarm(fsm, out, in->now);
        return;
    }
    status_once(fsm, out, in->now);
    if (heartbeat_may_sleep(cfg, in, out, ivts_elapsed(in->now, fsm->entered_ms))) {
        enter_sleep(fsm, cfg, out, in->now);
    }
}

static void step_sleep(ivts_fsm_t *fsm, const ivts_fsm_cfg_t *cfg,
                       const ivts_fsm_in_t *in, ivts_fsm_out_t *out)
{
    if (fsm->sleep_mode != IVTS_SLEEP_FAKE) { return; }
    bool motion_wake = in->motion == IVTS_MOTION_MOVING && cfg->imu_wakeup_enabled;
    if (in->ignition == IVTS_IGN_ON || cfg->sleep_enabled || motion_wake) {
        ivts_wake_t wake = in->ignition != IVTS_IGN_ON && motion_wake ? IVTS_WAKE_MOTION : IVTS_WAKE_OTHER;
        ivts_fsm_woke(fsm, in->now, wake);
        out->changed = true;
    } else if (ivts_elapsed(in->now, fsm->entered_ms) >= (ivts_ms_t)cfg->heartbeat_s * 1000u) {
        ivts_fsm_woke(fsm, in->now, IVTS_WAKE_TIMER);
        out->changed = true;
    }
}

void ivts_fsm_run_state(ivts_fsm_t *fsm, const ivts_fsm_cfg_t *cfg, const ivts_fsm_in_t *in, ivts_fsm_out_t *out)
{
    switch (fsm->state) {
    case IVTS_ST_INIT:      step_init(fsm, in, out); break;
    case IVTS_ST_CHECK_IGN: step_check_ign(fsm, cfg, in, out); break;
    case IVTS_ST_DRIVING:   step_driving(fsm, cfg, in, out); break;
    case IVTS_ST_PARKED:    step_parked(fsm, cfg, in, out); break;
    case IVTS_ST_ALARM:     step_alarm(fsm, cfg, in, out); break;
    case IVTS_ST_HEARTBEAT: step_heartbeat(fsm, cfg, in, out); break;
    case IVTS_ST_SLEEP:     step_sleep(fsm, cfg, in, out); break;
    case IVTS_ST_COUNT:     go(fsm, out, IVTS_ST_CHECK_IGN, in->now); break;
    }
}
