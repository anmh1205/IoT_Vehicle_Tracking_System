#include "ota_executor_internal.h"

#include <string.h>

#include "esp_ota_ops.h"

/**
 * @file util_ota_rollback.c
 * @brief Manual OTA rollback helpers behind the public util facade.
 * This translation unit belongs to the OTA domain layer and keeps domain rules, staging helpers, and policy decisions separate from transport and board adapters.
 */


/**
 * @brief Trigger manual rollback to previous partition.
 *
 * Picks a safe boot target using a priority fallback chain so the device always
 * has somewhere to boot after a bad update:
 *   1. If running on ota_0, prefer the ota_1 slot (the other OTA image).
 *   2. Otherwise prefer the factory image (known-good baseline).
 *   3. As a last resort, fall back to ota_0.
 * The chosen partition label is recorded in @p out_status and marked as the next
 * boot partition; the caller is responsible for the actual reset.
 *
 * @param[out] out_status Receives status "rolled_back" plus the target label.
 * @return ESP_OK when a boot partition was selected, ESP_ERR_NOT_FOUND when no
 *         usable partition exists, or an esp_ota error from set_boot_partition.
 */
esp_err_t util_ota_trigger_manual_rollback(firmware_status_t *out_status) {
    ESP_RETURN_ON_NULL(out_status, ESP_ERR_INVALID_ARG, UTIL_TAG, "out_status is NULL");

    // Pre-fill the status as a completed rollback; only the partition label varies per branch.
    memset(out_status, 0, sizeof(*out_status));
    util_copy_string(out_status->status, sizeof(out_status->status), TRACKER_OTA_STATUS_ROLLED_BACK);
    out_status->progress = TRACKER_OTA_PROGRESS_DONE;

    // Case 1: currently running ota_0, so the previous image lives in ota_1.
    const esp_partition_t *running = esp_ota_get_running_partition();
    if (running != NULL && !util_string_empty(running->label) && strcmp(running->label, "ota_0") == 0) {
        const esp_partition_t *rollback = esp_partition_find_first(ESP_PARTITION_TYPE_APP,
                                                                   ESP_PARTITION_SUBTYPE_APP_OTA_1,
                                                                   NULL);
        if (rollback != NULL) {
            util_fill_partition_label(rollback, out_status->partition, sizeof(out_status->partition));
            return esp_ota_set_boot_partition(rollback);
        }
    }

    // Case 2: prefer the factory image as a guaranteed known-good baseline.
    const esp_partition_t *factory = esp_partition_find_first(ESP_PARTITION_TYPE_APP,
                                                              ESP_PARTITION_SUBTYPE_APP_FACTORY,
                                                              NULL);
    if (factory != NULL) {
        util_fill_partition_label(factory, out_status->partition, sizeof(out_status->partition));
        return esp_ota_set_boot_partition(factory);
    }

    // Case 3: last-resort fallback to ota_0 when no factory image is present.
    const esp_partition_t *ota0 = esp_partition_find_first(ESP_PARTITION_TYPE_APP,
                                                           ESP_PARTITION_SUBTYPE_APP_OTA_0,
                                                           NULL);
    if (ota0 != NULL) {
        util_fill_partition_label(ota0, out_status->partition, sizeof(out_status->partition));
        return esp_ota_set_boot_partition(ota0);
    }

    // No bootable app partition found at all.
    return ESP_ERR_NOT_FOUND;
}
