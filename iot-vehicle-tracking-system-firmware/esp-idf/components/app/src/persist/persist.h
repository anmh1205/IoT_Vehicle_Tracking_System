/**
 * @file src/persist/persist.h
 * @brief Application NVS records and retained RTC context interfaces.
 *
 * Boot, the app task and the OTA preparation hook use caller-owned record buffers. NVS calls are
 * synchronous. Storage owns the flash envelope, while this module owns record keys and layouts.
 * RTC context is accepted only after checking its magic, version, size and checksum.
 */
#pragma once
#include "ivts_core/event/event.h"
#include "ivts_core/model/command.h"
#include "ivts_core/model/session.h"
#include "ivts_core/ota/confirm.h"
#include <stdbool.h>
#include <stdint.h>

/**
 * @brief Load retained OTA confirmation context.
 *
 * Try the previous layout only after a version or size mismatch.
 *
 * @param[out] out Caller-owned context. Cleared on read failure. A version 2 record leaves the partition
 *     label empty.
 * @retval IVTS_OK Record loaded.
 * @retval IVTS_ERR_NOT_FOUND Record or namespace absent.
 * @retval IVTS_ERR_CRC Record envelope or checksum is invalid.
 * @retval IVTS_ERR_VERSION Stored version or length does not match a supported layout.
 * @retval IVTS_ERR_IO Another NVS read operation failed.
 * @retval IVTS_ERR_INVALID_ARG The output pointer is null.
 *
 * @note Context: Startup task. Blocking: synchronous NVS access with no timeout at this layer.
 */
ivts_err_t app_records_ota_confirm_ctx_load(ivts_ota_confirm_ctx_t *out);
/**
 * @brief Save OTA confirmation context in the current layout.
 *
 * @param p Non-null context borrowed for the call. A zeroed context clears the pending state.
 * @retval IVTS_OK Record committed.
 * @retval IVTS_ERR_INVALID_ARG The record pointer is null or NVS rejects an argument.
 * @retval IVTS_ERR_INVALID_STATE NVS reports an invalid state.
 * @retval IVTS_ERR_TIMEOUT NVS reports a timeout.
 * @retval IVTS_ERR_NOT_FOUND The platform reports a missing resource.
 * @retval IVTS_ERR_FULL NVS reports a memory allocation failure.
 * @retval IVTS_ERR_IO Another NVS write or commit operation failed.
 *
 * @note Context: App task or OTA worker. Blocking: synchronous NVS access with no timeout at this layer.
 */
ivts_err_t app_records_ota_confirm_ctx_save(const ivts_ota_confirm_ctx_t *p);
/**
 * @brief Load the command receipt window and validate its entries.
 *
 * @param[out] out Caller-owned window. Cleared on envelope read failure. Validation failure can leave invalid
 *     data.
 * @retval IVTS_OK Record loaded.
 * @retval IVTS_ERR_NOT_FOUND Record or namespace absent.
 * @retval IVTS_ERR_CRC Invalid envelope, checksum, ring index or unterminated ID.
 * @retval IVTS_ERR_VERSION Stored version or length does not match a supported layout.
 * @retval IVTS_ERR_IO Another NVS read operation failed.
 * @retval IVTS_ERR_INVALID_ARG The output pointer is null.
 *
 * @note Context: Startup task before the app task starts, then the app task. Blocking: synchronous NVS access
 * with no timeout at this layer.
 */
ivts_err_t app_records_command_receipts_load(ivts_cmd_receipts_t *out);
/**
 * @brief Persist the current command receipt window.
 *
 * @param receipts Non-null ring borrowed for the call. Its next index must be below IVTS_CMD_RECEIPTS_COUNT.
 * @retval IVTS_OK Record committed.
 * @retval IVTS_ERR_INVALID_ARG Null receipts, an invalid ring index or an invalid NVS argument.
 * @retval IVTS_ERR_INVALID_STATE NVS reports an invalid state.
 * @retval IVTS_ERR_TIMEOUT NVS reports a timeout.
 * @retval IVTS_ERR_NOT_FOUND The platform reports a missing resource.
 * @retval IVTS_ERR_FULL NVS reports a memory allocation failure.
 * @retval IVTS_ERR_IO Another NVS write or commit operation failed.
 *
 * @note Context: App task. Blocking: synchronous NVS access with no timeout at this layer.
 */
