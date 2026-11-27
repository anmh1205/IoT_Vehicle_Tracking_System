/**
 * @file src/at/at_engine.c
 * @brief Execution and completion tracking for one outstanding AT command.
 *
 * Dispatch drives the engine on the modem task. Host tests supply their own writer and time.
 * The engine borrows command data, keeps one captured response and consumes matching lines and prompts.
 * The caller handles UART reads, deadlines between polls and routing of unclaimed lines.
 */
#include "at/at.h"
#include <string.h>
#include "ivts_core/base/str.h"

void at_engine_init(at_engine_t *e, at_tx_t tx)
{
    memset(e, 0, sizeof(*e));
    e->tx = tx;
}

ivts_err_t at_engine_start(at_engine_t *e, const at_cmd_t *cmd, ivts_ms_t now)
{
    if (e->busy) { return IVTS_ERR_INVALID_STATE; }
    if (cmd == NULL || cmd->text == NULL) { return IVTS_ERR_INVALID_ARG; }
    e->cmd = *cmd;
    e->deadline = now + cmd->timeout_ms;
    e->busy = true;
    e->ok_seen = false;
    e->data_sent = false;
    e->result = AT_RES_PENDING;
    e->resp[0] = '\0';
    e->tx.write(e->tx.ctx, cmd->text, strlen(cmd->text));
    e->tx.write(e->tx.ctx, "\r", 1);
    return IVTS_OK;
}

/** @brief Publish the terminal result and release the active command slot. */
static void finish(at_engine_t *e, at_result_t r)
{
    e->result = r;
    e->busy = false;
}

bool at_engine_on_line(at_engine_t *e, const char *line)
{
    if (!e->busy) { return false; }

    /* Ignore the modem's command echo before ATE0 takes effect. */
    if (strcmp(line, e->cmd.text) == 0) { return true; }

    at_line_kind_t kind = at_classify(line);
    if (kind == AT_LINE_OK) {
        if (e->cmd.data != NULL && !e->data_sent) { return true; }
        e->ok_seen = true;
        if (e->cmd.final_prefix == NULL) { finish(e, AT_RES_OK); }
        return true;
    }
    if (kind == AT_LINE_ERROR) {
        (void)ivts_str_copy(e->resp, sizeof(e->resp), line);
        finish(e, AT_RES_ERROR);
        return true;
    }
    /*
     * Match the active command first. For example, +CPIN: can arrive
     * unsolicited at boot or carry the AT+CPIN? response. +HTTPACTION: can
     * finish an active HTTP request or arrive as a URC.
     */
    if (e->cmd.final_prefix != NULL &&
        (e->cmd.final_exact ? strcmp(line, e->cmd.final_prefix) == 0 : at_has_prefix(line, e->cmd.final_prefix))) {
        if (e->cmd.data != NULL && !e->data_sent) { return true; }
        (void)ivts_str_copy(e->resp, sizeof(e->resp), line);
        int32_t err = 0;
        if (e->cmd.final_err_field > 0u &&
            (!at_field_int(line, (unsigned)e->cmd.final_err_field - 1u, &err) || err != 0)) {
            finish(e, AT_RES_ERROR);           /* A missing error field or nonzero error value fails the command. */
        } else {
            finish(e, AT_RES_OK);
        }
        return true;
    }
    if (e->cmd.capture != NULL && at_has_prefix(line, e->cmd.capture)) {
        (void)ivts_str_copy(e->resp, sizeof(e->resp), line);
        return true;
    }
    return false;          /* Let the caller route unsolicited or unknown lines. */
}

void at_engine_on_prompt(at_engine_t *e)
{
    if (!e->busy || e->cmd.data == NULL || e->data_sent) { return; }
    e->tx.write(e->tx.ctx, e->cmd.data, e->cmd.data_len);
    e->data_sent = true;
}

at_result_t at_engine_poll(at_engine_t *e, ivts_ms_t now)
{
    if (e->busy && now >= e->deadline) {
        finish(e, AT_RES_TIMEOUT);
    }
    return e->busy ? AT_RES_PENDING : e->result;
}
