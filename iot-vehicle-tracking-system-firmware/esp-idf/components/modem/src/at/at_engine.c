#include "at/at.h"
#include <string.h>
#include "ivts_core/base/str.h"

/* Xem at_engine.h. */
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

/** Kết thúc lệnh hiện tại với kết quả @p r. */
static void finish(at_engine_t *e, at_result_t r)
{
    e->result = r;
    e->busy = false;
}

bool at_engine_on_line(at_engine_t *e, const char *line)
{
    if (!e->busy) { return false; }

    /* Echo của chính lệnh: xảy ra khi echo đang bật (ATE1) hoặc trước khi ATE0 có hiệu lực. */
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
    /* Tiền tố của lệnh đang chạy được so trước khi coi dòng là URC, vì một số dòng vừa là URC
     * vừa là phản hồi: "+CPIN:" xuất hiện lúc boot và cũng là phản hồi của AT+CPIN?;
     * "+HTTPACTION:" là URC nhưng cũng là kết quả của AT+HTTPACTION. */
    if (e->cmd.final_prefix != NULL &&
        (e->cmd.final_exact ? strcmp(line, e->cmd.final_prefix) == 0 : at_has_prefix(line, e->cmd.final_prefix))) {
        if (e->cmd.data != NULL && !e->data_sent) { return true; }
        (void)ivts_str_copy(e->resp, sizeof(e->resp), line);
        int32_t err = 0;
        if (e->cmd.final_err_field > 0u &&
            (!at_field_int(line, (unsigned)e->cmd.final_err_field - 1u, &err) || err != 0)) {
            finish(e, AT_RES_ERROR);           /* Mã lỗi khác 0, hoặc dòng sai định dạng nên không đọc được mã. */
        } else {
            finish(e, AT_RES_OK);
        }
        return true;
    }
    if (e->cmd.capture != NULL && at_has_prefix(line, e->cmd.capture)) {
        (void)ivts_str_copy(e->resp, sizeof(e->resp), line);
        return true;
    }
    return false;          /* URC hoặc dòng không xác định: caller xử lý. */
}

/* Prompt chỉ có ý nghĩa với lệnh có data; gửi data đúng một lần. */
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
