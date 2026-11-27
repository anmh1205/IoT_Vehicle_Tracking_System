/**
 * @file confirm.h
 * @brief Pure OTA image confirmation decision and retained boot context.
 *
 * The caller supplies clock observations and connection health.
 */
#pragma once

#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/time.h"
#include "ivts_core/ota/contract.h"

/** Pending image confirmation context retained in NVS across reboot. */
typedef struct {
    bool     pending;           /**< True while the installed image awaits confirmation. */
    uint32_t timeout_s;         /**< Confirmation timeout, clamped to its allowed range when receiving the command. */
    uint64_t deadline_unix_ms;  /**< Trusted UTC deadline. Zero if trusted time was unavailable during installation. */
    char     job_id[IVTS_OTA_JOB_ID_SIZE];          /**< Firmware job whose final outcome must be reported after reboot. */
    char     target_version[IVTS_OTA_VERSION_SIZE];
    char     target_partition[IVTS_OTA_PART_LABEL_SIZE];
} ivts_ota_confirm_ctx_t;

/** Result of ivts_ota_confirm_decide(). */
typedef enum { IVTS_CONFIRM_WAIT = 0, IVTS_CONFIRM_ACCEPT, IVTS_CONFIRM_ROLLBACK } ivts_confirm_t;

/**
 * @brief Decide whether to wait, accept or roll back a new image.
 *
 * Accept when there is no pending context. Roll back when the trusted UTC
 * deadline or uptime window expires. Within the window, accept once the app
 * reports a healthy broker connection and qualifying PUBACK.
 *
 * With bootloader rollback enabled, a reset while PENDING_VERIFY can cause the
 * bootloader to mark the image ABORTED and boot its predecessor.
 *
 * @return IVTS_CONFIRM_WAIT, IVTS_CONFIRM_ACCEPT or IVTS_CONFIRM_ROLLBACK.
 */
ivts_confirm_t ivts_ota_confirm_decide(const ivts_ota_confirm_ctx_t *p, bool healthy,
                                       uint64_t now_unix_ms, bool time_trusted, ivts_ms_t uptime_ms);
