#include "cmd_receipts.h"
#include <string.h>
#include "app_log.h"
#include "esp_log.h"
#include "storage/storage.h"

static ivts_cmd_receipts_t s_receipts;
static bool s_receipts_ready;
static bool s_needs_checkpoint;

static bool load_receipts(void)
{
    ivts_err_t e = storage_command_receipts_load(&s_receipts);
    if (e != IVTS_OK && e != IVTS_ERR_NOT_FOUND) {
        ESP_LOGW(APP_TAG, "command receipts NVS: %s", ivts_err_name(e));
        return false;
    }
    return true;
}

void cmd_receipts_init(void)
{
    s_needs_checkpoint = false;
    s_receipts_ready = load_receipts();
}

bool cmd_receipts_ready(void)
{
    if (!s_receipts_ready) { s_receipts_ready = load_receipts(); }
    return s_receipts_ready;
}

bool cmd_receipts_contains(const char *id)
{
    for (size_t i = 0; i < IVTS_CMD_RECEIPTS_COUNT; i++) {
        if (strcmp(s_receipts.id[i], id) == 0) { return true; }
    }
    return false;
}

void cmd_receipts_append(const char *id)
{
    memcpy(s_receipts.id[s_receipts.next], id, sizeof s_receipts.id[s_receipts.next]);
    s_receipts.next = (uint8_t)((s_receipts.next + 1u) % IVTS_CMD_RECEIPTS_COUNT);
    s_needs_checkpoint = true;
}

bool cmd_receipts_needs_checkpoint(void) { return s_needs_checkpoint; }

bool cmd_receipts_flush(void)
{
    if (storage_command_receipts_save(&s_receipts) != IVTS_OK) { return false; }
    s_needs_checkpoint = false;
    return true;
}
