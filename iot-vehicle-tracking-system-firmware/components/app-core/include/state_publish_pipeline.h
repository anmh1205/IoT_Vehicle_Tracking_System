#pragma once

#include "ota_contract.h"

/**
 * @file state_publish_pipeline.h
 * @brief Publish/fallback helpers for raw, status, event, and firmware topics.
 */

void state_machine_publish_rawdata(void);
void state_machine_publish_status(const char *status);
void state_machine_publish_event(const char *event_type, int code, const char *message);
void state_machine_publish_firmware_payload(const firmware_status_t *firmware);
void state_machine_publish_firmware_status(const char *status,
                                           uint8_t progress,
                                           const char *version,
                                           const char *job_id,
                                           const char *partition,
                                           const char *error);
void state_machine_publish_or_stage_firmware_status(const char *status,
                                                    uint8_t progress,
                                                    const char *version,
                                                    const char *job_id,
                                                    const char *partition,
                                                    const char *error);
void state_machine_try_flush_deferred_firmware_report(void);
