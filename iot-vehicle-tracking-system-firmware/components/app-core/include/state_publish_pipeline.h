#pragma once

#include "ota_contract.h"

/**
 * @file state_publish_pipeline.h
 * @brief Publish/fallback helpers for raw, status, event, and firmware topics.
 * This header belongs to the app-core orchestration layer and defines the orchestration boundary that bootstrap code and adapters rely on during runtime.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief Publish one raw telemetry payload through the shared pipeline.
 *
 * Rawdata carries the current telemetry snapshot plus session/boot metadata and
 * becomes the point where the IMU peak delta window is reset after success.
 */
bool state_machine_publish_rawdata(void);
/**
 * @brief Publish a status payload and optional authoritative boundary marker.
 *
 * @param status Runtime status string such as `running`, `stopped`, or `heartbeat`.
 * @param boundary_event Authoritative boundary marker: `started`, `ended`, or `none`.
 */
void state_machine_publish_status(const char *status, const char *boundary_event);
/**
 * @brief Publish a device event payload through the shared pipeline.
 *
 * @param event_type Event family or severity label.
 * @param code Stable numeric event code.
 * @param message Short operator-facing diagnostic message.
 */
void state_machine_publish_event(const char *event_type, int code, const char *message);
/**
 * @brief Publish one firmware-status payload immediately.
 *
 * @param firmware Fully populated firmware status payload.
 */
void state_machine_publish_firmware_payload(const firmware_status_t *firmware);
/**
 * @brief Build and publish a firmware-status payload from primitive fields.
 *
 * @param status OTA lifecycle state.
 * @param progress OTA progress percentage.
 * @param version Target firmware version associated with the status.
 * @param job_id Cloud OTA job identifier.
 * @param partition Partition label when relevant.
 * @param error Stable short error text when the status represents failure.
 */
void state_machine_publish_firmware_status(const char *status,
                                           uint8_t progress,
                                           const char *version,
                                           const char *job_id,
                                           const char *partition,
                                           const char *error);
/**
 * @brief Publish firmware status now, or defer it until MQTT is connected.
 *
 * Uses the same payload contract as `state_machine_publish_firmware_status()`,
 * but keeps the report in memory when the device is offline so the next online
 * cycle can still emit the most recent OTA state.
 */
void state_machine_publish_or_stage_firmware_status(const char *status,
                                                    uint8_t progress,
                                                    const char *version,
                                                    const char *job_id,
                                                    const char *partition,
                                                    const char *error);
/**
 * @brief Flush any previously deferred firmware report when connectivity allows.
 *
 * Deferred reports are skipped while OTA is still mutating runtime state.
 */
void state_machine_try_flush_deferred_firmware_report(void);
