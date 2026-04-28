#include "session_mgr.h"

#include "sdkconfig.h"

/**
 * @file session_mgr.c
 * @brief Debounced ignition-to-session mapper.
 */

typedef enum {
    SESSION_STATE_IDLE = 0,
    SESSION_STATE_ACTIVE,
} session_state_t;

typedef struct {
    /** Current coarse lifecycle state. */
    session_state_t state;
    /** Most recent raw ignition sample before debounce. */
    bool last_sample;
    /** True once the first raw sample is captured. */
    bool sample_initialized;
    /** Debounced ignition value already accepted by the manager. */
    bool stable_ignition;
    /** True once the manager has accepted a debounced ignition level. */
    bool stable_known;
    /** One-shot flag consumed by `session_mgr_should_start`. */
    bool pending_start;
    /** Timestamp of the latest raw edge used for debounce timing. */
    uint64_t edge_ms;
    /** Session ID incremented each time the ignition turns on. */
    uint32_t current_session_id;
} session_mgr_ctx_t;

static session_mgr_ctx_t s_ctx;

static uint32_t session_mgr_next_session_id(void) {
    s_ctx.current_session_id += 1;
    if (s_ctx.current_session_id == 0) {
        /* Keep `0` reserved for "no session has started yet". */
        s_ctx.current_session_id = 1;
    }
    return s_ctx.current_session_id;
}

void session_mgr_init(void) {
    s_ctx.state = SESSION_STATE_IDLE;
    s_ctx.last_sample = false;
    s_ctx.sample_initialized = false;
    s_ctx.stable_ignition = false;
    s_ctx.stable_known = false;
    s_ctx.pending_start = false;
    s_ctx.edge_ms = 0;
    s_ctx.current_session_id = 0;
}

void session_mgr_on_ignition_sample(bool ignition_on, uint64_t now_ms) {
    if (!s_ctx.sample_initialized) {
        s_ctx.last_sample = ignition_on;
        s_ctx.edge_ms = now_ms;
        s_ctx.sample_initialized = true;
        return;
    }

    if (ignition_on != s_ctx.last_sample) {
        /* Raw edge detected; restart debounce timer from this sample. */
        s_ctx.last_sample = ignition_on;
        s_ctx.edge_ms = now_ms;
    }

    if (now_ms < s_ctx.edge_ms) {
        return;
    }

    uint64_t elapsed = now_ms - s_ctx.edge_ms;
    if (elapsed < (uint64_t)CONFIG_TRACKER_IGNITION_DEBOUNCE_MS) {
        /* Signal has not stayed stable long enough yet. */
        return;
    }

    if (!s_ctx.stable_known) {
        s_ctx.stable_ignition = ignition_on;
        s_ctx.stable_known = true;
        s_ctx.pending_start = (ignition_on && s_ctx.state == SESSION_STATE_IDLE);
        return;
    }

    if (s_ctx.stable_ignition == ignition_on) {
        /* Debounced state already matches the current sample. */
        return;
    }

    /* Stable state changed, so raise exactly one pending transition for the FSM. */
    s_ctx.stable_ignition = ignition_on;
    if (ignition_on) {
        s_ctx.pending_start = true;
    } else {
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

void session_mgr_mark_started(void) {
    s_ctx.state = SESSION_STATE_ACTIVE;
    /* Session ID changes only after the state machine accepts the start event. */
    session_mgr_next_session_id();
}

void session_mgr_mark_stopped(void) {
    s_ctx.state = SESSION_STATE_IDLE;
}

uint32_t session_mgr_current_session_id(void) {
    return s_ctx.current_session_id;
}

bool session_mgr_has_stable_ignition(void) {
    return s_ctx.stable_known;
}

bool session_mgr_stable_ignition(void) {
    return s_ctx.stable_ignition;
}
