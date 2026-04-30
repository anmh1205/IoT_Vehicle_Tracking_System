#include "mqtt_internal.h"

#include <stdlib.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "esp_log.h"

#include "modem_at.h"
#include "util.h"

/**
 * @file mqtt_urc_parser.c
 * @brief AT/URC parsing, result waits, and raw data-entry helpers for tracker MQTT.
 */

bool tracker_mqtt_err_indicates_disconnect(int err_code) {
    return err_code == MQTT_ERR_NETWORK_NOT_OPENED || err_code == MQTT_ERR_NO_CONNECTION ||
           err_code == MQTT_ERR_NOT_SUPPORTED_OPERATION || err_code == MQTT_ERR_SOCKET_CLOSED_BY_SERVER;
}

void tracker_mqtt_mark_disconnected(const char *reason, int err_code) {
    if (s_connected) {
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "MQTT marked disconnected reason=%s err=%d",
                 reason != NULL ? reason : "unknown",
                 err_code);
    }
    s_connected = false;
    s_commands_subscribed = false;
}

void tracker_mqtt_rx_reset(void) {
    memset(&s_rx_ctx, 0, sizeof(s_rx_ctx));
    s_rx_ctx.client_index = -1;
    s_rx_pending_header = MQTT_RX_PENDING_NONE;
}

