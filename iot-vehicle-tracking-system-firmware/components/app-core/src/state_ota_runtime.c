#include "state_ota_runtime.h"

#include "esp_log.h"
#include "esp_ota_ops.h"
#include "esp_system.h"

#include "nvs_config.h"
#include "ota_executor.h"
#include "state_machine_internal.h"
#include "state_publish_pipeline.h"
#include "state_runtime_context.h"
#include "state_wake_prelude.h"
#include "util.h"

/**
 * @file state_ota_runtime.c
 * @brief OTA command, confirm, and persisted OTA-context helpers.
 * This translation unit belongs to the app-core orchestration layer and keeps FSM transitions, retained runtime state, and orchestration policy centralized inside app-core.
 */


static const char *TAG = "OTA_RUNTIME";

/**
 * @brief Persist the current OTA confirm context to NVS.
 *
 * RTC memory survives deep sleep but not all reset paths. Persisting the OTA
 * confirm context lets the next boot continue the authoritative confirm/timeout
 * flow even after crashes or watchdog resets.
 */
static void state_machine_persist_ota_context(void) {
    ota_persist_context_t persisted = {0};
    persisted.pending_confirm = g_rtc_context.ota_pending_confirm;
    persisted.confirm_timeout_sec = g_rtc_context.ota_confirm_timeout_sec;
    persisted.confirm_deadline_ms = g_rtc_context.ota_confirm_deadline_ms;
    util_copy_string(persisted.job_id, sizeof(persisted.job_id), g_rtc_context.ota_job_id);
    util_copy_string(persisted.target_version,
                     sizeof(persisted.target_version),
                     g_rtc_context.ota_target_version);
    util_copy_string(persisted.previous_version,
                     sizeof(persisted.previous_version),
                     g_rtc_context.ota_previous_version);
    util_copy_string(persisted.partition, sizeof(persisted.partition), g_rtc_context.ota_partition);

    esp_err_t err = nvs_config_save_ota_context(&persisted);
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "event=ota_context_persist_failed err=%s", esp_err_to_name(err));
    }
}

/**
 * @brief Clear OTA context from NVS storage.
 *
 * Removes any persisted OTA context from NVS, called after successful OTA
 * confirmation or when OTA operation is cancelled/aborted.
 *
 * Workflow:
 * 1. Call nvs_config_clear_ota_context() to erase OTA keys from NVS
 * 2. Log warning if clear operation fails (non-fatal)
 */
static void state_machine_clear_persisted_ota_context(void) {
    esp_err_t err = nvs_config_clear_ota_context();
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "event=ota_context_clear_failed err=%s", esp_err_to_name(err));
    }
}

/**
 * @brief Restore OTA context from NVS on boot.
 *
 * Called during initialization to recover any pending OTA confirmations that
 * survived a reboot. If OTA was in progress when device rebooted, this restores
 * the confirm deadline and job details so confirm check can proceed.
 *
 * Workflow:
 * 1. If ota_pending_confirm already set, skip (already processed this boot)
 * 2. Load OTA context from NVS via nvs_config_load_ota_context()
 * 3. If not found or no pending confirm, return (nothing to restore)
 * 4. Restore all OTA fields into g_rtc_context (job_id, version, partition, deadline)
 * 5. Log restored context for debugging
 *
 * @note If NVS load fails or context invalid, operation is skipped silently.
 */
void state_machine_restore_ota_context_from_nvs(void) {
    if (g_rtc_context.ota_pending_confirm) {
        return;
    }

    ota_persist_context_t persisted = {0};
    bool found = false;
    esp_err_t err = nvs_config_load_ota_context(&persisted, &found);
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "event=ota_context_load_failed err=%s", esp_err_to_name(err));
        return;
    }
    if (!found) {
        return;
    }
    if (!persisted.pending_confirm || util_string_empty(persisted.job_id) ||
        util_string_empty(persisted.target_version)) {
        state_machine_clear_persisted_ota_context();
        return;
    }

    g_rtc_context.ota_pending_confirm = true;
    g_rtc_context.ota_confirm_timeout_sec = persisted.confirm_timeout_sec;
    g_rtc_context.ota_confirm_deadline_ms = persisted.confirm_deadline_ms;
    util_copy_string(g_rtc_context.ota_job_id, sizeof(g_rtc_context.ota_job_id), persisted.job_id);
    util_copy_string(g_rtc_context.ota_target_version,
                     sizeof(g_rtc_context.ota_target_version),
                     persisted.target_version);
    util_copy_string(g_rtc_context.ota_previous_version,
                     sizeof(g_rtc_context.ota_previous_version),
                     persisted.previous_version);
    util_copy_string(g_rtc_context.ota_partition,
                     sizeof(g_rtc_context.ota_partition),
                     persisted.partition);

    ESP_LOGI(TAG,
             "event=ota_context_restored job=%s target=%s pending=%d",
             g_rtc_context.ota_job_id,
             g_rtc_context.ota_target_version,
             g_rtc_context.ota_pending_confirm ? 1 : 0);
}

/**
 * @brief Publish OTA status updates through the shared firmware publish path.
 *
 * @param[in] firmware OTA status payload provided by the OTA executor.
 * @param[in] user_ctx Unused caller context.
 */
