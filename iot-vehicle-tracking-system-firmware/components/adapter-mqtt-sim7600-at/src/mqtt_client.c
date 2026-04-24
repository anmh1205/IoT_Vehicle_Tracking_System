#include "mqtt_client.h"

#include <string.h>

#include "esp_log.h"

#include "modem_at.h"
#include "mqtt_internal.h"
#include "util.h"

/**
 * @file mqtt_client.c
 * @brief Public compatibility facade for split MQTT topic/session helpers.
 */

mqtt_command_cb_t s_command_callback = NULL;
mqtt_puback_cb_t s_puback_callback = NULL;
config_t s_cfg = {0};
bool s_connected = false;
bool s_service_started = false;
bool s_client_acquired = false;
bool s_commands_subscribed = false;
bool s_tls_enabled = false;
bool s_urc_registered = false;
int s_next_msg_id = 1;
mqtt_rx_ctx_t s_rx_ctx = {0};
mqtt_rx_pending_header_t s_rx_pending_header = MQTT_RX_PENDING_NONE;
bool s_connect_result_pending = false;
bool s_connect_result_ready = false;
int s_connect_result_err = -1;
bool s_publish_result_pending = false;
bool s_publish_result_ready = false;
int s_publish_result_err = -1;
char s_topic_rawdata[MQTT_TOPIC_MAX_LEN] = {0};
char s_topic_status[MQTT_TOPIC_MAX_LEN] = {0};
char s_topic_events[MQTT_TOPIC_MAX_LEN] = {0};
char s_topic_firmware[MQTT_TOPIC_MAX_LEN] = {0};
char s_topic_commands[MQTT_TOPIC_MAX_LEN] = {0};
char s_server_addr_primary[MQTT_SERVER_ADDR_MAX_LEN] = {0};
char s_server_addr_fallback[MQTT_SERVER_ADDR_MAX_LEN] = {0};
bool s_server_addr_has_fallback = false;

esp_err_t tracker_mqtt_init(const config_t *cfg) {
    ESP_RETURN_ON_NULL(cfg, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "cfg is NULL");
    ESP_RETURN_ON_FALSE(!util_string_empty(cfg->mqtt_host),
                        ESP_ERR_INVALID_ARG,
                        TRACKER_MQTT_TAG,
                        "mqtt_host empty");

    s_cfg = *cfg;
    s_tls_enabled = tracker_mqtt_use_tls(&s_cfg);
    tracker_mqtt_build_topics();
    tracker_mqtt_rx_reset();
    s_connected = false;
    s_service_started = false;
    s_client_acquired = false;
    s_commands_subscribed = false;
    s_next_msg_id = 1;
    tracker_mqtt_reset_connect_wait();
    tracker_mqtt_reset_publish_wait();

    ESP_RETURN_ON_FALSE(tracker_mqtt_build_server_addrs(&s_cfg) == ESP_OK,
                        ESP_FAIL,
                        TRACKER_MQTT_TAG,
                        "server addr build failed");
    tracker_mqtt_register_urc_handler();

    ESP_LOGI(TRACKER_MQTT_TAG,
             "MQTT init via SIM7600 host=%s tls=%d server=%s port_mode=%s fallback=%d user_set=%d command_subscribe=%d",
             s_cfg.mqtt_host,
             s_tls_enabled ? 1 : 0,
             s_server_addr_primary,
             tracker_mqtt_host_forces_tls_default_port(s_cfg.mqtt_host) ? "tls8883_primary" : "explicit",
             s_server_addr_has_fallback ? 1 : 0,
             !util_string_empty(s_cfg.mqtt_username) ? 1 : 0,
             s_cfg.command_subscribe_enabled ? 1 : 0);
    return ESP_OK;
}

esp_err_t tracker_mqtt_connect(void) {
    return tracker_mqtt_session_connect();
}

esp_err_t tracker_mqtt_disconnect(void) {
    return tracker_mqtt_session_disconnect();
}

bool tracker_mqtt_is_connected(void) {
    return s_connected;
}

esp_err_t tracker_mqtt_publish(const char *topic, const char *payload, int qos) {
    int msg_id = tracker_mqtt_publish_with_msg_id_internal(topic, payload, qos);
    return msg_id >= 0 ? ESP_OK : ESP_FAIL;
}

int tracker_mqtt_publish_with_msg_id(const char *topic, const char *payload, int qos) {
    return tracker_mqtt_publish_with_msg_id_internal(topic, payload, qos);
}

esp_err_t tracker_mqtt_publish_rawdata(const char *json_payload) {
    return tracker_mqtt_publish(s_topic_rawdata, json_payload, 0);
}

esp_err_t tracker_mqtt_publish_status(const char *json_payload) {
    return tracker_mqtt_publish(s_topic_status, json_payload, 1);
}

esp_err_t tracker_mqtt_publish_event(const char *json_payload) {
    return tracker_mqtt_publish(s_topic_events, json_payload, 1);
}

esp_err_t tracker_mqtt_publish_firmware(const char *json_payload) {
    return tracker_mqtt_publish(s_topic_firmware, json_payload, 1);
}

esp_err_t tracker_mqtt_subscribe_commands(void) {
    return tracker_mqtt_subscribe_commands_internal();
}

void tracker_mqtt_set_command_callback(mqtt_command_cb_t cb) {
    s_command_callback = cb;
}

void tracker_mqtt_set_puback_callback(mqtt_puback_cb_t cb) {
    s_puback_callback = cb;
}

const char *tracker_mqtt_rawdata_topic(void) {
    return s_topic_rawdata;
}

const char *tracker_mqtt_status_topic(void) {
    return s_topic_status;
}

const char *tracker_mqtt_events_topic(void) {
    return s_topic_events;
}

const char *tracker_mqtt_firmware_topic(void) {
    return s_topic_firmware;
}

const char *tracker_mqtt_commands_topic(void) {
    return s_topic_commands;
}
