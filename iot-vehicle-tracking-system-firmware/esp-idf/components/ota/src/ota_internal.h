/**
 * @file src/ota_internal.h
 * @brief Private OTA job execution and progress hooks.
 *
 * The OTA worker calls the job runner with its copied command and borrows immutable startup settings.
 * The task wrapper provides progress delivery. The job owns source, hash and partition resources until
 * completion.
 */
#pragma once
#include "ota/ota.h"

#define OTA_TAG "ota"   /**< UART log tag for OTA download, verification and partition selection. */

/**
 * @brief Borrow the initialization settings.
 * @return Read-only pointer to the component-owned static configuration.
 * @note Context: App task creating the worker or OTA task executing the job. Non-blocking.
 */
const ota_cfg_t *ota_config(void);
/**
 * @brief Replace the latest progress value and attempt to deliver the corresponding event.
 * @param phase OTA status value encoded as ivts_ota_status_t.
 * @param pct Progress percentage from zero through 100.
 * @param error OTA error code, zero when none applies.
 * @note Context: OTA task. Atomically stores the snapshot and invokes the sink synchronously. The app sink
 *       uses zero wait.
 */
void ota_emit(uint8_t phase, uint8_t pct, uint8_t error);
/**
 * @brief Validate, download and select a candidate image for the next boot.
 *
 * The job checks battery voltage, SHA-256 and image version. It calls boot preparation before changing the
 * boot target.
 * Progress carries success or failure. The caller owns task cleanup and the app owns reboot.
 *
 * @param cmd Non-null command borrowed from the claimed worker slot for the run.
 * @param battery_mv Device supply sample in millivolts.
 * @param min_mv Minimum allowed supply in millivolts.
 * @note Context: OTA task only. Blocks on the source callbacks and flash operations without a fixed overall
 *       deadline.
 */
void ota_job_run(const ivts_ota_cmd_t *cmd, uint16_t battery_mv, uint16_t min_mv);
