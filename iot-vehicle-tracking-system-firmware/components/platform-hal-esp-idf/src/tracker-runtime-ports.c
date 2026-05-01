#include "tracker-runtime-ports.h"

#include "esp_log.h"

#include "util.h"

/**
 * @file tracker-runtime-ports.c
 * @brief Validation helpers for the firmware runtime port registry.
 */

static const char *TAG = "RUNTIME_PORTS";

/**
 * @brief Validate runtime ports registry.
 *
 * @param ports Port registry structure.
 * @return ESP_OK if valid.
 */
esp_err_t tracker_runtime_ports_validate(const tracker_runtime_ports_t *ports) {
    ESP_RETURN_ON_NULL(ports, ESP_ERR_INVALID_ARG, TAG, "ports registry is NULL");

    ESP_RETURN_ON_NULL(ports->modem, ESP_ERR_INVALID_ARG, TAG, "modem port missing");
    ESP_RETURN_ON_NULL(ports->modem->set_apn, ESP_ERR_INVALID_ARG, TAG, "modem set_apn missing");
    ESP_RETURN_ON_NULL(ports->modem->request_connect, ESP_ERR_INVALID_ARG, TAG, "modem request_connect missing");

    ESP_RETURN_ON_NULL(ports->mqtt, ESP_ERR_INVALID_ARG, TAG, "mqtt port missing");
    ESP_RETURN_ON_NULL(ports->mqtt->init, ESP_ERR_INVALID_ARG, TAG, "mqtt init missing");
    ESP_RETURN_ON_NULL(ports->mqtt->publish, ESP_ERR_INVALID_ARG, TAG, "mqtt publish missing");
    ESP_RETURN_ON_NULL(ports->mqtt->set_command_callback,
                       ESP_ERR_INVALID_ARG,
                       TAG,
                       "mqtt command callback setter missing");

    ESP_RETURN_ON_NULL(ports->storage_queue, ESP_ERR_INVALID_ARG, TAG, "storage queue port missing");
    ESP_RETURN_ON_NULL(ports->storage_queue->init, ESP_ERR_INVALID_ARG, TAG, "storage init missing");
    ESP_RETURN_ON_NULL(ports->storage_queue->enqueue, ESP_ERR_INVALID_ARG, TAG, "storage enqueue missing");

    ESP_RETURN_ON_NULL(ports->ota_download, ESP_ERR_INVALID_ARG, TAG, "ota port missing");
    ESP_RETURN_ON_NULL(ports->ota_download->apply_update, ESP_ERR_INVALID_ARG, TAG, "ota apply missing");
    ESP_RETURN_ON_NULL(ports->ota_download->manual_rollback,
                       ESP_ERR_INVALID_ARG,
                       TAG,
                       "ota rollback missing");

    ESP_RETURN_ON_NULL(ports->config_store, ESP_ERR_INVALID_ARG, TAG, "config store port missing");
    ESP_RETURN_ON_NULL(ports->config_store->init, ESP_ERR_INVALID_ARG, TAG, "config init missing");
    ESP_RETURN_ON_NULL(ports->config_store->load, ESP_ERR_INVALID_ARG, TAG, "config load missing");

    ESP_RETURN_ON_NULL(ports->rtc_clock, ESP_ERR_INVALID_ARG, TAG, "rtc port missing");
    ESP_RETURN_ON_NULL(ports->rtc_clock->init, ESP_ERR_INVALID_ARG, TAG, "rtc init missing");
    ESP_RETURN_ON_NULL(ports->rtc_clock->get_health, ESP_ERR_INVALID_ARG, TAG, "rtc health missing");

    ESP_RETURN_ON_NULL(ports->obd_reader, ESP_ERR_INVALID_ARG, TAG, "obd port missing");
    ESP_RETURN_ON_NULL(ports->obd_reader->connect, ESP_ERR_INVALID_ARG, TAG, "obd connect missing");
    ESP_RETURN_ON_NULL(ports->obd_reader->disconnect, ESP_ERR_INVALID_ARG, TAG, "obd disconnect missing");

    ESP_RETURN_ON_NULL(ports->power_control, ESP_ERR_INVALID_ARG, TAG, "power port missing");
    ESP_RETURN_ON_NULL(ports->power_control->init, ESP_ERR_INVALID_ARG, TAG, "power init missing");
    ESP_RETURN_ON_NULL(ports->power_control->power_on, ESP_ERR_INVALID_ARG, TAG, "power on missing");

    ESP_LOGI(TAG, "runtime port registry validated");
    return ESP_OK;
}
