#pragma once

#include <stdbool.h>

#include "app_config.h"
#include "esp_err.h"

typedef void (*mqtt_command_cb_t)(const char *topic, const char *payload);

esp_err_t tracker_mqtt_init(const config_t *cfg);
esp_err_t tracker_mqtt_connect(void);
esp_err_t tracker_mqtt_disconnect(void);
bool tracker_mqtt_is_connected(void);
esp_err_t tracker_mqtt_publish(const char *topic, const char *payload, int qos);
esp_err_t tracker_mqtt_publish_rawdata(const char *json_payload);
esp_err_t tracker_mqtt_publish_status(const char *json_payload);
esp_err_t tracker_mqtt_publish_event(const char *json_payload);
esp_err_t tracker_mqtt_publish_firmware(const char *json_payload);
esp_err_t tracker_mqtt_subscribe_commands(void);
void tracker_mqtt_set_command_callback(mqtt_command_cb_t cb);
const char *tracker_mqtt_rawdata_topic(void);
const char *tracker_mqtt_status_topic(void);
const char *tracker_mqtt_events_topic(void);
const char *tracker_mqtt_firmware_topic(void);
const char *tracker_mqtt_commands_topic(void);
