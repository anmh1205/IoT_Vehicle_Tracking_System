#include "ota_executor_internal.h"

#include <ctype.h>
#include <stdio.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "modem_at.h"

/**
 * @file util_ota_http.c
 * @brief SIM7600 HTTP transport helpers for OTA download flow.
 * This translation unit belongs to the OTA domain layer and keeps domain rules, staging helpers, and policy decisions separate from transport and board adapters.
 */


#ifndef CONFIG_TRACKER_TLS_VERIFY_SERVER
#define CONFIG_TRACKER_TLS_VERIFY_SERVER 0
#endif
#ifndef CONFIG_TRACKER_TLS_IGNORE_LOCAL_TIME
#define CONFIG_TRACKER_TLS_IGNORE_LOCAL_TIME 0
#endif
#ifndef CONFIG_TRACKER_TLS_CA_CERT_NAME
#define CONFIG_TRACKER_TLS_CA_CERT_NAME ""
#endif

/* OTA HTTP action state for tracking in-flight requests. */
ota_http_action_state_t s_ota_http_action = {0};
/* Flag indicating HTTP URC handler has been registered. */
bool s_ota_http_urc_registered = false;

/**
 * @brief Configure HTTPS CA certificate for modem OTA HTTP requests.
 *
 * Configures the SIM7600 modem's SSL context for OTA HTTP/HTTPS transfers.
 * This ensures OTA downloads use the same TLS verification settings as MQTT
 * to avoid split trust (different CA stores for telemetry vs firmware).
 *
 * Workflow:
 * 1. If CONFIG_TRACKER_TLS_VERIFY_SERVER is enabled:
 *    - Validate CA certificate name is configured (non-empty)
 *    - Build AT+CSSLCFG command to register CA cert for OTA SSL context
 *    - Send command to modem and verify "OK" response
 * 2. If TLS verification disabled: log warning and skip configuration
 *
 * @param[out] cmd Buffer to build AT command string into.
 * @param cmd_size Size of command buffer.
 * @return ESP_OK if configuration successful or skipped, ESP_ERR_* on failure.
 */
static esp_err_t util_ota_configure_https_ca_cert(char *cmd, size_t cmd_size) {
#if CONFIG_TRACKER_TLS_VERIFY_SERVER
    /*
     * HTTP OTA uses the modem SSL context, so CA verification depends on a file
     * already present in the SIM7600 certificate store. Keep this aligned with
     * MQTT TLS to avoid split trust behavior between telemetry and OTA.
     */
    if (util_string_empty(CONFIG_TRACKER_TLS_CA_CERT_NAME)) {
        ESP_LOGE(UTIL_TAG, "TLS verify enabled but CA certificate name is empty");
        return ESP_ERR_INVALID_STATE;
    }

    int n = snprintf(cmd,
                     cmd_size,
                     "AT+CSSLCFG=\"cacert\",%d,\"%s\"\r",
                     OTA_HTTP_SSL_CTX_INDEX,
                     CONFIG_TRACKER_TLS_CA_CERT_NAME);
    ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < cmd_size,
                        ESP_ERR_INVALID_SIZE,
                        UTIL_TAG,
                        "HTTP CSSLCFG cacert cmd too long");
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        UTIL_TAG,
                        "HTTP CSSLCFG cacert failed");
#else
    (void)cmd;
    (void)cmd_size;
    ESP_LOGW(UTIL_TAG, "TLS server certificate verification disabled by Kconfig");
#endif
return ESP_OK;
}

/**
 * @brief Convert SIM7600 HTTP transport error code to human-readable string.
 *
 * Maps numeric HTTPACTION result codes from SIM7600 modem to descriptive names.
 * Used for logging and diagnostic purposes to understand OTA transfer failures.
 *
 * Error code mapping:
 * - 701: alert_state (SSL alert received)
 * - 702: unknown_error (generic transport failure)
 * - 703: connect_error (connection to server failed)
 * - 704: timeout (server did not respond in time)
 * - 705: send_error (failed to send request)
 * - 706: receive_error (incomplete response from server)
 *
 * @param status_code Numeric HTTP transport status code from modem.
 * @return const char* Human-readable error name, "unknown" for unmapped codes.
 */
