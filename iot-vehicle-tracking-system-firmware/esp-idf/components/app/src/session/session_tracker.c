/**
 * @file src/session/session_tracker.c
 * @brief Ignition-session tracking and durable delivery of session boundaries.
 *
 * Boot loads the retained session. The app task commits the active session and its new boundary
 * together. A reset between PUBACK and removal can replay the boundary with its original identity.
 * The command handler can assign an ID to an active session or a pending close.
 * The publisher gates boundary delivery and the record layer owns NVS access.
 */
#include "persist/persist.h"

#include "session/session_tracker.h"
#include "app_internal.h"
#include <string.h>
#include "platform/log.h"
#include "ivts_core/payload/meta.h"
#include "storage/storage.h"

/* Startup restores this record. The app task serializes commits, assignment and delivery. */
static ivts_session_state_t s_session;

/** @brief Change the active session and outbox in RAM only after their joint NVS commit succeeds. */
static bool commit(const ivts_session_state_t *next)
{
    if (app_records_session_save(next) != IVTS_OK) {
        IVTS_LOGW(APP_TAG, "session save result=fail retry=%ums", (unsigned)NVS_RETRY_MS);
        return false;
    }
    s_session = *next;
    return true;
}

/* The app task owns transition backoff after a failed session save. */
static uint64_t s_session_retry_at_ms;

static bool wants_active_session(ivts_ignition_t ignition, bool tracking_enabled)
{
    return ignition == IVTS_IGN_ON && tracking_enabled;
}

static bool outbox_has_room(bool want_active)
{
    /* Reserve space for the close boundary before opening a session. */
    uint8_t limit = want_active ? IVTS_SESSION_OUTBOX_SIZE - 1u : IVTS_SESSION_OUTBOX_SIZE;
    return s_session.count < limit;
}

/** @brief Allocate a message identity and capture the boundary time before committing the session. */
static void make_boundary(ivts_session_boundary_t *boundary, ivts_boundary_kind_t kind, uint64_t now_ms, uint32_t boot_id)
{
    memset(boundary, 0, sizeof *boundary);
    boundary->kind = kind;
    boundary->boot_id = boot_id;
    boundary->seq = app_msg_seq_next();
    boundary->uptime_ms = (uint32_t)now_ms;
    boundary->unix_ms = app_clock_unix_ms_or_zero(NULL);
}

void app_session_restore(void)
{
    ivts_err_t error = app_records_session_load(&s_session);
    if (error != IVTS_OK && error != IVTS_ERR_NOT_FOUND) {
        IVTS_LOGW(APP_TAG, "session load result=%s", ivts_err_name(error));
    }
}

bool app_session_has_unsent_boundary(void) { return s_session.count != 0u; }

const ivts_session_boundary_t *app_session_oldest_boundary(void)
{
    return app_session_has_unsent_boundary() ? &s_session.outbox[0] : NULL;
}

const ivts_session_id_t *app_session_active_id(void) { return &s_session.active; }

void app_session_tick(ivts_ignition_t ignition, bool tracking_enabled, uint32_t boot_id)
{
    if (ignition == IVTS_IGN_UNKNOWN) { return; }
    bool want_active = wants_active_session(ignition, tracking_enabled);
    if (want_active == (s_session.active.local_key != 0u)) { return; }

    if (!outbox_has_room(want_active)) { return; }

    uint64_t now = app_now();
    if (now < s_session_retry_at_ms) { return; }

    ivts_session_state_t next = s_session;
    ivts_session_boundary_t *b = &next.outbox[next.count++];
    make_boundary(b, want_active ? IVTS_BOUNDARY_STARTED : IVTS_BOUNDARY_ENDED, now, boot_id);
    if (want_active) {
        next.active = (ivts_session_id_t){ .boot_id = b->boot_id, .local_key = b->seq };
    }
    b->session = next.active;
    if (!want_active) { next.active = (ivts_session_id_t){0}; }
    if (!commit(&next)) {
        s_session_retry_at_ms = now + NVS_RETRY_MS;
        return;
    }
    IVTS_LOGI(APP_TAG, "session %s boot=%lu key=%lu seq=%lu outbox=%u", want_active ? "open" : "close",
              (unsigned long)b->session.boot_id, (unsigned long)b->session.local_key, (unsigned long)b->seq,
              (unsigned)s_session.count);
}

bool app_session_on_ack(void)
{
    ivts_session_state_t next = s_session;
    if (next.count == 0u) { return true; }
    next.count--;
    memmove(next.outbox, next.outbox + 1, next.count * sizeof next.outbox[0]);
    memset(&next.outbox[next.count], 0, sizeof next.outbox[0]);
    return commit(&next);
}

static bool assignment_matches(const ivts_session_id_t *session, uint32_t local_key, const char *boot_id)
{
    if (session->local_key != local_key) { return false; }
    char local_boot[IVTS_BOOT_ID_SIZE];
    ivts_boot_id_format(local_boot, session->boot_id);
    return strcmp(boot_id, local_boot) == 0;
}

bool app_session_assign(uint32_t local_key, const char *boot_id, uint64_t canonical_id, bool *active_changed)
{
    if (active_changed != NULL) { *active_changed = false; }
    if (local_key == 0u || boot_id == NULL || canonical_id == 0u ||
        canonical_id > IVTS_SESSION_MAX_CANONICAL_ID) { return false; }

    ivts_session_state_t next = s_session;
    bool active = assignment_matches(&next.active, local_key, boot_id);
    ivts_session_id_t *target = active ? &next.active : NULL;
    if (target == NULL) {
        /*
         * The bridge can assign a session ID after ignition turns off while
         * the close boundary is still pending.
         */
        for (size_t i = 0; i < next.count; i++) {
            ivts_session_boundary_t *boundary = &next.outbox[i];
            if (boundary->kind == IVTS_BOUNDARY_ENDED && assignment_matches(&boundary->session, local_key, boot_id)) {
                target = &boundary->session;
                break;
            }
        }
    }
    if (target == NULL) { return false; }
    if (target->canonical_id != 0u) { return target->canonical_id == canonical_id; }
    target->canonical_id = canonical_id;
    if (!commit(&next)) { return false; }
    if (active_changed != NULL) { *active_changed = active; }
    return true;
}
