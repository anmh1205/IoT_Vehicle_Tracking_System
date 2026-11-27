/**
 * @file src/fw/fw_update.h
 * @brief App-side firmware-update orchestration and report lifecycle interfaces.
 *
 * Boot restores persisted context and the app task owns runtime update and report state.
 * The OTA worker calls the preparation hook to persist context before selecting a partition.
 * The worker owns image download and writing. The publisher borrows the report on the app task.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/ota/contract.h"

/**
 * @brief Restore firmware report and image confirmation state.
 *
 * Read the confirmation context and classify the running image as pending verification, a completed or rolled
 * back job, or ordinary startup. Mark the resulting report pending.
 *
 * @note Context: Startup task. Blocking: synchronous NVS access with no timeout at this layer.
 */
void app_fw_update_restore_at_boot(void);
/**
 * @brief Persist confirmation context before the OTA worker selects its boot partition.
 *
 * Persist the timeout and, when the RTC is trusted, an absolute deadline measured from this call.
 *
 * @param cmd Non-null OTA job with a confirmation timeout in seconds. Job ID and version are copied.
 * @param partition Target partition label, terminated and borrowed for the call. The label is copied.
 * @retval IVTS_OK Record committed.
 * @retval IVTS_ERR_INVALID_STATE NVS reports an invalid state.
 * @retval IVTS_ERR_TIMEOUT NVS reports a timeout.
 * @retval IVTS_ERR_NOT_FOUND The platform reports a missing resource.
 * @retval IVTS_ERR_FULL NVS reports a memory allocation failure.
 * @retval IVTS_ERR_IO Another NVS write or commit operation failed.
 * @retval IVTS_ERR_INVALID_ARG The persistence layer reports an invalid argument.
 *
 * @note Context: OTA worker. Blocking: up to two RTC reads, each with a 100 ms I2C lock timeout and a 50 ms
 * transfer timeout, then synchronous NVS access.
 */
ivts_err_t app_fw_update_prepare_boot(const ivts_ota_cmd_t *cmd, const char *partition);

/**
 * @brief Consume the latest OTA progress and service the OTA reboot deadline.
 *
 * Intermediate worker phases can be superseded. A rebooting phase starts a 20000 ms report window,
 * which a successful current report can shorten.
 *
 * @param now_ms Current monotonic uptime in milliseconds.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void app_fw_update_poll(uint64_t now_ms);
/**
 * @brief Apply the pending-image confirmation policy.
 *
 * Use broker connectivity and a qualifying publish ACK as health evidence. Apply the confirmation deadline
 * and retry a failed mark-valid or rollback operation after its configured delay.
 *
 * @note Context: App task. Blocking: up to two RTC reads, each with a 100 ms I2C lock timeout and a 50 ms
 * transfer timeout, then possible synchronous OTA metadata update.
 */
void app_fw_update_confirm_tick(void);
/**
 * @brief Check for OTA work that prevents ordinary sleep.
 *
 * @retval true during an active job, confirmation or pending OTA reboot.
 * @retval false otherwise.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
bool app_fw_update_in_progress(void);
/**
 * @brief Check whether OTA state blocks a restart request.
 *
 * @param rollback True for a rollback command, which may supersede image confirmation.
 * @retval true during an active job, OTA reboot wait or confirmation for a non-rollback request.
 * @retval false otherwise.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
bool app_fw_update_blocks_restart(bool rollback);
/**
 * @brief Cancel in-memory image confirmation after rollback selection.
 *
 * Leave the retained context available for boot recovery.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void app_fw_update_cancel_confirmation(void);
/**
 * @brief Apply runtime policy and start an OTA worker.
 *
 * Force bypasses the running-version and ignition checks. Voltage and update-state checks still apply.
 *
 * @param cmd Non-null validated manifest. The OTA worker owns a copy after acceptance.
 * @return NULL when the worker starts, or static reason already_running, unsafe_runtime_window, ota_busy or
 *     low_battery.
 *
 * @note Context: App task. Blocking: synchronous task creation. The OTA worker handles the download.
 */
const char *app_fw_update_try_start(const ivts_ota_cmd_t *cmd);

/**
 * @brief Check whether firmware reporting takes outbox priority.
 *
 * @retval true while awaiting confirmation or an OTA reboot.
 * @retval false otherwise.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
bool app_fw_update_prioritizes_report(void);
/**
 * @brief Check whether a firmware report is pending submission.
 *
 * @retval true when the current report needs a publish attempt.
 * @retval false when no attempt is pending.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
bool app_fw_update_report_needs_publish(void);
/**
 * @brief Borrow the current firmware report.
 *
 * @return Read-only app-owned storage. Its contents may change at the next update-state transition.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
const ivts_fw_status_t *app_fw_update_report(void);
/**
 * @brief Clear the pending submission flag after the modem accepts a firmware report.
 *
 * A later progress update or failed publish result can set the flag again.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void app_fw_update_report_sent(void);
/**
 * @brief Apply the modem result for a firmware report.
 *
 * Requeue on failure. During confirmation, success counts as health evidence. Otherwise, when no newer report
 * is pending, success advances a scheduled reboot or checkpoints removal of the retained context.
 *
 * @param ok True for a successful modem publish result, false for failure.
 *
 * @note Context: App task. Blocking: synchronous NVS access with no timeout at this layer.
 */
void app_fw_update_on_report_acked(bool ok);
/**
 * @brief Record a successful status or boundary publish as health evidence.
 *
 * The confirmation tick also requires the broker link to be up.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void app_fw_update_note_health_ack(void);