static const char *util_ota_http_transport_error_name(int status_code) {
    switch (status_code) {
        case 701:
            return "alert_state";
        case 702:
            return "unknown_error";
        case 703:
            return "busy";
        case 704:
            return "connection_closed";
        case 705:
            return "timeout";
        case 706:
            return "socket_io_failed";
        case 707:
            return "file_or_memory_error";
        case 708:
            return "invalid_parameter";
        case 709:
            return "network_error";
        case 710:
            return "ssl_session_start_failed";
        case 711:
            return "wrong_state";
        case 712:
            return "socket_create_failed";
        case 713:
            return "dns_failed";
        case 714:
            return "socket_connect_failed";
        case 715:
            return "tls_handshake_failed";
        case 716:
            return "socket_close_failed";
        case 717:
            return "no_network";
        case 718:
            return "send_timeout";
        case 719:
            return "ca_missing";
        default:
            return "n/a";
    }
}

/**
 * @brief Reset HTTP action state.
 *
 * Clears the latched +HTTPACTION result so a new request starts from a clean
 * slate. Sentinels of -1 mark "no value yet" for method/status/length.
 */
void util_ota_http_action_reset(void) {
    s_ota_http_action.waiting = false;     // Not yet armed for a response.
    s_ota_http_action.ready = false;       // No result latched.
    s_ota_http_action.method = -1;         // Unknown HTTP method.
    s_ota_http_action.status_code = -1;    // Unknown status code.
    s_ota_http_action.data_len = -1;       // Unknown body length.
}

/**
 * @brief Parse a single "+HTTPACTION: method,status,len" URC line.
 *
 * Accepts both the spaced and unspaced modem formats. All three numeric fields
 * must be present for the line to be considered valid.
 *
 * @param[in] line Raw URC text line.
 * @param[out] out_method Parsed HTTP method id (0 == GET).
 * @param[out] out_status_code Parsed HTTP/transport status code.
 * @param[out] out_data_len Parsed response body length.
 * @return true when all three fields parsed, false otherwise.
 */
static bool util_ota_parse_httpaction_urc_line(const char *line,
                                               int *out_method,
                                               int *out_status_code,
                                               int *out_data_len) {
    if (line == NULL || out_method == NULL || out_status_code == NULL || out_data_len == NULL) {
        return false;
    }

    int method = -1;
    int status_code = -1;
    int data_len = -1;
    // Try the spaced format first, then fall back to the compact (no-space) variant.
    int parsed = sscanf(line, "+HTTPACTION: %d,%d,%d", &method, &status_code, &data_len);
    if (parsed != 3) {
        parsed = sscanf(line, "+HTTPACTION:%d,%d,%d", &method, &status_code, &data_len);
    }
    if (parsed != 3) {
        return false; // Not a complete HTTPACTION result line.
    }

    *out_method = method;
    *out_status_code = status_code;
    *out_data_len = data_len;
    return true;
}

/**
 * @brief URC callback that latches the asynchronous +HTTPACTION result.
 *
 * Invoked from the modem RX path for every matching URC. It only records a
 * result while a request is actively waiting, then sets `ready` so the polling
 * waiter can pick it up.
 *
 * @param[in] line Raw URC line delivered by the modem driver.
 */
static void util_ota_httpaction_urc_cb(const char *line) {
    if (!s_ota_http_action.waiting || line == NULL) {
        return; // Ignore stray URCs when no request is in flight.
    }

    int method = -1;
    int status_code = -1;
    int data_len = -1;
    if (!util_ota_parse_httpaction_urc_line(line, &method, &status_code, &data_len)) {
        return; // Not the line we are waiting for.
    }

    // Latch the result and flag it ready for the blocking waiter to consume.
    s_ota_http_action.method = method;
    s_ota_http_action.status_code = status_code;
    s_ota_http_action.data_len = data_len;
    s_ota_http_action.ready = true;
}

