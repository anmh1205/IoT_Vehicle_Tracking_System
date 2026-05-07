#include "ota_executor_internal.h"

#include <string.h>

#include "esp_ota_ops.h"

/**
 * @file util_ota_rollback.c
 * @brief Manual OTA rollback helpers behind the public util facade.
 * This translation unit belongs to the OTA domain layer and keeps domain rules, staging helpers, and policy decisions separate from transport and board adapters.
 */

// File-local constants, retained state, and helper wiring stay private here so
// higher layers interact with this module through its exported contract.


/**
 * @brief Trigger manual rollback to previous partition.
 *
 * @param out_status Output status.
 * @return ESP_OK on success.
 */
esp_err_t util_ota_trigger_manual_rollback(firmware_status_t *out_status) {
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
    ESP_RETURN_ON_NULL(out_status, ESP_ERR_INVALID_ARG, UTIL_TAG, "out_status is NULL");

    memset(out_status, 0, sizeof(*out_status));
    util_copy_string(out_status->status, sizeof(out_status->status), TRACKER_OTA_STATUS_ROLLED_BACK);
    out_status->progress = TRACKER_OTA_PROGRESS_DONE;

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

    const esp_partition_t *factory = esp_partition_find_first(ESP_PARTITION_TYPE_APP,
                                                              ESP_PARTITION_SUBTYPE_APP_FACTORY,
                                                              NULL);
    if (factory != NULL) {
        util_fill_partition_label(factory, out_status->partition, sizeof(out_status->partition));
        return esp_ota_set_boot_partition(factory);
    }

    const esp_partition_t *ota0 = esp_partition_find_first(ESP_PARTITION_TYPE_APP,
                                                           ESP_PARTITION_SUBTYPE_APP_OTA_0,
                                                           NULL);
    if (ota0 != NULL) {
        util_fill_partition_label(ota0, out_status->partition, sizeof(out_status->partition));
        return esp_ota_set_boot_partition(ota0);
    }

    return ESP_ERR_NOT_FOUND;
}
