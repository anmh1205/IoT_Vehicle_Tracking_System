#include "persist/app_records.h"
#include "fw_update.h"
#include <string.h>
#include "app_clock.h"
#include "app_log.h"
#include "device/app_device.h"
#include "telemetry/telemetry_snapshot.h"
#include "ivts_core/ota/confirm.h"
#include "link/app_link.h"
#include "app_timing.h"
#include "esp_log.h"
#include "ivts_core/base/str.h"
#include "ota/ota.h"
#include "platform/platform.h"
#include "storage/storage.h"

static struct {
    bool has_health_ack;
    bool awaiting_confirmation;
    bool is_job_active;
    bool awaiting_final_report_ack;
    bool fw_report_needs_publish;
    uint64_t reboot_at_ms;
    ivts_ota_confirm_ctx_t confirm_ctx;
    ivts_fw_status_t report;
} s_update;

static void restore_pending_verify(const ivts_ota_confirm_ctx_t *saved)
{
    s_update.confirm_ctx = *saved;
    s_update.confirm_ctx.pending = true;
    if (s_update.confirm_ctx.timeout_s == 0u) { s_update.confirm_ctx.timeout_s = IVTS_OTA_CONFIRM_DEFAULT_S; }
    s_update.awaiting_confirmation = true;
    s_update.report.status = IVTS_OTA_ST_CONFIRMING;
    s_update.report.progress = IVTS_OTA_PCT_CONFIRMING;
    (void)ivts_str_copy(s_update.report.job_id, sizeof s_update.report.job_id, saved->job_id);
    (void)ivts_str_copy(s_update.report.target_version, sizeof s_update.report.target_version, saved->target_version);
    ESP_LOGW(APP_TAG, "image PENDING_VERIFY, hạn %lus", (unsigned long)s_update.confirm_ctx.timeout_s);
}

static bool image_landed(const ivts_ota_confirm_ctx_t *saved, const char *version, const char *partition)
{
    return saved->target_version[0] != '\0' && strcmp(saved->target_version, version) == 0 &&
                  (saved->target_partition[0] == '\0' || strcmp(saved->target_partition, partition) == 0);
}

static void restore_after_reboot(const ivts_ota_confirm_ctx_t *saved)
{
    bool landed = image_landed(saved, ota_running_version(), ota_running_partition());
    s_update.report.status = landed ? IVTS_OTA_ST_SUCCESS : IVTS_OTA_ST_ROLLED_BACK;
    s_update.report.progress = landed ? IVTS_OTA_PCT_DONE : 0u;
    s_update.report.error = landed ? IVTS_OTA_E_NONE : IVTS_OTA_E_CONFIRM_TIMEOUT;
    (void)ivts_str_copy(s_update.report.job_id, sizeof s_update.report.job_id, saved->job_id);
    (void)ivts_str_copy(s_update.report.target_version, sizeof s_update.report.target_version, saved->target_version);
    s_update.awaiting_final_report_ack = true;
    ESP_LOGW(APP_TAG, "OTA %s: %s", saved->target_version, landed ? "đã xác nhận" : "đã bị rollback");
}

static void restore_idle(void)
{
    s_update.report.status = IVTS_OTA_ST_SUCCESS;
    s_update.report.progress = IVTS_OTA_PCT_DONE;
}

void app_fw_update_restore_at_boot(void)
{
    ivts_ota_confirm_ctx_t saved;
    (void)app_records_ota_confirm_ctx_load(&saved);
    (void)ivts_str_copy(s_update.report.current_version, sizeof s_update.report.current_version, ota_running_version());
    (void)ivts_str_copy(s_update.report.partition, sizeof s_update.report.partition, ota_running_partition());
    s_update.fw_report_needs_publish = true;
    if (ota_image_pending_verify()) {
        restore_pending_verify(&saved);
    } else if (saved.pending) {
        restore_after_reboot(&saved);
    } else {
        restore_idle();
    }
}

/**
 * @brief Cập nhật trạng thái firmware và hẹn reboot khi đã sẵn sàng.
 */
static void app_fw_update_on_progress(const ivts_event_t *ev)
{
    s_update.report.status = ev->u.ota_progress.phase;
    s_update.report.progress = ev->u.ota_progress.pct;
    s_update.report.error = (uint8_t)ev->u.ota_progress.err;
    s_update.fw_report_needs_publish = true;
    if (ev->u.ota_progress.phase == IVTS_OTA_ST_REBOOTING) {
        s_update.is_job_active = false;
        s_update.reboot_at_ms = app_now() + OTA_REBOOT_DELAY_MS;
    } else if (ev->u.ota_progress.phase == IVTS_OTA_ST_FAILED) {
        s_update.is_job_active = false;
        s_update.awaiting_final_report_ack = ev->u.ota_progress.err == IVTS_OTA_E_SET_BOOT;
    }
}

static uint64_t s_confirm_retry_at_ms;

static void accept_running_image(uint64_t uptime_ms)
{
    if (ota_mark_valid() == IVTS_OK) {
        s_update.awaiting_confirmation = false;
        s_update.awaiting_final_report_ack = s_update.confirm_ctx.job_id[0] != '\0';
        s_update.report.status = IVTS_OTA_ST_SUCCESS;
        s_update.report.progress = IVTS_OTA_PCT_DONE;
        (void)ivts_str_copy(s_update.report.current_version, sizeof s_update.report.current_version, ota_running_version());
        (void)ivts_str_copy(s_update.report.partition, sizeof s_update.report.partition, ota_running_partition());
        s_update.fw_report_needs_publish = true;
        ESP_LOGI(APP_TAG, "image hợp lệ: đã mark valid");
    } else {
        s_confirm_retry_at_ms = uptime_ms + OTA_MARK_VALID_RETRY_MS;
        ESP_LOGW(APP_TAG, "chưa đánh dấu được image OTA hợp lệ");
    }
}

