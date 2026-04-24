#pragma once

#include <stdbool.h>

#include "app_config.h"
#include "esp_err.h"

/**
 * @file mqtt_client.h
 * @brief MQTT wrapper for tracker topics and command callbacks.
 */

/**
 * @brief Callback for command messages received from command topic.
 *
 * @param topic Topic string for received command.
 * @param payload Null-terminated command payload.
 */
typedef void (*mqtt_command_cb_t)(const char *topic, const char *payload);
typedef void (*mqtt_puback_cb_t)(int msg_id);

/**
 * @brief Initialize MQTT client and derive device-scoped topics.
 *
 * @param cfg Runtime configuration.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t tracker_mqtt_init(const config_t *cfg);

/**
 * @brief Start MQTT client and initiate connection.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t tracker_mqtt_connect(void);

/**
 * @brief Stop MQTT client and disconnect from broker.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t tracker_mqtt_disconnect(void);

/**
 * @brief Read cached MQTT connection state.
 *
 * @return true when connected.
 */
bool tracker_mqtt_is_connected(void);

/**
 * @brief Publish payload to provided MQTT topic.
 *
 * @param topic Topic name.
 * @param payload Payload string.
 * @param qos MQTT QoS level (0 or 1).
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t tracker_mqtt_publish(const char *topic, const char *payload, int qos);
int tracker_mqtt_publish_with_msg_id(const char *topic, const char *payload, int qos);

/**
 * @brief Publish payload to `v1/{device}/rawdata`.
 *
 * @param json_payload JSON payload string.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t tracker_mqtt_publish_rawdata(const char *json_payload);

/**
 * @brief Publish payload to `v1/{device}/status`.
 *
 * @param json_payload JSON payload string.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t tracker_mqtt_publish_status(const char *json_payload);

/**
 * @brief Publish payload to `v1/{device}/events`.
 *
 * @param json_payload JSON payload string.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t tracker_mqtt_publish_event(const char *json_payload);

/**
 * @brief Publish payload to `v1/{device}/firmware`.
 *
 * @param json_payload JSON payload string.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t tracker_mqtt_publish_firmware(const char *json_payload);

/**
 * @brief Subscribe to command topic for this device.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t tracker_mqtt_subscribe_commands(void);

/**
 * @brief Register command callback handler.
 *
 * @param cb Callback function.
 */
void tracker_mqtt_set_command_callback(mqtt_command_cb_t cb);
void tracker_mqtt_set_puback_callback(mqtt_puback_cb_t cb);

/**
 * @brief Get rawdata topic string.
 *
 * @return Topic pointer owned by MQTT module.
 */
const char *tracker_mqtt_rawdata_topic(void);

/**
 * @brief Get status topic string.
 *
 * @return Topic pointer owned by MQTT module.
 */
const char *tracker_mqtt_status_topic(void);

/**
 * @brief Get events topic string.
 *
 * @return Topic pointer owned by MQTT module.
 */
const char *tracker_mqtt_events_topic(void);

/**
 * @brief Get firmware topic string.
 *
 * @return Topic pointer owned by MQTT module.
 */
const char *tracker_mqtt_firmware_topic(void);

/**
 * @brief Get commands topic string.
 *
 * @return Topic pointer owned by MQTT module.
 */
const char *tracker_mqtt_commands_topic(void);
