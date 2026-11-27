/**
 * @file fsm.c
 * @brief FSM initialization and dispatch with caller-owned runtime state.
 */
#include "fsm/fsm_internal.h"
#include <string.h>

const char *ivts_fsm_state_name(ivts_fsm_state_t s)
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

ivts_device_state_t ivts_fsm_device_state(ivts_fsm_state_t s)
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

void ivts_fsm_woke(ivts_fsm_t *f, ivts_ms_t now, ivts_wake_t wake)
{
    f->state = IVTS_ST_CHECK_IGN;
    f->sleep_mode = IVTS_SLEEP_NONE;
    f->entered_ms = now;
    f->status_sent = false;
    f->wake = wake;
}

void ivts_fsm_step(ivts_fsm_t *fsm, const ivts_fsm_cfg_t *cfg, const ivts_fsm_in_t *in, ivts_fsm_out_t *out)
{
    memset(out, 0, sizeof(*out));
    if (in->link_up && in->offline_record_count > 0u && fsm->state != IVTS_ST_SLEEP) {
        out->actions |= IVTS_ACT_REPLAY;
    }
    ivts_fsm_run_state(fsm, cfg, in, out);
}