ivts_err_t app_records_command_receipts_save(const ivts_cmd_receipts_t *receipts);
/**
 * @brief Load a durable reboot or rollback intent.
 *
 * Try the ID-only layout on a version or size mismatch, leaving the rollback origin empty.
 *
 * @param[out] out Caller-owned intent. Cleared on read failure. Validation failure can leave invalid strings.
 * @retval IVTS_OK Record loaded.
 * @retval IVTS_ERR_NOT_FOUND Record or namespace absent.
 * @retval IVTS_ERR_CRC Invalid envelope, checksum or unterminated string.
 * @retval IVTS_ERR_VERSION Stored version or length does not match a supported layout.
 * @retval IVTS_ERR_IO Another NVS read operation failed.
 * @retval IVTS_ERR_INVALID_ARG The output pointer is null.
 *
 * @note Context: App task. Blocking: synchronous NVS access with no timeout at this layer.
 */
ivts_err_t app_records_restart_intent_load(ivts_restart_intent_t *out);
/**
 * @brief Save the command identity and rollback origin for a restart.
 *
 * @param intent Non-null intent borrowed for the call. Its strings must be NUL-terminated for later reads.
 * @retval IVTS_OK Record committed.
 * @retval IVTS_ERR_INVALID_ARG The record pointer is null or NVS rejects an argument.
 * @retval IVTS_ERR_INVALID_STATE NVS reports an invalid state.
 * @retval IVTS_ERR_TIMEOUT NVS reports a timeout.
 * @retval IVTS_ERR_NOT_FOUND The platform reports a missing resource.
 * @retval IVTS_ERR_FULL NVS reports a memory allocation failure.
 * @retval IVTS_ERR_IO Another NVS write or commit operation failed.
 *
 * @note Context: App task. Blocking: synchronous NVS access with no timeout at this layer.
 */
ivts_err_t app_records_restart_intent_save(const ivts_restart_intent_t *intent);
/**
 * @brief Read the tracking policy flag.
 *
 * A stored byte of one enables tracking. Other byte values and read errors other than absence disable it.
 *
 * @param[out] enabled Non-null caller-owned flag. Always set. A missing record enables tracking.
 * @retval IVTS_OK Record loaded.
 * @retval IVTS_ERR_NOT_FOUND Record or namespace absent.
 * @retval IVTS_ERR_CRC Record envelope or checksum is invalid.
 * @retval IVTS_ERR_VERSION Stored version or length does not match a supported layout.
 * @retval IVTS_ERR_IO Another NVS read operation failed.
 *
 * @note Context: Startup task. Blocking: synchronous NVS access with no timeout at this layer.
 */
ivts_err_t app_records_tracking_load(bool *enabled);
/**
 * @brief Persist the tracking flag as a one-byte record.
 *
 * @param enabled True to enable tracking, false to disable it.
 * @retval IVTS_OK Record committed.
 * @retval IVTS_ERR_INVALID_ARG NVS rejects an argument.
 * @retval IVTS_ERR_INVALID_STATE NVS reports an invalid state.
 * @retval IVTS_ERR_TIMEOUT NVS reports a timeout.
 * @retval IVTS_ERR_NOT_FOUND The platform reports a missing resource.
 * @retval IVTS_ERR_FULL NVS reports a memory allocation failure.
 * @retval IVTS_ERR_IO Another NVS write or commit operation failed.
 *
 * @note Context: App task. Blocking: synchronous NVS access with no timeout at this layer.
 */
ivts_err_t app_records_tracking_save(bool enabled);
/**
 * @brief Load the active session and pending boundary outbox.
 *
 * @param[out] state Non-null caller-owned state. Cleared on any failure.
 * @retval IVTS_OK Record loaded.
 * @retval IVTS_ERR_NOT_FOUND Record or namespace absent.
 * @retval IVTS_ERR_CRC Record envelope or checksum is invalid.
 * @retval IVTS_ERR_VERSION Stored version or length does not match a supported layout.
 * @retval IVTS_ERR_IO Another NVS read operation failed.
 * @retval IVTS_ERR_INVALID_STATE The outbox count exceeds IVTS_SESSION_OUTBOX_SIZE.
 *
 * @note Context: Startup task. Blocking: synchronous NVS access with no timeout at this layer.
 */
