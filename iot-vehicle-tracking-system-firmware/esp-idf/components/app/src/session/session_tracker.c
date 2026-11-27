/**
 * @file session_tracker.c
 * @brief Theo dõi phiên theo ignition và lưu các mốc chưa có PUBACK trong NVS.
 *
 * Task app là writer duy nhất. Phiên đang mở và mốc mới được commit cùng lúc.
 * Nếu reset sau PUBACK nhưng trước khi xoá mốc, lần gửi sau giữ nguyên định danh.
 */

#include "session_tracker.h"
#include "app_priv.h"
#include "app_timing.h"
#include <string.h>
#include "esp_log.h"
#include "ivts_core/payload/meta.h"
#include "storage/storage.h"

static ivts_session_state_t s_session;

static bool commit(const ivts_session_state_t *next)
{
    if (storage_session_save(next) != IVTS_OK) {
        ESP_LOGW(APP_TAG, "không lưu được phiên");
        return false;
    }
    s_session = *next;
    return true;
}

static uint64_t s_session_retry_at_ms;

static bool wants_active_session(ivts_ignition_t ignition, bool tracking_enabled)
{
    return ignition == IVTS_IGN_ON && tracking_enabled;
}

static bool outbox_has_room(bool want_active)
{
    /* Giữ một chỗ cho mốc đóng khi mở phiên mới. */
    uint8_t limit = want_active ? IVTS_SESSION_OUTBOX_SIZE - 1u : IVTS_SESSION_OUTBOX_SIZE;
    return s_session.count < limit;
}

static void make_boundary(ivts_session_boundary_t *boundary, ivts_boundary_kind_t kind, uint64_t now_ms, uint32_t boot_id)
{
    memset(boundary, 0, sizeof *boundary);
    boundary->kind = kind;
    boundary->boot_id = boot_id;
    boundary->seq = app_rtc_next_seq();
    boundary->uptime_ms = (uint32_t)now_ms;
    boundary->unix_ms = app_clock_unix_ms_or_zero(NULL);
}

void app_session_restore(void)
{
    ivts_err_t error = storage_session_load(&s_session);
    if (error != IVTS_OK && error != IVTS_ERR_NOT_FOUND) {
        ESP_LOGW(APP_TAG, "session NVS: %s", ivts_err_name(error));
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
    if (!commit(&next)) { s_session_retry_at_ms = now + NVS_RETRY_MS; }
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
        /* Bridge có thể trả định danh sau khi ignition đã OFF, trong lúc mốc đóng còn chờ gửi. */
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
