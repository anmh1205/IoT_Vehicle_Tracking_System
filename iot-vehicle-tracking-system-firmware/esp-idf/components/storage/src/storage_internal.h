/**
 * @file src/storage_internal.h
 * @brief Private storage configuration, event delivery and startup hooks.
 *
 * App startup initializes NVS and publishes the configuration before handing SD work to the storage task.
 * NVS and SD helpers share these hooks. Queue framing and file layouts stay in the relevant modules.
 */
#pragma once
#include "storage/storage.h"
#include "esp_err.h"

#define STORAGE_TAG "storage"   /**< UART log tag for NVS, SD and offline queue operations. */
#ifndef SD_MOUNT
#define SD_MOUNT "/sd"   /**< Default VFS mount path for the SD card. */
#endif

/**
 * @brief Borrow the storage configuration stored at initialization.
 * @return Read-only pointer to component-owned static settings.
 * @note Context: App startup, SD helpers and storage task after settings are copied. Non-blocking.
 */
const storage_cfg_t *storage_config_view(void);
/**
 * @brief Forward a storage event through the configured sink.
 * @param event Event borrowed by the sink for the call. The sink must copy it to retain it.
 * @note Context: NVS caller or storage task. Calls the sink synchronously. The app sink enqueues with zero
 *       wait.
 */
void storage_emit(const ivts_event_t *event);

/**
 * @brief Create the SD request queue and its worker.
 * @retval ESP_OK The task starts.
 * @retval ESP_ERR_NO_MEM Queue or task allocation fails.
 * @note Context: App startup after NVS and optional SD setup. No wait for the worker to run.
 */
esp_err_t storage_task_start(void);

/**
 * @brief Initialize flash NVS while preserving existing records.
 * @return SDK initialization result.
 * @note Context: App startup. Synchronous flash access with no component-level timeout.
 */
esp_err_t storage_nvs_init(void);
