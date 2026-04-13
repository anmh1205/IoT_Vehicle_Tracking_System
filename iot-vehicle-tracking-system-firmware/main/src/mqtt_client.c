#include "mqtt_client.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "esp_log.h"

#include "modem_at.h"
#include "util.h"

/**
 * @file mqtt_client.c
 * @brief Device-scoped MQTT topic management over SIM7600 AT MQTT commands.
 */

#define MQTT_TOPIC_MAX_LEN 96
#define MQTT_SERVER_ADDR_MAX_LEN 128
#define MQTT_AT_RESPONSE_MAX_LEN 1024
#define MQTT_COMMAND_PAYLOAD_MAX_LEN 1024
#define MQTT_DEFAULT_KEEPALIVE_S 60
#define MQTT_DEFAULT_OPERATION_TIMEOUT_S 120
#define MQTT_DEFAULT_PUBLISH_TIMEOUT_S 120
#define MQTT_DEFAULT_DISCONNECT_TIMEOUT_S 120
#define MQTT_CLIENT_INDEX 0
#define MQTT_SSL_CTX_INDEX 1
#define MQTT_INPUT_TIMEOUT_MS 8000U
#define MQTT_CONNECT_TIMEOUT_MS 30000U
#define MQTT_CMD_TIMEOUT_MS 15000U
#define MQTT_POLL_MAX_BYTES 256U
#define MQTT_CONNECT_RESULT_POLL_MS 100U
#define MQTT_CONNECT_SESSION_PROBE_WINDOW_MS 8000U
#define MQTT_CONNECT_SESSION_PROBE_INTERVAL_MS 500U
#define MQTT_IMPLICIT_TLS_PORT 8883U
#define TRACKER_MQTT_TLS_HOST "mqtt.thingdock.dev"
#define MQTT_ERR_NETWORK_NOT_OPENED 9
#define MQTT_ERR_NO_CONNECTION 11
#define MQTT_ERR_NOT_SUPPORTED_OPERATION 13
#define MQTT_ERR_CLIENT_IS_USED 19
#define MQTT_ERR_CLIENT_NOT_RELEASED 21
#define MQTT_ERR_SOCKET_CLOSED_BY_SERVER 26
#define MQTT_CONNECT_CLEANUP_RETRY_MAX 3U
#define MQTT_CONNECT_CLEANUP_RETRY_DELAY_MS 500U

static const char *TAG = "TRACKER_MQTT";

typedef struct {
    bool active;
    int client_index;
    int topic_total_len;
    int payload_total_len;
    int topic_chunk_remaining;
    int payload_chunk_remaining;
    size_t topic_len;
    size_t payload_len;
    char topic[MQTT_TOPIC_MAX_LEN];
    char payload[MQTT_COMMAND_PAYLOAD_MAX_LEN];
} mqtt_rx_ctx_t;

typedef enum {
    MQTT_RX_PENDING_NONE = 0,
    MQTT_RX_PENDING_START_HEADER,
    MQTT_RX_PENDING_TOPIC_HEADER,
    MQTT_RX_PENDING_PAYLOAD_HEADER,
} mqtt_rx_pending_header_t;

/* Callback for cloud command messages. */
static mqtt_command_cb_t s_command_callback = NULL;
/* Callback for publish ACK notification. */
static mqtt_puback_cb_t s_puback_callback = NULL;

/* Cached MQTT runtime state. */
static config_t s_cfg;
static bool s_connected = false;
static bool s_service_started = false;
static bool s_client_acquired = false;
static bool s_commands_subscribed = false;
static bool s_tls_enabled = false;
static bool s_urc_registered = false;
static int s_next_msg_id = 1;
static mqtt_rx_ctx_t s_rx_ctx = {0};
static mqtt_rx_pending_header_t s_rx_pending_header = MQTT_RX_PENDING_NONE;
static bool s_connect_result_pending = false;
static bool s_connect_result_ready = false;
static int s_connect_result_err = -1;

/* Cached topics and broker server address strings. */
static char s_topic_rawdata[MQTT_TOPIC_MAX_LEN];
static char s_topic_status[MQTT_TOPIC_MAX_LEN];
static char s_topic_events[MQTT_TOPIC_MAX_LEN];
static char s_topic_firmware[MQTT_TOPIC_MAX_LEN];
static char s_topic_commands[MQTT_TOPIC_MAX_LEN];
static char s_server_addr_primary[MQTT_SERVER_ADDR_MAX_LEN];
static char s_server_addr_fallback[MQTT_SERVER_ADDR_MAX_LEN];
static bool s_server_addr_has_fallback = false;

static bool tracker_mqtt_err_indicates_disconnect(int err_code) {
    return err_code == MQTT_ERR_NETWORK_NOT_OPENED || err_code == MQTT_ERR_NO_CONNECTION ||
           err_code == MQTT_ERR_NOT_SUPPORTED_OPERATION || err_code == MQTT_ERR_SOCKET_CLOSED_BY_SERVER;
}

static bool tracker_mqtt_query_disconnect_state(int *out_disc_state);

static void tracker_mqtt_mark_disconnected(const char *reason, int err_code) {
    if (s_connected) {
        ESP_LOGW(TAG, "MQTT marked disconnected reason=%s err=%d", reason != NULL ? reason : "unknown", err_code);
    }
    s_connected = false;
    s_commands_subscribed = false;
}

static bool tracker_mqtt_host_forces_tls_default_port(const char *host) {
    if (util_string_empty(host)) {
        return false;
    }
    return strcmp(host, TRACKER_MQTT_TLS_HOST) == 0;
}

static bool tracker_mqtt_use_tls(const config_t *cfg) {
    if (cfg == NULL) {
        return false;
    }
    return tracker_mqtt_host_forces_tls_default_port(cfg->mqtt_host) || cfg->mqtt_port == MQTT_IMPLICIT_TLS_PORT;
}

static void tracker_mqtt_rx_reset(void) {
    memset(&s_rx_ctx, 0, sizeof(s_rx_ctx));
    s_rx_ctx.client_index = -1;
    s_rx_pending_header = MQTT_RX_PENDING_NONE;
}

static bool tracker_mqtt_parse_next_int(const char **cursor, int *out_value) {
    ESP_RETURN_ON_FALSE(cursor != NULL, false, TAG, "parse cursor null");
    ESP_RETURN_ON_FALSE(*cursor != NULL, false, TAG, "parse cursor pointee null");
    ESP_RETURN_ON_FALSE(out_value != NULL, false, TAG, "parse out_value null");

    const char *p = *cursor;
    while (*p == ' ' || *p == '\t' || *p == ':' || *p == ',') {
        ++p;
    }

    char *end_ptr = NULL;
    long parsed = strtol(p, &end_ptr, 10);
    if (end_ptr == p) {
        return false;
    }

    *out_value = (int)parsed;
    *cursor = end_ptr;
    return true;
}

static const char *tracker_mqtt_find_last(const char *text, const char *needle) {
    if (text == NULL || needle == NULL || needle[0] == '\0') {
        return NULL;
    }

    const char *cursor = text;
    const char *last = NULL;
    while ((cursor = strstr(cursor, needle)) != NULL) {
        last = cursor;
        cursor += strlen(needle);
    }

    return last;
}

