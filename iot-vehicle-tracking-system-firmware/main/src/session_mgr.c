#include "session_mgr.h"

#include "sdkconfig.h"

typedef struct {
    session_state_t state;
    bool last_sample;
    bool stable_ignition;
    bool pending_start;
    bool pending_stop;
    uint64_t edge_ms;
    uint32_t current_session_id;
} session_mgr_ctx_t;

static session_mgr_ctx_t s_ctx;

static uint32_t session_mgr_next_session_id(void) {
    s_ctx.current_session_id += 1;
    if (s_ctx.current_session_id == 0) {
        s_ctx.current_session_id = 1;
    }
    return s_ctx.current_session_id;
}

void session_mgr_init(void) {
    s_ctx.state = SESSION_STATE_IDLE;
    s_ctx.last_sample = false;
    s_ctx.stable_ignition = false;
    s_ctx.pending_start = false;
    s_ctx.pending_stop = false;
    s_ctx.edge_ms = 0;
    s_ctx.current_session_id = 0;
}

void session_mgr_on_ignition_sample(bool ignition_on, uint64_t now_ms) {
    if (ignition_on != s_ctx.last_sample) {
        s_ctx.last_sample = ignition_on;
        s_ctx.edge_ms = now_ms;
    }

    uint64_t elapsed = now_ms - s_ctx.edge_ms;
    if (elapsed < (uint64_t)CONFIG_TRACKER_IGNITION_DEBOUNCE_MS) {
        return;
    }

    if (s_ctx.stable_ignition == ignition_on) {
        return;
    }

    s_ctx.stable_ignition = ignition_on;
    if (ignition_on) {
        s_ctx.pending_start = true;
        s_ctx.pending_stop = false;
    } else {
        s_ctx.pending_stop = true;
        s_ctx.pending_start = false;
    }
}

bool session_mgr_should_start(void) {
    if (!s_ctx.pending_start || s_ctx.state != SESSION_STATE_IDLE) {
        return false;
    }
    s_ctx.pending_start = false;
    return true;
}

bool session_mgr_should_stop(void) {
    if (!s_ctx.pending_stop || s_ctx.state != SESSION_STATE_ACTIVE) {
        return false;
    }
    s_ctx.pending_stop = false;
    return true;
}

void session_mgr_mark_started(uint64_t now_ms) {
    (void)now_ms;
    s_ctx.state = SESSION_STATE_ACTIVE;
    session_mgr_next_session_id();
}

void session_mgr_mark_stopped(uint64_t now_ms) {
    (void)now_ms;
    s_ctx.state = SESSION_STATE_IDLE;
}

uint32_t session_mgr_current_session_id(void) {
    return s_ctx.current_session_id;
}

session_state_t session_mgr_state(void) {
    return s_ctx.state;
}

bool session_mgr_is_active(void) {
    return s_ctx.state == SESSION_STATE_ACTIVE;
}

uint32_t session_mgr_drain_timeout_ms(void) {
    return CONFIG_TRACKER_IGNITION_OFF_DRAIN_MS;
}
