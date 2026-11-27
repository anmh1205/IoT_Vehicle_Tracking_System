/**
 * @file include/ivts_core/ota/confirm.h
 * @brief Pure OTA image confirmation decision and retained boot context.
 *
 * The app task supplies trusted time, uptime and connection health when it
 * checks an image. The decision function borrows its inputs for the call.
 * The app owns persistence and uses the OTA adapter to accept or roll back.
 */
#pragma once

#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/time.h"
#include "ivts_core/ota/contract.h"

/** @brief App-owned image confirmation context retained in NVS across reboot. */
typedef struct {
    bool     pending;           /**< True while the installed image awaits confirmation. */
    uint32_t timeout_s;         /**< Confirmation timeout, clamped to its allowed range when receiving the command. */
    uint64_t deadline_unix_ms;  /**< Trusted UTC deadline. Zero if trusted time was unavailable during installation. */
    char     job_id[IVTS_OTA_JOB_ID_SIZE];          /**< Firmware job whose final outcome must be reported after reboot. */
    char     target_version[IVTS_OTA_VERSION_SIZE];  /**< NUL-terminated target firmware version. */
    char     target_partition[IVTS_OTA_PART_LABEL_SIZE];  /**< NUL-terminated target partition label. */
} ivts_ota_confirm_ctx_t;

/** @brief Decision for the app after evaluating image confirmation. */
typedef enum { IVTS_CONFIRM_WAIT = 0, /**< A pending image is within its window and health is false.
       */ IVTS_CONFIRM_ACCEPT, /**< No image is pending, or the pending image is healthy within its window.
       */ IVTS_CONFIRM_ROLLBACK /**< At least one confirmation deadline expires. */ } ivts_confirm_t;

/**
 * @brief Choose whether to wait, accept or roll back an image.
 *
 * Expiry takes precedence over health. Trusted UTC can enforce an installation deadline.
 * The boot uptime limit applies even when UTC is unavailable.
 *
 * @param p Borrowed retained context. NULL is treated as no pending image.
 * @param healthy True when the app has a broker connection and a qualifying PUBACK.
 * @param now_unix_ms Current time in Unix milliseconds. Used only with trusted time and a stored deadline.
 * @param time_trusted True to enable the deadline comparison when the context contains a UTC deadline.
 * @param uptime_ms Monotonic milliseconds since the current boot.
 * @retval IVTS_CONFIRM_WAIT A pending image is within its window and health is false.
 * @retval IVTS_CONFIRM_ACCEPT No image is pending, or health is true within the window.
 * @retval IVTS_CONFIRM_ROLLBACK A pending image reaches either applicable deadline.
 *
 * @warning With bootloader rollback enabled, resetting a PENDING_VERIFY image may abort it.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
ivts_confirm_t ivts_ota_confirm_decide(const ivts_ota_confirm_ctx_t *p, bool healthy,
                                       uint64_t now_unix_ms, bool time_trusted, ivts_ms_t uptime_ms);
