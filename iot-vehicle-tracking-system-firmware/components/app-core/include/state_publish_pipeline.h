#pragma once

#include "ota_contract.h"

/**
 * @file state_publish_pipeline.h
 * @brief Publish/fallback helpers for raw, status, event, and firmware topics.
 */

/** @brief Publish one raw telemetry payload through the shared pipeline. */
void state_machine_publish_rawdata(void);
/** @brief Publish a status payload and optional authoritative boundary marker. */
void state_machine_publish_status(const char *status, const char *boundary_event);
/** @brief Publish a device event payload through the shared pipeline. */
void state_machine_publish_event(const char *event_type, int code, const char *message);
/** @brief Publish one firmware-status payload immediately. */
void state_machine_publish_firmware_payload(const firmware_status_t *firmware);
/** @brief Build and publish a firmware-status payload from primitive fields. */
void state_machine_publish_firmware_status(const char *status,
                                           uint8_t progress,
                                           const char *version,
                                           const char *job_id,
                                           const char *partition,
                                           const char *error);
/** @brief Publish firmware status now, or defer it until MQTT is connected. */
void state_machine_publish_or_stage_firmware_status(const char *status,
                                                    uint8_t progress,
                                                    const char *version,
                                                    const char *job_id,
                                                    const char *partition,
                                                    const char *error);
/** @brief Flush any previously deferred firmware report when connectivity allows. */
void state_machine_try_flush_deferred_firmware_report(void);