static bool tracker_mqtt_parse_int_list_from_text(const char *text,
                                                  const char *prefix,
                                                  int *out_values,
                                                  size_t value_count) {
    ESP_RETURN_ON_FALSE(text != NULL, false, TAG, "parse text null");
    ESP_RETURN_ON_FALSE(prefix != NULL, false, TAG, "parse prefix null");
    ESP_RETURN_ON_FALSE(out_values != NULL, false, TAG, "parse out_values null");
    ESP_RETURN_ON_FALSE(value_count > 0, false, TAG, "parse value_count invalid");

    const char *line = tracker_mqtt_find_last(text, prefix);
    if (line == NULL) {
        return false;
    }

    const char *cursor = line + strlen(prefix);
    for (size_t i = 0; i < value_count; ++i) {
        if (!tracker_mqtt_parse_next_int(&cursor, &out_values[i])) {
            return false;
        }
    }

    return true;
}

static bool tracker_mqtt_parse_disconnect_state(const char *response, int *out_disc_state) {
    ESP_RETURN_ON_FALSE(response != NULL, false, TAG, "response null");
    ESP_RETURN_ON_FALSE(out_disc_state != NULL, false, TAG, "out_disc_state null");

    const char *cursor = response;
    while ((cursor = strstr(cursor, "+CMQTTDISC:")) != NULL) {
        const char *line_cursor = cursor + strlen("+CMQTTDISC:");
        int client_index = -1;
        int disc_state = -1;
        if (tracker_mqtt_parse_next_int(&line_cursor, &client_index) &&
            tracker_mqtt_parse_next_int(&line_cursor, &disc_state) &&
            client_index == MQTT_CLIENT_INDEX) {
            *out_disc_state = disc_state;
            return true;
        }

        cursor += strlen("+CMQTTDISC:");
    }

    return false;
}

static bool tracker_mqtt_err_allowed(int err_code, const int *allowed_codes, size_t allowed_count) {
    if (allowed_codes == NULL) {
        return err_code == 0;
    }

    for (size_t i = 0; i < allowed_count; ++i) {
        if (err_code == allowed_codes[i]) {
            return true;
        }
    }
    return false;
}

static esp_err_t tracker_mqtt_expect_result(const char *response,
                                            const char *prefix,
                                            bool has_client_index,
                                            const int *allowed_codes,
                                            size_t allowed_count,
                                            bool require_prefix,
                                            int *out_err_code,
                                            bool *out_parsed) {
    ESP_RETURN_ON_NULL(response, ESP_ERR_INVALID_ARG, TAG, "response null");
    ESP_RETURN_ON_NULL(prefix, ESP_ERR_INVALID_ARG, TAG, "prefix null");

    int values[2] = {0};
    bool parsed = tracker_mqtt_parse_int_list_from_text(response, prefix, values, has_client_index ? 2U : 1U);
    if (out_parsed != NULL) {
        *out_parsed = parsed;
    }
    if (!parsed) {
        if (require_prefix) {
            ESP_LOGW(TAG, "AT result missing prefix=%s raw=\"%s\"", prefix, response);
            return ESP_FAIL;
        }
        if (out_err_code != NULL) {
            *out_err_code = 0;
        }
        return ESP_OK;
    }

    int err_code = has_client_index ? values[1] : values[0];
    if (out_err_code != NULL) {
        *out_err_code = err_code;
    }
    if (!tracker_mqtt_err_allowed(err_code, allowed_codes, allowed_count)) {
        if (tracker_mqtt_err_indicates_disconnect(err_code)) {
            tracker_mqtt_mark_disconnected(prefix, err_code);
        }
        ESP_LOGW(TAG, "AT result error prefix=%s err=%d raw=\"%s\"", prefix, err_code, response);
        return ESP_FAIL;
    }

    return ESP_OK;
}

static bool tracker_mqtt_extract_error_code_from_response(const char *response, int *out_err_code) {
    ESP_RETURN_ON_FALSE(response != NULL, false, TAG, "response null");
    ESP_RETURN_ON_FALSE(out_err_code != NULL, false, TAG, "out_err_code null");

    static const struct {
        const char *prefix;
        bool has_client_index;
    } k_candidates[] = {
        {"+CMQTTCONNECT:", true},
        {"+CMQTTACCQ:", true},
        {"+CMQTTTOPIC:", true},
        {"+CMQTTPAYLOAD:", true},
        {"+CMQTTPUB:", true},
        {"+CMQTTSUB:", true},
        {"+CMQTTDISC:", true},
        {"+CMQTTREL:", true},
        {"+CMQTTSTART:", false},
        {"+CMQTTSTOP:", false},
    };

    for (size_t i = 0; i < ARRAY_SIZE(k_candidates); ++i) {
        int values[2] = {0};
        size_t value_count = k_candidates[i].has_client_index ? 2U : 1U;
        if (!tracker_mqtt_parse_int_list_from_text(response, k_candidates[i].prefix, values, value_count)) {
            continue;
        }

        *out_err_code = k_candidates[i].has_client_index ? values[1] : values[0];
        return true;
    }

    return false;
}

static esp_err_t tracker_mqtt_send_cmd(const char *cmd,
                                       uint32_t timeout_ms,
                                       char *response,
                                       size_t response_size) {
    ESP_RETURN_ON_NULL(cmd, ESP_ERR_INVALID_ARG, TAG, "cmd null");
    ESP_RETURN_ON_NULL(response, ESP_ERR_INVALID_ARG, TAG, "response null");
    ESP_RETURN_ON_FALSE(response_size > 0, ESP_ERR_INVALID_ARG, TAG, "response_size invalid");

    response[0] = '\0';
    esp_err_t err = modem_at_send(cmd, response, response_size, timeout_ms);
    if (err != ESP_OK) {
        int err_code = 0;
        bool parsed = tracker_mqtt_extract_error_code_from_response(response, &err_code);
        if (parsed && tracker_mqtt_err_indicates_disconnect(err_code)) {
            tracker_mqtt_mark_disconnected("AT_error_response", err_code);
        }
        if (parsed) {
            ESP_LOGW(TAG,
                     "AT command returned error result, defer parse cmd=\"%s\" err=%s resp=\"%s\"",
                     cmd,
                     esp_err_to_name(err),
                     response);
            return ESP_OK;
        }
        ESP_LOGW(TAG,
                 "AT command failed cmd=\"%s\" err=%s resp=\"%s\"",
                 cmd,
                 esp_err_to_name(err),
                 response);
        return err;
    }

    return ESP_OK;
}

static void tracker_mqtt_reset_connect_wait(void) {
    s_connect_result_pending = false;
    s_connect_result_ready = false;
    s_connect_result_err = -1;
}

static void tracker_mqtt_begin_connect_wait(void) {
    s_connect_result_pending = true;
    s_connect_result_ready = false;
    s_connect_result_err = -1;
}

