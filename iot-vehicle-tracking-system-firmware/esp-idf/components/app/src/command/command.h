/**
 * @file src/command/command.h
 * @brief Private command inbox, handler, receipt and completion interfaces.
 *
 * Startup restores the receipt window. The app task serializes command handling, receipt
 * checkpoints and callback delivery from the publisher. The modem owns the inbound FIFO and
 * transmits the application ACK. OTA, session and device modules own their runtime policy.
 */
#pragma once
#include <stdbool.h>
#include "ivts_core/model/command.h"
#include "ivts_core/payload/json_fields.h"

/**
 * @brief Initialize command state and load the receipt window.
 *
 * Clear the in-memory ACK, location and restart state. Later command handling retries a failed receipt read.
 *
 * @note Context: Startup task. Blocking: synchronous NVS access with no timeout at this layer.
 */
void app_cmd_init(void);
/**
 * @brief Take and handle at most one command from the modem FIFO.
 *
 * Leave the FIFO alone while a normal command owns the slot. A duplicate successful ID queues another ACK
 * without running its handler. An ID-less session assignment can run without producing a command ACK.
 *
 * @note Context: App task. Blocking: may wait on the modem slot mutex and on NVS or OTA metadata operations.
 */
void app_cmd_handle(void);
/**
 * @brief Service restart, location and command ACK work.
 *
 * Check restart first, advance the location request and persist successful receipts before sending their
 * ACKs.
 *
 * @note Context: App task. Blocking: may wait on NVS, the RTC and modem slot mutex. GNSS and MQTT results
 * arrive asynchronously.
 */
void app_cmd_tick(void);
/**
 * @brief Check whether a normal command owns the inbox.
 *
 * @retval true while a command ID occupies the slot, including execution and ACK delivery.
 * @retval false when the slot is empty.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
bool app_cmd_pending(void);
/**
 * @brief Check for command activity that requires the device awake.
 *
 * @retval true during an active location request or a scheduled restart.
 * @retval false otherwise.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
bool app_cmd_blocks_sleep(void);
/**
 * @brief Check whether the location request still holds GNSS demand.
 *
 * @retval true while waiting for a publish opportunity or its modem ACK.
 * @retval false when no location request is active.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
bool app_cmd_needs_gnss(void);

/**
 * @brief Apply the modem result for the outstanding command ACK.
 *
 * A failed publish delays another attempt by 1000 ms. Success frees the inbox and can trigger a scheduled
 * reboot.
 *
 * @param ok True for a successful modem publish result, false for failure.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void app_cmd_on_ack(bool ok);
/**
 * @brief Complete a location request after its RAW publish result.
 *
 * Release the location GNSS demand and queue the command result. Ignore results when no location publish is
 * pending.
 *
 * @param ok True for a successful modem publish result, false for failure.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void app_cmd_on_location_ack(bool ok);

/** @brief Per-dispatch envelope owned by the app task. The params view expires when parse buffers are reused. */
typedef struct {
    char id[IVTS_CMD_ID_SIZE]; /**< Terminated ID, or empty when absent or unusable. */
    char name[32]; /**< Terminated command name when has_name is true. */
    ivts_json_obj_t params; /**< Borrowed view of the app task JSON text and token storage. */
    bool has_id; /**< A recognized ID field is present, even if its value is unusable. */
    bool has_name; /**< A non-empty command string fits the name buffer. */
    bool has_params; /**< The params field is an object. */
} cmd_envelope_t;

/** @brief Value returned to the command inbox after handler dispatch on the app task. */
typedef struct {
    const char *reason; /**< Static failure reason, or NULL for success or accepted asynchronous work. */
    bool awaits_completion; /**< The handler reports the final result later. */
} cmd_result_t;

/**
 * @brief Validate the envelope shape and call its registered handler.
 *
 * @param command Parsed, non-null command borrowed for the call.
 * @return Handler result, including whether it completes later, or a static envelope rejection reason.
 *
 * @note Context: App task. Blocking: inherits the selected handler's NVS or OTA metadata waits.
 */
cmd_result_t cmd_table_dispatch(const cmd_envelope_t *command);
/**
 * @brief Validate an OTA manifest and request an update.
 *
 * Accept jobId or job_id and confirmTimeoutSec or confirm_timeout_sec. Clamp the timeout to the OTA
 * contract range. The firmware-update module applies runtime and battery policy.
 *
 * @param command Non-null command with a parsed params object. Borrowed for the call.
 * @return NULL when the worker starts, or a static manifest or OTA policy reason.
 *
 * @note Context: App task. Blocking: synchronous OTA worker setup. Download and flash run on the worker.
 */
const char *cmd_ota_handle(const cmd_envelope_t *command);
/**
 * @brief Apply supported cloud updates to device policy.
 *
 * Validate a candidate containing recognized fields, commit it to NVS, then apply it to runtime.
 *
 * @param command Non-null command with a parsed params object. Borrowed for the call.
 * @return NULL on success, or static reason invalid_config or persist_failed.
 *
 * @note Context: App task. Blocking: synchronous NVS access with no timeout at this layer.
 */
const char *cmd_config_handle(const cmd_envelope_t *command);
/**
 * @brief Persist a change to tracking policy.
 *
 * An unchanged value succeeds without a write. A committed change updates the app flag and requests status.
 *
 * @param command Non-null command with a parsed params object. Borrowed for the call.
 * @return NULL on success, or static reason invalid_enabled or persist_failed.
 *
 * @note Context: App task. Blocking: synchronous NVS access with no timeout at this layer.
 */
