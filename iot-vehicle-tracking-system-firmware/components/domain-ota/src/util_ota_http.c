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
 */
void util_ota_http_action_reset(void) {
    s_ota_http_action.waiting = false;
    s_ota_http_action.ready = false;
    s_ota_http_action.method = -1;
    s_ota_http_action.status_code = -1;
    s_ota_http_action.data_len = -1;
}

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
    int parsed = sscanf(line, "+HTTPACTION: %d,%d,%d", &method, &status_code, &data_len);
    if (parsed != 3) {
        parsed = sscanf(line, "+HTTPACTION:%d,%d,%d", &method, &status_code, &data_len);
    }
    if (parsed != 3) {
        return false;
    }

    *out_method = method;
    *out_status_code = status_code;
    *out_data_len = data_len;
    return true;
}

static void util_ota_httpaction_urc_cb(const char *line) {
    if (!s_ota_http_action.waiting || line == NULL) {
        return;
    }

    int method = -1;
    int status_code = -1;
    int data_len = -1;
    if (!util_ota_parse_httpaction_urc_line(line, &method, &status_code, &data_len)) {
        return;
    }

    s_ota_http_action.method = method;
    s_ota_http_action.status_code = status_code;
    s_ota_http_action.data_len = data_len;
    s_ota_http_action.ready = true;
}

/**
 * @brief Register HTTP URC once.
 */
void util_ota_http_register_urc_once(void) {
    if (s_ota_http_urc_registered) {
        return;
    }

    modem_at_register_urc("+HTTPACTION:", util_ota_httpaction_urc_cb);
    s_ota_http_urc_registered = true;
}

/**
 * @brief Wait for HTTP action response.
 *
 * @param out_status_code Output status code.
 * @param out_data_len Output data length.
 * @param timeout_ms Timeout in ms.
 * @return ESP_OK on success.
 */
esp_err_t util_ota_wait_http_action(int *out_status_code, int *out_data_len, uint32_t timeout_ms) {
    ESP_RETURN_ON_NULL(out_status_code, ESP_ERR_INVALID_ARG, UTIL_TAG, "out_status_code is NULL");
    ESP_RETURN_ON_NULL(out_data_len, ESP_ERR_INVALID_ARG, UTIL_TAG, "out_data_len is NULL");

    uint64_t deadline_ms = util_uptime_ms() + (uint64_t)timeout_ms;
    while (util_uptime_ms() < deadline_ms) {
        if (s_ota_http_action.ready) {
            *out_status_code = s_ota_http_action.status_code;
            *out_data_len = s_ota_http_action.data_len;
            s_ota_http_action.waiting = false;
            return ESP_OK;
        }

        (void)modem_at_poll_urc(OTA_HTTP_URC_POLL_BYTES);
        vTaskDelay(pdMS_TO_TICKS(OTA_HTTP_URC_POLL_INTERVAL_MS));
    }

    s_ota_http_action.waiting = false;
    return ESP_ERR_TIMEOUT;
}

/**
 * @brief Parse HTTPREAD payload from response.
 *
 * @param response Response buffer.
 * @param response_len Buffer length.
 * @param out_data Output data pointer.
 * @param out_len Output data length.
 * @return True if parsed successfully.
 */
bool util_ota_parse_httpread_payload(const uint8_t *response,
                                     size_t response_len,
                                     const uint8_t **out_data,
                                     size_t *out_len) {
    if (response == NULL || response_len == 0U || out_data == NULL || out_len == NULL) {
        return false;
    }

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
        return false;
    }

    size_t cursor = header_pos + prefix_len;
    while (cursor < response_len && (response[cursor] == ' ' || response[cursor] == '\t')) {
        ++cursor;
    }
    if (cursor + strlen("DATA,") <= response_len &&
        memcmp(response + cursor, "DATA,", strlen("DATA,")) == 0) {
        cursor += strlen("DATA,");
    }
    if (cursor >= response_len || !isdigit((unsigned char)response[cursor])) {
        return false;
    }

    size_t declared_len = 0U;
    while (cursor < response_len && isdigit((unsigned char)response[cursor])) {
        declared_len = (declared_len * 10U) + (size_t)(response[cursor] - '0');
        ++cursor;
    }
    if (declared_len == 0U) {
        return false;
    }

    while (cursor < response_len && response[cursor] != '\n') {
        ++cursor;
    }
    if (cursor >= response_len) {
        return false;
    }

    size_t data_offset = cursor + 1U;
    if (data_offset + declared_len > response_len) {
        return false;
    }

    *out_data = response + data_offset;
    *out_len = declared_len;
    return true;
}

/**
 * @brief Check if data is hex ASCII bytes.
 *
 * @param data Data buffer.
 * @param len Buffer length.
 * @return True if all bytes are hex digits.
 */
bool util_is_hex_ascii_bytes(const uint8_t *data, size_t len) {
    if (data == NULL || len == 0U || (len % 2U) != 0U) {
        return false;
    }

    for (size_t i = 0; i < len; ++i) {
        if (!isxdigit((unsigned char)data[i])) {
            return false;
        }
    }

    return true;
}

esp_err_t util_ota_configure_https_ssl_context(void) {
    char cmd[96] = {0};

    (void)snprintf(cmd, sizeof(cmd), "AT+CSSLCFG=\"sslversion\",%d,4\r", OTA_HTTP_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        UTIL_TAG,
                        "HTTP CSSLCFG sslversion failed");

    (void)snprintf(cmd,
                   sizeof(cmd),
                   "AT+CSSLCFG=\"authmode\",%d,%d\r",
                   OTA_HTTP_SSL_CTX_INDEX,
                   CONFIG_TRACKER_TLS_VERIFY_SERVER ? 1 : 0);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        UTIL_TAG,
                        "HTTP CSSLCFG authmode failed");

    ESP_RETURN_ON_FALSE(util_ota_configure_https_ca_cert(cmd, sizeof(cmd)) == ESP_OK,
                        ESP_FAIL,
                        UTIL_TAG,
                        "HTTP CSSLCFG certificate failed");

    (void)snprintf(cmd,
                   sizeof(cmd),
                   "AT+CSSLCFG=\"ignorelocaltime\",%d,%d\r",
                   OTA_HTTP_SSL_CTX_INDEX,
                   CONFIG_TRACKER_TLS_IGNORE_LOCAL_TIME ? 1 : 0);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        UTIL_TAG,
                        "HTTP CSSLCFG ignorelocaltime failed");

    (void)snprintf(cmd, sizeof(cmd), "AT+CSSLCFG=\"negotiatetime\",%d,300\r", OTA_HTTP_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        UTIL_TAG,
                        "HTTP CSSLCFG negotiatetime failed");

    (void)snprintf(cmd, sizeof(cmd), "AT+CSSLCFG=\"enableSNI\",%d,1\r", OTA_HTTP_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        UTIL_TAG,
                        "HTTP CSSLCFG enableSNI failed");

    (void)snprintf(cmd, sizeof(cmd), "AT+HTTPPARA=\"SSLCFG\",%d\r", OTA_HTTP_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        UTIL_TAG,
                        "HTTPPARA SSLCFG failed");

    return ESP_OK;
}

const char *util_ota_http_status_name(int status_code) {
    return util_ota_http_transport_error_name(status_code);
}