/**
 * @brief Register the +HTTPACTION URC callback exactly once per boot.
 *
 * The SIM7600 reports HTTP transfer completion asynchronously, so the URC
 * handler must be installed before any AT+HTTPACTION request. Registration is
 * idempotent: the guard flag prevents stacking duplicate handlers across
 * repeated OTA attempts within the same session.
 *
 * @note Safe to call on every OTA run; only the first call installs the URC.
 */
void util_ota_http_register_urc_once(void) {
    if (s_ota_http_urc_registered) {
        return; // Handler already installed; avoid duplicate registrations.
    }

    modem_at_register_urc("+HTTPACTION:", util_ota_httpaction_urc_cb);
    s_ota_http_urc_registered = true;
}

/**
 * @brief Block until the asynchronous +HTTPACTION result arrives or time out.
 *
 * Polls the modem RX path so the URC handler can latch the transfer outcome,
 * then hands back the status code and body length. The waiter is disarmed on
 * both success and timeout so a late/stray URC from this request is ignored by
 * a subsequent transfer.
 *
 * @param[out] out_status_code Receives the HTTP status (or a 7xx transport error).
 * @param[out] out_data_len Receives the response body length reported by the modem.
 * @param[in] timeout_ms Maximum time to wait for the result, in milliseconds.
 * @return ESP_OK when a result was latched, ESP_ERR_TIMEOUT on deadline,
 *         ESP_ERR_INVALID_ARG when an output pointer is NULL.
 */
esp_err_t util_ota_wait_http_action(int *out_status_code, int *out_data_len, uint32_t timeout_ms) {
    ESP_RETURN_ON_NULL(out_status_code, ESP_ERR_INVALID_ARG, UTIL_TAG, "out_status_code is NULL");
    ESP_RETURN_ON_NULL(out_data_len, ESP_ERR_INVALID_ARG, UTIL_TAG, "out_data_len is NULL");

    // Poll the URC pump until the result is latched or the deadline passes.
    uint64_t deadline_ms = util_uptime_ms() + (uint64_t)timeout_ms;
    while (util_uptime_ms() < deadline_ms) {
        if (s_ota_http_action.ready) {
            // Result arrived: hand it back and disarm so late URCs are ignored.
            *out_status_code = s_ota_http_action.status_code;
            *out_data_len = s_ota_http_action.data_len;
            s_ota_http_action.waiting = false;
            return ESP_OK;
        }

        // Drain modem RX so the +HTTPACTION URC can be parsed, then back off briefly.
        (void)modem_at_poll_urc(OTA_HTTP_URC_POLL_BYTES);
        vTaskDelay(pdMS_TO_TICKS(OTA_HTTP_URC_POLL_INTERVAL_MS));
    }

    // Timed out waiting for the transfer result; disarm to avoid a stale match later.
    s_ota_http_action.waiting = false;
    return ESP_ERR_TIMEOUT;
}

/**
 * @brief Extract the binary payload span out of a raw +HTTPREAD response.
 *
 * The modem frames each ranged read as `+HTTPREAD: [DATA,]<len>\r\n<bytes>`.
 * This locates the header anywhere in the buffer, parses the declared length
 * (rejecting overflow or sizes that exceed the buffer), skips to the byte after
 * the header newline, and returns a pointer/length into the original buffer.
 * No copy is made; the caller must not free @p out_data separately.
 *
 * @param[in] response Raw modem response buffer (header + framed payload).
 * @param[in] response_len Number of valid bytes in @p response.
 * @param[out] out_data Receives a pointer to the first payload byte inside @p response.
 * @param[out] out_len Receives the declared payload length in bytes.
 * @return true when a complete, in-bounds payload was located, false otherwise.
 */
