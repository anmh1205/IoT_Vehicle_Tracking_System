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
 * This translation unit belongs to the SIM7600 AT MQTT adapter layer and keeps adapter-local state, topic wiring, and broker command sequencing isolated behind the exported entry points.
 */

// File-local constants, retained state, and helper wiring stay private here so
// higher layers interact with this module through its exported contract.


/**
 * @brief Check if MQTT error code indicates disconnection.
 *
 * @param err_code Error code from modem MQTT.
 * @return true if error means disconnected, false otherwise.
 */
bool tracker_mqtt_err_indicates_disconnect(int err_code) {
    // Keep this public facade thin and forward the real work to the focused implementation below.
    return err_code == MQTT_ERR_NETWORK_NOT_OPENED || err_code == MQTT_ERR_NO_CONNECTION ||
           err_code == MQTT_ERR_NOT_SUPPORTED_OPERATION || err_code == MQTT_ERR_SOCKET_CLOSED_BY_SERVER;
}

/**
 * @brief Mark MQTT as disconnected and update state.
 *
 * @param reason Disconnection reason string.
 * @param err_code Error code from modem.
 */
void tracker_mqtt_mark_disconnected(const char *reason, int err_code) {
    // Drive the transport or session toward a connected state while keeping retries explicit.
    if (s_connected) {
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "MQTT marked disconnected reason=%s err=%d",
                 reason != NULL ? reason : "unknown",
                 err_code);
    }
    s_connected = false;
    s_commands_subscribed = false;
}

/**
 * @brief Reset MQTT RX parser state.
 *
 * Clears all pending RX context for fresh parsing.
 */
void tracker_mqtt_rx_reset(void) {
    // Reset RX reset here so stale data does not leak into the next cycle.
    memset(&s_rx_ctx, 0, sizeof(s_rx_ctx));
    s_rx_ctx.client_index = -1;
    s_rx_pending_header = MQTT_RX_PENDING_NONE;
}

/**
 * @brief Parse next integer from text cursor.
 *
 * Parses decimal integer, advances cursor past parsed value.
 *
 * @param cursor In/out pointer to text position.
 * @param out_value Output for parsed integer.
 * @return true on success, false on parse failure.
 */
