#include "mqtt_internal.h"

#include <stdio.h>
#include <string.h>

#include "esp_log.h"

#include "util.h"

/**
 * @file mqtt_publish.c
 * @brief Publish and subscribe helpers behind the tracker MQTT facade.
 *
 * ## MQTT Publish/Subscribe Flow
 *
 * ### 1. Publish Path (tracker_mqtt_publish)
 *    - Validates topic and payload
 *    - Formats AT+CMQTTTOPIC command with topic
 *    - Sends AT+CMQTTPAYLOAD with JSON data
 *    - Sends AT+CMQTTPUB for publish
 *    - Waits for OK/ERROR response
 *    - Falls back to offline_queue on failure
 *
 * ### 2. Subscribe Path (tracker_mqtt_subscribe)
 *    - Formats AT+CMQTTSUB with topic + QoS
 *    - Sends command, waits for result
 *    - Command topic uses QoS 1 for reliability
 *
 * ### 3. Topic Classes
 *    - rawdata: High-frequency telemetry (QoS 0)
 *    - status: Device status updates (QoS 1)
 *    - events: Event notifications (QoS 1)
 *    - firmware: OTA status (QoS 1)
 *    - commands: Incoming commands (QoS 1)
 *
 * ### 4. Error Handling
 *    - MQTT disconnected: enqueue to offline_queue
 *    - AT command timeout: retry with backoff
 *    - Modem error: log, return ESP_FAIL
 *
 * ## Publish vs Subscribe Thread Safety
 *    - Publish uses blocking AT send
 *    - URC parser handles async responses
 *    - Only one in-flight publish at a time
 */


/**
 * @brief Classify a topic string into its tracker topic class for logging.
 *
 * Compares the topic first by pointer (fast path for the module's own cached
 * topic buffers) and then by content against each device-scoped topic. The
 * returned label is used only in diagnostics, so an unrecognized topic is
 * reported as "external" rather than rejected.
 *
 * @param topic Topic string to classify (may be NULL).
 * @return Static class label: "rawdata", "status", "events", "firmware",
 *         "commands", or "external".
 */
static const char *tracker_mqtt_topic_class(const char *topic) {
    // Pointer compare catches the common case where callers pass our own cached topic buffer.
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
    return "external"; // not one of the device-scoped topics
}

/**
 * @brief Publish a payload to a topic and return a locally-assigned message ID.
 *
 * Runs the SIM7600 three-phase publish transaction: stage the topic bytes via
 * AT+CMQTTTOPIC, stage the JSON payload via AT+CMQTTPAYLOAD, then issue
 * AT+CMQTTPUB. The final publish status may come back inline on the PUB
 * response or later as an asynchronous +CMQTTPUB URC, so both completion paths
 * are handled. The modem does not return a broker message ID, so a monotonic
 * local ID is allocated for higher-level correlation.
 *
 * @param topic Target topic (non-empty, <= 1024 bytes).
 * @param payload Message payload (non-empty, <= 10240 bytes).
 * @param qos MQTT QoS level (0-2).
 * @return Locally-assigned message ID (>= 0) on success, -1 on any failure or
 *         when the session is not connected.
 */