bool util_ota_parse_httpread_payload(const uint8_t *response,
                                     size_t response_len,
                                     const uint8_t **out_data,
                                     size_t *out_len) {
    if (response == NULL || response_len == 0U || out_data == NULL || out_len == NULL) {
        return false;
    }

    // Step 1: locate the "+HTTPREAD:" header anywhere inside the response buffer.
    const char *prefix = "+HTTPREAD:";
    size_t prefix_len = strlen(prefix);
    size_t header_pos = SIZE_MAX;
    for (size_t i = 0U; i + prefix_len <= response_len; ++i) {
        if (memcmp(response + i, prefix, prefix_len) == 0) {
            header_pos = i;
            break;
        }
    }
    if (header_pos == SIZE_MAX) {
        return false; // No HTTPREAD framing present.
    }

    // Step 2: skip optional whitespace and an optional "DATA," token after the header.
    size_t cursor = header_pos + prefix_len;
    while (cursor < response_len && (response[cursor] == ' ' || response[cursor] == '\t')) {
        ++cursor;
    }
    if (cursor + strlen("DATA,") <= response_len &&
        memcmp(response + cursor, "DATA,", strlen("DATA,")) == 0) {
        cursor += strlen("DATA,");
    }
    if (cursor >= response_len || !isdigit((unsigned char)response[cursor])) {
        return false; // Expected a numeric declared-length field here.
    }

    // Step 3: parse the declared payload length, rejecting overflow or impossible sizes.
    size_t declared_len = 0U;
    while (cursor < response_len && isdigit((unsigned char)response[cursor])) {
        size_t next = (declared_len * 10U) + (size_t)(response[cursor] - '0');
        if (next < declared_len || next > response_len) {
            /* Overflow or impossibly large length — reject. */
            return false;
        }
        declared_len = next;
        ++cursor;
    }
    if (declared_len == 0U) {
        return false; // A zero-length payload carries no data.
    }

    // Step 4: advance to the end of the header line; the binary payload starts after the newline.
    while (cursor < response_len && response[cursor] != '\n') {
        ++cursor;
    }
    if (cursor >= response_len) {
        return false; // Header line was never terminated.
    }

    // Step 5: ensure the declared payload actually fits inside the received buffer.
    size_t data_offset = cursor + 1U;
    if (data_offset + declared_len > response_len) {
        return false; // Truncated payload.
    }

    *out_data = response + data_offset; // Point at the first payload byte.
    *out_len = declared_len;            // Report the exact declared length.
    return true;
}

/**
 * @brief Probe whether a chunk is ASCII-hex encoded rather than raw binary.
 *
 * Some SIM7600 firmware returns the HTTP body as an ASCII hex string instead of
 * raw bytes. A hex stream must be non-empty, have an even length (two chars per
 * byte), and contain only hexadecimal digits. A single non-hex byte means the
 * transport is raw binary and the image can be written without decoding.
 *
 * @param[in] data Chunk bytes to inspect.
 * @param[in] len Number of bytes in @p data.
 * @return true when every byte is a hex digit (treat as hex transport), else false.
 */
bool util_is_hex_ascii_bytes(const uint8_t *data, size_t len) {
    // Hex-encoded payloads must be non-empty and have an even length (2 chars per byte).
    if (data == NULL || len == 0U || (len % 2U) != 0U) {
        return false;
    }

    // A single non-hex character means the stream is raw binary, not ASCII hex.
    for (size_t i = 0; i < len; ++i) {
        if (!isxdigit((unsigned char)data[i])) {
            return false;
        }
    }

    return true;
}

/**
 * @brief Program the modem SSL context used for OTA HTTPS downloads.
 *
 * Configures the dedicated OTA SSL context slot end to end: pins a modern TLS
 * version, applies the build-time server-verification auth mode, loads the CA
 * certificate (when verification is enabled), sets the local-time and
 * negotiation policies, enables SNI for shared-hostname firmware CDNs, and
 * finally binds the prepared context to the modem HTTP client profile. Each
 * AT+CSSLCFG step is checked so a misconfigured context fails fast before the
 * download starts.
 *
 * @return ESP_OK when every SSL/HTTP parameter was accepted, else ESP_FAIL.
 */