static void tracker_mqtt_on_connect_result_line(int client_index, int err_code) {
    if (client_index != MQTT_CLIENT_INDEX) {
        return;
    }

    if (s_connect_result_pending) {
        s_connect_result_ready = true;
        s_connect_result_err = err_code;
    }

    if (err_code != 0 && tracker_mqtt_err_indicates_disconnect(err_code)) {
        tracker_mqtt_mark_disconnected("+CMQTTCONNECT", err_code);
    }
}

static esp_err_t tracker_mqtt_wait_connect_result(int *out_err_code) {
    ESP_RETURN_ON_NULL(out_err_code, ESP_ERR_INVALID_ARG, TAG, "out_err_code null");
    uint64_t start_ms = util_uptime_ms();

    while ((util_uptime_ms() - start_ms) < MQTT_CONNECT_TIMEOUT_MS) {
        if (s_connect_result_ready) {
            *out_err_code = s_connect_result_err;
            return ESP_OK;
        }
        (void)modem_at_poll_urc(MQTT_POLL_MAX_BYTES);
        if (s_connect_result_ready) {
            *out_err_code = s_connect_result_err;
            return ESP_OK;
        }
        vTaskDelay(pdMS_TO_TICKS(MQTT_CONNECT_RESULT_POLL_MS));
    }

    return ESP_ERR_TIMEOUT;
}

static bool tracker_mqtt_response_has_prompt(const char *response) {
    if (response == NULL) {
        return false;
    }

    return strstr(response, "\r\n>\r\n") != NULL || strstr(response, "\n>\n") != NULL ||
           strstr(response, "\r\n>") != NULL || strstr(response, "\n>") != NULL ||
           strstr(response, "> ") != NULL || strstr(response, ">") != NULL;
}

static esp_err_t tracker_mqtt_input_data(const char *prepare_cmd,
                                         const char *data,
                                         const char *result_prefix,
                                         bool has_client_index) {
    ESP_RETURN_ON_NULL(prepare_cmd, ESP_ERR_INVALID_ARG, TAG, "prepare_cmd null");
    ESP_RETURN_ON_NULL(data, ESP_ERR_INVALID_ARG, TAG, "data null");
    ESP_RETURN_ON_NULL(result_prefix, ESP_ERR_INVALID_ARG, TAG, "result_prefix null");
    ESP_RETURN_ON_FALSE(data[0] != '\0', ESP_ERR_INVALID_ARG, TAG, "data empty");

    char response[MQTT_AT_RESPONSE_MAX_LEN] = {0};
    esp_err_t prepare_err = modem_at_send(prepare_cmd, response, sizeof(response), MQTT_INPUT_TIMEOUT_MS);
    if (prepare_err == ESP_ERR_TIMEOUT && tracker_mqtt_response_has_prompt(response)) {
        prepare_err = ESP_OK;
    }
    if (prepare_err != ESP_OK) {
        int err_code = 0;
        bool parsed = tracker_mqtt_extract_error_code_from_response(response, &err_code);
        if (parsed && tracker_mqtt_err_indicates_disconnect(err_code)) {
            tracker_mqtt_mark_disconnected("AT_prepare_input", err_code);
        }
        if (parsed) {
            ESP_LOGW(TAG,
                     "AT prepare-input returned error, cmd=\"%s\" err=%s resp=\"%s\"",
                     prepare_cmd,
                     esp_err_to_name(prepare_err),
                     response);
        } else {
            ESP_LOGW(TAG,
                     "AT prepare-input failed cmd=\"%s\" err=%s resp=\"%s\"",
                     prepare_cmd,
                     esp_err_to_name(prepare_err),
                     response);
        }
    }
    ESP_RETURN_ON_FALSE(prepare_err == ESP_OK, ESP_FAIL, TAG, "prepare input failed");
    ESP_RETURN_ON_FALSE(tracker_mqtt_response_has_prompt(response), ESP_FAIL, TAG, "AT input prompt missing");

    memset(response, 0, sizeof(response));
    ESP_RETURN_ON_FALSE(tracker_mqtt_send_cmd(data, MQTT_INPUT_TIMEOUT_MS, response, sizeof(response)) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "send input data failed");

    return tracker_mqtt_expect_result(response, result_prefix, has_client_index, NULL, 0, false, NULL, NULL);
}

static esp_err_t tracker_mqtt_build_server_addrs(const config_t *cfg) {
    ESP_RETURN_ON_NULL(cfg, ESP_ERR_INVALID_ARG, TAG, "cfg null");
    ESP_RETURN_ON_FALSE(!util_string_empty(cfg->mqtt_host), ESP_ERR_INVALID_ARG, TAG, "mqtt_host empty");

    s_server_addr_has_fallback = false;
    if (tracker_mqtt_host_forces_tls_default_port(cfg->mqtt_host)) {
        /* SIM7600 MQTT(S) requires tcp:// URL even when TLS context is enabled. */
        int n = snprintf(s_server_addr_primary,
                         sizeof(s_server_addr_primary),
                         "tcp://%s:%u",
                         cfg->mqtt_host,
                         (unsigned int)MQTT_IMPLICIT_TLS_PORT);
        ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < sizeof(s_server_addr_primary),
                            ESP_ERR_INVALID_SIZE,
                            TAG,
                            "primary addr too long");

        n = snprintf(s_server_addr_fallback,
                     sizeof(s_server_addr_fallback),
                     "tcp://%s",
                     cfg->mqtt_host);
        ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < sizeof(s_server_addr_fallback),
                            ESP_ERR_INVALID_SIZE,
                            TAG,
                            "fallback addr too long");
        s_server_addr_has_fallback = true;
        return ESP_OK;
    }

    int n = snprintf(s_server_addr_primary,
                     sizeof(s_server_addr_primary),
                     "tcp://%s:%u",
                     cfg->mqtt_host,
                     (unsigned int)cfg->mqtt_port);
    ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < sizeof(s_server_addr_primary),
                        ESP_ERR_INVALID_SIZE,
                        TAG,
                        "server addr too long");
    return ESP_OK;
}

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

static size_t tracker_mqtt_append_topic_chunk(const char *chunk, size_t chunk_len) {
    if (chunk == NULL || chunk_len == 0U || s_rx_ctx.topic_chunk_remaining <= 0) {
        return 0U;
    }

    size_t consume_len = (size_t)MIN_VALUE((int)chunk_len, s_rx_ctx.topic_chunk_remaining);
    size_t cap_remaining = sizeof(s_rx_ctx.topic) - 1 - s_rx_ctx.topic_len;
    size_t copy_len = MIN_VALUE(consume_len, cap_remaining);
    if (copy_len > 0) {
        memcpy(&s_rx_ctx.topic[s_rx_ctx.topic_len], chunk, copy_len);
        s_rx_ctx.topic_len += copy_len;
        s_rx_ctx.topic[s_rx_ctx.topic_len] = '\0';
    }

    if (copy_len < consume_len) {
        ESP_LOGW(TAG, "MQTT RX topic truncated chunk=%u", (unsigned)consume_len);
    }

    s_rx_ctx.topic_chunk_remaining -= (int)consume_len;
    return consume_len;
}

