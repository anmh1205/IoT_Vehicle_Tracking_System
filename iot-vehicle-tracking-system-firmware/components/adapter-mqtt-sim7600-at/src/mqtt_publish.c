#include "mqtt_internal.h"

#include <stdio.h>
#include <string.h>

#include "esp_log.h"

#include "util.h"

/**
 * @file mqtt_publish.c
 * @brief Publish and subscribe helpers behind the tracker MQTT facade.
 */

static const char *tracker_mqtt_topic_class(const char *topic) {
    if (topic == s_topic_rawdata || (topic != NULL && strcmp(topic, s_topic_rawdata) == 0)) {
        return "rawdata";
    }
    if (topic == s_topic_status || (topic != NULL && strcmp(topic, s_topic_status) == 0)) {
        return "status";
    }
    if (topic == s_topic_events || (topic != NULL && strcmp(topic, s_topic_events) == 0)) {
        return "events";
    }
    if (topic == s_topic_firmware || (topic != NULL && strcmp(topic, s_topic_firmware) == 0)) {
        return "firmware";
    }
    if (topic == s_topic_commands || (topic != NULL && strcmp(topic, s_topic_commands) == 0)) {
        return "commands";
    }
    return "external";
}

int tracker_mqtt_publish_with_msg_id_internal(const char *topic, const char *payload, int qos) {
    ESP_RETURN_ON_FALSE(s_connected, -1, TRACKER_MQTT_TAG, "MQTT not connected");
    ESP_RETURN_ON_NULL(topic, -1, TRACKER_MQTT_TAG, "topic is NULL");
    ESP_RETURN_ON_NULL(payload, -1, TRACKER_MQTT_TAG, "payload is NULL");
    ESP_RETURN_ON_FALSE(topic[0] != '\0', -1, TRACKER_MQTT_TAG, "topic empty");
    ESP_RETURN_ON_FALSE(payload[0] != '\0', -1, TRACKER_MQTT_TAG, "payload empty");
    ESP_RETURN_ON_FALSE(qos >= 0 && qos <= 2, -1, TRACKER_MQTT_TAG, "invalid qos=%d", qos);

    const char *topic_class = tracker_mqtt_topic_class(topic);
    size_t topic_len = strlen(topic);
    size_t payload_len = strlen(payload);
    ESP_RETURN_ON_FALSE(topic_len <= 1024, -1, TRACKER_MQTT_TAG, "topic too long len=%u", (unsigned)topic_len);
    ESP_RETURN_ON_FALSE(payload_len <= 10240,
                        -1,
                        TRACKER_MQTT_TAG,
                        "payload too long len=%u",
                        (unsigned)payload_len);

    char cmd[96] = {0};
    (void)snprintf(cmd, sizeof(cmd), "AT+CMQTTTOPIC=%d,%u\r", MQTT_CLIENT_INDEX, (unsigned int)topic_len);
    if (tracker_mqtt_input_data(cmd, topic, "+CMQTTTOPIC:", true) != ESP_OK) {
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "publish failed stage=topic topic_class=%s topic_len=%u",
                 topic_class,
                 (unsigned)topic_len);
        return -1;
    }

    (void)snprintf(cmd, sizeof(cmd), "AT+CMQTTPAYLOAD=%d,%u\r", MQTT_CLIENT_INDEX, (unsigned int)payload_len);
    if (tracker_mqtt_input_data(cmd, payload, "+CMQTTPAYLOAD:", true) != ESP_OK) {
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "publish failed stage=payload topic_class=%s payload_len=%u",
                 topic_class,
                 (unsigned)payload_len);
        return -1;
    }

    (void)snprintf(cmd,
                   sizeof(cmd),
                   "AT+CMQTTPUB=%d,%d,%u,0,0\r",
                   MQTT_CLIENT_INDEX,
                   qos,
                   (unsigned int)MQTT_DEFAULT_PUBLISH_TIMEOUT_S);

    tracker_mqtt_begin_publish_wait();
    char response[MQTT_AT_RESPONSE_MAX_LEN] = {0};
    if (tracker_mqtt_send_cmd(cmd, MQTT_CONNECT_TIMEOUT_MS, response, sizeof(response)) != ESP_OK) {
        tracker_mqtt_reset_publish_wait();
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "publish failed stage=pub topic_class=%s qos=%d",
                 topic_class,
                 qos);
        return -1;
    }

    int publish_err = 0;
    bool parsed = false;
    esp_err_t result_err = tracker_mqtt_expect_result(response,
                                                      "+CMQTTPUB:",
                                                      true,
                                                      NULL,
                                                      0,
                                                      false,
                                                      &publish_err,
                                                      &parsed);
    if (!parsed) {
        esp_err_t wait_err = tracker_mqtt_wait_publish_result(&publish_err);
        tracker_mqtt_reset_publish_wait();
        if (wait_err != ESP_OK) {
            ESP_LOGW(TRACKER_MQTT_TAG,
                     "publish failed stage=result topic_class=%s err=timeout",
                     topic_class);
            return -1;
        }
        if (publish_err != 0) {
            ESP_LOGW(TRACKER_MQTT_TAG,
                     "publish failed stage=result topic_class=%s err=%d",
                     topic_class,
                     publish_err);
            return -1;
        }
    } else {
        tracker_mqtt_reset_publish_wait();
        if (result_err != ESP_OK) {
            ESP_LOGW(TRACKER_MQTT_TAG,
                     "publish failed stage=result topic_class=%s err=%d",
                     topic_class,
                     publish_err);
            return -1;
        }
    }

    int msg_id = s_next_msg_id++;
    if (s_next_msg_id <= 0) {
        s_next_msg_id = 1;
    }
    return msg_id;
}

esp_err_t tracker_mqtt_subscribe_commands_internal(void) {
    ESP_RETURN_ON_FALSE(s_connected, ESP_ERR_INVALID_STATE, TRACKER_MQTT_TAG, "MQTT not connected");
    if (s_commands_subscribed) {
        return ESP_OK;
    }

    size_t topic_len = strlen(s_topic_commands);
    ESP_RETURN_ON_FALSE(topic_len > 0 && topic_len <= 1024,
                        ESP_ERR_INVALID_ARG,
                        TRACKER_MQTT_TAG,
                        "invalid commands topic");

    char cmd[96] = {0};
    (void)snprintf(cmd, sizeof(cmd), "AT+CMQTTSUB=%d,%u,1\r", MQTT_CLIENT_INDEX, (unsigned int)topic_len);
    if (tracker_mqtt_input_data(cmd, s_topic_commands, "+CMQTTSUB:", true) != ESP_OK) {
        if (!s_connected) {
            ESP_LOGW(TRACKER_MQTT_TAG, "CMQTTSUB deferred because MQTT disconnected");
            return ESP_ERR_NOT_FINISHED;
        }
        ESP_LOGW(TRACKER_MQTT_TAG, "CMQTTSUB failed");
        return ESP_FAIL;
    }

    s_commands_subscribed = true;
    ESP_LOGI(TRACKER_MQTT_TAG, "mqtt subscribed topic_class=commands");
    return ESP_OK;
}