static void state_machine_ota_status_callback(const firmware_status_t *firmware, void *user_ctx) {
    (void)user_ctx;
    state_machine_publish_firmware_payload(firmware);
}

/**
 * @brief Drain pending command actions that can execute in the current wake loop.
 *
 * The handler intentionally processes a bounded number of actions so command
 * traffic cannot starve telemetry, retry, or sleep logic in the main FSM loop.
 */
void state_machine_handle_pending_action(void) {
    for (uint32_t i = 0; i < TRACKER_PENDING_ACTION_DRAIN_LIMIT; ++i) {
        command_action_t action = command_handler_consume_action();
        if (action == COMMAND_ACTION_NONE) {
            return;
        }
        if (action == COMMAND_ACTION_APPLY_CONFIG) {
            (void)command_handler_apply_pending_config();
            continue;
        }
        if (action == COMMAND_ACTION_REBOOT) {
            esp_restart();
        }
        if (action == COMMAND_ACTION_ASSIGN_SESSION) {
            /* Session assignment must land in firmware state before the next publish. */
            command_session_assignment_t assignment = {0};
            if (command_handler_take_session_assignment(&assignment)) {
                state_machine_apply_session_assignment(assignment.local_session_key,
                                                       assignment.canonical_session_id,
                                                       assignment.boot_id);
            }
            continue;
        }

        state_machine_process_ota_command(action);
        if (s_ota_in_progress) {
            return;
        }
    }
}

/**
 * @brief Confirm the currently running firmware after an OTA reboot if needed.
 *
 * This path restores any persisted OTA context, enforces confirm deadlines when
 * trusted time is available, emits confirming/success/failure status updates,
 * and asks ESP-IDF to mark the new partition valid.
 */
void state_machine_try_confirm_running_firmware(void) {
    if (s_ota_confirm_checked) {
        return;
    }

    // Confirmation should only execute once per boot, even if the FSM loops repeatedly before the cloud comes back.
    s_ota_confirm_checked = true;
    const esp_partition_t *running = esp_ota_get_running_partition();
    if (running != NULL && !util_string_empty(running->label)) {
        util_copy_string(g_rtc_context.ota_partition,
                         sizeof(g_rtc_context.ota_partition),
                         running->label);
    }

    state_machine_restore_ota_context_from_nvs();
    if (!g_rtc_context.ota_pending_confirm) {
        return;
    }

    // Trusted wall-clock time turns the confirm deadline into an enforceable timeout instead of a best-effort hint.
    state_machine_update_time_source();
    if (g_rtc_context.ota_confirm_deadline_ms > 0 &&
        s_time_trusted &&
        s_event_timestamp_ms > g_rtc_context.ota_confirm_deadline_ms) {
        g_rtc_context.ota_pending_confirm = false;
        g_rtc_context.ota_confirm_deadline_ms = 0;
        state_machine_clear_persisted_ota_context();
        state_machine_publish_or_stage_firmware_status(TRACKER_OTA_STATUS_FAILED,
                                                       TRACKER_OTA_PROGRESS_DONE,
                                                       g_rtc_context.ota_target_version,
                                                       g_rtc_context.ota_job_id,
                                                       g_rtc_context.ota_partition,
                                                       TRACKER_OTA_ERROR_CONFIRM_TIMEOUT_EXCEEDED);
        esp_restart();
        return;
    }

    // Publish the confirming state before asking ESP-IDF to cancel rollback so the cloud sees the in-progress transition.
    state_machine_publish_or_stage_firmware_status(TRACKER_OTA_STATUS_CONFIRMING,
                                                   TRACKER_OTA_PROGRESS_CONFIRMING,
                                                   g_rtc_context.ota_target_version,
                                                   g_rtc_context.ota_job_id,
                                                   g_rtc_context.ota_partition,
                                                   "");

    if (esp_ota_mark_app_valid_cancel_rollback() == ESP_OK) {
        // Success clears the persisted confirm context and promotes the new target version into current runtime state.
        g_rtc_context.ota_pending_confirm = false;
        g_rtc_context.ota_confirm_deadline_ms = 0;
        util_copy_string(s_current_version, sizeof(s_current_version), g_rtc_context.ota_target_version);
        state_machine_clear_persisted_ota_context();
        state_machine_publish_or_stage_firmware_status(TRACKER_OTA_STATUS_SUCCESS,
                                                       TRACKER_OTA_PROGRESS_DONE,
                                                       g_rtc_context.ota_target_version,
                                                       g_rtc_context.ota_job_id,
                                                       g_rtc_context.ota_partition,
                                                       "");
    } else {
        // Mark-app-valid failure is terminal for this boot, so clear pending state and publish a failed OTA outcome.
        g_rtc_context.ota_pending_confirm = false;
        g_rtc_context.ota_confirm_deadline_ms = 0;
        state_machine_clear_persisted_ota_context();
        state_machine_publish_or_stage_firmware_status(TRACKER_OTA_STATUS_FAILED,
                                                       TRACKER_OTA_PROGRESS_DONE,
                                                       g_rtc_context.ota_target_version,
                                                       g_rtc_context.ota_job_id,
                                                       g_rtc_context.ota_partition,
                                                       TRACKER_OTA_ERROR_CONFIRM_FAILED);
    }
}

