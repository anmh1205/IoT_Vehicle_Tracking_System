/**
 * @file components/ivts-core/include/ivts_core/model/command.h
 * @brief Cloud command result, receipt and restart intent contracts.
 */
#pragma once
#include <stdint.h>
#include "ivts_core/ota/contract.h"

#define IVTS_CMD_ID_SIZE 48u
#define IVTS_CMD_RECEIPTS_COUNT 32u

/** Ring of successful command IDs. An empty ID marks an unused slot. */
typedef struct {
    uint8_t next;
    char id[IVTS_CMD_RECEIPTS_COUNT][IVTS_CMD_ID_SIZE];
} ivts_cmd_receipts_t;

typedef struct {
    char id[IVTS_CMD_ID_SIZE];
    char rollback_origin[IVTS_OTA_PART_LABEL_SIZE]; /**< Original slot for rollback. Empty for an ordinary restart. */
} ivts_restart_intent_t;
