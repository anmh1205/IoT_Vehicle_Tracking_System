#include "tracker-runtime-ports.h"

#include "esp_log.h"

#include "util.h"

/**
 * @file tracker-runtime-ports.c
 * @brief Validation helpers for the firmware runtime port registry.
 * This translation unit belongs to the ESP-IDF runtime port layer and bridges portable runtime expectations onto concrete ESP-IDF services and platform helpers.
 */


/* Logging tag for runtime ports module. */
static const char *TAG = "RUNTIME_PORTS";

/**
 * @brief Validate runtime ports registry.
 *
 * Runs a fail-fast null check over the registry and every mandatory port plus
 * its required function pointers. Catching a missing dependency here (at
 * bootstrap wiring time) turns a would-be runtime NULL-call crash into a clean
 * ESP_ERR_INVALID_ARG with a precise log message naming the offender.
 *
 * @param ports Bootstrap-time dependency registry to validate.
 * @return ESP_OK when every mandatory port/callback is present,
 *         ESP_ERR_INVALID_ARG (with a log line) on the first missing member.
 */
esp_err_t tracker_runtime_ports_validate(const tracker_runtime_ports_t *ports) {
    // Reject a NULL registry before dereferencing any of its members.
    ESP_RETURN_ON_NULL(ports, ESP_ERR_INVALID_ARG, TAG, "ports registry is NULL");

    // Modem port: APN configuration and connect request are the minimum needed to bring the link up.
    ESP_RETURN_ON_NULL(ports->modem, ESP_ERR_INVALID_ARG, TAG, "modem port missing");
    ESP_RETURN_ON_NULL(ports->modem->set_apn, ESP_ERR_INVALID_ARG, TAG, "modem set_apn missing");
    ESP_RETURN_ON_NULL(ports->modem->request_connect, ESP_ERR_INVALID_ARG, TAG, "modem request_connect missing");

    // MQTT port: init brings the client up; publish and the command-callback setter drive telemetry/commands.
    ESP_RETURN_ON_NULL(ports->mqtt, ESP_ERR_INVALID_ARG, TAG, "mqtt port missing");
    ESP_RETURN_ON_NULL(ports->mqtt->init, ESP_ERR_INVALID_ARG, TAG, "mqtt init missing");
    ESP_RETURN_ON_NULL(ports->mqtt->publish, ESP_ERR_INVALID_ARG, TAG, "mqtt publish missing");
    ESP_RETURN_ON_NULL(ports->mqtt->set_command_callback,
                       ESP_ERR_INVALID_ARG,
                       TAG,
                       "mqtt command callback setter missing");

    // Storage-queue port: init prepares the offline store; enqueue buffers records when the link is down.
    ESP_RETURN_ON_NULL(ports->storage_queue, ESP_ERR_INVALID_ARG, TAG, "storage queue port missing");
    ESP_RETURN_ON_NULL(ports->storage_queue->init, ESP_ERR_INVALID_ARG, TAG, "storage init missing");
    ESP_RETURN_ON_NULL(ports->storage_queue->enqueue, ESP_ERR_INVALID_ARG, TAG, "storage enqueue missing");

    // OTA port: apply_update performs the firmware update; manual_rollback recovers a bad image.
    ESP_RETURN_ON_NULL(ports->ota_download, ESP_ERR_INVALID_ARG, TAG, "ota port missing");
    ESP_RETURN_ON_NULL(ports->ota_download->apply_update, ESP_ERR_INVALID_ARG, TAG, "ota apply missing");
    ESP_RETURN_ON_NULL(ports->ota_download->manual_rollback,
                       ESP_ERR_INVALID_ARG,
                       TAG,
                       "ota rollback missing");

    // Config-store port: init prepares persistent storage; load restores saved device configuration.
    ESP_RETURN_ON_NULL(ports->config_store, ESP_ERR_INVALID_ARG, TAG, "config store port missing");
    ESP_RETURN_ON_NULL(ports->config_store->init, ESP_ERR_INVALID_ARG, TAG, "config init missing");
    ESP_RETURN_ON_NULL(ports->config_store->load, ESP_ERR_INVALID_ARG, TAG, "config load missing");

    // RTC port: init brings up the clock; get_health reports whether wall-clock time can be trusted.
    ESP_RETURN_ON_NULL(ports->rtc_clock, ESP_ERR_INVALID_ARG, TAG, "rtc port missing");
    ESP_RETURN_ON_NULL(ports->rtc_clock->init, ESP_ERR_INVALID_ARG, TAG, "rtc init missing");
    ESP_RETURN_ON_NULL(ports->rtc_clock->get_health, ESP_ERR_INVALID_ARG, TAG, "rtc health missing");

    // OBD port: connect/disconnect manage the link to the vehicle ECU for diagnostics reads.
    ESP_RETURN_ON_NULL(ports->obd_reader, ESP_ERR_INVALID_ARG, TAG, "obd port missing");
    ESP_RETURN_ON_NULL(ports->obd_reader->connect, ESP_ERR_INVALID_ARG, TAG, "obd connect missing");
    ESP_RETURN_ON_NULL(ports->obd_reader->disconnect, ESP_ERR_INVALID_ARG, TAG, "obd disconnect missing");

    // Power-control port: init configures modem power GPIOs; power_on is the minimum required action.
    ESP_RETURN_ON_NULL(ports->power_control, ESP_ERR_INVALID_ARG, TAG, "power port missing");
    ESP_RETURN_ON_NULL(ports->power_control->init, ESP_ERR_INVALID_ARG, TAG, "power init missing");
    ESP_RETURN_ON_NULL(ports->power_control->power_on, ESP_ERR_INVALID_ARG, TAG, "power on missing");

    // Every mandatory port and required callback is present: the registry is safe to use at runtime.
    ESP_LOGI(TAG, "runtime port registry validated");
    return ESP_OK;
}