static size_t tracker_mqtt_append_payload_chunk(const char *chunk, size_t chunk_len) {
    if (chunk == NULL || chunk_len == 0U || s_rx_ctx.payload_chunk_remaining <= 0) {
        return 0U;
    }

    size_t consume_len = (size_t)MIN_VALUE((int)chunk_len, s_rx_ctx.payload_chunk_remaining);
    size_t cap_remaining = sizeof(s_rx_ctx.payload) - 1 - s_rx_ctx.payload_len;
    size_t copy_len = MIN_VALUE(consume_len, cap_remaining);
    if (copy_len > 0) {
        memcpy(&s_rx_ctx.payload[s_rx_ctx.payload_len], chunk, copy_len);
        s_rx_ctx.payload_len += copy_len;
        s_rx_ctx.payload[s_rx_ctx.payload_len] = '\0';
    }

    if (copy_len < consume_len) {
        ESP_LOGW(TAG, "MQTT RX payload truncated chunk=%u", (unsigned)consume_len);
    }

    s_rx_ctx.payload_chunk_remaining -= (int)consume_len;
    return consume_len;
}

static bool tracker_mqtt_parse_plain_int_list(const char *text, int *out_values, size_t value_count) {
    ESP_RETURN_ON_FALSE(text != NULL, false, TAG, "plain parse text null");
    ESP_RETURN_ON_FALSE(out_values != NULL, false, TAG, "plain parse out_values null");
    ESP_RETURN_ON_FALSE(value_count > 0, false, TAG, "plain parse value_count invalid");

    const char *cursor = text;
    for (size_t i = 0; i < value_count; ++i) {
        if (!tracker_mqtt_parse_next_int(&cursor, &out_values[i])) {
            return false;
        }
    }

    return true;
}

static bool tracker_mqtt_try_consume_pending_header(const char *line) {
    if (line == NULL || line[0] == '\0' || s_rx_pending_header == MQTT_RX_PENDING_NONE) {
        return false;
    }

    int values[3] = {0};
    switch (s_rx_pending_header) {
        case MQTT_RX_PENDING_START_HEADER:
            if (!tracker_mqtt_parse_plain_int_list(line, values, 3)) {
                return false;
            }
            tracker_mqtt_rx_reset();
            s_rx_ctx.active = true;
            s_rx_ctx.client_index = values[0];
            s_rx_ctx.topic_total_len = values[1];
            s_rx_ctx.payload_total_len = values[2];
            ESP_LOGI(TAG,
                     "MQTT RX start client=%d topic_len=%d payload_len=%d",
                     s_rx_ctx.client_index,
                     s_rx_ctx.topic_total_len,
                     s_rx_ctx.payload_total_len);
            s_rx_pending_header = MQTT_RX_PENDING_NONE;
            return true;

        case MQTT_RX_PENDING_TOPIC_HEADER:
            if (!tracker_mqtt_parse_plain_int_list(line, values, 2) || !s_rx_ctx.active) {
                return false;
            }
            s_rx_ctx.topic_chunk_remaining = values[1];
            s_rx_pending_header = MQTT_RX_PENDING_NONE;
            ESP_LOGI(TAG, "MQTT RX topic chunk expect=%d", s_rx_ctx.topic_chunk_remaining);
            return true;

        case MQTT_RX_PENDING_PAYLOAD_HEADER:
            if (!tracker_mqtt_parse_plain_int_list(line, values, 2) || !s_rx_ctx.active) {
                return false;
            }
            s_rx_ctx.payload_chunk_remaining = values[1];
            s_rx_pending_header = MQTT_RX_PENDING_NONE;
            ESP_LOGI(TAG, "MQTT RX payload chunk expect=%d", s_rx_ctx.payload_chunk_remaining);
            return true;

        case MQTT_RX_PENDING_NONE:
        default:
            return false;
    }
}

static void tracker_mqtt_dispatch_rx_if_complete(void) {
    if (!s_rx_ctx.active || s_rx_ctx.topic_len == 0 || s_rx_ctx.payload_len == 0) {
        return;
    }

    if (s_command_callback != NULL && strcmp(s_rx_ctx.topic, s_topic_commands) == 0) {
        ESP_LOGI(TAG,
                 "MQTT RX command topic=%s payload_len=%u",
                 s_rx_ctx.topic,
                 (unsigned)s_rx_ctx.payload_len);
        s_command_callback(s_rx_ctx.topic, s_rx_ctx.payload);
        return;
    }

    ESP_LOGI(TAG, "MQTT RX ignored topic=%s len=%u", s_rx_ctx.topic, (unsigned)s_rx_ctx.payload_len);
}

static const char *tracker_mqtt_seek_urc_prefix(const char *cursor) {
    if (cursor == NULL) {
        return NULL;
    }

    while (*cursor == ' ' || *cursor == '\t') {
        ++cursor;
    }
    if (*cursor == '+') {
        return cursor;
    }

    return strchr(cursor, '+');
}

