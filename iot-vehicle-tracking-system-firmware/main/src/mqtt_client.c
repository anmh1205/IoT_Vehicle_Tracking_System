#include "mqtt_client.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "esp_event.h"
#include "esp_log.h"

#include "util.h"

/**
 * @file mqtt_client.c
 * @brief Device-scoped MQTT topic management and publish/subscribe wrapper.
 */

#define MQTT_TOPIC_MAX_LEN 96

static const char *TAG = "TRACKER_MQTT";

/* ESP-IDF MQTT client handle. */
static esp_mqtt_client_handle_t s_client = NULL;
/* Callback for cloud command messages. */
static mqtt_command_cb_t s_command_callback = NULL;
/* Cached connection state from MQTT events. */
static bool s_connected = false;

/* Cached configuration copy for reconnect behavior and topic mapping. */
static config_t s_cfg;
static char s_topic_rawdata[MQTT_TOPIC_MAX_LEN];
static char s_topic_status[MQTT_TOPIC_MAX_LEN];
static char s_topic_events[MQTT_TOPIC_MAX_LEN];
static char s_topic_firmware[MQTT_TOPIC_MAX_LEN];
static char s_topic_commands[MQTT_TOPIC_MAX_LEN];
static char s_broker_uri[MQTT_TOPIC_MAX_LEN];

/**
 * @brief Build all MQTT topics from current device ID.
 */
static void tracker_mqtt_build_topics(void) {
    int n = snprintf(s_topic_rawdata, sizeof(s_topic_rawdata), "v1/%s/rawdata", s_cfg.device_id);
    if (n < 0 || (size_t)n >= sizeof(s_topic_rawdata)) {
        ESP_LOGW(TAG, "rawdata topic truncated");
    }

    n = snprintf(s_topic_status, sizeof(s_topic_status), "v1/%s/status", s_cfg.device_id);
    if (n < 0 || (size_t)n >= sizeof(s_topic_status)) {
        ESP_LOGW(TAG, "status topic truncated");
    }

    n = snprintf(s_topic_events, sizeof(s_topic_events), "v1/%s/events", s_cfg.device_id);
    if (n < 0 || (size_t)n >= sizeof(s_topic_events)) {
        ESP_LOGW(TAG, "events topic truncated");
    }

    n = snprintf(s_topic_firmware, sizeof(s_topic_firmware), "v1/%s/firmware", s_cfg.device_id);
    if (n < 0 || (size_t)n >= sizeof(s_topic_firmware)) {
        ESP_LOGW(TAG, "firmware topic truncated");
    }

    n = snprintf(s_topic_commands, sizeof(s_topic_commands), "v1/%s/commands", s_cfg.device_id);
    if (n < 0 || (size_t)n >= sizeof(s_topic_commands)) {
        ESP_LOGW(TAG, "commands topic truncated");
    }
}

/**
 * @brief Central MQTT event callback from ESP-IDF MQTT client.
 *
 * @param handler_args Unused.
 * @param base Event base.
 * @param event_id MQTT event ID.
 * @param event_data Event payload.
 */
static void tracker_mqtt_event_handler(void *handler_args,
                                       esp_event_base_t base,
                                       int32_t event_id,
                                       void *event_data) {
    (void)handler_args;
    (void)base;

    esp_mqtt_event_handle_t event = (esp_mqtt_event_handle_t)event_data;

    switch ((esp_mqtt_event_id_t)event_id) {
        case MQTT_EVENT_CONNECTED:
            s_connected = true;
            ESP_LOGI(TAG, "MQTT connected");
            /* Subscribe command topic only when config enables command channel. */
            if (s_cfg.command_subscribe_enabled) {
                esp_mqtt_client_subscribe(s_client, s_topic_commands, 1);
            }
            break;

        case MQTT_EVENT_DISCONNECTED:
            s_connected = false;
            ESP_LOGW(TAG, "MQTT disconnected");
            break;

        case MQTT_EVENT_DATA: {
            /* Ignore malformed event frames with empty topic or payload. */
            if (event->topic_len <= 0 || event->data_len <= 0) {
                break;
            }

            size_t topic_len = (size_t)event->topic_len;
            if (s_command_callback != NULL && topic_len == strlen(s_topic_commands) &&
                strncmp(event->topic, s_topic_commands, topic_len) == 0) {
                /* Copy payload into null-terminated local buffer for JSON parser. */
                char payload[512] = {0};
                size_t copy_len = MIN_VALUE((size_t)event->data_len, sizeof(payload) - 1);
                if (copy_len < (size_t)event->data_len) {
                    ESP_LOGW(TAG, "Command payload too large, truncating from %d bytes", event->data_len);
                }
                memcpy(payload, event->data, copy_len);
                s_command_callback(s_topic_commands, payload);
            }
            break;
        }

        default:
            break;
    }
}

