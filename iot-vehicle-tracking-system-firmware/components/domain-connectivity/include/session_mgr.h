#pragma once

#include <stdbool.h>
#include <stdint.h>

/**
 * @file session_mgr.h
 * @brief Ignition-only session lifecycle with debounce and OFF drain window.
 */

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
 * @brief Mark the current ignition-driven session as started.
 */
void session_mgr_mark_started(void);

/**
 * @brief Mark the current session as stopped.
 */
void session_mgr_mark_stopped(void);

/**
 * @brief Restore an already-open session after reboot.
 *
 * @param session_id Session identifier that should remain active.
 */
void session_mgr_restore_active(uint32_t session_id);

/**
 * @brief Return the current monotonically increasing session ID.
 *
 * @return Current session identifier, or `0` before the first session starts.
 */
uint32_t session_mgr_current_session_id(void);

/**
 * @brief Report whether the manager has accepted at least one debounced sample.
 *
 * @return true when a stable ignition level is known.
 */
bool session_mgr_has_stable_ignition(void);

/**
 * @brief Return the latest debounced ignition state.
 *
 * @return true when the accepted debounced ignition level is ON.
 */
bool session_mgr_stable_ignition(void);
