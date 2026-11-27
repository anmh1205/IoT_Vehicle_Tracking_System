/**
 * @file sd.h
 * @brief Private SD mount and log operations for the storage task.
 */
#pragma once
#include "esp_err.h"
#include "storage/storage.h"

/* Mount and scan during initialization. Append from the storage task. */
esp_err_t storage_sd_mount(void);
void storage_sd_log_open(void);
ivts_err_t storage_sd_log_write(const char *line, size_t len);
