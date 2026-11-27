/**
 * @file cmd_inbox.c
 * @brief Command envelope parsing, handler dispatch and reliable command ACK delivery.
 *
 * The app task owns parsing buffers, the in-flight ACK and retry state.
 * Checkpoint successful receipts before handing an ACK to the publisher.
 */
#include "command/command.h"
#include <string.h>
#include "app_internal.h"
#include "platform/log.h"
#include "modem/modem.h"
#include "publish/publish.h"

#define CMD_TOKEN_CAPACITY 64

typedef struct {
    char id[IVTS_CMD_ID_SIZE];
    const char *status;
    const char *response;
} command_ack_t;

static char s_cmd_json[MODEM_CMD_MAX];
static ivts_jtok_t s_cmd_tokens[CMD_TOKEN_CAPACITY];
static command_ack_t s_ack;
static uint64_t s_ack_retry_at_ms;

void app_cmd_init(void)
{
    s_ack = (command_ack_t){0};
    s_ack_retry_at_ms = 0;
    cmd_restart_init();
    cmd_location_init();
    cmd_receipts_init();
}

void cmd_inbox_complete(const char *reason)
{
    s_ack.response = reason;
    s_ack.status = reason == NULL ? "acknowledged" : "failed";
    if (reason == NULL) {
        IVTS_LOGI(APP_TAG, "cmd done id=%s status=acknowledged", s_ack.id);
    } else {
        IVTS_LOGW(APP_TAG, "cmd done id=%s status=failed reason=%s", s_ack.id, reason);
    }
    if (reason == NULL) { cmd_receipts_append(s_ack.id); }
}

static int take_and_parse_command(void)
{
    size_t len = 0;
    if (modem_cmd_take(s_cmd_json, sizeof s_cmd_json, &len) != IVTS_OK) { return 0; }
    int n = ivts_json_parse(s_cmd_json, len, s_cmd_tokens, CMD_TOKEN_CAPACITY, 4);
    if (n <= 0 || s_cmd_tokens[0].type != IVTS_JT_OBJ) {
        IVTS_LOGW(APP_TAG, "cmd received result=malformed_json size=%uB", (unsigned)len);
        return 0;
    }
    return n;
}

static void read_command_envelope(int token_count, cmd_envelope_t *envelope)
{
    const ivts_json_obj_t root = { s_cmd_json, s_cmd_tokens, token_count, 0 };
    envelope->has_id = ivts_json_obj_read_id(&root, "command_id", envelope->id, sizeof envelope->id) ||
                       ivts_json_obj_read_id(&root, "commandId", envelope->id, sizeof envelope->id);
    envelope->has_name = ivts_json_obj_get_str(&root, "command", envelope->name, sizeof envelope->name) &&
                         envelope->name[0] != '\0';
    int params = ivts_json_find(s_cmd_json, s_cmd_tokens, token_count, 0, "params");
    envelope->params = (ivts_json_obj_t){ s_cmd_json, s_cmd_tokens, token_count, params };
    envelope->has_params = params >= 0 && s_cmd_tokens[params].type == IVTS_JT_OBJ;
}

static void handle_internal_assignment(const cmd_envelope_t *envelope)
{
    if (!envelope->has_id && envelope->has_name && envelope->has_params &&
        strcmp(envelope->name, "assign_session") == 0) {
        (void)cmd_session_handle(envelope);
    }
}

void app_cmd_handle(void)
{
    if (app_cmd_pending()) { return; }
    int token_count = take_and_parse_command();
    if (token_count == 0) { return; }
    cmd_envelope_t envelope = {0};
    read_command_envelope(token_count, &envelope);
    IVTS_LOGI(APP_TAG, "cmd received id=%s name=%s params=%s", envelope.id[0] != '\0' ? envelope.id : "-",
              envelope.has_name ? envelope.name : "-", IVTS_LOG_YES(envelope.has_params));
    if (envelope.id[0] == '\0') {
        handle_internal_assignment(&envelope);
        return;
    }

    s_ack = (command_ack_t){0};
    memcpy(s_ack.id, envelope.id, sizeof s_ack.id);
    if (!cmd_receipts_ready()) { cmd_inbox_complete("dedupe_unavailable"); return; }
    if (cmd_receipts_contains(envelope.id)) {
        IVTS_LOGI(APP_TAG, "cmd duplicate id=%s action=ack_again", envelope.id);
        s_ack.status = "acknowledged";
        return;
    }

    cmd_result_t result = cmd_table_dispatch(&envelope);
    if (!result.awaits_completion) { cmd_inbox_complete(result.reason); }
}

bool app_cmd_pending(void)
{
    return s_ack.id[0] != '\0';
}

bool app_cmd_blocks_sleep(void)
{
    return app_cmd_needs_gnss() || cmd_restart_is_scheduled();
}

void app_cmd_on_ack(bool ok)
{
    IVTS_LOGD(APP_TAG, "cmd ack_published id=%s result=%s", s_ack.id, IVTS_LOG_OK(ok));
    if (!ok) {
        s_ack_retry_at_ms = app_now() + ACK_RETRY_MS;
        return;
    }
    s_ack = (command_ack_t){0};
    s_ack_retry_at_ms = 0;
    cmd_restart_on_ack();
}

static bool flush_receipts_checkpoint(uint64_t now_ms)
{
    if (!cmd_receipts_needs_checkpoint()) { return true; }
    if (!cmd_receipts_flush()) {
        s_ack_retry_at_ms = now_ms + ACK_RETRY_MS;
        return false;
    }
    cmd_restart_on_checkpoint(now_ms);
    return true;
}

static void send_pending_ack(uint64_t now_ms)
{
    if (s_ack.status == NULL || now_ms < s_ack_retry_at_ms || !flush_receipts_checkpoint(now_ms)) { return; }
    (void)app_messages_publish_command_ack(s_ack.id, s_ack.status, s_ack.response);
}

void app_cmd_tick(void)
{
    uint64_t now_ms = app_now();
    cmd_restart_tick(now_ms);
    cmd_location_tick(now_ms);
    send_pending_ack(now_ms);
}

typedef struct {
    const char *name;
    const char *(*handle)(const cmd_envelope_t *command);
    bool needs_params;
    bool awaits_completion;
} command_handler_t;

static const command_handler_t k_handlers[] = {
    { "ota_update",      cmd_ota_handle,      true,  false },
    { "update_config",   cmd_config_handle,   true,  false },
    { "enable_tracking", cmd_tracking_handle, true,  false },
    { "assign_session",  cmd_session_handle,  true,  false },
    { "request_location", cmd_location_handle, false, true },
    { "reboot",           cmd_reboot_handle,    false, false },
    { "ota_rollback",     cmd_rollback_handle,  false, false },
    { "manual_rollback",  cmd_rollback_handle,  false, false },
};

cmd_result_t cmd_table_dispatch(const cmd_envelope_t *command)
{
    if (!command->has_name) { return (cmd_result_t){ .reason = "malformed" }; }
    for (size_t i = 0; i < sizeof k_handlers / sizeof k_handlers[0]; i++) {
        const command_handler_t *handler = &k_handlers[i];
        if (strcmp(command->name, handler->name) != 0) { continue; }
        if (handler->needs_params && !command->has_params) {
            return (cmd_result_t){ .reason = "missing_params" };
        }
        const char *reason = handler->handle(command);
        return (cmd_result_t){ .reason = reason, .awaits_completion = reason == NULL && handler->awaits_completion };
    }
    return (cmd_result_t){ .reason = "unknown_command" };
}
