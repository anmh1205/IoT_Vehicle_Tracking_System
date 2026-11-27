/**
 * @file cmd_restart.c
 * @brief Durable restart and rollback intent with ACK-driven completion.
 *
 * Track the original OTA slot and defer the requested restart until the ACK is
 * delivered or the established deadline expires.
 */
#include "persist/persist.h"
#include "command/command.h"
#include <string.h>
#include "telemetry.h"
#include "app_internal.h"
#include "fw_update.h"
#include "ivts_core/base/str.h"
#include "ota/ota.h"
#include "platform/platform.h"
#include "storage/storage.h"

static bool s_awaiting_checkpoint;
static uint64_t s_restart_at_ms;

static const char *load_restart_intent(ivts_restart_intent_t *intent, const char *id, bool *same)
{
    ivts_err_t error = app_records_restart_intent_load(intent);
    if (error != IVTS_OK && error != IVTS_ERR_NOT_FOUND) { return "dedupe_unavailable"; }
    *same = error == IVTS_OK && strcmp(intent->id, id) == 0;
    return NULL;
}

static bool is_duplicate_restart(const ivts_restart_intent_t *intent, bool rollback, const char *running)
{
    return !rollback || intent->rollback_origin[0] == '\0' ||
           strcmp(intent->rollback_origin, running) != 0;
}

static const char *check_restart_preconditions(bool rollback)
{
    if (app_fw_update_blocks_restart(rollback)) { return "ota_busy"; }
    if (rollback && app_telemetry_view()->ignition != IVTS_IGN_OFF) { return "unsafe_runtime_window"; }
    if (rollback && !ota_can_rollback()) { return "no_rollback_image"; }
    return NULL;
}

static const char *persist_restart_intent(const char *id, bool rollback, const char *running)
{
    ivts_restart_intent_t intent = {0};
    (void)ivts_str_copy(intent.id, sizeof intent.id, id);
    if (rollback && ivts_str_copy(intent.rollback_origin, sizeof intent.rollback_origin, running) != IVTS_OK) {
        return "no_rollback_image";
    }
    if (app_records_restart_intent_save(&intent) != IVTS_OK) { return "persist_failed"; }
    return NULL;
}

static const char *request_restart(const char *id, bool rollback)
{
    ivts_restart_intent_t intent;
    bool same;
    const char *reason = load_restart_intent(&intent, id, &same);
    if (reason != NULL) { return reason; }
    const char *running = ota_running_partition();
    if (rollback && running[0] == '\0') { return "no_rollback_image"; }
    if (same && is_duplicate_restart(&intent, rollback, running)) { return NULL; }

    reason = check_restart_preconditions(rollback);
    if (reason != NULL) { return reason; }
    if (!same) {
        reason = persist_restart_intent(id, rollback, running);
        if (reason != NULL) { return reason; }
    }
    /*
     * After a power loss with a persisted rollback intent, retry the rollback
     * only while running on the original image slot.
     */
    if (rollback) {
        if (ota_schedule_rollback() != IVTS_OK) { return "no_rollback_image"; }
        app_fw_update_cancel_confirmation();
    }
    s_awaiting_checkpoint = true;
    return NULL;
}

const char *cmd_reboot_handle(const cmd_envelope_t *command)
{
    return request_restart(command->id, false);
}

const char *cmd_rollback_handle(const cmd_envelope_t *command)
{
    return request_restart(command->id, true);
}

void cmd_restart_init(void)
{
    s_awaiting_checkpoint = false;
    s_restart_at_ms = 0;
}

bool cmd_restart_is_scheduled(void)
{
    return s_awaiting_checkpoint || s_restart_at_ms != 0u;
}

void cmd_restart_on_checkpoint(uint64_t now_ms)
{
    if (s_awaiting_checkpoint) {
        s_awaiting_checkpoint = false;
        s_restart_at_ms = now_ms + CMD_RESTART_DELAY_MS;
    }
}

void cmd_restart_on_ack(void)
{
    if (s_restart_at_ms != 0u) {
        s_restart_at_ms = 0;
        platform_restart("cmd_restart");
    }
}

void cmd_restart_tick(uint64_t now_ms)
{
    if (s_restart_at_ms != 0u && now_ms >= s_restart_at_ms) {
        platform_restart("cmd_restart_timeout");
    }
}
