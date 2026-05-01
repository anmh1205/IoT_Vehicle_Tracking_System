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

/** Callback invoked when command message received on command topic. */
mqtt_command_cb_t s_command_callback = NULL;
/** Cached runtime configuration for MQTT operations. */
config_t s_cfg = {0};
/** True when MQTT session is connected to broker. */
bool s_connected = false;
/** True when MQTT service has been started successfully. */
bool s_service_started = false;
/** True when MQTT client context has been acquired. */
bool s_client_acquired = false;
/** True when command topic subscription succeeded. */
bool s_commands_subscribed = false;
/** True when TLS is enabled for connection. */
bool s_tls_enabled = false;
/** True when URC handler has been registered. */
bool s_urc_registered = false;
/** Next message ID for QoS 1/2 messages. */
int s_next_msg_id = 1;
/** RX context for incoming message parsing. */
mqtt_rx_ctx_t s_rx_ctx = {0};
/** Pending header state for multi-part message reception. */
mqtt_rx_pending_header_t s_rx_pending_header = MQTT_RX_PENDING_NONE;
/** True when connect result is pending. */
bool s_connect_result_pending = false;
/** True when connect result has been received. */
bool s_connect_result_ready = false;
/** Connect result error code. */
int s_connect_result_err = -1;
/** True when publish result is pending. */
bool s_publish_result_pending = false;
/** True when publish result has been received. */
bool s_publish_result_ready = false;
/** Publish result error code. */
int s_publish_result_err = -1;
/** Rawdata topic name (v1/{device_id}/rawdata). */
char s_topic_rawdata[MQTT_TOPIC_MAX_LEN] = {0};
/** Status topic name (v1/{device_id}/status). */
char s_topic_status[MQTT_TOPIC_MAX_LEN] = {0};
/** Events topic name (v1/{device_id}/events). */
char s_topic_events[MQTT_TOPIC_MAX_LEN] = {0};
/** Firmware topic name (v1/{device_id}/firmware). */
char s_topic_firmware[MQTT_TOPIC_MAX_LEN] = {0};
/** Commands topic name (v1/{device_id}/commands). */
char s_topic_commands[MQTT_TOPIC_MAX_LEN] = {0};
/** Primary broker hostname or IP address. */
char s_server_addr_primary[MQTT_SERVER_ADDR_MAX_LEN] = {0};
/** Fallback broker hostname or IP address. */
char s_server_addr_fallback[MQTT_SERVER_ADDR_MAX_LEN] = {0};
/** True when fallback address is configured. */
bool s_server_addr_has_fallback = false;

/**
 * @brief Initialize MQTT client with configuration.
 *
 * Sets up the MQTT client with device configuration including:
 * - Server host, port, credentials
 * - Topic names based on device ID
 * - TLS settings
 * - URC handler for async MQTT events
 *
 * Must be called before any other MQTT operations.
 *
 * @param cfg Pointer to runtime configuration (cannot be NULL).
 * @return ESP_OK on success, ESP_ERR_INVALID_ARG on invalid config.
 */
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
             "mqtt init tls=%d endpoint_configured=%d port_mode=%s fallback=%d user_set=%d command_subscribe=%d",
             s_tls_enabled ? 1 : 0,
             util_string_empty(s_server_addr_primary) ? 0 : 1,
             tracker_mqtt_host_forces_tls_default_port(s_cfg.mqtt_host) ? "tls8883_primary" : "explicit",
             s_server_addr_has_fallback ? 1 : 0,
             !util_string_empty(s_cfg.mqtt_username) ? 1 : 0,
             s_cfg.command_subscribe_enabled ? 1 : 0);
    return ESP_OK;
}

/**
 * @brief Connect to MQTT broker.
 *
 * Initiates connection to the configured MQTT server.
 * Connection is performed asynchronously; use tracker_mqtt_is_connected()
 * to check connection status.
 *
 * @return ESP_OK if connection initiated, ESP_FAIL on immediate failure.
 */
esp_err_t tracker_mqtt_connect(void) {
    return tracker_mqtt_session_connect();
}

/**
 * @brief Disconnect from MQTT broker.
 *
 * Gracefully disconnects from the MQTT server and cleans up
 * session resources.
 *
 * @return ESP_OK on success.
 */