ivts_err_t app_records_session_load(ivts_session_state_t *state);
/**
 * @brief Commit the active session and pending boundaries together.
 *
 * @param state Non-null state borrowed for the call. Its count must fit the outbox for a later load.
 * @retval IVTS_OK Record committed.
 * @retval IVTS_ERR_INVALID_ARG The record pointer is null or NVS rejects an argument.
 * @retval IVTS_ERR_INVALID_STATE NVS reports an invalid state.
 * @retval IVTS_ERR_TIMEOUT NVS reports a timeout.
 * @retval IVTS_ERR_NOT_FOUND The platform reports a missing resource.
 * @retval IVTS_ERR_FULL NVS reports a memory allocation failure.
 * @retval IVTS_ERR_IO Another NVS write or commit operation failed.
 *
 * @note Context: App task. Blocking: synchronous NVS access with no timeout at this layer.
 */
ivts_err_t app_records_session_save(const ivts_session_state_t *state);
/**
 * @brief Load the retained motion alarm.
 *
 * @param[out] alarm Non-null caller-owned alarm. Cleared on any failure. Sequence zero indicates no alarm.
 * @retval IVTS_OK Record loaded.
 * @retval IVTS_ERR_NOT_FOUND Record or namespace absent.
 * @retval IVTS_ERR_CRC Record envelope or checksum is invalid.
 * @retval IVTS_ERR_VERSION Stored version or length does not match a supported layout.
 * @retval IVTS_ERR_IO Another NVS read operation failed.
 *
 * @note Context: Startup task. Blocking: synchronous NVS access with no timeout at this layer.
 */
ivts_err_t app_records_alarm_load(ivts_motion_alarm_t *alarm);
/**
 * @brief Commit a motion alarm record.
 *
 * @param alarm Non-null record borrowed for the call. A zeroed record clears the pending alarm.
 * @retval IVTS_OK Record committed.
 * @retval IVTS_ERR_INVALID_ARG The record pointer is null or NVS rejects an argument.
 * @retval IVTS_ERR_INVALID_STATE NVS reports an invalid state.
 * @retval IVTS_ERR_TIMEOUT NVS reports a timeout.
 * @retval IVTS_ERR_NOT_FOUND The platform reports a missing resource.
 * @retval IVTS_ERR_FULL NVS reports a memory allocation failure.
 * @retval IVTS_ERR_IO Another NVS write or commit operation failed.
 *
 * @note Context: App task. Blocking: synchronous NVS access with no timeout at this layer.
 */
ivts_err_t app_records_alarm_save(const ivts_motion_alarm_t *alarm);

/**
 * @brief Validate and load the retained deep-sleep identity.
 *
 * Check the magic, version, size and CRC. On success restore the in-memory message sequence as well.
 * On invalid context clear the retained copy and leave outputs unchanged.
 *
 * @param[out] boot_id Non-null caller-owned output for the retained boot ID.
 * @param[out] seq Non-null caller-owned output for the last retained sequence.
 * @retval true when the retained context is valid.
 * @retval false when validation fails.
 *
 * @note Context: Startup task. Blocking: non-blocking.
 */
bool app_rtc_ctx_load(uint32_t *boot_id, uint32_t *seq);
/**
 * @brief Save boot identity and sequence to retained RTC memory.
 *
 * Write the checksum after the record fields. Set the in-memory sequence to the same value.
 *
 * @param boot_id Current boot identity.
 * @param seq Last allocated sequence, or zero for a new boot identity.
 * @param last_state FSM state before sleep, stored as a byte. Boot passes zero for a new identity.
 *
 * @note Context: Startup task before the app task starts, then the app task. Blocking: non-blocking.
 */
void app_rtc_ctx_save(uint32_t boot_id, uint32_t seq, uint8_t last_state);