esp_err_t util_ota_configure_https_ssl_context(void) {
    char cmd[96] = {0};

    int n = snprintf(cmd, sizeof(cmd), "AT+CSSLCFG=\"sslversion\",%d,4\r", OTA_HTTP_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < sizeof(cmd),
                        ESP_ERR_INVALID_SIZE,
                        UTIL_TAG,
                        "CSSLCFG sslversion cmd truncated");

    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        UTIL_TAG,
                        "HTTP CSSLCFG sslversion failed");

    n = snprintf(cmd,
                 sizeof(cmd),
                 "AT+CSSLCFG=\"authmode\",%d,%d\r",
                 OTA_HTTP_SSL_CTX_INDEX,
                 CONFIG_TRACKER_TLS_VERIFY_SERVER ? 1 : 0);
    ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < sizeof(cmd),
                        ESP_ERR_INVALID_SIZE,
                        UTIL_TAG,
                        "CSSLCFG authmode cmd truncated");

    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        UTIL_TAG,
                        "HTTP CSSLCFG authmode failed");

    ESP_RETURN_ON_FALSE(util_ota_configure_https_ca_cert(cmd, sizeof(cmd)) == ESP_OK,
                        ESP_FAIL,
                        UTIL_TAG,
                        "HTTP CSSLCFG certificate failed");

    n = snprintf(cmd,
                 sizeof(cmd),
                 "AT+CSSLCFG=\"ignorelocaltime\",%d,%d\r",
                 OTA_HTTP_SSL_CTX_INDEX,
                 CONFIG_TRACKER_TLS_IGNORE_LOCAL_TIME ? 1 : 0);
    ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < sizeof(cmd),
                        ESP_ERR_INVALID_SIZE,
                        UTIL_TAG,
                        "CSSLCFG ignorelocaltime cmd truncated");

    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        UTIL_TAG,
                        "HTTP CSSLCFG ignorelocaltime failed");

    n = snprintf(cmd, sizeof(cmd), "AT+CSSLCFG=\"negotiatetime\",%d,300\r", OTA_HTTP_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < sizeof(cmd),
                        ESP_ERR_INVALID_SIZE,
                        UTIL_TAG,
                        "CSSLCFG negotiatetime cmd truncated");

    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        UTIL_TAG,
                        "HTTP CSSLCFG negotiatetime failed");

    n = snprintf(cmd, sizeof(cmd), "AT+CSSLCFG=\"enableSNI\",%d,1\r", OTA_HTTP_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < sizeof(cmd),
                        ESP_ERR_INVALID_SIZE,
                        UTIL_TAG,
                        "CSSLCFG enableSNI cmd truncated");

    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        UTIL_TAG,
                        "HTTP CSSLCFG enableSNI failed");

    n = snprintf(cmd, sizeof(cmd), "AT+HTTPPARA=\"SSLCFG\",%d\r", OTA_HTTP_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < sizeof(cmd),
                        ESP_ERR_INVALID_SIZE,
                        UTIL_TAG,
                        "HTTPPARA SSLCFG cmd truncated");

    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        UTIL_TAG,
                        "HTTPPARA SSLCFG failed");

    return ESP_OK;
}

/**
 * @brief Map a SIM7600 transport status code to a human-readable name.
 *
 * Thin public wrapper over the internal 7xx error-name table so OTA logging can
 * annotate non-200 outcomes (e.g. TLS handshake or DNS failures) with a stable
 * label. Codes outside the known transport range return "n/a".
 *
 * @param status_code +HTTPACTION transport status code reported by the modem.
 * @return Stable error-name string; never NULL.
 */
const char *util_ota_http_status_name(int status_code) {
    return util_ota_http_transport_error_name(status_code);
}
