/**
 * @file ota_internal.h
 * @brief Private OTA job execution, configuration and event interfaces.
 */
#pragma once
#include "ota/ota.h"

#define OTA_TAG "ota"

/* Copied at initialization and read only by the OTA task after start. */
const ota_cfg_t *ota_config(void);
void ota_emit(uint8_t phase, uint8_t pct, uint8_t error);
/* OTA task. Download, validate and persist the boot context before switching the partition. */
void ota_job_run(const ivts_ota_cmd_t *cmd, uint16_t battery_mv, uint16_t min_mv);
