#pragma once
#include "storage/storage.h"
#include "esp_err.h"

#define STORAGE_TAG "storage"
#ifndef SD_MOUNT
#define SD_MOUNT "/sd"
#endif

/* Set during initialization and read by the storage task afterwards. */
const storage_cfg_t *storage_config_view(void);
void storage_emit(const ivts_event_t *event);

/* Create the request queue and its only consumer after initializing NVS and SD. */
esp_err_t storage_task_start(void);

/* Initialize NVS without erasing existing data. */
esp_err_t storage_nvs_init(void);