esp_err_t tracker_mqtt_disconnect(void) {
    return tracker_mqtt_session_disconnect();
}

/**
 * @brief Check if MQTT client is connected to broker.
 *
 * Returns the cached connection state. The actual connection
 * state is updated via URC callbacks from the modem.
 *
 * @return true if connected, false otherwise.
 */
bool tracker_mqtt_is_connected(void) {
    return s_connected;
}

/**
 * @brief Publish message to specified topic.
 *
 * Publishes a message to the given MQTT topic. For QoS 0, the
 * publish is fire-and-forget. For QoS 1, waits for PUBACK.
 *
 * @param topic Target topic path.
 * @param payload Message payload (JSON string).
 * @param qos Quality of Service level (0 or 1).
 * @return ESP_OK on success, ESP_FAIL on publish failure.
 */
esp_err_t tracker_mqtt_publish(const char *topic, const char *payload, int qos) {
    int msg_id = tracker_mqtt_publish_with_msg_id_internal(topic, payload, qos);
    return msg_id >= 0 ? ESP_OK : ESP_FAIL;
}

/**
 * @brief Publish message and return message ID.
 *
 * Variant that returns the message ID allocated for this publish.
 * Useful for tracking QoS 1 acknowledgments.
 *
 * @param topic Target topic.
 * @param payload Message payload.
 * @param qos QoS level.
 * @return Message ID (>=0) on success, -1 on failure.
 */
int tracker_mqtt_publish_with_msg_id(const char *topic, const char *payload, int qos) {
    return tracker_mqtt_publish_with_msg_id_internal(topic, payload, qos);
}

/**
 * @brief Publish raw telemetry data to rawdata topic.
 *
 * Convenience wrapper for publishing telemetry to the device's
 * rawdata topic. Uses QoS 0 for high-frequency updates.
 *
 * @param json_payload JSON-formatted telemetry data.
 * @return ESP_OK on success, ESP_FAIL on failure.
 */
esp_err_t tracker_mqtt_publish_rawdata(const char *json_payload) {
    return tracker_mqtt_publish(s_topic_rawdata, json_payload, 0);
}

/**
 * @brief Publish device status to status topic.
 *
 * Convenience wrapper for publishing device status messages.
 * Uses QoS 1 for reliable delivery.
 *
 * @param json_payload JSON-formatted status data.
 * @return ESP_OK on success, ESP_FAIL on failure.
 */
esp_err_t tracker_mqtt_publish_status(const char *json_payload) {
    return tracker_mqtt_publish(s_topic_status, json_payload, 1);
}

/**
 * @brief Publish event notification to events topic.
 *
 * Convenience wrapper for publishing device events.
 * Uses QoS 1 for reliable delivery.
 *
 * @param json_payload JSON-formatted event data.
 * @return ESP_OK on success, ESP_FAIL on failure.
 */
esp_err_t tracker_mqtt_publish_event(const char *json_payload) {
    return tracker_mqtt_publish(s_topic_events, json_payload, 1);
}

/**
 * @brief Publish firmware status to firmware topic.
 *
 * Convenience wrapper for publishing firmware update status.
 * Uses QoS 1 for reliable delivery.
 *
 * @param json_payload JSON-formatted firmware status.
 * @return ESP_OK on success, ESP_FAIL on failure.
 */
esp_err_t tracker_mqtt_publish_firmware(const char *json_payload) {
    return tracker_mqtt_publish(s_topic_firmware, json_payload, 1);
}

/**
 * @brief Subscribe to command topic for cloud commands.
 *
 * Subscribes to the device command topic to receive remote
 * commands from the cloud (update_config, ota_update, etc.).
 *
 * @return ESP_OK on success, ESP_FAIL on failure.
 */
esp_err_t tracker_mqtt_subscribe_commands(void) {
    return tracker_mqtt_subscribe_commands_internal();
}

/**
 * @brief Set callback for incoming command messages.
 *
 * Registers a callback that is invoked when a command message
 * is received on the command topic. The callback receives
 * the full JSON payload for parsing.
 *
 * @param cb Command callback function (cannot be NULL).
 */
void tracker_mqtt_set_command_callback(mqtt_command_cb_t cb) {
    s_command_callback = cb;
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