/**
 * @brief Initialize MQTT client with topic mapping and credentials.
 *
 * @param cfg Runtime configuration.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t tracker_mqtt_init(const config_t *cfg) {
    ESP_RETURN_ON_NULL(cfg, ESP_ERR_INVALID_ARG, TAG, "cfg is NULL");

    /* Store config copy because caller may update its own buffer later. */
    s_cfg = *cfg;
    tracker_mqtt_build_topics();
    snprintf(s_broker_uri, sizeof(s_broker_uri), "mqtt://%s:%u", s_cfg.mqtt_host, s_cfg.mqtt_port);

    /* Build ESP-IDF MQTT configuration object. */
    esp_mqtt_client_config_t mqtt_cfg = {
        .broker.address.uri = s_broker_uri,
        .credentials.username = s_cfg.mqtt_username,
        .credentials.authentication.password = s_cfg.mqtt_password,
        .credentials.client_id = s_cfg.device_id,
        .session.keepalive = 60,
        .session.disable_clean_session = true,
        .network.reconnect_timeout_ms = 5000,
        .buffer.size = 1024,
        .buffer.out_size = 1024,
    };

    s_client = esp_mqtt_client_init(&mqtt_cfg);
    ESP_RETURN_ON_NULL(s_client, ESP_FAIL, TAG, "esp_mqtt_client_init failed");

    esp_mqtt_client_register_event(s_client, ESP_EVENT_ANY_ID, tracker_mqtt_event_handler, NULL);
    return ESP_OK;
}

/**
 * @brief Start MQTT client and begin broker connection.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t tracker_mqtt_connect(void) {
    ESP_RETURN_ON_NULL(s_client, ESP_ERR_INVALID_STATE, TAG, "MQTT not initialized");
    return esp_mqtt_client_start(s_client);
}

/**
 * @brief Stop MQTT client and disconnect broker session.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t tracker_mqtt_disconnect(void) {
    ESP_RETURN_ON_NULL(s_client, ESP_ERR_INVALID_STATE, TAG, "MQTT not initialized");
    s_connected = false;
    return esp_mqtt_client_stop(s_client);
}

/**
 * @brief Read cached connection flag from event callbacks.
 *
 * @return true when connected.
 */
bool tracker_mqtt_is_connected(void) {
    return s_connected;
}

/**
 * @brief Publish generic payload to specified topic.
 *
 * @param topic Target topic.
 * @param payload Payload string.
 * @param qos QoS level.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t tracker_mqtt_publish(const char *topic, const char *payload, int qos) {
    ESP_RETURN_ON_NULL(s_client, ESP_ERR_INVALID_STATE, TAG, "MQTT not initialized");
    ESP_RETURN_ON_NULL(topic, ESP_ERR_INVALID_ARG, TAG, "topic is NULL");
    ESP_RETURN_ON_NULL(payload, ESP_ERR_INVALID_ARG, TAG, "payload is NULL");

    int msg_id = esp_mqtt_client_publish(s_client, topic, payload, 0, qos, 0);
    return msg_id >= 0 ? ESP_OK : ESP_FAIL;
}

/**
 * @brief Publish to raw telemetry topic.
 *
 * @param json_payload JSON payload.
 *
 * @return ESP_OK on success, otherwise error.
 */
esp_err_t tracker_mqtt_publish_rawdata(const char *json_payload) {
    return tracker_mqtt_publish(s_topic_rawdata, json_payload, 0);
}

/**
 * @brief Publish to status topic.
 *
 * @param json_payload JSON payload.
 *
 * @return ESP_OK on success, otherwise error.
 */
esp_err_t tracker_mqtt_publish_status(const char *json_payload) {
    return tracker_mqtt_publish(s_topic_status, json_payload, 1);
}

/**
 * @brief Publish to event topic.
 *
 * @param json_payload JSON payload.
 *
 * @return ESP_OK on success, otherwise error.
 */
esp_err_t tracker_mqtt_publish_event(const char *json_payload) {
    return tracker_mqtt_publish(s_topic_events, json_payload, 1);
}

/**
 * @brief Publish to firmware topic.
 *
 * @param json_payload JSON payload.
 *
 * @return ESP_OK on success, otherwise error.
 */
esp_err_t tracker_mqtt_publish_firmware(const char *json_payload) {
    return tracker_mqtt_publish(s_topic_firmware, json_payload, 1);
}

/**
 * @brief Subscribe to command topic manually.
 *
 * @return ESP_OK on success, otherwise error.
 */
esp_err_t tracker_mqtt_subscribe_commands(void) {
    ESP_RETURN_ON_NULL(s_client, ESP_ERR_INVALID_STATE, TAG, "MQTT not initialized");
    int msg_id = esp_mqtt_client_subscribe(s_client, s_topic_commands, 1);
    return msg_id >= 0 ? ESP_OK : ESP_FAIL;
}

/**
 * @brief Register command callback.
 *
 * @param cb Callback function pointer.
 */
void tracker_mqtt_set_command_callback(mqtt_command_cb_t cb) {
    s_command_callback = cb;
}

/**
 * @brief Get rawdata topic string.
 *
 * @return Topic pointer.
 */
const char *tracker_mqtt_rawdata_topic(void) {
    return s_topic_rawdata;
}

/**
 * @brief Get status topic string.
 *
 * @return Topic pointer.
 */
const char *tracker_mqtt_status_topic(void) {
    return s_topic_status;
}

/**
 * @brief Get events topic string.
 *
 * @return Topic pointer.
 */
const char *tracker_mqtt_events_topic(void) {
    return s_topic_events;
}

/**
 * @brief Get firmware topic string.
 *
 * @return Topic pointer.
 */
const char *tracker_mqtt_firmware_topic(void) {
    return s_topic_firmware;
}

/**
 * @brief Get commands topic string.
 *
 * @return Topic pointer.
 */
const char *tracker_mqtt_commands_topic(void) {
    return s_topic_commands;
}
