/**
 * @file session_tracker.h
 * @brief App-task session tracking and publish boundary interfaces.
 *
 * The caller ticks session policy and acknowledges published boundaries on the
 * app task. Restoring or updating a durable session may wait on flash.
 */
#pragma once
#include "ivts_core/model/session.h"
#include "ivts_core/model/telemetry.h"

/* Load session and pending boundaries from NVS before starting the app task. */
void app_session_restore(void);
/* App task. Persist changes to ignition-derived session and boundary outbox. */
void app_session_tick(ivts_ignition_t ignition, bool tracking_enabled, uint32_t boot_id);
bool app_session_on_ack(void);
bool app_session_assign(uint32_t local_key, const char *boot_id, uint64_t canonical_id, bool *active_changed);
bool app_session_has_unsent_boundary(void);
const ivts_session_boundary_t *app_session_oldest_boundary(void);
const ivts_session_id_t *app_session_active_id(void);