bool tracker_mqtt_parse_next_int(const char **cursor, int *out_value) {
    // Decode raw parse next int into the normalized form the rest of the module expects.
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
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
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

/**
 * @brief Parse list of integers from text by prefix.
 *
 * Finds last occurrence of prefix, then parses N integers.
 *
 * @param text Input text to search.
 * @param prefix Prefix to find (e.g., "+CMQTTCONN:").
 * @param out_values Output array for parsed values.
 * @param value_count Number of integers to parse.
 * @return true on full parse success, false on failure.
 */
bool tracker_mqtt_parse_int_list_from_text(const char *text,
                                           const char *prefix,
                                           int *out_values,
                                           size_t value_count) {
    // Decode raw parse int list from text into the normalized form the rest of the module expects.
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

/**
 * @brief Parse disconnect state from MQTT response.
 *
 * Extracts disconnect state value from +CMQTTDISC response.
 *
 * @param response Modem response text.
 * @param out_disc_state Output for disconnect state.
 * @return true if parse success, false if not found.
 */
bool tracker_mqtt_parse_disconnect_state(const char *response, int *out_disc_state) {
    // Decode raw parse disconnect into the normalized form the rest of the module expects.
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
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
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
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
    ESP_RETURN_ON_NULL(response, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "response null");
    ESP_RETURN_ON_NULL(prefix, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "prefix null");

    int values[2] = {0};
    bool parsed = tracker_mqtt_parse_int_list_from_text(response, prefix, values, has_client_index ? 2U : 1U);
    if (out_parsed != NULL) {
        *out_parsed = parsed;
    }

    if (!parsed) {
        if (require_prefix) {
            ESP_LOGW(TRACKER_MQTT_TAG,
                     "AT result missing prefix=%s response_len=%u",
                     prefix,
                     (unsigned)strlen(response));
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
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "AT result rejected prefix=%s err=%d response_len=%u",
                 prefix,
                 err_code,
                 (unsigned)strlen(response));
        return ESP_FAIL;
    }
    return ESP_OK;
}

bool tracker_mqtt_extract_error_code_from_response(const char *response, int *out_err_code) {
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
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

/**
 * @brief Send AT command with retry policy.
 *
 * Sends MQTT AT command with optional logging and
 * automatic disconnect detection.
 *
 * @param cmd AT command to send.
 * @param timeout_ms Timeout in ms.
 * @param response Response buffer.
 * @param response_size Buffer capacity.
 * @param log_command Whether to log command.
 * @param log_result Whether to log response.
 * @return ESP_OK on success, error on failure.
 */
esp_err_t tracker_mqtt_send_cmd_with_policy(const char *cmd,
                                            uint32_t timeout_ms,
                                            char *response,
                                            size_t response_size,
                                            bool log_command,
                                            bool log_result) {
    // Send the AT command through the policy-aware helper so retries, quiet mode, and diagnostics stay consistent.
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
            ESP_LOGW(TRACKER_MQTT_TAG,
                     "AT %s failed err=%s response_len=%u",
                     cmd,
                     esp_err_to_name(err),
                     (unsigned)strlen(response));
        }
        return err;
    }

    if (log_result) {
        ESP_LOGD(TRACKER_MQTT_TAG, "AT RX response_len=%u", (unsigned)strlen(response));
    }
    return ESP_OK;
}

/**
 * @brief Send AT command without logging.
 *
 * Wrapper with defaults for silent operation.
 *
 * @param cmd AT command.
 * @param timeout_ms Timeout.
 * @param response Response buffer.
 * @param response_size Buffer size.
 * @return ESP_OK on success.
 */
esp_err_t tracker_mqtt_send_cmd(const char *cmd, uint32_t timeout_ms, char *response, size_t response_size) {
    // Keep this public facade thin and forward the real work to the focused implementation below.
    return tracker_mqtt_send_cmd_with_policy(cmd, timeout_ms, response, response_size, false, false);
}

/**
 * @brief Reset connect result wait state.
 */
void tracker_mqtt_reset_connect_wait(void) {
    // Reset the pending-connect wait state here once the URC path has reached a terminal outcome.
    s_connect_result_pending = false;
    s_connect_result_ready = false;
    s_connect_result_err = -1;
}

/**
 * @brief Begin waiting for connect result.
 */
void tracker_mqtt_begin_connect_wait(void) {
    // Drive the transport or session toward a connected state while keeping retries explicit.
    tracker_mqtt_reset_connect_wait();
    s_connect_result_pending = true;
}

/**
 * @brief Reset publish result wait state.
 */
void tracker_mqtt_reset_publish_wait(void) {
    // Reset the pending-publish wait state here once the modem has acknowledged or rejected the publish.
    s_publish_result_pending = false;
    s_publish_result_ready = false;
    s_publish_result_err = -1;
}

/**
 * @brief Begin waiting for publish result.
 */
void tracker_mqtt_begin_publish_wait(void) {
    // Push begin publish wait through the shared publish path so metadata and error handling stay aligned.
    tracker_mqtt_reset_publish_wait();
    s_publish_result_pending = true;
}

/**
 * @brief Handle connect result from modem.
 *
 * @param client_index Client index from modem.
 * @param err_code Error code from modem.
 */
void tracker_mqtt_on_connect_result_line(int client_index, int err_code) {
    // Drive the transport or session toward a connected state while keeping retries explicit.
    if (!s_connect_result_pending || client_index != MQTT_CLIENT_INDEX) {
        return;
    }

    s_connect_result_pending = false;
    s_connect_result_ready = true;
    s_connect_result_err = err_code;
}

void tracker_mqtt_on_publish_result_line(int client_index, int err_code) {
    // Push on publish result line through the shared publish path so metadata and error handling stay aligned.
    if (!s_publish_result_pending || client_index != MQTT_CLIENT_INDEX) {
        return;
    }

    s_publish_result_pending = false;
    s_publish_result_ready = true;
    s_publish_result_err = err_code;
}

esp_err_t tracker_mqtt_wait_connect_result(int *out_err_code) {
    // Drive the transport or session toward a connected state while keeping retries explicit.
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
    // Push wait publish result through the shared publish path so metadata and error handling stay aligned.
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
    // Keep this public facade thin and forward the real work to the focused implementation below.
    return response != NULL &&
           (strstr(response, "\r\n>\r\n") != NULL || strstr(response, "\n>\n") != NULL ||
            strstr(response, "\r\n>") != NULL || strstr(response, "\n>") != NULL ||
            strstr(response, "> ") != NULL || strstr(response, ">") != NULL);
}

esp_err_t tracker_mqtt_input_data(const char *prepare_cmd,
                                  const char *data,
                                  const char *result_prefix,
                                  bool has_client_index) {
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
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
    // Stage append topic chunk durably here so transient link loss cannot drop the caller's payload.
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
    // Rehydrate append payload chunk here so later logic reads one coherent snapshot after reset or sleep.
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
        ESP_LOGW(TRACKER_MQTT_TAG, "mqtt rx body truncated chunk=%u", (unsigned)consume_len);
    }

    s_rx_ctx.payload_chunk_remaining -= (int)consume_len;
    return consume_len;
}

