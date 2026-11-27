#pragma once
#include "storage/storage.h"

#define STORAGE_TAG "storage"
#ifndef SD_MOUNT
#define SD_MOUNT "/sd"
#endif

/* Set during initialization and read by the storage task afterwards. */
const storage_cfg_t *storage_config_view(void);
void storage_emit(const ivts_event_t *event);
