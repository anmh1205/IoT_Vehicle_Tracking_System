#include "ota_executor_internal.h"

#include <string.h>

#include "esp_ota_ops.h"

/**
 * @file util_ota_rollback.c
 * @brief Select a verified fallback image without discarding the OTA job lineage.
 */

/**
 * A rollback must never select the running image or an OTA slot not confirmed
 * ESP_OTA_IMG_VALID. esp_ota_set_boot_partition additionally validates that
 * the candidate contains a bootable image; failed candidates are skipped.
 */
static esp_err_t try_rollback_candidate(const esp_partition_t *candidate,
                                        const esp_partition_t *running,
                                        firmware_status_t *out_status) {
    if (candidate == NULL || candidate == running) {
        return ESP_ERR_NOT_FOUND;
    }

    if (candidate->subtype != ESP_PARTITION_SUBTYPE_APP_FACTORY) {
        esp_ota_img_states_t state = ESP_OTA_IMG_UNDEFINED;
        if (esp_ota_get_state_partition(candidate, &state) != ESP_OK ||
            state != ESP_OTA_IMG_VALID) {
            return ESP_ERR_INVALID_STATE;
        }
    }

    esp_err_t err = esp_ota_set_boot_partition(candidate);
    if (err != ESP_OK) {
        return err;
    }

    // Only the rollback selector's fields are modified. The caller owns
    // job_id, target_version, current_version and diagnostic lineage.
    util_fill_partition_label(candidate, out_status->partition, sizeof(out_status->partition));
    util_copy_string(out_status->status, sizeof(out_status->status), TRACKER_OTA_STATUS_ROLLED_BACK);
    out_status->progress = TRACKER_OTA_PROGRESS_DONE;
    return ESP_OK;
}

esp_err_t util_ota_trigger_manual_rollback(firmware_status_t *out_status) {
    ESP_RETURN_ON_NULL(out_status, ESP_ERR_INVALID_ARG, UTIL_TAG, "out_status is NULL");

    const esp_partition_t *running = esp_ota_get_running_partition();
    if (running == NULL) {
        return ESP_ERR_INVALID_STATE;
    }

    // An OTA image only rolls back to an independently verified alternate OTA
    // image or to the factory image. Factory is not assumed to be the previous
    // application version: its bootability is checked by ESP-IDF.
    esp_err_t last_err = ESP_ERR_NOT_FOUND;
    if (running->subtype == ESP_PARTITION_SUBTYPE_APP_OTA_0 ||
        running->subtype == ESP_PARTITION_SUBTYPE_APP_OTA_1) {
        const esp_partition_subtype_t other_subtype =
            running->subtype == ESP_PARTITION_SUBTYPE_APP_OTA_0
                ? ESP_PARTITION_SUBTYPE_APP_OTA_1
                : ESP_PARTITION_SUBTYPE_APP_OTA_0;
        const esp_partition_t *other = esp_partition_find_first(
            ESP_PARTITION_TYPE_APP, other_subtype, NULL);
        last_err = try_rollback_candidate(other, running, out_status);
        if (last_err == ESP_OK) {
            return ESP_OK;
        }
    }

    if (running->subtype != ESP_PARTITION_SUBTYPE_APP_FACTORY) {
        const esp_partition_t *factory = esp_partition_find_first(
            ESP_PARTITION_TYPE_APP, ESP_PARTITION_SUBTYPE_APP_FACTORY, NULL);
        esp_err_t factory_err = try_rollback_candidate(factory, running, out_status);
        if (factory_err == ESP_OK) {
            return ESP_OK;
        }
        if (factory_err != ESP_ERR_NOT_FOUND) {
            last_err = factory_err;
        }
    }

    // There is no verified fallback. Preserve the caller's original status and
    // metadata so the app-core can publish a correlated failed rollback report.
    return last_err;
}
