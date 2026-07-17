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


/**
 * @brief Check if an MQTT error code implies the broker session is gone.
 *
 * Used to decide whether a failed AT command should flip cached state to
 * disconnected. Only the codes that mean "no usable link/session" qualify;
 * transient or operation-specific errors do not force a disconnect.
 *
 * @param err_code Error code reported by the modem MQTT layer.
 * @return true if the code means the session must be treated as disconnected.
 */
bool tracker_mqtt_err_indicates_disconnect(int err_code) {
    // Network/socket/session-loss codes: the existing connection can no longer be used.
    return err_code == MQTT_ERR_NETWORK_NOT_OPENED || err_code == MQTT_ERR_NO_CONNECTION ||
           err_code == MQTT_ERR_NOT_SUPPORTED_OPERATION || err_code == MQTT_ERR_SOCKET_CLOSED_BY_SERVER;
}

/**
 * @brief Force cached MQTT state to disconnected.
 *
 * Clears the connected flag and the command-subscription flag so the next
 * connect attempt re-runs subscription. Logs only on a real state transition
 * (when previously connected) to avoid noise on repeated failures.
 *
 * @param reason Short human-readable cause, used for diagnostics only.
 * @param err_code Modem error code that triggered the transition.
 * @note Subscription is cleared because a new broker session never preserves
 *       the previous subscription state.
 */
void tracker_mqtt_mark_disconnected(const char *reason, int err_code) {
    if (s_connected) {
        // Only log the first transition connected -> disconnected.
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "MQTT marked disconnected reason=%s err=%d",
                 reason != NULL ? reason : "unknown",
                 err_code);
    }
    s_connected = false;
    s_commands_subscribed = false; // re-subscribe required after any reconnect
}

/**
 * @brief Reset the inbound-message reassembly context to idle.
 *
 * Zeroes all accumulated topic/payload bytes and chunk counters so the next
 * +CMQTTRXSTART frame starts clean. Called at frame start, frame end, and on
 * any teardown to guarantee no stale bytes leak between messages.
 */
void tracker_mqtt_rx_reset(void) {
    memset(&s_rx_ctx, 0, sizeof(s_rx_ctx));
    s_rx_ctx.client_index = -1;          // -1 = no client bound yet (0 is a valid index)
    s_rx_pending_header = MQTT_RX_PENDING_NONE; // no split header outstanding
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
    ESP_RETURN_ON_FALSE(cursor != NULL, false, TRACKER_MQTT_TAG, "parse cursor null");
    ESP_RETURN_ON_FALSE(*cursor != NULL, false, TRACKER_MQTT_TAG, "parse cursor pointee null");
    ESP_RETURN_ON_FALSE(out_value != NULL, false, TRACKER_MQTT_TAG, "parse out_value null");

    // Skip separators that appear between AT response fields (": 1, 2" style).
    const char *p = *cursor;
    while (*p == ' ' || *p == '\t' || *p == ':' || *p == ',') {
        ++p;
    }

    char *end_ptr = NULL;
    long parsed = strtol(p, &end_ptr, 10);
    if (end_ptr == p) {
        return false; // no digits consumed: not an integer at this position
    }

    *out_value = (int)parsed;
    *cursor = end_ptr; // advance caller cursor past the parsed number
    return true;
}

/**
 * @brief Return a pointer to the last occurrence of @p needle in @p text.
 *
 * AT responses can echo a prefix more than once (e.g. command echo plus the
 * final result line). The most recent occurrence carries the authoritative
 * result, so callers parse from the last match rather than the first.
 *
 * @param text Haystack to scan (may be NULL).
 * @param needle Substring to locate (must be non-empty).
 * @return Pointer to the last match, or NULL when not found.
 */