bool tracker_mqtt_parse_next_int(const char **cursor, int *out_value) {
    ESP_RETURN_ON_FALSE(cursor != NULL, false, TRACKER_MQTT_TAG, "parse cursor null");
    ESP_RETURN_ON_FALSE(*cursor != NULL, false, TRACKER_MQTT_TAG, "parse cursor pointee null");
    ESP_RETURN_ON_FALSE(out_value != NULL, false, TRACKER_MQTT_TAG, "parse out_value null");

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

bool tracker_mqtt_parse_int_list_from_text(const char *text,
                                           const char *prefix,
                                           int *out_values,
                                           size_t value_count) {
    ESP_RETURN_ON_FALSE(text != NULL, false, TRACKER_MQTT_TAG, "parse text null");
    ESP_RETURN_ON_FALSE(prefix != NULL, false, TRACKER_MQTT_TAG, "parse prefix null");
    ESP_RETURN_ON_FALSE(out_values != NULL, false, TRACKER_MQTT_TAG, "parse out_values null");
    ESP_RETURN_ON_FALSE(value_count > 0, false, TRACKER_MQTT_TAG, "parse value_count invalid");

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

bool tracker_mqtt_parse_disconnect_state(const char *response, int *out_disc_state) {
    ESP_RETURN_ON_FALSE(response != NULL, false, TRACKER_MQTT_TAG, "response null");
    ESP_RETURN_ON_FALSE(out_disc_state != NULL, false, TRACKER_MQTT_TAG, "out_disc_state null");

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

esp_err_t tracker_mqtt_expect_result(const char *response,
                                     const char *prefix,
                                     bool has_client_index,
                                     const int *allowed_codes,
                                     size_t allowed_count,
                                     bool require_prefix,
                                     int *out_err_code,
                                     bool *out_parsed) {
    ESP_RETURN_ON_NULL(response, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "response null");
    ESP_RETURN_ON_NULL(prefix, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "prefix null");

    int values[2] = {0};
    bool parsed = tracker_mqtt_parse_int_list_from_text(response, prefix, values, has_client_index ? 2U : 1U);
    if (out_parsed != NULL) {
        *out_parsed = parsed;
    }

    if (!parsed) {
        if (require_prefix) {
            ESP_LOGW(TRACKER_MQTT_TAG, "AT result missing prefix=%s raw=\"%s\"", prefix, response);
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
        ESP_LOGW(TRACKER_MQTT_TAG, "AT result prefix=%s err=%d raw=\"%s\"", prefix, err_code, response);
        return ESP_FAIL;
    }
    return ESP_OK;
}

bool tracker_mqtt_extract_error_code_from_response(const char *response, int *out_err_code) {
    if (response == NULL || out_err_code == NULL) {
        return false;
    }

    static const struct {
        const char *prefix;
        bool has_client_index;
    } prefixes[] = {
        {"+CMQTTSTART:", false},
        {"+CMQTTSTOP:", false},
        {"+CMQTTACCQ:", true},
        {"+CMQTTREL:", true},
        {"+CMQTTCONNECT:", true},
        {"+CMQTTDISC:", true},
        {"+CMQTTTOPIC:", true},
        {"+CMQTTPAYLOAD:", true},
        {"+CMQTTPUB:", true},
        {"+CMQTTSUB:", true},
    };

    for (size_t i = 0; i < ARRAY_SIZE(prefixes); ++i) {
        int values[2] = {0};
        if (tracker_mqtt_parse_int_list_from_text(response,
                                                  prefixes[i].prefix,
                                                  values,
                                                  prefixes[i].has_client_index ? 2U : 1U)) {
            *out_err_code = prefixes[i].has_client_index ? values[1] : values[0];
            return true;
        }
    }
    return false;
}

esp_err_t tracker_mqtt_send_cmd_with_policy(const char *cmd,
                                            uint32_t timeout_ms,
                                            char *response,
                                            size_t response_size,
                                            bool log_command,
                                            bool log_result) {
    ESP_RETURN_ON_NULL(cmd, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "cmd null");
    ESP_RETURN_ON_NULL(response, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "response null");
    ESP_RETURN_ON_FALSE(response_size > 0, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "response_size invalid");

    response[0] = '\0';
    if (log_command) {
        ESP_LOGD(TRACKER_MQTT_TAG, "AT TX: %s", cmd);
    }

    esp_err_t err = modem_at_send(cmd, response, response_size, timeout_ms);
    if (err != ESP_OK) {
        int err_code = 0;
        if (tracker_mqtt_extract_error_code_from_response(response, &err_code) &&
            tracker_mqtt_err_indicates_disconnect(err_code)) {
            tracker_mqtt_mark_disconnected(cmd, err_code);
        }
        if (log_result) {
            ESP_LOGW(TRACKER_MQTT_TAG, "AT %s failed err=%s resp=\"%s\"", cmd, esp_err_to_name(err), response);
        }
        return err;
    }

    if (log_result) {
        ESP_LOGD(TRACKER_MQTT_TAG, "AT RX: %s", response);
    }
    return ESP_OK;
}

esp_err_t tracker_mqtt_send_cmd(const char *cmd, uint32_t timeout_ms, char *response, size_t response_size) {
    return tracker_mqtt_send_cmd_with_policy(cmd, timeout_ms, response, response_size, false, false);
}

void tracker_mqtt_reset_connect_wait(void) {
    s_connect_result_pending = false;
    s_connect_result_ready = false;
    s_connect_result_err = -1;
}

void tracker_mqtt_begin_connect_wait(void) {
    tracker_mqtt_reset_connect_wait();
    s_connect_result_pending = true;
}

void tracker_mqtt_reset_publish_wait(void) {
    s_publish_result_pending = false;
    s_publish_result_ready = false;
    s_publish_result_err = -1;
}

void tracker_mqtt_begin_publish_wait(void) {
    tracker_mqtt_reset_publish_wait();
    s_publish_result_pending = true;
}

void tracker_mqtt_on_connect_result_line(int client_index, int err_code) {
    if (!s_connect_result_pending || client_index != MQTT_CLIENT_INDEX) {
        return;
    }

    s_connect_result_pending = false;
    s_connect_result_ready = true;
    s_connect_result_err = err_code;
}

void tracker_mqtt_on_publish_result_line(int client_index, int err_code) {
    if (!s_publish_result_pending || client_index != MQTT_CLIENT_INDEX) {
        return;
    }

    s_publish_result_pending = false;
    s_publish_result_ready = true;
    s_publish_result_err = err_code;
}

esp_err_t tracker_mqtt_wait_connect_result(int *out_err_code) {
    ESP_RETURN_ON_NULL(out_err_code, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "out_err_code null");
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

esp_err_t tracker_mqtt_wait_publish_result(int *out_err_code) {
    ESP_RETURN_ON_NULL(out_err_code, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "out_err_code null");
    uint64_t start_ms = util_uptime_ms();

    while ((util_uptime_ms() - start_ms) < MQTT_CONNECT_TIMEOUT_MS) {
        if (s_publish_result_ready) {
            *out_err_code = s_publish_result_err;
            return ESP_OK;
        }
        (void)modem_at_poll_urc(MQTT_POLL_MAX_BYTES);
        if (s_publish_result_ready) {
            *out_err_code = s_publish_result_err;
            return ESP_OK;
        }
        vTaskDelay(pdMS_TO_TICKS(MQTT_CONNECT_RESULT_POLL_MS));
    }
    return ESP_ERR_TIMEOUT;
}

bool tracker_mqtt_response_has_prompt(const char *response) {
    return response != NULL &&
           (strstr(response, "\r\n>\r\n") != NULL || strstr(response, "\n>\n") != NULL ||
            strstr(response, "\r\n>") != NULL || strstr(response, "\n>") != NULL ||
            strstr(response, "> ") != NULL || strstr(response, ">") != NULL);
}

esp_err_t tracker_mqtt_input_data(const char *prepare_cmd,
                                  const char *data,
                                  const char *result_prefix,
                                  bool has_client_index) {
    ESP_RETURN_ON_NULL(prepare_cmd, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "prepare_cmd null");
    ESP_RETURN_ON_NULL(data, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "data null");
    ESP_RETURN_ON_NULL(result_prefix, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "result_prefix null");
    ESP_RETURN_ON_FALSE(data[0] != '\0', ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "data empty");

    char response[MQTT_AT_RESPONSE_MAX_LEN] = {0};
    esp_err_t err = modem_at_send_prompt_data(prepare_cmd,
                                              (const uint8_t *)data,
                                              strlen(data),
                                              response,
                                              sizeof(response),
                                              MQTT_INPUT_TIMEOUT_MS);
    if (err != ESP_OK) {
        int err_code = 0;
        bool parsed = tracker_mqtt_extract_error_code_from_response(response, &err_code);
        if (parsed && tracker_mqtt_err_indicates_disconnect(err_code)) {
            tracker_mqtt_mark_disconnected("prompt_data", err_code);
        }
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "AT input data interrupted err=%s connected=%d",
                 esp_err_to_name(err),
                 s_connected ? 1 : 0);
        return ESP_FAIL;
    }

    return tracker_mqtt_expect_result(response, result_prefix, has_client_index, NULL, 0, false, NULL, NULL);
}

static size_t tracker_mqtt_append_topic_chunk(const char *chunk, size_t chunk_len) {
    if (chunk == NULL || chunk_len == 0U || s_rx_ctx.topic_chunk_remaining <= 0) {
        return 0U;
    }

    /*
     * Consume the modem-reported chunk length even if our topic buffer fills.
     * The truncation flag makes dispatch drop the frame later, while the parser
     * stays aligned with the following payload/end URCs.
     */
    size_t consume_len = (size_t)MIN_VALUE((int)chunk_len, s_rx_ctx.topic_chunk_remaining);
    size_t cap_remaining = sizeof(s_rx_ctx.topic) - 1U - s_rx_ctx.topic_len;
    size_t copy_len = MIN_VALUE(consume_len, cap_remaining);
    if (copy_len > 0) {
        memcpy(&s_rx_ctx.topic[s_rx_ctx.topic_len], chunk, copy_len);
        s_rx_ctx.topic_len += copy_len;
        s_rx_ctx.topic[s_rx_ctx.topic_len] = '\0';
    }
    if (copy_len < consume_len) {
        s_rx_ctx.topic_truncated = true;
        ESP_LOGW(TRACKER_MQTT_TAG, "MQTT RX topic truncated chunk=%u", (unsigned)consume_len);
    }

    s_rx_ctx.topic_chunk_remaining -= (int)consume_len;
    return consume_len;
}

static size_t tracker_mqtt_append_payload_chunk(const char *chunk, size_t chunk_len) {
    if (chunk == NULL || chunk_len == 0U || s_rx_ctx.payload_chunk_remaining <= 0) {
        return 0U;
    }

    /*
     * Command payloads must be complete JSON. Keep consuming modem bytes after
     * local truncation so the next URC starts cleanly, then reject dispatch.
     */
    size_t consume_len = (size_t)MIN_VALUE((int)chunk_len, s_rx_ctx.payload_chunk_remaining);
    size_t cap_remaining = sizeof(s_rx_ctx.payload) - 1U - s_rx_ctx.payload_len;
    size_t copy_len = MIN_VALUE(consume_len, cap_remaining);
    if (copy_len > 0) {
        memcpy(&s_rx_ctx.payload[s_rx_ctx.payload_len], chunk, copy_len);
        s_rx_ctx.payload_len += copy_len;
        s_rx_ctx.payload[s_rx_ctx.payload_len] = '\0';
    }
    if (copy_len < consume_len) {
        s_rx_ctx.payload_truncated = true;
        ESP_LOGW(TRACKER_MQTT_TAG, "MQTT RX payload truncated chunk=%u", (unsigned)consume_len);
    }

    s_rx_ctx.payload_chunk_remaining -= (int)consume_len;
    return consume_len;
}

static bool tracker_mqtt_parse_plain_int_list(const char *text, int *out_values, size_t value_count) {
    ESP_RETURN_ON_FALSE(text != NULL, false, TRACKER_MQTT_TAG, "plain parse text null");
    ESP_RETURN_ON_FALSE(out_values != NULL, false, TRACKER_MQTT_TAG, "plain parse out_values null");
    ESP_RETURN_ON_FALSE(value_count > 0, false, TRACKER_MQTT_TAG, "plain parse value_count invalid");

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
            ESP_LOGI(TRACKER_MQTT_TAG,
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
            ESP_LOGI(TRACKER_MQTT_TAG, "MQTT RX topic chunk expect=%d", s_rx_ctx.topic_chunk_remaining);
            return true;
        case MQTT_RX_PENDING_PAYLOAD_HEADER:
            if (!tracker_mqtt_parse_plain_int_list(line, values, 2) || !s_rx_ctx.active) {
                return false;
            }
            s_rx_ctx.payload_chunk_remaining = values[1];
            s_rx_pending_header = MQTT_RX_PENDING_NONE;
            ESP_LOGI(TRACKER_MQTT_TAG, "MQTT RX payload chunk expect=%d", s_rx_ctx.payload_chunk_remaining);
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

    /*
     * SIM7600 may split RX frames across several URCs. Dispatch only when the
     * accumulated lengths exactly match the modem header; partial JSON commands
     * must never reach the command handler.
     */
    bool topic_complete = s_rx_ctx.topic_total_len >= 0 &&
                          s_rx_ctx.topic_len == (size_t)s_rx_ctx.topic_total_len &&
                          s_rx_ctx.topic_chunk_remaining == 0;
    bool payload_complete = s_rx_ctx.payload_total_len >= 0 &&
                            s_rx_ctx.payload_len == (size_t)s_rx_ctx.payload_total_len &&
                            s_rx_ctx.payload_chunk_remaining == 0;
    if (s_rx_ctx.topic_truncated || s_rx_ctx.payload_truncated || !topic_complete || !payload_complete) {
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "MQTT RX dropped incomplete frame topic_len=%u/%d payload_len=%u/%d topic_trunc=%d payload_trunc=%d",
                 (unsigned)s_rx_ctx.topic_len,
                 s_rx_ctx.topic_total_len,
                 (unsigned)s_rx_ctx.payload_len,
                 s_rx_ctx.payload_total_len,
                 s_rx_ctx.topic_truncated ? 1 : 0,
                 s_rx_ctx.payload_truncated ? 1 : 0);
        return;
    }

    if (s_command_callback != NULL && strcmp(s_rx_ctx.topic, s_topic_commands) == 0) {
        ESP_LOGI(TRACKER_MQTT_TAG,
                 "MQTT RX command topic=%s payload_len=%u",
                 s_rx_ctx.topic,
                 (unsigned)s_rx_ctx.payload_len);
        s_command_callback(s_rx_ctx.topic, s_rx_ctx.payload);
        return;
    }

    ESP_LOGI(TRACKER_MQTT_TAG, "MQTT RX ignored topic=%s len=%u", s_rx_ctx.topic, (unsigned)s_rx_ctx.payload_len);
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

static const char *tracker_mqtt_skip_inline_whitespace(const char *cursor) {
    while (cursor != NULL && (*cursor == ' ' || *cursor == '\t')) {
        ++cursor;
    }
    return cursor;
}

static bool tracker_mqtt_consume_pending_rx_data(const char *cursor, const char **out_next_cursor) {
    if (s_rx_ctx.topic_chunk_remaining > 0) {
        size_t consumed = tracker_mqtt_append_topic_chunk(cursor, strlen(cursor));
        if (consumed == 0U || cursor[consumed] == '\0') {
            *out_next_cursor = NULL;
        } else {
            *out_next_cursor = tracker_mqtt_skip_inline_whitespace(cursor + consumed);
        }
        return true;
    }

    if (s_rx_ctx.payload_chunk_remaining > 0) {
        size_t consumed = tracker_mqtt_append_payload_chunk(cursor, strlen(cursor));
        if (consumed == 0U || cursor[consumed] == '\0') {
            *out_next_cursor = NULL;
        } else {
            *out_next_cursor = tracker_mqtt_skip_inline_whitespace(cursor + consumed);
        }
        return true;
    }

    if (tracker_mqtt_try_consume_pending_header(cursor)) {
        *out_next_cursor = cursor;
        return true;
    }

    return false;
}

static bool tracker_mqtt_handle_rx_urc(const char *cursor, const char **out_next_cursor) {
    if (strncmp(cursor, "+CMQTTRXSTART:", strlen("+CMQTTRXSTART:")) == 0) {
        int values[3] = {0};
        if (tracker_mqtt_parse_int_list_from_text(cursor, "+CMQTTRXSTART:", values, 3)) {
            tracker_mqtt_rx_reset();
            s_rx_ctx.active = true;
            s_rx_ctx.client_index = values[0];
            s_rx_ctx.topic_total_len = values[1];
            s_rx_ctx.payload_total_len = values[2];
            ESP_LOGI(TRACKER_MQTT_TAG,
                     "MQTT RX start client=%d topic_len=%d payload_len=%d",
                     s_rx_ctx.client_index,
                     s_rx_ctx.topic_total_len,
                     s_rx_ctx.payload_total_len);
        } else {
            s_rx_pending_header = MQTT_RX_PENDING_START_HEADER;
        }
        *out_next_cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
        return true;
    }

    if (strncmp(cursor, "+CMQTTRXTOPIC:", strlen("+CMQTTRXTOPIC:")) == 0) {
        int values[2] = {0};
        if (tracker_mqtt_parse_int_list_from_text(cursor, "+CMQTTRXTOPIC:", values, 2) && s_rx_ctx.active) {
            s_rx_ctx.topic_chunk_remaining = values[1];
            ESP_LOGI(TRACKER_MQTT_TAG, "MQTT RX topic chunk expect=%d", s_rx_ctx.topic_chunk_remaining);
        } else if (s_rx_ctx.active) {
            s_rx_pending_header = MQTT_RX_PENDING_TOPIC_HEADER;
        }
        *out_next_cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
        return true;
    }

    if (strncmp(cursor, "+CMQTTRXPAYLOAD:", strlen("+CMQTTRXPAYLOAD:")) == 0) {
        int values[2] = {0};
        if (tracker_mqtt_parse_int_list_from_text(cursor, "+CMQTTRXPAYLOAD:", values, 2) && s_rx_ctx.active) {
            s_rx_ctx.payload_chunk_remaining = values[1];
            ESP_LOGI(TRACKER_MQTT_TAG, "MQTT RX payload chunk expect=%d", s_rx_ctx.payload_chunk_remaining);
        } else if (s_rx_ctx.active) {
            s_rx_pending_header = MQTT_RX_PENDING_PAYLOAD_HEADER;
        }
        *out_next_cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
        return true;
    }

    if (strncmp(cursor, "+CMQTTRXEND:", strlen("+CMQTTRXEND:")) == 0) {
        ESP_LOGI(TRACKER_MQTT_TAG,
                 "MQTT RX end topic_len=%u payload_len=%u",
                 (unsigned)s_rx_ctx.topic_len,
                 (unsigned)s_rx_ctx.payload_len);
        tracker_mqtt_dispatch_rx_if_complete();
        tracker_mqtt_rx_reset();
        *out_next_cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
        return true;
    }

    return false;
}

static bool tracker_mqtt_handle_non_rx_urc(const char *cursor, const char **out_next_cursor) {
    if (strncmp(cursor, "+CMQTTCONNECT:", strlen("+CMQTTCONNECT:")) == 0) {
        int values[2] = {0};
        if (tracker_mqtt_parse_int_list_from_text(cursor, "+CMQTTCONNECT:", values, 2)) {
            tracker_mqtt_on_connect_result_line(values[0], values[1]);
        }
        *out_next_cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
        return true;
    }

    if (strncmp(cursor, "+CMQTTSUB:", strlen("+CMQTTSUB:")) == 0) {
        int values[2] = {0};
        if (tracker_mqtt_parse_int_list_from_text(cursor, "+CMQTTSUB:", values, 2) &&
            values[0] == MQTT_CLIENT_INDEX) {
            if (values[1] == 0) {
                s_commands_subscribed = true;
            }
            ESP_LOGI(TRACKER_MQTT_TAG, "MQTT subscribe URC client=%d err=%d", values[0], values[1]);
        }
        *out_next_cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
        return true;
    }

    if (strncmp(cursor, "+CMQTTPUB:", strlen("+CMQTTPUB:")) == 0) {
        int values[2] = {0};
        if (tracker_mqtt_parse_int_list_from_text(cursor, "+CMQTTPUB:", values, 2)) {
            tracker_mqtt_on_publish_result_line(values[0], values[1]);
        }
        *out_next_cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
        return true;
    }

    if (strncmp(cursor, "+CMQTTCONNLOST:", strlen("+CMQTTCONNLOST:")) == 0 ||
        strncmp(cursor, "+CMQTTPING:", strlen("+CMQTTPING:")) == 0 ||
        strncmp(cursor, "+CMQTTNONET", strlen("+CMQTTNONET")) == 0) {
        if (s_connected) {
            ESP_LOGW(TRACKER_MQTT_TAG, "MQTT URC disconnect: %s", cursor);
        }
        tracker_mqtt_mark_disconnected(cursor, MQTT_ERR_NO_CONNECTION);
        *out_next_cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
        return true;
    }

    return false;
}

void tracker_mqtt_on_urc_line(const char *line) {
    if (line == NULL || line[0] == '\0') {
        return;
    }

    const char *cursor = line;
    while (cursor != NULL && cursor[0] != '\0') {
        const char *next_cursor = NULL;
        if (tracker_mqtt_consume_pending_rx_data(cursor, &next_cursor)) {
            if (next_cursor == NULL) {
                return;
            }
            cursor = next_cursor;
            continue;
        }

        cursor = tracker_mqtt_seek_urc_prefix(cursor);
        if (cursor == NULL || cursor[0] == '\0') {
            return;
        }
        if (tracker_mqtt_handle_rx_urc(cursor, &next_cursor) ||
            tracker_mqtt_handle_non_rx_urc(cursor, &next_cursor)) {
            cursor = next_cursor;
            continue;
        }

        cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
    }
}

void tracker_mqtt_register_urc_handler(void) {
    if (s_urc_registered) {
        return;
    }

    modem_at_register_urc("", tracker_mqtt_on_urc_line);
    s_urc_registered = true;
}
