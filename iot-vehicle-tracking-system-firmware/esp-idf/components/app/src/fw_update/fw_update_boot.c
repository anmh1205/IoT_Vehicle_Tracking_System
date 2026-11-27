#include "persist/app_records.h"
#include "fw_update.h"
#include "app_clock.h"
#include "ivts_core/base/str.h"
#include "ivts_core/ota/confirm.h"
#include "storage/storage.h"

ivts_err_t app_fw_update_prepare_boot(const ivts_ota_cmd_t *cmd, const char *partition)
{
    ivts_ota_pending_t pending = { .pending = true, .timeout_s = cmd->confirm_timeout_s };
    bool trusted;
    uint64_t now = app_clock_unix_ms_or_zero(&trusted);
    if (trusted) { pending.deadline_unix_ms = now + (uint64_t)pending.timeout_s * 1000u; }
    (void)ivts_str_copy(pending.job_id, sizeof pending.job_id, cmd->job_id);
    (void)ivts_str_copy(pending.target_version, sizeof pending.target_version, cmd->version);
    (void)ivts_str_copy(pending.target_partition, sizeof pending.target_partition, partition);
    return app_records_ota_pending_save(&pending);
}
