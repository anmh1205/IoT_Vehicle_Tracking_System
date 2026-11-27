#pragma once
#include <stdint.h>
#include "ivts_core/ota/contract.h"

#define IVTS_CMD_ID_SIZE 48u
#define IVTS_CMD_RECEIPTS_COUNT 32u

/** Các command đã thực thi thành công, theo cửa sổ vòng tròn. Một ID rỗng là ô chưa dùng. */
typedef struct {
    uint8_t next;
    char id[IVTS_CMD_RECEIPTS_COUNT][IVTS_CMD_ID_SIZE];
} ivts_cmd_receipts_t;


typedef struct {
    char id[IVTS_CMD_ID_SIZE];
    char rollback_origin[IVTS_OTA_PART_LABEL_SIZE]; /**< Slot gốc của rollback; rỗng với reboot thường. */
} ivts_restart_intent_t;