int tracker_mqtt_publish_with_msg_id_internal(const char *topic, const char *payload, int qos) {
    // Drive one full modem publish transaction here so topic/payload staging and PUB result handling stay in one place.
    ESP_RETURN_ON_FALSE(s_connected, -1, TRACKER_MQTT_TAG, "MQTT not connected");
    ESP_RETURN_ON_NULL(topic, -1, TRACKER_MQTT_TAG, "topic is NULL");
    ESP_RETURN_ON_NULL(payload, -1, TRACKER_MQTT_TAG, "payload is NULL");
    ESP_RETURN_ON_FALSE(topic[0] != '\0', -1, TRACKER_MQTT_TAG, "topic empty");
    ESP_RETURN_ON_FALSE(payload[0] != '\0', -1, TRACKER_MQTT_TAG, "payload empty");
    ESP_RETURN_ON_FALSE(qos >= 0 && qos <= 2, -1, TRACKER_MQTT_TAG, "invalid qos=%d", qos);

    const char *topic_class = tracker_mqtt_topic_class(topic);
    size_t topic_len = strlen(topic);
    size_t payload_len = strlen(payload);
    // Validate modem-facing limits before staging topic or payload into separate CMQTT* commands.
    ESP_RETURN_ON_FALSE(topic_len <= 1024, -1, TRACKER_MQTT_TAG, "topic too long len=%u", (unsigned)topic_len);
    ESP_RETURN_ON_FALSE(payload_len <= 10240,
                        -1,
                        TRACKER_MQTT_TAG,
                        "payload too long len=%u",
                        (unsigned)payload_len);

    char cmd[96] = {0};
    // Topic bytes are staged first because the modem expects the publish envelope in distinct topic/payload phases.
    (void)snprintf(cmd, sizeof(cmd), "AT+CMQTTTOPIC=%d,%u\r", MQTT_CLIENT_INDEX, (unsigned int)topic_len);
    if (tracker_mqtt_input_data(cmd, topic, "+CMQTTTOPIC:", true) != ESP_OK) {
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "publish failed stage=topic topic_class=%s topic_len=%u",
                 topic_class,
                 (unsigned)topic_len);
        return -1;
    }

    // Only after the topic is accepted do we stream the JSON payload into the modem's publish buffer.
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

    // Arm publish-result tracking before sending PUB so synchronous and asynchronous completion paths share one state machine.
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
    // First try to read the publish status inline from the PUB command response.
    esp_err_t result_err = tracker_mqtt_expect_result(response,
                                                      "+CMQTTPUB:",
                                                      true,
                                                      NULL,
                                                      0,
                                                      false,
                                                      &publish_err,
                                                      &parsed);
    if (!parsed) {
        // Some modem firmware only reports final publish status later via URC, so wait that path out before failing.
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
        // Inline modem results can close the publish wait immediately without touching the asynchronous path.
        tracker_mqtt_reset_publish_wait();
        if (result_err != ESP_OK) {
            ESP_LOGW(TRACKER_MQTT_TAG,
                     "publish failed stage=result topic_class=%s err=%d",
                     topic_class,
                     publish_err);
            return -1;
        }
    }

    // The modem path does not return a broker message ID, so track one locally for higher-level correlation.
    int msg_id = s_next_msg_id++;
    if (s_next_msg_id <= 0) {
        s_next_msg_id = 1; // wrap back to 1 so IDs stay positive after int overflow
    }
    return msg_id;
}

/**
 * @brief Subscribe the active session to the device command topic.
 *
 * Issues AT+CMQTTSUB for `v1/{device}/commands` at QoS 1 so remote commands are
 * delivered reliably. The subscription is staged via the prompt-mode data-entry
 * helper (topic bytes are streamed after the setup prompt). Idempotent: returns
 * immediately if already subscribed.
 *
 * @return ESP_OK on success or when already subscribed; ESP_ERR_INVALID_STATE
 *         when not connected; ESP_ERR_NOT_FINISHED if the link dropped mid-
 *         subscribe (caller should retry after reconnect); ESP_FAIL on a
 *         modem-reported subscribe error.
 */
esp_err_t tracker_mqtt_subscribe_commands_internal(void) {
    ESP_RETURN_ON_FALSE(s_connected, ESP_ERR_INVALID_STATE, TRACKER_MQTT_TAG, "MQTT not connected");
    if (s_commands_subscribed) {
        return ESP_OK; // already subscribed on this session
    }

    size_t topic_len = strlen(s_topic_commands);
    // CMQTTSUB declares the byte count up front, so validate against the modem limit first.
    ESP_RETURN_ON_FALSE(topic_len > 0 && topic_len <= 1024,
                        ESP_ERR_INVALID_ARG,
                        TRACKER_MQTT_TAG,
                        "invalid commands topic");

    char cmd[96] = {0};
    // QoS 1 (trailing ,1) ensures the broker re-delivers commands until acknowledged.
    (void)snprintf(cmd, sizeof(cmd), "AT+CMQTTSUB=%d,%u,1\r", MQTT_CLIENT_INDEX, (unsigned int)topic_len);
    if (tracker_mqtt_input_data(cmd, s_topic_commands, "+CMQTTSUB:", true) != ESP_OK) {
        if (!s_connected) {
            // The data-entry helper flips s_connected on a disconnect code; this is a deferrable failure.
            ESP_LOGW(TRACKER_MQTT_TAG, "CMQTTSUB deferred because MQTT disconnected");
            return ESP_ERR_NOT_FINISHED;
        }
        ESP_LOGW(TRACKER_MQTT_TAG, "CMQTTSUB failed");
        return ESP_FAIL;
    }

    s_commands_subscribed = true; // confirmed; URC handler may also set this on async +CMQTTSUB
    ESP_LOGI(TRACKER_MQTT_TAG, "mqtt subscribed topic_class=commands");
    return ESP_OK;
}