static void rollback_running_image(uint64_t uptime_ms)
{
    ESP_LOGE(APP_TAG, "quá hạn confirm: rollback");
    (void)ota_rollback_and_reboot();
    s_confirm_retry_at_ms = uptime_ms + OTA_ROLLBACK_RETRY_MS;
}

/**
 * @brief Quyết định chấp nhận hay rollback image OTA đang chờ xác nhận.
 *
 * Xác nhận trước hạn khi broker đang kết nối và đã PUBACK bản tin trạng thái trong lần boot này.
 */
void app_fw_update_confirm_tick(void)
{
    if (!s_update.awaiting_confirmation) { return; }
    uint64_t uptime = app_now();
    if (uptime < s_confirm_retry_at_ms) { return; }
    bool trusted;
    uint64_t now = app_clock_unix_ms_or_zero(&trusted);
    bool healthy = app_link_is_broker_up() && s_update.has_health_ack;
    switch (ivts_ota_confirm_decide(&s_update.confirm_ctx, healthy, now, trusted, uptime)) {
    case IVTS_CONFIRM_ACCEPT:
        accept_running_image(uptime);
        break;
    case IVTS_CONFIRM_ROLLBACK:
        rollback_running_image(uptime);
        break;
    case IVTS_CONFIRM_WAIT:
        break;
    }
}

static void on_report_failed(void)
{
    s_update.fw_report_needs_publish = true;
}

static void confirm_health_from_report(void)
{
    s_update.has_health_ack = true;
}

static void release_reboot_after_report(void)
{
    s_update.reboot_at_ms = app_now();
}

static void clear_confirm_ctx_after_report(void)
{
    ivts_ota_confirm_ctx_t empty = {0};
    if (app_records_ota_confirm_ctx_save(&empty) == IVTS_OK) { s_update.awaiting_final_report_ack = false; }
    else { on_report_failed(); }
}

void app_fw_update_on_report_acked(bool ok)
{
    if (!ok) {
        on_report_failed();
    } else if (s_update.awaiting_confirmation) {
        confirm_health_from_report();
    } else if (!s_update.fw_report_needs_publish && s_update.reboot_at_ms != 0u) {
        release_reboot_after_report();
    } else if (!s_update.fw_report_needs_publish && s_update.awaiting_final_report_ack) {
        clear_confirm_ctx_after_report();
    }
}

const char *app_fw_update_try_start(const ivts_ota_cmd_t *cmd)
{
    if (!cmd->force && strcmp(cmd->version, ota_running_version()) == 0) { return "already_running"; }
    if (app_telemetry_view()->ignition != IVTS_IGN_OFF && !cmd->force) { return "unsafe_runtime_window"; }
    if (app_fw_update_in_progress() || s_update.awaiting_final_report_ack) { return "ota_busy"; }
    if (app_telemetry_view()->device_mv < app_device_config()->ota_min_battery_mv) { return "low_battery"; }

    ivts_err_t e = ota_start(cmd, app_telemetry_view()->device_mv, app_device_config()->ota_min_battery_mv);
    if (e != IVTS_OK) { return "ota_busy"; }
    s_update.is_job_active = true;
    memset(&s_update.report, 0, sizeof s_update.report);
    (void)ivts_str_copy(s_update.report.job_id, sizeof s_update.report.job_id, cmd->job_id);
    (void)ivts_str_copy(s_update.report.target_version, sizeof s_update.report.target_version, cmd->version);
    (void)ivts_str_copy(s_update.report.current_version, sizeof s_update.report.current_version, ota_running_version());
    (void)ivts_str_copy(s_update.report.partition, sizeof s_update.report.partition, ota_running_partition());
    return NULL;
}

void app_fw_update_poll(uint64_t now_ms)
{
    ivts_event_t progress;
    if (ota_progress_take(&progress)) { app_fw_update_on_progress(&progress); }
    if (s_update.reboot_at_ms != 0u && now_ms >= s_update.reboot_at_ms) {
        platform_restart("ota_reboot");
    }
}

bool app_fw_update_in_progress(void)
{
    return s_update.is_job_active || s_update.awaiting_confirmation || s_update.reboot_at_ms != 0u;
}

bool app_fw_update_blocks_restart(bool rollback)
{
    return s_update.is_job_active || (!rollback && s_update.awaiting_confirmation) ||
           s_update.reboot_at_ms != 0u;
}

void app_fw_update_cancel_confirmation(void)
{
    s_update.awaiting_confirmation = false;
}

bool app_fw_update_prioritizes_report(void)
{
    return s_update.reboot_at_ms != 0u || s_update.awaiting_confirmation;
}

bool app_fw_update_report_needs_publish(void)
{
    return s_update.fw_report_needs_publish;
}

const ivts_fw_status_t *app_fw_update_report(void)
{
    return &s_update.report;
}

void app_fw_update_report_sent(void)
{
    s_update.fw_report_needs_publish = false;
}

void app_fw_update_note_health_ack(void)
{
    s_update.has_health_ack = true;
}
