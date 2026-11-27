/**
 * @file src/session/session_tracker.h
 * @brief App-task session tracking and publish boundary interfaces.
 *
 * The session folder owns trip identity, telemetry capture and the parked motion alarm. Boot restores
 * session state. Runtime, command and publish callers use it on the app task. Boundary and identity
 * views borrow app-owned storage. This module delegates flash access and message delivery to other modules.
 */
#pragma once
#include "ivts_core/model/session.h"
#include "ivts_core/model/telemetry.h"

/**
 * @brief Restore the active session and pending boundaries.
 *
 * A missing, unreadable or rejected record leaves empty session state.
 *
 * @note Context: Startup task. Blocking: synchronous NVS access with no timeout at this layer.
 */
void app_session_restore(void);
/**
 * @brief Reconcile the durable session with ignition and tracking policy.
 *
 * Ignore unknown ignition. Preserve space for a close when opening. Commit active state and a new boundary
 * together before changing RAM. Failed writes delay another transition attempt by 5000 ms.
 *
 * @param ignition Debounced vehicle ignition state.
 * @param tracking_enabled A session is desired only with tracking enabled and ignition ON.
 * @param boot_id Current boot identity for a newly created boundary.
 *
 * @note Context: App task. Blocking: up to two RTC reads, each with a 100 ms I2C lock timeout and a 50 ms
 * transfer timeout, then synchronous NVS access.
 */
void app_session_tick(ivts_ignition_t ignition, bool tracking_enabled, uint32_t boot_id);
/**
 * @brief Remove the oldest boundary after its successful modem ACK.
 *
 * Commit the shortened outbox before replacing RAM. A failed commit leaves the boundary eligible for replay.
 *
 * @retval true when removal commits or the outbox is already empty.
 * @retval false when the commit fails.
 *
 * @note Context: App task. Blocking: synchronous NVS access with no timeout at this layer.
 */
bool app_session_on_ack(void);
/**
 * @brief Persist a canonical ID for an active session or a pending close boundary.
 *
 * A repeated assignment of the same ID succeeds without a write. A conflicting ID is rejected.
 *
 * @param local_key Nonzero local session key.
 * @param boot_id Non-null boot ID string in the format used in cloud payloads. Borrowed for the call.
 * @param canonical_id Server ID from 1 through IVTS_SESSION_MAX_CANONICAL_ID.
 * @param[out] active_changed Optional flag. True only when a new ID is committed to the active session.
 *     Set false for a repeat assignment, a close-boundary assignment or a failure.
 * @retval true when the assignment commits or already matches.
 * @retval false for invalid input, missing match, conflict or write failure.
 *
 * @note Context: App task. Blocking: synchronous NVS access with no timeout at this layer.
 */
bool app_session_assign(uint32_t local_key, const char *boot_id, uint64_t canonical_id, bool *active_changed);
/**
 * @brief Check for pending session boundaries.
 *
 * @retval true when the boundary outbox contains an entry.
 * @retval false when it is empty.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
bool app_session_has_unsent_boundary(void);
/**
 * @brief Borrow the head of the session boundary outbox.
 *
 * @return Read-only app-owned boundary until the next session mutation, or NULL when empty.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
const ivts_session_boundary_t *app_session_oldest_boundary(void);
/**
 * @brief Borrow the active session identity.
 *
 * @return Read-only app-owned identity until the next session mutation. A zero local key indicates no active
 *     session.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
const ivts_session_id_t *app_session_active_id(void);