static const char *tracker_mqtt_find_last(const char *text, const char *needle) {
    if (text == NULL || needle == NULL || needle[0] == '\0') {
        return NULL;
    }

    const char *cursor = text;
    const char *last = NULL;
    while ((cursor = strstr(cursor, needle)) != NULL) {
        last = cursor;                 // remember this hit
        cursor += strlen(needle);      // continue past it to find a later one
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
    ESP_RETURN_ON_FALSE(text != NULL, false, TRACKER_MQTT_TAG, "parse text null");
    ESP_RETURN_ON_FALSE(prefix != NULL, false, TRACKER_MQTT_TAG, "parse prefix null");
    ESP_RETURN_ON_FALSE(out_values != NULL, false, TRACKER_MQTT_TAG, "parse out_values null");
    ESP_RETURN_ON_FALSE(value_count > 0, false, TRACKER_MQTT_TAG, "parse value_count invalid");

    // Use the last prefix occurrence: it holds the final/authoritative values.
    const char *line = tracker_mqtt_find_last(text, prefix);
    if (line == NULL) {
        return false; // prefix never appeared
    }

    // Parse exactly value_count integers immediately following the prefix.
    const char *cursor = line + strlen(prefix);
    for (size_t i = 0; i < value_count; ++i) {
        if (!tracker_mqtt_parse_next_int(&cursor, &out_values[i])) {
            return false; // fewer integers than expected -> treat as failure
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
    ESP_RETURN_ON_FALSE(response != NULL, false, TRACKER_MQTT_TAG, "response null");
    ESP_RETURN_ON_FALSE(out_disc_state != NULL, false, TRACKER_MQTT_TAG, "out_disc_state null");

    const char *cursor = response;
    // A response may contain several +CMQTTDISC: lines; accept the first one
    // that belongs to our client index.
    while ((cursor = strstr(cursor, "+CMQTTDISC:")) != NULL) {
        const char *line_cursor = cursor + strlen("+CMQTTDISC:");
        int client_index = -1;
        int disc_state = -1;
        // Layout: +CMQTTDISC: <client_index>,<disc_state>
        if (tracker_mqtt_parse_next_int(&line_cursor, &client_index) &&
            tracker_mqtt_parse_next_int(&line_cursor, &disc_state) &&
            client_index == MQTT_CLIENT_INDEX) {
            *out_disc_state = disc_state; // 0 = still connected, non-zero = disconnected
            return true;
        }
        cursor += strlen("+CMQTTDISC:"); // advance to look for the next line
    }
    return false;
}

/**
 * @brief Decide whether a parsed error code is acceptable for a command.
 *
 * @param err_code Code extracted from the AT result line.
 * @param allowed_codes Optional whitelist of tolerable codes (e.g. "already
 *        started"). When NULL, only code 0 (success) is allowed.
 * @param allowed_count Number of entries in @p allowed_codes.
 * @return true if @p err_code is success or explicitly whitelisted.
 */
static bool tracker_mqtt_err_allowed(int err_code, const int *allowed_codes, size_t allowed_count) {
    if (allowed_codes == NULL) {
        return err_code == 0; // strict success-only when no whitelist given
    }

    for (size_t i = 0; i < allowed_count; ++i) {
        if (err_code == allowed_codes[i]) {
            return true; // benign/expected code (e.g. idempotent re-issue)
        }
    }
    return false;
}

/**
 * @brief Validate an AT result line against an expected prefix and codes.
 *
 * Locates @p prefix in @p response, parses either one integer (status only)
 * or two integers (client index + status) depending on @p has_client_index,
 * then checks the status against the allowed-code policy.
 *
 * @param response Raw modem response text.
 * @param prefix Result prefix to look for (e.g. "+CMQTTPUB:").
 * @param has_client_index true when the line begins with a client index field.
 * @param allowed_codes Optional whitelist of tolerable error codes.
 * @param allowed_count Number of entries in @p allowed_codes.
 * @param require_prefix When true, a missing prefix is a hard failure; when
 *        false, a missing prefix is treated as success (code 0).
 * @param out_err_code Optional out: the parsed status/error code.
 * @param out_parsed Optional out: whether the prefix was actually found.
 * @return ESP_OK if accepted, ESP_FAIL if rejected, ESP_ERR_INVALID_ARG on
 *         NULL input.
 */
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

    // Read 1 or 2 integers: [client_index,] status.
    int values[2] = {0};
    bool parsed = tracker_mqtt_parse_int_list_from_text(response, prefix, values, has_client_index ? 2U : 1U);
    if (out_parsed != NULL) {
        *out_parsed = parsed;
    }

    if (!parsed) {
        if (require_prefix) {
            // Caller demanded the prefix and it is absent: fail loudly.
            ESP_LOGW(TRACKER_MQTT_TAG,
                     "AT result missing prefix=%s response_len=%u",
                     prefix,
                     (unsigned)strlen(response));
            return ESP_FAIL;
        }
        // Prefix optional: absence is treated as benign success.
        if (out_err_code != NULL) {
            *out_err_code = 0;
        }
        return ESP_OK;
    }

    // Status is the second field when a client index precedes it, else the first.
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

/**
 * @brief Scan a response for any known CMQTT* result prefix and extract its code.
 *
 * When a command fails at the transport level the caller often still wants the
 * modem's MQTT error code (e.g. to detect a disconnect). This tries every
 * known result prefix and returns the first error code it can parse.
 *
 * @param response Raw modem response text.
 * @param out_err_code Out: the extracted error/status code.
 * @return true if any known prefix was found and parsed.
 */
bool tracker_mqtt_extract_error_code_from_response(const char *response, int *out_err_code) {
    if (response == NULL || out_err_code == NULL) {
        return false;
    }

    // Each CMQTT* result line is either "<status>" or "<client_index>,<status>".
    static const struct {
        const char *prefix;       // result keyword to search for
        bool has_client_index;    // true when a client index precedes the status
    } prefixes[] = {
        {"+CMQTTSTART:", false},   // service start
        {"+CMQTTSTOP:", false},    // service stop
        {"+CMQTTACCQ:", true},     // client acquire
        {"+CMQTTREL:", true},      // client release
        {"+CMQTTCONNECT:", true},  // broker connect
        {"+CMQTTDISC:", true},     // broker disconnect/state
        {"+CMQTTTOPIC:", true},    // topic staging
        {"+CMQTTPAYLOAD:", true},  // payload staging
        {"+CMQTTPUB:", true},      // publish
        {"+CMQTTSUB:", true},      // subscribe
    };

    for (size_t i = 0; i < ARRAY_SIZE(prefixes); ++i) {
        int values[2] = {0};
        if (tracker_mqtt_parse_int_list_from_text(response,
                                                  prefixes[i].prefix,
                                                  values,
                                                  prefixes[i].has_client_index ? 2U : 1U)) {
            // Pick the status field based on whether a client index was present.
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
 * @brief Record an asynchronous +CMQTTCONNECT result delivered via URC.
 *
 * Called from the URC parser when the modem reports connect completion out of
 * band. Ignored unless a connect wait is armed and the line targets our client
 * index, preventing stale or cross-client results from unblocking the waiter.
 *
 * @param client_index Client index field from the +CMQTTCONNECT line.
 * @param err_code Connect status code (0 = connected).
 */
void tracker_mqtt_on_connect_result_line(int client_index, int err_code) {
    // Drop results when no wait is armed or they belong to a different client.
    if (!s_connect_result_pending || client_index != MQTT_CLIENT_INDEX) {
        return;
    }

    s_connect_result_pending = false; // wait satisfied
    s_connect_result_ready = true;    // hand the code to the waiter
    s_connect_result_err = err_code;
}

/**
 * @brief Record an asynchronous +CMQTTPUB result delivered via URC.
 *
 * Mirror of the connect-result handler for the publish path: only accepts the
 * result when a publish wait is armed and the client index matches.
 *
 * @param client_index Client index field from the +CMQTTPUB line.
 * @param err_code Publish status code (0 = published).
 */
void tracker_mqtt_on_publish_result_line(int client_index, int err_code) {
    // Ignore results that arrive with no publish in flight or for another client.
    if (!s_publish_result_pending || client_index != MQTT_CLIENT_INDEX) {
        return;
    }

    s_publish_result_pending = false; // wait satisfied
    s_publish_result_ready = true;    // hand the code to the waiter
    s_publish_result_err = err_code;
}

/**
 * @brief Block until the armed connect result arrives or the timeout elapses.
 *
 * Polls the modem URC stream so an asynchronous +CMQTTCONNECT result is parsed
 * and surfaced. Checks the ready flag both before and after each poll so a
 * result captured during the drain is returned without an extra delay.
 *
 * @param out_err_code Out: connect status code when ESP_OK is returned.
 * @return ESP_OK if a result arrived, ESP_ERR_TIMEOUT after the deadline.
 */
esp_err_t tracker_mqtt_wait_connect_result(int *out_err_code) {
    ESP_RETURN_ON_NULL(out_err_code, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "out_err_code null");
    uint64_t start_ms = util_uptime_ms();

    while ((util_uptime_ms() - start_ms) < MQTT_CONNECT_TIMEOUT_MS) {
        if (s_connect_result_ready) { // result may already be present
            *out_err_code = s_connect_result_err;
            return ESP_OK;
        }
        (void)modem_at_poll_urc(MQTT_POLL_MAX_BYTES); // pull pending URC bytes
        if (s_connect_result_ready) { // re-check after the drain
            *out_err_code = s_connect_result_err;
            return ESP_OK;
        }
        vTaskDelay(pdMS_TO_TICKS(MQTT_CONNECT_RESULT_POLL_MS)); // yield, then poll again
    }
    return ESP_ERR_TIMEOUT;
}

/**
 * @brief Block until the armed publish result arrives or the timeout elapses.
 *
 * Publish counterpart to tracker_mqtt_wait_connect_result(): drives the URC
 * poll loop so a deferred +CMQTTPUB result is captured and returned.
 *
 * @param out_err_code Out: publish status code when ESP_OK is returned.
 * @return ESP_OK if a result arrived, ESP_ERR_TIMEOUT after the deadline.
 */
esp_err_t tracker_mqtt_wait_publish_result(int *out_err_code) {
    ESP_RETURN_ON_NULL(out_err_code, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "out_err_code null");
    uint64_t start_ms = util_uptime_ms();

    while ((util_uptime_ms() - start_ms) < MQTT_CONNECT_TIMEOUT_MS) {
        if (s_publish_result_ready) { // result may already be present
            *out_err_code = s_publish_result_err;
            return ESP_OK;
        }
        (void)modem_at_poll_urc(MQTT_POLL_MAX_BYTES); // pull pending URC bytes
        if (s_publish_result_ready) { // re-check after the drain
            *out_err_code = s_publish_result_err;
            return ESP_OK;
        }
        vTaskDelay(pdMS_TO_TICKS(MQTT_CONNECT_RESULT_POLL_MS)); // yield, then poll again
    }
    return ESP_ERR_TIMEOUT;
}

/**
 * @brief Run a two-step prompt-mode AT data entry and validate the result.
 *
 * Several CMQTT* commands (topic, payload, subscribe) first send a setup
 * command, wait for the modem's "> " prompt, then stream the raw bytes. This
 * helper performs that exchange and then checks the trailing result line.
 *
 * @param prepare_cmd Setup command that elicits the data-entry prompt.
 * @param data Null-terminated bytes streamed after the prompt.
 * @param result_prefix Result prefix expected after data entry (e.g. "+CMQTTTOPIC:").
 * @param has_client_index true when the result line carries a client index.
 * @return ESP_OK on accepted entry, ESP_FAIL on transport/result error,
 *         ESP_ERR_INVALID_ARG on NULL/empty input.
 * @note On transport failure the response is scanned for a disconnect code so
 *       cached state can be flipped before returning.
 */
esp_err_t tracker_mqtt_input_data(const char *prepare_cmd,
                                  const char *data,
                                  const char *result_prefix,
                                  bool has_client_index) {
    ESP_RETURN_ON_NULL(prepare_cmd, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "prepare_cmd null");
    ESP_RETURN_ON_NULL(data, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "data null");
    ESP_RETURN_ON_NULL(result_prefix, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "result_prefix null");
    ESP_RETURN_ON_FALSE(data[0] != '\0', ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "data empty");

    // Send setup command, await the modem prompt, then stream exactly strlen(data) bytes.
    char response[MQTT_AT_RESPONSE_MAX_LEN] = {0};
    esp_err_t err = modem_at_send_prompt_data(prepare_cmd,
                                              (const uint8_t *)data,
                                              strlen(data),
                                              response,
                                              sizeof(response),
                                              MQTT_INPUT_TIMEOUT_MS);
    if (err != ESP_OK) {
        // Transport-level failure: salvage any MQTT code so a dead session is detected.
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

    // Prefix is optional here: absence is tolerated, presence must carry an accepted code.
    return tracker_mqtt_expect_result(response, result_prefix, has_client_index, NULL, 0, false, NULL, NULL);
}

/**
 * @brief Append received topic bytes from one URC line into the RX context.
 *
 * The SIM7600 reports the topic of an inbound message as one or more chunks
 * inside the +CMQTTRXTOPIC sequence. This copies up to the remaining declared
 * chunk length into the bounded topic buffer and keeps the parser's notion of
 * how many topic bytes are still outstanding accurate.
 *
 * @param chunk Pointer to the topic bytes carried by the current line.
 * @param chunk_len Number of bytes available at @p chunk.
 * @return Number of bytes consumed from the modem stream (may exceed the bytes
 *         actually stored when the local buffer is full).
 * @note On overflow the data is still "consumed" so the parser stays aligned
 *       with the following URCs; the frame is dropped later via the truncation
 *       flag rather than corrupting the stream position.
 */
static size_t tracker_mqtt_append_topic_chunk(const char *chunk, size_t chunk_len) {
    // Nothing to do without bytes or without an outstanding topic chunk to fill.
    if (chunk == NULL || chunk_len == 0U || s_rx_ctx.topic_chunk_remaining <= 0) {
        return 0U;
    }

    /*
     * Consume the modem-reported chunk length even if our topic buffer fills.
     * The truncation flag makes dispatch drop the frame later, while the parser
     * stays aligned with the following payload/end URCs.
     */
    // consume_len = bytes claimed from the stream this call (never more than the chunk declares).
    size_t consume_len = (size_t)MIN_VALUE((int)chunk_len, s_rx_ctx.topic_chunk_remaining);
    // cap_remaining = free space left in the bounded buffer, reserving one byte for the terminator.
    size_t cap_remaining = sizeof(s_rx_ctx.topic) - 1U - s_rx_ctx.topic_len;
    // copy_len = bytes actually stored; may be less than consume_len when the buffer is full.
    size_t copy_len = MIN_VALUE(consume_len, cap_remaining);
    if (copy_len > 0) {
        memcpy(&s_rx_ctx.topic[s_rx_ctx.topic_len], chunk, copy_len);
        s_rx_ctx.topic_len += copy_len;
        s_rx_ctx.topic[s_rx_ctx.topic_len] = '\0'; // keep buffer null-terminated for later strcmp()
    }
    if (copy_len < consume_len) {
        // Buffer overflowed: flag the frame so dispatch rejects it instead of acting on a partial topic.
        s_rx_ctx.topic_truncated = true;
        ESP_LOGW(TRACKER_MQTT_TAG, "MQTT RX topic truncated chunk=%u", (unsigned)consume_len);
    }

    s_rx_ctx.topic_chunk_remaining -= (int)consume_len; // shrink the outstanding-byte counter
    return consume_len;
}

/**
 * @brief Append received payload bytes from one URC line into the RX context.
 *
 * Payload counterpart to tracker_mqtt_append_topic_chunk(): accumulates the
 * +CMQTTRXPAYLOAD body bytes into the bounded command-payload buffer.
 *
 * @param chunk Pointer to the payload bytes carried by the current line.
 * @param chunk_len Number of bytes available at @p chunk.
 * @return Number of bytes consumed from the modem stream.
 * @note Inbound command payloads must be complete JSON, so an overflow marks
 *       the frame truncated and dispatch later discards it.
 */
static size_t tracker_mqtt_append_payload_chunk(const char *chunk, size_t chunk_len) {
    // Nothing to do without bytes or without an outstanding payload chunk to fill.
    if (chunk == NULL || chunk_len == 0U || s_rx_ctx.payload_chunk_remaining <= 0) {
        return 0U;
    }

    /*
     * Command payloads must be complete JSON. Keep consuming modem bytes after
     * local truncation so the next URC starts cleanly, then reject dispatch.
     */
    // consume_len = bytes claimed from the stream this call (capped by the declared chunk size).
    size_t consume_len = (size_t)MIN_VALUE((int)chunk_len, s_rx_ctx.payload_chunk_remaining);
    // cap_remaining = free space left in the payload buffer, reserving one byte for the terminator.
    size_t cap_remaining = sizeof(s_rx_ctx.payload) - 1U - s_rx_ctx.payload_len;
    // copy_len = bytes actually stored; less than consume_len once the buffer is full.
    size_t copy_len = MIN_VALUE(consume_len, cap_remaining);
    if (copy_len > 0) {
        memcpy(&s_rx_ctx.payload[s_rx_ctx.payload_len], chunk, copy_len);
        s_rx_ctx.payload_len += copy_len;
        s_rx_ctx.payload[s_rx_ctx.payload_len] = '\0'; // keep payload null-terminated for the callback
    }
    if (copy_len < consume_len) {
        // Body exceeded local capacity: mark truncated so the partial JSON command is never dispatched.
        s_rx_ctx.payload_truncated = true;
        ESP_LOGW(TRACKER_MQTT_TAG, "mqtt rx body truncated chunk=%u", (unsigned)consume_len);
    }

    s_rx_ctx.payload_chunk_remaining -= (int)consume_len; // shrink the outstanding-byte counter
    return consume_len;
}

/**
 * @brief Parse a bare comma/space separated integer list (no prefix).
 *
 * Used when a URC's numeric header arrives on its own line, detached from the
 * keyword. The keyword handler has already recorded which header is expected,
 * so here the line is treated as a plain list of integers.
 *
 * @param text Line text containing only the integer fields.
 * @param out_values Output array receiving the parsed values.
 * @param value_count Exact number of integers required.
 * @return true when all @p value_count integers were parsed, false otherwise.
 */
static bool tracker_mqtt_parse_plain_int_list(const char *text, int *out_values, size_t value_count) {
    ESP_RETURN_ON_FALSE(text != NULL, false, TRACKER_MQTT_TAG, "plain parse text null");
    ESP_RETURN_ON_FALSE(out_values != NULL, false, TRACKER_MQTT_TAG, "plain parse out_values null");
    ESP_RETURN_ON_FALSE(value_count > 0, false, TRACKER_MQTT_TAG, "plain parse value_count invalid");

    // Walk the line pulling one integer at a time; bail out if any field is missing.
    const char *cursor = text;
    for (size_t i = 0; i < value_count; ++i) {
        if (!tracker_mqtt_parse_next_int(&cursor, &out_values[i])) {
            return false;
        }
    }
    return true;
}

/**
 * @brief Consume an RX header whose integers arrived on a separate line.
 *
 * Some SIM7600 firmware emits a RX URC keyword (+CMQTTRXSTART/TOPIC/PAYLOAD)
 * and its numeric fields on different lines. When the keyword handler could not
 * parse the fields inline it records the expected header type; this is then
 * called on the following line to apply those integers to the RX context.
 *
 * @param line The numeric-only line that follows a split URC keyword.
 * @return true if the line was interpreted as the pending header, false if no
 *         header was pending or the line did not parse.
 */
static bool tracker_mqtt_try_consume_pending_header(const char *line) {
    // Only relevant when a previous keyword left a header outstanding.
    if (line == NULL || line[0] == '\0' || s_rx_pending_header == MQTT_RX_PENDING_NONE) {
        return false;
    }

    int values[3] = {0};
    switch (s_rx_pending_header) {
        case MQTT_RX_PENDING_START_HEADER:
            // Start header carries: client_index, topic_total_len, payload_total_len.
            if (!tracker_mqtt_parse_plain_int_list(line, values, 3)) {
                return false;
            }
            tracker_mqtt_rx_reset(); // begin a clean frame before recording its declared lengths
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
            // Topic header carries: client_index, chunk_len. Ignore if no frame is active.
            if (!tracker_mqtt_parse_plain_int_list(line, values, 2) || !s_rx_ctx.active) {
                return false;
            }
            s_rx_ctx.topic_chunk_remaining = values[1]; // bytes of topic to expect next
            s_rx_pending_header = MQTT_RX_PENDING_NONE;
            ESP_LOGD(TRACKER_MQTT_TAG, "mqtt rx topic chunk expect=%d", s_rx_ctx.topic_chunk_remaining);
            return true;
        case MQTT_RX_PENDING_PAYLOAD_HEADER:
            // Payload header carries: client_index, chunk_len. Ignore if no frame is active.
            if (!tracker_mqtt_parse_plain_int_list(line, values, 2) || !s_rx_ctx.active) {
                return false;
            }
            s_rx_ctx.payload_chunk_remaining = values[1]; // bytes of payload to expect next
            s_rx_pending_header = MQTT_RX_PENDING_NONE;
            ESP_LOGD(TRACKER_MQTT_TAG, "mqtt rx body chunk expect=%d", s_rx_ctx.payload_chunk_remaining);
            return true;
        case MQTT_RX_PENDING_NONE:
        default:
            return false;
    }
}

/**
 * @brief Deliver a fully reassembled inbound message, or drop a partial one.
 *
 * Invoked on +CMQTTRXEND. Verifies that the accumulated topic and payload
 * lengths exactly match the totals declared in the RX start header and that no
 * truncation occurred. Only a complete, untruncated frame addressed to this
 * device's command topic is handed to the registered command callback; every
 * other case is logged and discarded so partial JSON never reaches handlers.
 */
static void tracker_mqtt_dispatch_rx_if_complete(void) {
    // Nothing to deliver unless a frame is active and both parts have bytes.
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
    // Any truncation or length mismatch invalidates the whole frame.
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

    // Only messages on this device's command topic are routed to the callback.
    if (s_command_callback != NULL && strcmp(s_rx_ctx.topic, s_topic_commands) == 0) {
        ESP_LOGI(TRACKER_MQTT_TAG,
                 "mqtt rx command topic_class=commands body_len=%u",
                 (unsigned)s_rx_ctx.payload_len);
        s_command_callback(s_rx_ctx.topic, s_rx_ctx.payload);
        return;
    }

    // Well-formed but on a topic we do not act on: log and ignore.
    ESP_LOGI(TRACKER_MQTT_TAG,
             "mqtt rx ignored topic_len=%u body_len=%u",
             (unsigned)s_rx_ctx.topic_len,
             (unsigned)s_rx_ctx.payload_len);
}

/**
 * @brief Advance @p cursor to the next URC token start ('+').
 *
 * A single modem read can contain several concatenated URCs. After handling
 * one, the parser scans forward to the next '+' so the remaining URCs on the
 * same line are still processed.
 *
 * @param cursor Current scan position (may be NULL).
 * @return Pointer to the next '+' (leading whitespace skipped), or NULL.
 */
static const char *tracker_mqtt_seek_urc_prefix(const char *cursor) {
    if (cursor == NULL) {
        return NULL;
    }
    // Skip leading spacing so an indented URC is still recognized.
    while (*cursor == ' ' || *cursor == '\t') {
        ++cursor;
    }
    if (*cursor == '+') {
        return cursor; // already at a URC token
    }
    return strchr(cursor, '+'); // otherwise jump to the next one, if any
}

/**
 * @brief Skip spaces/tabs between concatenated RX data fields.
 *
 * @param cursor Current position (may be NULL).
 * @return First non-whitespace position, or the original NULL.
 */
static const char *tracker_mqtt_skip_inline_whitespace(const char *cursor) {
    while (cursor != NULL && (*cursor == ' ' || *cursor == '\t')) {
        ++cursor;
    }
    return cursor;
}

/**
 * @brief Feed raw RX bytes into the topic/payload buffers, or apply a header.
 *
 * When the modem is mid-frame the bytes following a chunk header are the actual
 * topic or payload data rather than another URC. This routes such bytes to the
 * matching accumulator, or applies a split header line if one is pending.
 *
 * @param cursor Bytes at the current scan position.
 * @param out_next_cursor Out: where scanning should resume, or NULL when the
 *        line is exhausted by this consumption.
 * @return true if the bytes were consumed as RX data/header, false if @p cursor
 *         should instead be treated as a new URC keyword.
 */
static bool tracker_mqtt_consume_pending_rx_data(const char *cursor, const char **out_next_cursor) {
    // Topic bytes take priority while a topic chunk is still outstanding.
    if (s_rx_ctx.topic_chunk_remaining > 0) {
        size_t consumed = tracker_mqtt_append_topic_chunk(cursor, strlen(cursor));
        if (consumed == 0U || cursor[consumed] == '\0') {
            *out_next_cursor = NULL; // line fully consumed (or stalled)
        } else {
            *out_next_cursor = tracker_mqtt_skip_inline_whitespace(cursor + consumed);
        }
        return true;
    }

    // Then payload bytes while a payload chunk is outstanding.
    if (s_rx_ctx.payload_chunk_remaining > 0) {
        size_t consumed = tracker_mqtt_append_payload_chunk(cursor, strlen(cursor));
        if (consumed == 0U || cursor[consumed] == '\0') {
            *out_next_cursor = NULL; // line fully consumed (or stalled)
        } else {
            *out_next_cursor = tracker_mqtt_skip_inline_whitespace(cursor + consumed);
        }
        return true;
    }

    // No data outstanding: maybe this line is a header for a split URC keyword.
    if (tracker_mqtt_try_consume_pending_header(cursor)) {
        *out_next_cursor = cursor; // header applied in place; re-scan from here
        return true;
    }

    return false; // treat cursor as a fresh URC token instead
}

/**
 * @brief Handle the inbound-message URC family (+CMQTTRX*).
 *
 * Recognizes the four-stage receive sequence the SIM7600 uses to deliver a
 * subscribed message: RXSTART (declares total topic/payload lengths) ->
 * RXTOPIC (per-chunk topic length) -> RXPAYLOAD (per-chunk payload length) ->
 * RXEND (frame complete). When the numeric header is absent on the keyword
 * line, a pending-header state is armed so the following line supplies it.
 *
 * @param cursor Scan position aligned on a '+' URC token.
 * @param out_next_cursor Out: next URC token to process on this line.
 * @return true if @p cursor matched an RX URC keyword.
 */
static bool tracker_mqtt_handle_rx_urc(const char *cursor, const char **out_next_cursor) {
    // Frame start: reset reassembly and record declared topic/payload totals.
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
            // Header integers are on the next line; wait for them.
            s_rx_pending_header = MQTT_RX_PENDING_START_HEADER;
        }
        *out_next_cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
        return true;
    }

    // Topic chunk header: how many topic bytes follow next.
    if (strncmp(cursor, "+CMQTTRXTOPIC:", strlen("+CMQTTRXTOPIC:")) == 0) {
        int values[2] = {0};
        if (tracker_mqtt_parse_int_list_from_text(cursor, "+CMQTTRXTOPIC:", values, 2) && s_rx_ctx.active) {
            s_rx_ctx.topic_chunk_remaining = values[1];
            ESP_LOGD(TRACKER_MQTT_TAG, "mqtt rx topic chunk expect=%d", s_rx_ctx.topic_chunk_remaining);
        } else if (s_rx_ctx.active) {
            s_rx_pending_header = MQTT_RX_PENDING_TOPIC_HEADER; // chunk length on next line
        }
        *out_next_cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
        return true;
    }

    // Payload chunk header: how many payload bytes follow next.
    if (strncmp(cursor, "+CMQTTRXPAYLOAD:", strlen("+CMQTTRXPAYLOAD:")) == 0) {
        int values[2] = {0};
        if (tracker_mqtt_parse_int_list_from_text(cursor, "+CMQTTRXPAYLOAD:", values, 2) && s_rx_ctx.active) {
            s_rx_ctx.payload_chunk_remaining = values[1];
            ESP_LOGD(TRACKER_MQTT_TAG, "mqtt rx body chunk expect=%d", s_rx_ctx.payload_chunk_remaining);
        } else if (s_rx_ctx.active) {
            s_rx_pending_header = MQTT_RX_PENDING_PAYLOAD_HEADER; // chunk length on next line
        }
        *out_next_cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
        return true;
    }

    // Frame end: attempt dispatch then wipe the context for the next message.
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

/**
 * @brief Handle non-receive MQTT URCs (connect/subscribe/publish/link-loss).
 *
 * Surfaces asynchronous results and link-state notifications the modem emits
 * outside the RX frame sequence:
 *   - +CMQTTCONNECT / +CMQTTPUB: deferred connect/publish completion codes,
 *     forwarded to the result-wait state machine.
 *   - +CMQTTSUB: subscription acknowledgement; flips the subscribed flag on
 *     success (code 0) for this client index.
 *   - +CMQTTCONNLOST / +CMQTTPING / +CMQTTNONET: broker/link loss, which forces
 *     cached state to disconnected.
 *
 * @param cursor Scan position aligned on a '+' URC token.
 * @param out_next_cursor Out: next URC token to process on this line.
 * @return true if @p cursor matched a non-RX URC keyword.
 */
static bool tracker_mqtt_handle_non_rx_urc(const char *cursor, const char **out_next_cursor) {
    // Asynchronous connect completion: layout is <client_index>,<status>.
    if (strncmp(cursor, "+CMQTTCONNECT:", strlen("+CMQTTCONNECT:")) == 0) {
        int values[2] = {0};
        if (tracker_mqtt_parse_int_list_from_text(cursor, "+CMQTTCONNECT:", values, 2)) {
            tracker_mqtt_on_connect_result_line(values[0], values[1]);
        }
        *out_next_cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
        return true;
    }

    // Subscribe result: mark commands subscribed only on success for our client.
    if (strncmp(cursor, "+CMQTTSUB:", strlen("+CMQTTSUB:")) == 0) {
        int values[2] = {0};
        if (tracker_mqtt_parse_int_list_from_text(cursor, "+CMQTTSUB:", values, 2) &&
            values[0] == MQTT_CLIENT_INDEX) {
            if (values[1] == 0) {
                s_commands_subscribed = true; // SUBACK accepted
            }
            ESP_LOGI(TRACKER_MQTT_TAG, "MQTT subscribe URC client=%d err=%d", values[0], values[1]);
        }
        *out_next_cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
        return true;
    }

    // Asynchronous publish completion: layout is <client_index>,<status>.
    if (strncmp(cursor, "+CMQTTPUB:", strlen("+CMQTTPUB:")) == 0) {
        int values[2] = {0};
        if (tracker_mqtt_parse_int_list_from_text(cursor, "+CMQTTPUB:", values, 2)) {
            tracker_mqtt_on_publish_result_line(values[0], values[1]);
        }
        *out_next_cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
        return true;
    }

    // Link/broker loss notifications: connection is no longer usable.
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

/**
 * @brief Parse a single URC line received from the modem layer.
 *
 * Entry point registered with the modem AT layer. A single physical line can
 * carry several concatenated URC tokens plus interleaved raw RX bytes, so this
 * walks the line left to right:
 *   1. First drain any pending RX data/header continuation for an in-progress
 *      receive frame (raw topic/payload bytes are not '+'-prefixed).
 *   2. Otherwise advance to the next '+' URC token and dispatch it to the RX
 *      or non-RX handler.
 *   3. If nothing matched, skip past the current '+' to avoid an infinite loop.
 *
 * @param line Null-terminated URC line (may contain multiple tokens).
 */
void tracker_mqtt_on_urc_line(const char *line) {
    if (line == NULL || line[0] == '\0') {
        return;
    }

    const char *cursor = line;
    while (cursor != NULL && cursor[0] != '\0') {
        const char *next_cursor = NULL;
        // Raw RX bytes (topic/payload continuation) take priority over token scan.
        if (tracker_mqtt_consume_pending_rx_data(cursor, &next_cursor)) {
            if (next_cursor == NULL) {
                return; // line fully consumed by the RX chunk
            }
            cursor = next_cursor;
            continue;
        }

        // Move to the next URC keyword; nothing left means we are done.
        cursor = tracker_mqtt_seek_urc_prefix(cursor);
        if (cursor == NULL || cursor[0] == '\0') {
            return;
        }
        if (tracker_mqtt_handle_rx_urc(cursor, &next_cursor) ||
            tracker_mqtt_handle_non_rx_urc(cursor, &next_cursor)) {
            cursor = next_cursor;
            continue;
        }

        // Unknown '+' token: step past it so the scan keeps making progress.
        cursor = tracker_mqtt_seek_urc_prefix(cursor + 1);
    }
}

/**
 * @brief Register the URC line handler with the modem AT layer (idempotent).
 *
 * Hooks tracker_mqtt_on_urc_line() so every unsolicited modem line is routed
 * through the MQTT parser. An empty prefix subscribes to all URC lines. The
 * guard flag ensures the handler is registered exactly once per boot.
 */
void tracker_mqtt_register_urc_handler(void) {
    if (s_urc_registered) {
        return; // already hooked; avoid duplicate registration
    }

    modem_at_register_urc("", tracker_mqtt_on_urc_line); // "" = match every URC line
    s_urc_registered = true;
}