static void tracker_mqtt_on_urc_line(const char *line) {
    if (line == NULL || line[0] == '\0') {
        return;
    }

    const char *cursor = line;
    while (cursor != NULL && cursor[0] != '\0') {
        if (s_rx_ctx.topic_chunk_remaining > 0) {
            size_t consumed = tracker_mqtt_append_topic_chunk(cursor, strlen(cursor));
            if (consumed == 0U || cursor[consumed] == '\0') {
                return;
            }
            cursor += consumed;
            while (*cursor == ' ' || *cursor == '\t') {
                ++cursor;
            }
            continue;
        }
        if (s_rx_ctx.payload_chunk_remaining > 0) {
            size_t consumed = tracker_mqtt_append_payload_chunk(cursor, strlen(cursor));
            if (consumed == 0U || cursor[consumed] == '\0') {
                return;
            }
            cursor += consumed;
            while (*cursor == ' ' || *cursor == '\t') {
                ++cursor;
            }
            continue;
        }

        if (tracker_mqtt_try_consume_pending_header(cursor)) {
            continue;
        }

        cursor = tracker_mqtt_seek_urc_prefix(cursor);
        if (cursor == NULL || cursor[0] == '\0') {
            return;
        }

        if (strncmp(cursor, "+CMQTTCONNECT:", strlen("+CMQTTCONNECT:")) == 0) {
            int values[2] = {0};
            if (tracker_mqtt_parse_int_list_from_text(cursor, "+CMQTTCONNECT:", values, 2)) {
                tracker_mqtt_on_connect_result_line(values[0], values[1]);
            }
            cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
            continue;
        }

        if (strncmp(cursor, "+CMQTTRXSTART:", strlen("+CMQTTRXSTART:")) == 0) {
            int values[3] = {0};
            if (tracker_mqtt_parse_int_list_from_text(cursor, "+CMQTTRXSTART:", values, 3)) {
                tracker_mqtt_rx_reset();
                s_rx_ctx.active = true;
                s_rx_ctx.client_index = values[0];
                s_rx_ctx.topic_total_len = values[1];
                s_rx_ctx.payload_total_len = values[2];
                ESP_LOGI(TAG,
                         "MQTT RX start client=%d topic_len=%d payload_len=%d",
                         s_rx_ctx.client_index,
                         s_rx_ctx.topic_total_len,
                         s_rx_ctx.payload_total_len);
            } else {
                s_rx_pending_header = MQTT_RX_PENDING_START_HEADER;
            }
            cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
            continue;
        }

        if (strncmp(cursor, "+CMQTTRXTOPIC:", strlen("+CMQTTRXTOPIC:")) == 0) {
            int values[2] = {0};
            if (tracker_mqtt_parse_int_list_from_text(cursor, "+CMQTTRXTOPIC:", values, 2) && s_rx_ctx.active) {
                s_rx_ctx.topic_chunk_remaining = values[1];
                ESP_LOGI(TAG, "MQTT RX topic chunk expect=%d", s_rx_ctx.topic_chunk_remaining);
            } else if (s_rx_ctx.active) {
                s_rx_pending_header = MQTT_RX_PENDING_TOPIC_HEADER;
            }
            cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
            continue;
        }

        if (strncmp(cursor, "+CMQTTRXPAYLOAD:", strlen("+CMQTTRXPAYLOAD:")) == 0) {
            int values[2] = {0};
            if (tracker_mqtt_parse_int_list_from_text(cursor, "+CMQTTRXPAYLOAD:", values, 2) &&
                s_rx_ctx.active) {
                s_rx_ctx.payload_chunk_remaining = values[1];
                ESP_LOGI(TAG, "MQTT RX payload chunk expect=%d", s_rx_ctx.payload_chunk_remaining);
            } else if (s_rx_ctx.active) {
                s_rx_pending_header = MQTT_RX_PENDING_PAYLOAD_HEADER;
            }
            cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
            continue;
        }

        if (strncmp(cursor, "+CMQTTRXEND:", strlen("+CMQTTRXEND:")) == 0) {
            ESP_LOGI(TAG,
                     "MQTT RX end topic_len=%u payload_len=%u",
                     (unsigned)s_rx_ctx.topic_len,
                     (unsigned)s_rx_ctx.payload_len);
            tracker_mqtt_dispatch_rx_if_complete();
            tracker_mqtt_rx_reset();
            cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
            continue;
        }

        if (strncmp(cursor, "+CMQTTSUB:", strlen("+CMQTTSUB:")) == 0) {
            int values[2] = {0};
            if (tracker_mqtt_parse_int_list_from_text(cursor, "+CMQTTSUB:", values, 2) &&
                values[0] == MQTT_CLIENT_INDEX) {
                if (values[1] == 0) {
                    s_commands_subscribed = true;
                }
                ESP_LOGI(TAG, "MQTT subscribe URC client=%d err=%d", values[0], values[1]);
            }
            cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
            continue;
        }

        if (strncmp(cursor, "+CMQTTCONNLOST:", strlen("+CMQTTCONNLOST:")) == 0 ||
            strncmp(cursor, "+CMQTTPING:", strlen("+CMQTTPING:")) == 0 ||
            strncmp(cursor, "+CMQTTNONET", strlen("+CMQTTNONET")) == 0) {
            if (s_connected) {
                ESP_LOGW(TAG, "MQTT URC disconnect: %s", cursor);
            }
            tracker_mqtt_mark_disconnected(cursor, MQTT_ERR_NO_CONNECTION);
            cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
            continue;
        }

        cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
    }

}

static esp_err_t tracker_mqtt_start_service(void) {
    if (s_service_started) {
        return ESP_OK;
    }

    static const int accepted[] = {0, 23};
    char response[MQTT_AT_RESPONSE_MAX_LEN] = {0};
    ESP_RETURN_ON_FALSE(tracker_mqtt_send_cmd("AT+CMQTTSTART\r", MQTT_CONNECT_TIMEOUT_MS, response, sizeof(response)) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "CMQTTSTART failed");
    ESP_RETURN_ON_FALSE(tracker_mqtt_expect_result(response,
                                                   "+CMQTTSTART:",
                                                   false,
                                                   accepted,
                                                   ARRAY_SIZE(accepted),
                                                   false,
                                                   NULL,
                                                   NULL) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "CMQTTSTART result failed");
    s_service_started = true;
    return ESP_OK;
}

