/**
 * @file include/ivts_core/model/command.h
 * @brief Persisted cloud command receipts and restart intent.
 *
 * The app task owns the receipt ring and restart intent. App command handlers
 * use the ring for deduplication and the intent to complete reporting after a
 * restart. App persistence code owns the NVS reads and writes.
 */
#pragma once
#include <stdint.h>
#include "ivts_core/ota/contract.h"

#define IVTS_CMD_ID_SIZE 48u  /**< Command ID buffer capacity in bytes, including NUL. */
#define IVTS_CMD_RECEIPTS_COUNT 32u  /**< Number of recent command IDs the receipt ring retains. */

/** @brief App-owned ring of successful command IDs checkpointed to NVS. */
typedef struct {
    uint8_t next;  /**< Next slot to overwrite, zero through IVTS_CMD_RECEIPTS_COUNT minus one. */
    char id[IVTS_CMD_RECEIPTS_COUNT][IVTS_CMD_ID_SIZE];  /**< NUL-terminated IDs. Unused slots are empty. */
} ivts_cmd_receipts_t;

/** @brief App-owned restart intent saved before reboot and recovered at startup. */
typedef struct {
    char id[IVTS_CMD_ID_SIZE];  /**< NUL-terminated command ID for post-restart reporting. */
    char rollback_origin[IVTS_OTA_PART_LABEL_SIZE]; /**< Original slot for rollback. Empty for an ordinary restart. */
} ivts_restart_intent_t;
