/**
 * @file src/sd/sd.h
 * @brief Private SDMMC mount and SD log interface.
 *
 * App startup binds the configured pins and scans existing logs. The storage task owns subsequent file
 * writes.
 * Offline telemetry uses a separate segment store. Log append borrows a caller buffer only during the write.
 */
#pragma once
#include "esp_err.h"
#include "storage/storage.h"

/**
 * @brief Mount the configured four-bit SDMMC card and scan existing logs.
 * @retval ESP_OK The filesystem mounts.
 * @return Otherwise, the SDK mount error. A mount failure does not trigger formatting.
 * @note Context: App startup. Blocks on card setup and log directory I/O without a fixed timeout.
 */
esp_err_t storage_sd_mount(void);
/**
 * @brief Create the log directory and scan existing log indices and sizes.
 * Directory creation and scan failures are not reported to the caller.
 * @note Context: App startup after SD mount. Synchronous filesystem I/O with no fixed timeout.
 */
void storage_sd_log_open(void);
/**
 * @brief Append a newline-terminated line and rotate the log if needed.
 * @param line Borrowed buffer of len readable bytes.
 * @param len Line length in bytes, excluding the newline added here.
 * @retval IVTS_OK The full line and newline are written and the file closes.
 * @retval IVTS_ERR_INVALID_STATE SD storage is unavailable.
 * @retval IVTS_ERR_IO Open, write or close fails. A partial append may remain.
 * @note Context: Storage task. Synchronous SD and directory I/O without a fixed timeout.
 */
ivts_err_t storage_sd_log_write(const char *line, size_t len);
