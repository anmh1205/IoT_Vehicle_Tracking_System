/**
 * @file app_session.c
 * @brief Theo dõi phiên theo ignition và lưu các mốc chưa có PUBACK trong NVS.
 *
 * Task app là writer duy nhất. Phiên đang mở và mốc mới được commit cùng lúc.
 * Nếu reset sau PUBACK nhưng trước khi xoá mốc, lần gửi sau giữ nguyên định danh.
 */

#include "app_priv.h"
#include "app_timing.h"
#include <string.h>
#include "esp_log.h"
#include "ivts_core/payload/meta.h"
#include "storage/storage.h"

static bool commit(const ivts_session_state_t *next)
{
    if (storage_session_save(next) != IVTS_OK) {
        ESP_LOGW(APP_TAG, "không lưu được phiên");
        return false;
    }
    g_app.session = *next;
    return true;
}

void app_session_tick(void)
{
    if (g_app.axes.ign == IVTS_IGN_UNKNOWN) { return; }
    bool want_active = g_app.axes.ign == IVTS_IGN_ON && g_app.tracking_enabled;
    if (want_active == (g_app.session.active.local_key != 0u)) { return; }

    /* Giữ một chỗ cho mốc đóng khi mở phiên mới. Nếu offline quá lâu, chờ phát lại
     * các mốc cũ trước khi tạo phiên tiếp theo. */
    uint8_t limit = want_active ? IVTS_SESSION_OUTBOX_SIZE - 1u : IVTS_SESSION_OUTBOX_SIZE;
    if (g_app.session.count >= limit) { return; }

    static uint64_t next_attempt_ms;
    uint64_t now = app_now();
    if (now < next_attempt_ms) { return; }

    ivts_session_state_t next = g_app.session;
    ivts_session_boundary_t *b = &next.outbox[next.count++];
    memset(b, 0, sizeof *b);
    b->kind = want_active ? IVTS_BOUNDARY_STARTED : IVTS_BOUNDARY_ENDED;
    b->boot_id = g_app.boot_id;
    b->seq = app_rtc_next_seq();
    b->uptime_ms = (uint32_t)now;
    b->unix_ms = app_clock_unix_ms_or_zero(NULL);
    if (want_active) {
        next.active = (ivts_session_id_t){ .boot_id = b->boot_id, .local_key = b->seq };
    }
    b->session = next.active;
    if (!want_active) { next.active = (ivts_session_id_t){0}; }
    if (!commit(&next)) { next_attempt_ms = now + NVS_RETRY_MS; }
}

bool app_session_on_ack(void)
{
    ivts_session_state_t next = g_app.session;
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

bool app_session_assign(uint32_t local_key, const char *boot_id, uint64_t canonical_id)
{
    if (local_key == 0u || boot_id == NULL || canonical_id == 0u ||
        canonical_id > IVTS_SESSION_MAX_CANONICAL_ID) { return false; }

    ivts_session_state_t next = g_app.session;
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
    if (active) { g_app.status_dirty = true; }
    return true;
}