static esp_err_t tracker_mqtt_configure_tls(void) {
    if (!s_tls_enabled) {
        return ESP_OK;
    }

    char cmd[96] = {0};
    (void)snprintf(cmd, sizeof(cmd), "AT+CSSLCFG=\"sslversion\",%d,4\r", MQTT_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", MQTT_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "CSSLCFG sslversion failed");

    (void)snprintf(cmd, sizeof(cmd), "AT+CSSLCFG=\"authmode\",%d,0\r", MQTT_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", MQTT_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "CSSLCFG authmode failed");

    (void)snprintf(cmd, sizeof(cmd), "AT+CSSLCFG=\"ignorelocaltime\",%d,1\r", MQTT_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", MQTT_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "CSSLCFG ignorelocaltime failed");

    (void)snprintf(cmd, sizeof(cmd), "AT+CSSLCFG=\"negotiatetime\",%d,300\r", MQTT_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", MQTT_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "CSSLCFG negotiatetime failed");

    (void)snprintf(cmd, sizeof(cmd), "AT+CSSLCFG=\"enableSNI\",%d,1\r", MQTT_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", MQTT_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "CSSLCFG enableSNI failed");

    (void)snprintf(cmd, sizeof(cmd), "AT+CMQTTSSLCFG=%d,%d\r", MQTT_CLIENT_INDEX, MQTT_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", MQTT_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "CMQTTSSLCFG failed");
    return ESP_OK;
}

static esp_err_t tracker_mqtt_acquire_client(void) {
    if (s_client_acquired) {
        return ESP_OK;
    }

    static const int accepted[] = {0, 19};
    char cmd[220] = {0};
    int n = snprintf(cmd,
                     sizeof(cmd),
                     "AT+CMQTTACCQ=%d,\"%s\",%d,4\r",
                     MQTT_CLIENT_INDEX,
                     s_cfg.device_id,
                     s_tls_enabled ? 1 : 0);
    ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < sizeof(cmd), ESP_ERR_INVALID_SIZE, TAG, "CMQTTACCQ cmd too long");

    char response[MQTT_AT_RESPONSE_MAX_LEN] = {0};
    ESP_RETURN_ON_FALSE(tracker_mqtt_send_cmd(cmd, MQTT_CMD_TIMEOUT_MS, response, sizeof(response)) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "CMQTTACCQ failed");
    ESP_RETURN_ON_FALSE(tracker_mqtt_expect_result(response,
                                                   "+CMQTTACCQ:",
                                                   true,
                                                   accepted,
                                                   ARRAY_SIZE(accepted),
                                                   false,
                                                   NULL,
                                                   NULL) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "CMQTTACCQ result failed");

    s_client_acquired = true;
    return ESP_OK;
}

static esp_err_t tracker_mqtt_apply_client_options(void) {
    ESP_RETURN_ON_FALSE(modem_at_send_expect("AT+CMQTTCFG=\"checkUTF8\",0,0\r", "OK", MQTT_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "CMQTTCFG checkUTF8 failed");

    char cmd[80] = {0};
    int n = snprintf(cmd,
                     sizeof(cmd),
                     "AT+CMQTTCFG=\"optimeout\",0,%u\r",
                     (unsigned int)MQTT_DEFAULT_OPERATION_TIMEOUT_S);
    ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < sizeof(cmd), ESP_ERR_INVALID_SIZE, TAG, "CMQTTCFG optimeout cmd too long");
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", MQTT_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "CMQTTCFG optimeout failed");
    return ESP_OK;
}

static bool tracker_mqtt_query_disconnect_state(int *out_disc_state) {
    ESP_RETURN_ON_FALSE(out_disc_state != NULL, false, TAG, "out_disc_state null");

    char response[MQTT_AT_RESPONSE_MAX_LEN] = {0};
    if (tracker_mqtt_send_cmd("AT+CMQTTDISC?\r", MQTT_CMD_TIMEOUT_MS, response, sizeof(response)) != ESP_OK) {
        return false;
    }

    return tracker_mqtt_parse_disconnect_state(response, out_disc_state);
}

static esp_err_t tracker_mqtt_connect_once(const char *server_addr, int *out_connect_err_code, bool *out_timed_out) {
    ESP_RETURN_ON_FALSE(!util_string_empty(server_addr), ESP_ERR_INVALID_ARG, TAG, "server addr empty");

    if (out_connect_err_code != NULL) {
        *out_connect_err_code = 0;
    }
    if (out_timed_out != NULL) {
        *out_timed_out = false;
    }

    char cmd[420] = {0};
    int n = 0;
    if (util_string_empty(s_cfg.mqtt_username)) {
        n = snprintf(cmd,
                     sizeof(cmd),
                     "AT+CMQTTCONNECT=%d,\"%s\",%u,1\r",
                     MQTT_CLIENT_INDEX,
                     server_addr,
                     (unsigned int)MQTT_DEFAULT_KEEPALIVE_S);
    } else {
        n = snprintf(cmd,
                     sizeof(cmd),
                     "AT+CMQTTCONNECT=%d,\"%s\",%u,1,\"%s\",\"%s\"\r",
                     MQTT_CLIENT_INDEX,
                     server_addr,
                     (unsigned int)MQTT_DEFAULT_KEEPALIVE_S,
                     s_cfg.mqtt_username,
                     s_cfg.mqtt_password);
    }
    ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < sizeof(cmd), ESP_ERR_INVALID_SIZE, TAG, "CMQTTCONNECT cmd too long");

    tracker_mqtt_begin_connect_wait();
    char response[MQTT_AT_RESPONSE_MAX_LEN] = {0};
    esp_err_t send_err = tracker_mqtt_send_cmd(cmd, MQTT_CONNECT_TIMEOUT_MS, response, sizeof(response));
    if (send_err != ESP_OK) {
        tracker_mqtt_reset_connect_wait();
        if (out_connect_err_code != NULL) {
            *out_connect_err_code = MQTT_ERR_NO_CONNECTION;
        }
        return ESP_FAIL;
    }

    int connect_err = 0;
    bool parsed = false;
    esp_err_t result_err = tracker_mqtt_expect_result(response,
                                                      "+CMQTTCONNECT:",
                                                      true,
                                                      NULL,
                                                      0,
                                                      false,
                                                      &connect_err,
                                                      &parsed);
    if (!parsed) {
        uint64_t probe_start_ms = util_uptime_ms();
        while ((util_uptime_ms() - probe_start_ms) < MQTT_CONNECT_SESSION_PROBE_WINDOW_MS) {
            int disc_state = -1;
            if (tracker_mqtt_query_disconnect_state(&disc_state) && disc_state == 0) {
                tracker_mqtt_reset_connect_wait();
                s_connected = true;
                s_commands_subscribed = false;
                ESP_LOGI(TAG, "CMQTTCONNECT session probe connected (disc_state=%d)", disc_state);
                if (out_connect_err_code != NULL) {
                    *out_connect_err_code = 0;
                }
                return ESP_OK;
            }

            if (s_connect_result_ready) {
                break;
            }

            (void)modem_at_poll_urc(MQTT_POLL_MAX_BYTES);
            vTaskDelay(pdMS_TO_TICKS(MQTT_CONNECT_SESSION_PROBE_INTERVAL_MS));
        }

        esp_err_t wait_err = tracker_mqtt_wait_connect_result(&connect_err);
        tracker_mqtt_reset_connect_wait();
        if (wait_err != ESP_OK) {
            int disc_state = -1;
            if (tracker_mqtt_query_disconnect_state(&disc_state) && disc_state == 0) {
                s_connected = true;
                s_commands_subscribed = false;
                ESP_LOGW(TAG,
                         "CMQTTCONNECT timeout but session state is connected (disc_state=%d), continue",
                         disc_state);
                if (out_connect_err_code != NULL) {
                    *out_connect_err_code = 0;
                }
                return ESP_OK;
            }

            ESP_LOGW(TAG, "CMQTTCONNECT result timeout server=%s", server_addr);
            tracker_mqtt_mark_disconnected("+CMQTTCONNECT_timeout", MQTT_ERR_NO_CONNECTION);
            if (out_connect_err_code != NULL) {
                *out_connect_err_code = MQTT_ERR_NO_CONNECTION;
            }
            if (out_timed_out != NULL) {
                *out_timed_out = true;
            }
            return ESP_ERR_TIMEOUT;
        }

        if (connect_err != 0) {
            if (tracker_mqtt_err_indicates_disconnect(connect_err)) {
                tracker_mqtt_mark_disconnected("+CMQTTCONNECT", connect_err);
            }
            ESP_LOGW(TAG, "CMQTTCONNECT rejected server=%s err=%d", server_addr, connect_err);
            if (out_connect_err_code != NULL) {
                *out_connect_err_code = connect_err;
            }
            return ESP_FAIL;
        }
    } else {
        tracker_mqtt_reset_connect_wait();
        if (result_err != ESP_OK) {
            if (out_connect_err_code != NULL) {
                *out_connect_err_code = connect_err;
            }
            return ESP_FAIL;
        }
    }

    s_connected = true;
    s_commands_subscribed = false;
    ESP_LOGI(TAG, "MQTT connected server=%s", server_addr);
    return ESP_OK;
}

static void tracker_mqtt_log_diag_cmd(const char *cmd, uint32_t timeout_ms) {
    if (util_string_empty(cmd)) {
        ESP_LOGW(TAG, "diag cmd empty");
        return;
    }

    char response[MQTT_AT_RESPONSE_MAX_LEN] = {0};
    esp_err_t err = tracker_mqtt_send_cmd(cmd, timeout_ms, response, sizeof(response));
    if (err != ESP_OK) {
        ESP_LOGW(TAG,
                 "MQTT diag command failed cmd=\"%s\" err=%s resp=\"%s\"",
                 cmd,
                 esp_err_to_name(err),
                 response);
        return;
    }

    ESP_LOGI(TAG, "MQTT diag cmd=\"%s\" resp=\"%s\"", cmd, response);
}

static void tracker_mqtt_log_connect_diagnostics(void) {
    tracker_mqtt_log_diag_cmd("AT+CMQTTDISC?\r", MQTT_CMD_TIMEOUT_MS);
    tracker_mqtt_log_diag_cmd("AT+CMQTTACCQ?\r", MQTT_CMD_TIMEOUT_MS);
    tracker_mqtt_log_diag_cmd("AT+CMQTTCONNECT?\r", MQTT_CMD_TIMEOUT_MS);
}

static esp_err_t tracker_mqtt_send_disconnect(void) {
    if (!s_connected && !s_client_acquired) {
        return ESP_OK;
    }

    static const int accepted[] = {0, 9, 11};
    char cmd[64] = {0};
    (void)snprintf(cmd,
                   sizeof(cmd),
                   "AT+CMQTTDISC=%d,%u\r",
                   MQTT_CLIENT_INDEX,
                   (unsigned int)MQTT_DEFAULT_DISCONNECT_TIMEOUT_S);

    char response[MQTT_AT_RESPONSE_MAX_LEN] = {0};
    esp_err_t err = tracker_mqtt_send_cmd(cmd, MQTT_CONNECT_TIMEOUT_MS, response, sizeof(response));
    if (err == ESP_OK) {
        err = tracker_mqtt_expect_result(response,
                                         "+CMQTTDISC:",
                                         true,
                                         accepted,
                                         ARRAY_SIZE(accepted),
                                         false,
                                         NULL,
                                         NULL);
    }
    s_connected = false;
    s_commands_subscribed = false;
    return err;
}

static esp_err_t tracker_mqtt_release_client(void) {
    if (!s_client_acquired) {
        return ESP_OK;
    }

    static const int accepted[] = {0, 20};
    char response[MQTT_AT_RESPONSE_MAX_LEN] = {0};
    esp_err_t err = tracker_mqtt_send_cmd("AT+CMQTTREL=0\r", MQTT_CONNECT_TIMEOUT_MS, response, sizeof(response));
    if (err != ESP_OK) {
        return err;
    }

    int err_code = 0;
    bool parsed = false;
    err = tracker_mqtt_expect_result(response,
                                     "+CMQTTREL:",
                                     true,
                                     accepted,
                                     ARRAY_SIZE(accepted),
                                     false,
                                     &err_code,
                                     &parsed);
    if (err == ESP_OK) {
        s_client_acquired = false;
        return ESP_OK;
    }

    if (parsed && err_code == MQTT_ERR_CLIENT_IS_USED) {
        ESP_LOGW(TAG, "CMQTTREL deferred: client still in use");
        return ESP_ERR_NOT_FINISHED;
    }

    return err;
}

static esp_err_t tracker_mqtt_stop_service(void) {
    if (!s_service_started) {
        return ESP_OK;
    }

    static const int accepted[] = {0, 9};
    char response[MQTT_AT_RESPONSE_MAX_LEN] = {0};
    esp_err_t err = tracker_mqtt_send_cmd("AT+CMQTTSTOP\r", MQTT_CONNECT_TIMEOUT_MS, response, sizeof(response));
    if (err != ESP_OK) {
        return err;
    }

    int err_code = 0;
    bool parsed = false;
    err = tracker_mqtt_expect_result(response,
                                     "+CMQTTSTOP:",
                                     false,
                                     accepted,
                                     ARRAY_SIZE(accepted),
                                     false,
                                     &err_code,
                                     &parsed);
    if (err == ESP_OK) {
        s_service_started = false;
        return ESP_OK;
    }

    if (parsed && err_code == MQTT_ERR_CLIENT_NOT_RELEASED) {
        ESP_LOGW(TAG, "CMQTTSTOP deferred: client not released");
        return ESP_ERR_NOT_FINISHED;
    }

    return err;
}

static esp_err_t tracker_mqtt_cleanup_after_connect_failure(void) {
    esp_err_t first_err = ESP_OK;

    esp_err_t disc_err = tracker_mqtt_send_disconnect();
    if (first_err == ESP_OK && disc_err != ESP_OK) {
        first_err = disc_err;
    }

    esp_err_t rel_err = ESP_OK;
    uint32_t rel_attempts_performed = 0;
    for (uint32_t i = 0; i < MQTT_CONNECT_CLEANUP_RETRY_MAX; ++i) {
        rel_attempts_performed = i + 1U;
        disc_err = tracker_mqtt_send_disconnect();
        if (first_err == ESP_OK && disc_err != ESP_OK) {
            first_err = disc_err;
        }

        rel_err = tracker_mqtt_release_client();
        if (rel_err == ESP_OK) {
            break;
        }

        vTaskDelay(pdMS_TO_TICKS(MQTT_CONNECT_CLEANUP_RETRY_DELAY_MS));
    }
    if (first_err == ESP_OK && rel_err != ESP_OK) {
        first_err = rel_err;
    }

    esp_err_t stop_err = ESP_OK;
    uint32_t stop_attempts_performed = 0;
    for (uint32_t i = 0; i < MQTT_CONNECT_CLEANUP_RETRY_MAX; ++i) {
        stop_attempts_performed = i + 1U;
        stop_err = tracker_mqtt_stop_service();
        if (stop_err == ESP_OK) {
            break;
        }

        (void)tracker_mqtt_release_client();
        vTaskDelay(pdMS_TO_TICKS(MQTT_CONNECT_CLEANUP_RETRY_DELAY_MS));
    }
    if (first_err == ESP_OK && stop_err != ESP_OK) {
        first_err = stop_err;
    }

    s_connected = false;
    s_service_started = false;
    s_client_acquired = false;
    s_commands_subscribed = false;
    tracker_mqtt_rx_reset();
    tracker_mqtt_reset_connect_wait();

    ESP_LOGW(TAG,
             "MQTT connect cleanup disc=%s rel=%s stop=%s rel_attempts=%u stop_attempts=%u",
             esp_err_to_name(disc_err),
             esp_err_to_name(rel_err),
             esp_err_to_name(stop_err),
             (unsigned int)rel_attempts_performed,
             (unsigned int)stop_attempts_performed);

    return first_err;
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
    ESP_RETURN_ON_FALSE(!util_string_empty(cfg->mqtt_host), ESP_ERR_INVALID_ARG, TAG, "mqtt_host empty");

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

    ESP_RETURN_ON_FALSE(tracker_mqtt_build_server_addrs(&s_cfg) == ESP_OK, ESP_FAIL, TAG, "server addr build failed");

    if (!s_urc_registered) {
        modem_at_register_urc("", tracker_mqtt_on_urc_line);
        s_urc_registered = true;
    }

    ESP_LOGI(TAG,
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

/**
 * @brief Start MQTT client and begin broker connection.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t tracker_mqtt_connect(void) {
    if (s_connected) {
        return ESP_OK;
    }

    ESP_RETURN_ON_FALSE(tracker_mqtt_start_service() == ESP_OK, ESP_FAIL, TAG, "start service failed");
    ESP_RETURN_ON_FALSE(tracker_mqtt_acquire_client() == ESP_OK, ESP_FAIL, TAG, "acquire client failed");
    ESP_RETURN_ON_FALSE(tracker_mqtt_apply_client_options() == ESP_OK, ESP_FAIL, TAG, "apply options failed");
    ESP_RETURN_ON_FALSE(tracker_mqtt_configure_tls() == ESP_OK, ESP_FAIL, TAG, "configure tls failed");

    int connect_err_code = 0;
    bool connect_timed_out = false;
    esp_err_t err = tracker_mqtt_connect_once(s_server_addr_primary, &connect_err_code, &connect_timed_out);

    bool should_try_fallback = s_server_addr_has_fallback;
    if (should_try_fallback && connect_err_code == MQTT_ERR_NOT_SUPPORTED_OPERATION) {
        should_try_fallback = false;
        ESP_LOGW(TAG,
                 "MQTT fallback skipped connect_err=%d; forcing cleanup",
                 connect_err_code);
    }

    if (err != ESP_OK && should_try_fallback) {
        ESP_LOGW(TAG, "MQTT primary connect failed, retry fallback server=%s", s_server_addr_fallback);
        connect_err_code = 0;
        connect_timed_out = false;
        err = tracker_mqtt_connect_once(s_server_addr_fallback, &connect_err_code, &connect_timed_out);
    }

    if (err != ESP_OK) {
        tracker_mqtt_log_connect_diagnostics();
        esp_err_t cleanup_err = tracker_mqtt_cleanup_after_connect_failure();
        ESP_LOGW(TAG,
                 "MQTT connect failed timeout=%d connect_err=%d cleanup=%s",
                 connect_timed_out ? 1 : 0,
                 connect_err_code,
                 esp_err_to_name(cleanup_err));
    }

    return err;
}

/**
 * @brief Stop MQTT client and disconnect broker session.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t tracker_mqtt_disconnect(void) {
    esp_err_t first_err = ESP_OK;

    esp_err_t err = tracker_mqtt_send_disconnect();
    if (first_err == ESP_OK && err != ESP_OK) {
        first_err = err;
    }

    err = tracker_mqtt_release_client();
    if (first_err == ESP_OK && err != ESP_OK) {
        first_err = err;
    }

    err = tracker_mqtt_stop_service();
    if (first_err == ESP_OK && err != ESP_OK) {
        first_err = err;
    }

    s_connected = false;
    s_service_started = false;
    s_client_acquired = false;
    s_commands_subscribed = false;
    tracker_mqtt_rx_reset();
    tracker_mqtt_reset_connect_wait();
    return first_err;
}

/**
 * @brief Read cached connection flag.
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
    int msg_id = tracker_mqtt_publish_with_msg_id(topic, payload, qos);
    return msg_id >= 0 ? ESP_OK : ESP_FAIL;
}

int tracker_mqtt_publish_with_msg_id(const char *topic, const char *payload, int qos) {
    ESP_RETURN_ON_FALSE(s_connected, -1, TAG, "MQTT not connected");
    ESP_RETURN_ON_NULL(topic, -1, TAG, "topic is NULL");
    ESP_RETURN_ON_NULL(payload, -1, TAG, "payload is NULL");
    ESP_RETURN_ON_FALSE(topic[0] != '\0', -1, TAG, "topic empty");
    ESP_RETURN_ON_FALSE(payload[0] != '\0', -1, TAG, "payload empty");
    ESP_RETURN_ON_FALSE(qos >= 0 && qos <= 2, -1, TAG, "invalid qos=%d", qos);

    size_t topic_len = strlen(topic);
    size_t payload_len = strlen(payload);
    ESP_RETURN_ON_FALSE(topic_len <= 1024, -1, TAG, "topic too long len=%u", (unsigned)topic_len);
    ESP_RETURN_ON_FALSE(payload_len <= 10240, -1, TAG, "payload too long len=%u", (unsigned)payload_len);

    char cmd[96] = {0};
    (void)snprintf(cmd, sizeof(cmd), "AT+CMQTTTOPIC=%d,%u\r", MQTT_CLIENT_INDEX, (unsigned int)topic_len);
    ESP_RETURN_ON_FALSE(tracker_mqtt_input_data(cmd, topic, "+CMQTTTOPIC:", true) == ESP_OK,
                        -1,
                        TAG,
                        "CMQTTTOPIC failed");

    (void)snprintf(cmd, sizeof(cmd), "AT+CMQTTPAYLOAD=%d,%u\r", MQTT_CLIENT_INDEX, (unsigned int)payload_len);
    ESP_RETURN_ON_FALSE(tracker_mqtt_input_data(cmd, payload, "+CMQTTPAYLOAD:", true) == ESP_OK,
                        -1,
                        TAG,
                        "CMQTTPAYLOAD failed");

    (void)snprintf(cmd,
                   sizeof(cmd),
                   "AT+CMQTTPUB=%d,%d,%u,0,0\r",
                   MQTT_CLIENT_INDEX,
                   qos,
                   (unsigned int)MQTT_DEFAULT_PUBLISH_TIMEOUT_S);

    char response[MQTT_AT_RESPONSE_MAX_LEN] = {0};
    ESP_RETURN_ON_FALSE(tracker_mqtt_send_cmd(cmd, MQTT_CONNECT_TIMEOUT_MS, response, sizeof(response)) == ESP_OK,
                        -1,
                        TAG,
                        "CMQTTPUB failed");
    ESP_RETURN_ON_FALSE(tracker_mqtt_expect_result(response,
                                                   "+CMQTTPUB:",
                                                   true,
                                                   NULL,
                                                   0,
                                                   false,
                                                   NULL,
                                                   NULL) == ESP_OK,
                        -1,
                        TAG,
                        "CMQTTPUB result failed");

    int msg_id = s_next_msg_id++;
    if (s_next_msg_id <= 0) {
        s_next_msg_id = 1;
    }

    if (s_puback_callback != NULL) {
        s_puback_callback(msg_id);
    }
    return msg_id;
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
 * @brief Subscribe to command topic.
 *
 * @return ESP_OK on success, otherwise error.
 */
esp_err_t tracker_mqtt_subscribe_commands(void) {
    ESP_RETURN_ON_FALSE(s_connected, ESP_ERR_INVALID_STATE, TAG, "MQTT not connected");
    if (s_commands_subscribed) {
        return ESP_OK;
    }

    size_t topic_len = strlen(s_topic_commands);
    ESP_RETURN_ON_FALSE(topic_len > 0 && topic_len <= 1024, ESP_ERR_INVALID_ARG, TAG, "invalid commands topic");

    char cmd[96] = {0};
    (void)snprintf(cmd, sizeof(cmd), "AT+CMQTTSUB=%d,%u,1\r", MQTT_CLIENT_INDEX, (unsigned int)topic_len);
    ESP_RETURN_ON_FALSE(tracker_mqtt_input_data(cmd, s_topic_commands, "+CMQTTSUB:", true) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "CMQTTSUB failed");

    s_commands_subscribed = true;
    ESP_LOGI(TAG, "MQTT subscribed commands topic=%s", s_topic_commands);
    return ESP_OK;
}

/**
 * @brief Register command callback.
 *
 * @param cb Callback function pointer.
 */
void tracker_mqtt_set_command_callback(mqtt_command_cb_t cb) {
    s_command_callback = cb;
}

void tracker_mqtt_set_puback_callback(mqtt_puback_cb_t cb) {
    s_puback_callback = cb;
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
