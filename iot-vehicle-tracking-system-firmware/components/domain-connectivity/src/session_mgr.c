#include "session_mgr.h"

#include "sdkconfig.h"

/**
 * @file session_mgr.c
 * @brief Debounced ignition-to-session mapper.
 *
 * ## Session Management Flow
 *
 * ### Purpose
 *    Maps raw ignition signal transitions to logical sessions
 *    - Debounces ignition signal noise
 *    - Tracks session boundaries for telemetry
 *    - Provides stable ignition state to FSM
 *
 * ### State Machine
 *
 *    IDLE --(ignition on)--> ACTIVE --(ignition off)--> IDLE
 *
 * ### Debounce Logic
 *    - First sample: initialize timer, capture raw value
 *    - Same value: restart debounce timer
 *    - Stable for DEBOUNCE_MS: accept as stable state
 *    - New session triggers on rising edge (off->on transition)
 *
 * ### Key Functions
 *    - session_mgr_init(): Reset all state
 *    - session_mgr_on_ignition_sample(): Process raw sample with debounce
 *    - session_mgr_stable_ignition(): Returns debounced ignition state
 *    - session_mgr_current_session_id(): Returns active session ID
 *    - session_mgr_should_start(): Returns true if session just started
 *
 * ## Tuning Parameters
 *    - DEBOUNCE_MS: Ignition signal stability window (500ms default)
 *    - Session ID: Monotonically increasing, wraps at 0xFFFFFFFF
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

/**
 * @brief Initialize session manager.
 *
 * Resets debounce state and clears session ID.
 */
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

/**
 * @brief Process ignition sample with debounce.
 *
 * Takes raw ignition input and applies debounce logic.
 * When signal is stable for DEBOUNCE_MS, updates stable state.
 *
 * @param ignition_on Raw ignition reading.
 * @param now_ms Current timestamp.
 */
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

/**
 * @brief Check if session should start.
 *
 * Consumer checks this to detect ignition-on edge.
 * Returns true once per ignition-on transition.
 *
 * @return true if session should start now.
 */
bool session_mgr_should_start(void) {
    if (!s_ctx.pending_start || s_ctx.state != SESSION_STATE_IDLE) {
        return false;
    }
    s_ctx.pending_start = false;
    return true;
}

/**
 * @brief Mark session as started.
 *
 * Called when FSM accepts start event.
 */
void session_mgr_mark_started(void) {
    s_ctx.state = SESSION_STATE_ACTIVE;
    /* Session ID changes only after the state machine accepts the start event. */
    session_mgr_next_session_id();
}

/**
 * @brief Mark session as stopped.
 *
 * Called when ignition turns off and session ends.
 */
void session_mgr_mark_stopped(void) {
    s_ctx.state = SESSION_STATE_IDLE;
}

/**
 * @brief Get current session ID.
 *
 * @return Current session ID (0 if none started).
 */
uint32_t session_mgr_current_session_id(void) {
    return s_ctx.current_session_id;
}

/**
 * @brief Check if stable ignition state is known.
 *
 * @return true if debounce has resolved ignition state.
 */
bool session_mgr_has_stable_ignition(void) {
    return s_ctx.stable_known;
}

bool session_mgr_stable_ignition(void) {
    return s_ctx.stable_ignition;
}