const char *cmd_tracking_handle(const cmd_envelope_t *command);
/**
 * @brief Assign a canonical ID to a matching local session.
 *
 * A new assignment to the active session also requests status.
 *
 * @param command Non-null command with a parsed params object. Borrowed for the call.
 * @return NULL on success, or static reason invalid_session or session_not_current.
 *
 * @note Context: App task. Blocking: synchronous NVS access with no timeout at this layer.
 */
const char *cmd_session_handle(const cmd_envelope_t *command);
/**
 * @brief Arm an asynchronous location request.
 *
 * Start a 90000 ms window for obtaining a fix and submitting a publish. Completion follows through the inbox.
 *
 * @param command Unused by the handler. The caller owns the outstanding command ID.
 * @return NULL when the request is armed.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
const char *cmd_location_handle(const cmd_envelope_t *command);
/**
 * @brief Record a reboot intent for completion through the command receipt.
 *
 * A matching stored intent succeeds without scheduling another restart. A new intent waits for the receipt
 * checkpoint before the restart deadline starts.
 *
 * @param command Parsed, non-null command borrowed for the call.
 * @return NULL when accepted, or static reason dedupe_unavailable, ota_busy or persist_failed.
 *
 * @note Context: App task. Blocking: synchronous NVS access with no timeout at this layer.
 */
const char *cmd_reboot_handle(const cmd_envelope_t *command);
/**
 * @brief Select a rollback image and schedule a restart after the receipt checkpoint.
 *
 * Require ignition OFF and an available rollback image when acting on the command. A stored intent from
 * another
 * partition is treated as complete. Persist a new intent before changing the boot image.
 *
 * @param command Parsed, non-null command borrowed for the call.
 * @return NULL when accepted or treated as complete, or a static persistence, OTA or runtime reason.
 *
 * @note Context: App task. Blocking: synchronous NVS and OTA metadata access.
 */
const char *cmd_rollback_handle(const cmd_envelope_t *command);

/**
 * @brief Clear pending location state.
 *
 * @note Context: Startup task. Blocking: non-blocking.
 */
void cmd_location_init(void);
/**
 * @brief Advance the location request until a fix publish is submitted or the deadline expires.
 *
 * Once a publish is accepted, its modem ACK completes the request. The deadline applies only before
 * submission.
 *
 * @param now_ms Current monotonic uptime in milliseconds.
 *
 * @note Context: App task. Blocking: may wait on the RTC and modem slot mutex. Fixes and modem publish
 * results arrive asynchronously.
 */
void cmd_location_tick(uint64_t now_ms);
/**
 * @brief Record the application result for the outstanding command.
 *
 * Success appends the ID to the in-memory receipt window. The tick checkpoints it before a successful ACK is
 * sent.
 *
 * @param reason NULL for success, or an error string borrowed until the command ACK is delivered.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void cmd_inbox_complete(const char *reason);

/**
 * @brief Clear the in-memory restart scheduling state.
 *
 * A retried command consults the durable intent when it arrives.
 *
 * @note Context: Startup task. Blocking: non-blocking.
 */
void cmd_restart_init(void);
/**
 * @brief Check whether a restart is awaiting its checkpoint or reboot trigger.
 *
 * @retval true if a restart is waiting for either stage.
 * @retval false if neither stage is active.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
bool cmd_restart_is_scheduled(void);
/**
 * @brief Start the reboot deadline after the receipt checkpoint.
 *
 * Arm a 20000 ms deadline only if a restart is waiting for the checkpoint.
 *
 * @param now_ms Current monotonic uptime in milliseconds.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void cmd_restart_on_checkpoint(uint64_t now_ms);
/**
 * @brief Restart the device after successful delivery of a restart command ACK.
 *
 * Restart only if the checkpoint has armed the deadline.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void cmd_restart_on_ack(void);
/**
 * @brief Restart the device if the armed deadline expires.
 *
 * @param now_ms Current monotonic uptime in milliseconds.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void cmd_restart_tick(uint64_t now_ms);

/**
 * @brief Load the recent command receipt window.
 *
 * Treat a missing window as empty. Leave other read failures for later retry.
 *
 * @note Context: Startup task. Blocking: synchronous NVS access with no timeout at this layer.
 */
void cmd_receipts_init(void);
/**
 * @brief Check receipt availability and retry loading when necessary.
 *
 * @retval true when the receipt window is available, including an empty window.
 * @retval false when the read or validation fails.
 *
 * @note Context: App task. Blocking: synchronous NVS access with no timeout at this layer.
 */
bool cmd_receipts_ready(void);
/**
 * @brief Look for a command ID in the loaded receipt window.
 *
 * @param id Non-empty, NUL-terminated command ID borrowed for the call.
 * @retval true if an entry matches.
 * @retval false if no entry matches.
 *
 * @note Context: App task. Blocking: non-blocking.
 * @warning Check cmd_receipts_ready() before querying the window.
 */
bool cmd_receipts_contains(const char *id);
/**
 * @brief Stage a successful command ID in the receipt window.
 *
 * Copy the whole input buffer into the next ring slot and mark it for checkpointing.
 *
 * @param id Non-null buffer of at least IVTS_CMD_ID_SIZE readable bytes containing the terminated ID.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void cmd_receipts_append(const char *id);
/**
 * @brief Check whether the receipt window has staged changes.
 *
 * @retval true when a receipt append still needs a checkpoint.
 * @retval false when no changes are staged.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
bool cmd_receipts_needs_checkpoint(void);
/**
 * @brief Persist the current receipt window.
 *
 * @retval true when NVS commits the window and clears its dirty flag.
 * @retval false when persistence fails and the dirty flag is unchanged.
 *
 * @note Context: App task. Blocking: synchronous NVS access with no timeout at this layer.
 */
bool cmd_receipts_flush(void);