/**
 * @brief Execute an OTA update or rollback command previously staged by commands.
 *
 * @param[in] action OTA-related command action to process.
 */
void state_machine_process_ota_command(command_action_t action) {
    // Centralize OTA update and rollback execution here so publish side effects and persisted confirm state stay aligned.
    if (action != COMMAND_ACTION_OTA_UPDATE && action != COMMAND_ACTION_OTA_ROLLBACK) {
        return;
    }

    ota_command_t cmd = {0};
    if (!command_handler_take_ota_command(&cmd)) {
        return;
    }

    if (action == COMMAND_ACTION_OTA_ROLLBACK || cmd.rollback_pending) {
        // Rollback reuses the firmware-status path so the cloud sees the same lifecycle semantics as forward OTA.
        /* Rollback uses the same publish path so cloud sees the authoritative transition. */
        firmware_status_t rollback = {0};
        util_copy_string(rollback.job_id, sizeof(rollback.job_id), g_rtc_context.ota_job_id);
        util_copy_string(rollback.target_version, sizeof(rollback.target_version), g_rtc_context.ota_previous_version);
        util_copy_string(rollback.current_version, sizeof(rollback.current_version), s_current_version);

        if (util_ota_trigger_manual_rollback(&rollback) == ESP_OK) {
            g_rtc_context.ota_pending_confirm = false;
            g_rtc_context.ota_confirm_deadline_ms = 0;
            state_machine_clear_persisted_ota_context();
            state_machine_publish_firmware_payload(&rollback);
            esp_restart();
        } else {
            g_rtc_context.ota_confirm_deadline_ms = 0;
            state_machine_publish_firmware_status(TRACKER_OTA_STATUS_FAILED,
                                                  TRACKER_OTA_PROGRESS_DONE,
                                                  g_rtc_context.ota_previous_version,
                                                  g_rtc_context.ota_job_id,
                                                  g_rtc_context.ota_partition,
                                                  TRACKER_OTA_ERROR_MANUAL_ROLLBACK_FAILED);
        }
        return;
    }

    firmware_status_t report = {0};
    util_copy_string(report.job_id, sizeof(report.job_id), cmd.job_id);
    util_copy_string(report.target_version, sizeof(report.target_version), cmd.version);
    util_copy_string(report.current_version, sizeof(report.current_version), s_current_version);

    // Announce assignment before any safety gate runs so the backend can correlate a later rejection with this job.
    state_machine_publish_firmware_status(TRACKER_OTA_STATUS_ASSIGNED,
                                          TRACKER_OTA_PROGRESS_ASSIGNED,
                                          cmd.version,
                                          cmd.job_id,
                                          "",
                                          "");

    if (!state_machine_ota_start_is_safe()) {
        // Unsafe runtime windows fail fast without touching flash, but still emit an authoritative failed status.
        state_machine_publish_firmware_status(TRACKER_OTA_STATUS_FAILED,
                                              TRACKER_OTA_PROGRESS_ASSIGNED,
                                              cmd.version,
                                              cmd.job_id,
                                              "",
                                              TRACKER_OTA_ERROR_UNSAFE_RUNTIME_WINDOW);
        return;
    }

    s_ota_in_progress = true;
    if (util_ota_apply_update(&s_config,
                              s_current_version,
                              &cmd,
                              &report,
                              state_machine_ota_status_callback,
                              NULL) == ESP_OK) {
        // A successful flash write persists enough context for the rebooted firmware to confirm or reject itself later.
        /*
         * Persist all fields required to resume confirmation after reboot. The
         * cloud-facing canonical outcome still comes from the next boot.
         */
        util_copy_string(g_rtc_context.ota_job_id, sizeof(g_rtc_context.ota_job_id), cmd.job_id);
        util_copy_string(g_rtc_context.ota_target_version,
                         sizeof(g_rtc_context.ota_target_version),
                         cmd.version);
        util_copy_string(g_rtc_context.ota_previous_version,
                         sizeof(g_rtc_context.ota_previous_version),
                         s_current_version);
        util_copy_string(g_rtc_context.ota_partition,
                         sizeof(g_rtc_context.ota_partition),
                         report.partition);
        g_rtc_context.ota_pending_confirm = true;
        g_rtc_context.ota_confirm_timeout_sec = cmd.confirm_timeout_sec;
        state_machine_update_time_source();
        if (s_time_trusted) {
            g_rtc_context.ota_confirm_deadline_ms =
                s_event_timestamp_ms + ((uint64_t)cmd.confirm_timeout_sec * 1000ULL);
        } else {
            g_rtc_context.ota_confirm_deadline_ms = 0;
        }
        state_machine_persist_ota_context();
        esp_restart();
    } else {
        // Flash/apply failures clear the in-progress flag locally so the FSM can accept or report later work again.
        g_rtc_context.ota_confirm_deadline_ms = 0;
        s_ota_in_progress = false;
    }
}