static bool tracker_mqtt_parse_plain_int_list(const char *text, int *out_values, size_t value_count) {
    // Decode raw parse plain int list into the normalized form the rest of the module expects.
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
    // Consume try consume pending header exactly once so producers and the owning task stay in sync.
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
                     "mqtt rx start client=%d topic_len=%d body_len=%d",
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
            ESP_LOGD(TRACKER_MQTT_TAG, "mqtt rx topic chunk expect=%d", s_rx_ctx.topic_chunk_remaining);
            return true;
        case MQTT_RX_PENDING_PAYLOAD_HEADER:
            if (!tracker_mqtt_parse_plain_int_list(line, values, 2) || !s_rx_ctx.active) {
                return false;
            }
            s_rx_ctx.payload_chunk_remaining = values[1];
            s_rx_pending_header = MQTT_RX_PENDING_NONE;
            ESP_LOGD(TRACKER_MQTT_TAG, "mqtt rx body chunk expect=%d", s_rx_ctx.payload_chunk_remaining);
            return true;
        case MQTT_RX_PENDING_NONE:
        default:
            return false;
    }
}

static void tracker_mqtt_dispatch_rx_if_complete(void) {
    // Route dispatch RX if complete to the right callback or helper while keeping ownership explicit.
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
                 "mqtt rx dropped incomplete frame topic_len=%u/%d body_len=%u/%d topic_trunc=%d body_trunc=%d",
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
                 "mqtt rx command topic_class=commands body_len=%u",
                 (unsigned)s_rx_ctx.payload_len);
        s_command_callback(s_rx_ctx.topic, s_rx_ctx.payload);
        return;
    }

    ESP_LOGI(TRACKER_MQTT_TAG,
             "mqtt rx ignored topic_len=%u body_len=%u",
             (unsigned)s_rx_ctx.topic_len,
             (unsigned)s_rx_ctx.payload_len);
}

static const char *tracker_mqtt_seek_urc_prefix(const char *cursor) {
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
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
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
    while (cursor != NULL && (*cursor == ' ' || *cursor == '\t')) {
        ++cursor;
    }
    return cursor;
}

static bool tracker_mqtt_consume_pending_rx_data(const char *cursor, const char **out_next_cursor) {
    // Consume the pending RX payload exactly once so multipart URC assembly cannot replay stale bytes.
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
    // Keep the branchy handle RX URC flow centralized here so side effects remain easy to audit.
    if (strncmp(cursor, "+CMQTTRXSTART:", strlen("+CMQTTRXSTART:")) == 0) {
        int values[3] = {0};
        if (tracker_mqtt_parse_int_list_from_text(cursor, "+CMQTTRXSTART:", values, 3)) {
            tracker_mqtt_rx_reset();
            s_rx_ctx.active = true;
            s_rx_ctx.client_index = values[0];
            s_rx_ctx.topic_total_len = values[1];
            s_rx_ctx.payload_total_len = values[2];
            ESP_LOGI(TRACKER_MQTT_TAG,
                     "mqtt rx start client=%d topic_len=%d body_len=%d",
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
            ESP_LOGD(TRACKER_MQTT_TAG, "mqtt rx topic chunk expect=%d", s_rx_ctx.topic_chunk_remaining);
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
            ESP_LOGD(TRACKER_MQTT_TAG, "mqtt rx body chunk expect=%d", s_rx_ctx.payload_chunk_remaining);
        } else if (s_rx_ctx.active) {
            s_rx_pending_header = MQTT_RX_PENDING_PAYLOAD_HEADER;
        }
        *out_next_cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
        return true;
    }

    if (strncmp(cursor, "+CMQTTRXEND:", strlen("+CMQTTRXEND:")) == 0) {
        ESP_LOGI(TRACKER_MQTT_TAG,
                 "mqtt rx end topic_len=%u body_len=%u",
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
    // Keep the branchy handle non RX URC flow centralized here so side effects remain easy to audit.
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
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
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
    // Keep the branchy register URC handler flow centralized here so side effects remain easy to audit.
    if (s_urc_registered) {
        return;
    }

    modem_at_register_urc("", tracker_mqtt_on_urc_line);
    s_urc_registered = true;
}
