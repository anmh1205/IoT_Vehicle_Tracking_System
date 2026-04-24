#pragma once

#include <stdbool.h>
#include <stdint.h>

/**
 * @file session_mgr.h
 * @brief Ignition-only session lifecycle with debounce and OFF drain window.
 */

typedef enum {
    /** No active drive session is open. */
    SESSION_STATE_IDLE = 0,
    /** Reserved transitional state while a session starts. */
    SESSION_STATE_STARTING,
    /** A drive session is active and can receive telemetry. */
    SESSION_STATE_ACTIVE,
    /** Reserved transitional state while a session stops. */
    SESSION_STATE_STOPPING,
} session_state_t;

/** @brief Reset session manager state and clear pending edge decisions. */
void session_mgr_init(void);

/**
 * @brief Feed one ignition sample into the debouncer.
 *
 * The manager waits until the signal stays stable for the configured debounce
 * window before raising a start or stop request.
 *
 * @param ignition_on Latest sampled ignition state.
 * @param now_ms Current monotonic uptime in milliseconds.
 */
void session_mgr_on_ignition_sample(bool ignition_on, uint64_t now_ms);

/**
 * @brief Consume a pending start request.
 *
 * @return true once when a debounced ignition-on edge should open a session.
 */
bool session_mgr_should_start(void);

/**
 * @brief Consume a pending stop request.
 *
 * @return true once when a debounced ignition-off edge should stop a session.
 */
bool session_mgr_should_stop(void);

/**
 * @brief Mark the current ignition-driven session as started.
 *
 * @param now_ms Current monotonic uptime in milliseconds. Present for future
 *               extension even though the current implementation does not use it.
 */
void session_mgr_mark_started(uint64_t now_ms);

/**
 * @brief Mark the current session as stopped.
 *
 * @param now_ms Current monotonic uptime in milliseconds. Present for future
 *               extension even though the current implementation does not use it.
 */
void session_mgr_mark_stopped(uint64_t now_ms);

/**
 * @brief Return the current monotonically increasing session ID.
 *
 * @return Current session identifier, or `0` before the first session starts.
 */
uint32_t session_mgr_current_session_id(void);

/**
 * @brief Return the current internal session state.
 *
 * @return Current session state enum.
 */
session_state_t session_mgr_state(void);

/**
 * @brief Check whether a session is active.
 *
 * @return true when the session state is `SESSION_STATE_ACTIVE`.
 */
bool session_mgr_is_active(void);

/**
 * @brief Return the configured ignition-off drain window.
 *
 * This timeout lets the firmware finish final publishes/flushes before sleep.
 *
 * @return Drain timeout in milliseconds.
 */
uint32_t session_mgr_drain_timeout_ms(void);
