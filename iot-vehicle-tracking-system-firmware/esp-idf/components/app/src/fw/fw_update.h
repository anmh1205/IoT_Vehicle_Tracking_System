/**
 * @file src/fw/fw_update.h
 * @brief App-side firmware-update orchestration and report lifecycle interfaces.
 *
 * Boot, command, publish and the app task use these interfaces. The app task owns update state.
 * The OTA worker invokes the preparation callback before selecting a new boot partition.
 * Firmware download and flashing belong to components/ota.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/ota/contract.h"

/* Restore the report and confirmation state from NVS before the app task starts. */
void app_fw_update_restore_at_boot(void);
/* OTA task hook. Persist context before setting the boot partition. */
ivts_err_t app_fw_update_prepare_boot(const ivts_ota_cmd_t *cmd, const char *partition);

/* App task. Consume download progress, then restart when the report window closes. */
void app_fw_update_poll(uint64_t now_ms);
/* App task. Apply the confirmation policy after its publish and control actions. */
void app_fw_update_confirm_tick(void);
bool app_fw_update_in_progress(void);
bool app_fw_update_blocks_restart(bool rollback);
void app_fw_update_cancel_confirmation(void);
/* App task. Return a cloud reason on rejection or NULL when a job starts. */
const char *app_fw_update_try_start(const ivts_ota_cmd_t *cmd);

/* Report outbox, owned by the app task. */
bool app_fw_update_prioritizes_report(void);
bool app_fw_update_report_needs_publish(void);
const ivts_fw_status_t *app_fw_update_report(void);
void app_fw_update_report_sent(void);
void app_fw_update_on_report_acked(bool ok);
void app_fw_update_note_health_ack(void);
