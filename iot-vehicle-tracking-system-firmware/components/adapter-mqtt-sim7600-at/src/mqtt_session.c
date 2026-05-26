#include "mqtt_internal.h"

#include <stdio.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "esp_log.h"

#include "modem_at.h"
#include "util.h"

/**
 * @file mqtt_session.c
 * @brief MQTT service/client/session lifecycle helpers for the SIM7600 facade.
 *
 * ## MQTT Session Lifecycle Flow
 *
 * ### 1. Service Start (tracker_mqtt_start_service)
 *    AT+CMQTTSTART -> Start MQTT service on modem
 *    Error codes: 0=success, 23=already started
 *
 * ### 2. TLS Configuration (tracker_mqtt_configure_tls)
 *    AT+CSSLCFG (sslversion, authmode, certificate, ignorelocaltime, negotiateTime, enableSNI)
 *    Configures TLS context for secure connections
 *    Can be skipped if TLS disabled in config
 *
 * ### 3. Client Acquisition (tracker_mqtt_acquire_client)
 *    AT+CMQTTACCQ -> Acquire MQTT client with device ID
 *    Error codes: 0=success, 19=client already in use
 *
 * ### 4. Client Options (tracker_mqtt_apply_client_options)
 *    AT+CMQTTCFG -> Set UTF-8 check, operation timeout
 *
 * ### 5. Connection (tracker_mqtt_connect)
 *    AT+CMQTTCONNECT -> Connect to broker with keepalive
 *    AT+CMQTTSUB -> Subscribe to command topic
 *    Polls for session window until connected
 *
 * ### 6. Disconnect (tracker_mqtt_disconnect)
 *    AT+CMQTTDISCONN -> Graceful disconnect from broker
 *    Resets s_connected, s_commands_subscribed
 *
 * ## Error Recovery
 * - Connection timeout: probe session window, retry with backoff
 * - Client in use: force disconnect, reacquire
 * - TLS errors: fallback to non-TLS if configured
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
#ifndef CONFIG_TRACKER_MQTT_DNS_FALLBACK_IPV4
#define CONFIG_TRACKER_MQTT_DNS_FALLBACK_IPV4 ""
#endif

#define MQTT_DNS_LOOKUP_TIMEOUT_MS 60000U
#define MQTT_DNS_LOOKUP_IDLE_TIMEOUT_MS 1500U
#define MQTT_RESOLVED_IPV4_MAX_LEN 16U

static bool tracker_mqtt_parse_ipv4_literal(const char *value, char *out_ip, size_t out_ip_size);

/**
 * @brief Get endpoint class name.
 *
 * @param server_addr Server address.
 * @return Class name ("primary" or "fallback").
 */
static const char *tracker_mqtt_endpoint_class(const char *server_addr) {
    if (!util_string_empty(server_addr) && strcmp(server_addr, s_server_addr_fallback) == 0) {
        return "fallback";
    }
    if (!util_string_empty(server_addr)) {
        const char *scheme = "tcp://";
        size_t scheme_len = strlen(scheme);
        if (strncmp(server_addr, scheme, scheme_len) == 0) {
            char host[TRACKER_HOST_MAX_LEN] = {0};
            const char *host_start = server_addr + scheme_len;
            const char *host_end = strchr(host_start, ':');
            size_t host_len = host_end != NULL ? (size_t)(host_end - host_start) : strlen(host_start);
            if (host_len > 0U && host_len < sizeof(host)) {
                memcpy(host, host_start, host_len);
                host[host_len] = '\0';
                if (tracker_mqtt_parse_ipv4_literal(host, host, sizeof(host))) {
                    return "resolved_ip";
                }
            }
        }
    }
    return "primary";
}

static const char *tracker_mqtt_connect_err_name(int err_code) {
    // Keep the modem MQTT error labels centralized so field logs stay legible.
    switch (err_code) {
        case 0:
            return "ok";
        case MQTT_ERR_NETWORK_NOT_OPENED:
            return "network_not_opened";
        case MQTT_ERR_NO_CONNECTION:
            return "no_connection";
        case MQTT_ERR_NOT_SUPPORTED_OPERATION:
            return "not_supported_operation";
        case MQTT_ERR_TIMEOUT:
            return "timeout";
        case MQTT_ERR_CLIENT_IS_USED:
            return "client_in_use";
        case MQTT_ERR_CLIENT_NOT_RELEASED:
            return "client_not_released";
        case MQTT_ERR_DNS_FAILURE:
            return "dns_failure";
        case MQTT_ERR_SOCKET_CLOSED_BY_SERVER:
            return "socket_closed_by_server";
        default:
            return "unknown";
    }
}

static void tracker_mqtt_log_response_excerpt(const char *label, const char *response) {
    // Log a bounded modem-response excerpt so DNS and connect diagnostics can be read from field logs.
    if (util_string_empty(label)) {
        return;
    }

    if (response == NULL || response[0] == '\0') {
        ESP_LOGW(TRACKER_MQTT_TAG, "%s response=<empty>", label);
        return;
    }

    ESP_LOGW(TRACKER_MQTT_TAG, "%s response=\"%s\"", label, response);
}

static const char *tracker_mqtt_find_last_text(const char *text, const char *needle) {
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

static bool tracker_mqtt_parse_ipv4_literal(const char *value, char *out_ip, size_t out_ip_size) {
    if (util_string_empty(value) || out_ip == NULL || out_ip_size < MQTT_RESOLVED_IPV4_MAX_LEN) {
        return false;
    }

    unsigned int octets[4] = {0};
    char tail = '\0';
    int parsed = sscanf(value,
                        "%u.%u.%u.%u%c",
                        &octets[0],
                        &octets[1],
                        &octets[2],
                        &octets[3],
                        &tail);
    if (parsed != 4) {
        return false;
    }

    for (size_t i = 0; i < ARRAY_SIZE(octets); ++i) {
        if (octets[i] > 255U) {
            return false;
        }
    }

    util_copy_string(out_ip, out_ip_size, value);
    return true;
}

static bool tracker_mqtt_parse_dns_success(const char *response,
                                           const char *host,
                                           char *out_ip,
                                           size_t out_ip_size) {
    if (response == NULL || util_string_empty(host) || out_ip == NULL || out_ip_size < MQTT_RESOLVED_IPV4_MAX_LEN) {
        return false;
    }

    const char *line = tracker_mqtt_find_last_text(response, "+CDNSGIP:");
    if (line == NULL) {
        return false;
    }

    int status = 0;
    char resolved_host[TRACKER_HOST_MAX_LEN] = {0};
    char resolved_ip[MQTT_RESOLVED_IPV4_MAX_LEN] = {0};
    int parsed = sscanf(line,
                        "+CDNSGIP: %d,\"%63[^\"]\",\"%15[^\"]\"",
                        &status,
                        resolved_host,
                        resolved_ip);
    if (parsed != 3) {
        parsed = sscanf(line,
                        "+CDNSGIP:%d,\"%63[^\"]\",\"%15[^\"]\"",
                        &status,
                        resolved_host,
                        resolved_ip);
    }
    if (parsed != 3 || status != 1) {
        return false;
    }

    if (strcmp(resolved_host, host) != 0 || !tracker_mqtt_parse_ipv4_literal(resolved_ip, out_ip, out_ip_size)) {
        return false;
    }
    return true;
}

static bool tracker_mqtt_parse_dns_error(const char *response, int *out_dns_err_code) {
    if (response == NULL || out_dns_err_code == NULL) {
        return false;
    }

    const char *line = tracker_mqtt_find_last_text(response, "+CDNSGIP:");
    if (line == NULL) {
        return false;
    }

    int status = 0;
    int dns_err_code = 0;
    int parsed = sscanf(line, "+CDNSGIP: %d,%d", &status, &dns_err_code);
    if (parsed != 2) {
        parsed = sscanf(line, "+CDNSGIP:%d,%d", &status, &dns_err_code);
    }
    if (parsed != 2 || status != 0) {
        return false;
    }

    *out_dns_err_code = dns_err_code;
    return true;
}

static bool tracker_mqtt_resolve_host_ipv4(const char *host, char *out_ip, size_t out_ip_size) {
    // Resolve the broker host explicitly so DNS failures can be isolated from broker or TLS failures.
    ESP_RETURN_ON_FALSE(!util_string_empty(host), false, TRACKER_MQTT_TAG, "dns host empty");
    ESP_RETURN_ON_FALSE(out_ip != NULL, false, TRACKER_MQTT_TAG, "dns out_ip null");
    ESP_RETURN_ON_FALSE(out_ip_size >= MQTT_RESOLVED_IPV4_MAX_LEN,
                        false,
                        TRACKER_MQTT_TAG,
                        "dns out_ip buffer too small");

    if (tracker_mqtt_parse_ipv4_literal(host, out_ip, out_ip_size)) {
        return true;
    }

    char cmd[96] = {0};
    int n = snprintf(cmd, sizeof(cmd), "AT+CDNSGIP=\"%s\"\r", host);
    ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < sizeof(cmd),
                        false,
                        TRACKER_MQTT_TAG,
                        "CDNSGIP cmd too long");

    char response[MQTT_AT_RESPONSE_MAX_LEN] = {0};
    size_t response_len = 0U;
    esp_err_t err = modem_at_send_collect(cmd,
                                          (uint8_t *)response,
                                          sizeof(response),
                                          &response_len,
                                          MQTT_DNS_LOOKUP_TIMEOUT_MS,
                                          MQTT_DNS_LOOKUP_IDLE_TIMEOUT_MS);
    if (err != ESP_OK) {
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "mqtt dns lookup transport failed host=%s err=%s response_len=%u",
                 host,
                 esp_err_to_name(err),
                 (unsigned)response_len);
        tracker_mqtt_log_response_excerpt("mqtt dns lookup transport", response);
        return false;
    }

    if (tracker_mqtt_parse_dns_success(response, host, out_ip, out_ip_size)) {
        ESP_LOGI(TRACKER_MQTT_TAG, "mqtt dns lookup host=%s resolved_ip=%s", host, out_ip);
        return true;
    }

    int dns_err_code = 0;
    if (tracker_mqtt_parse_dns_error(response, &dns_err_code)) {
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "mqtt dns lookup failed host=%s dns_err=%d response_len=%u",
                 host,
                 dns_err_code,
                 (unsigned)response_len);
        tracker_mqtt_log_response_excerpt("mqtt dns lookup failed", response);
        return false;
    }

    ESP_LOGW(TRACKER_MQTT_TAG,
             "mqtt dns lookup parse miss host=%s response_len=%u",
             host,
             (unsigned)response_len);
    tracker_mqtt_log_response_excerpt("mqtt dns lookup parse_miss", response);
    return false;
}

static esp_err_t tracker_mqtt_build_resolved_server_addr(const char *resolved_ip,
                                                         char *server_addr,
                                                         size_t server_addr_size) {
    ESP_RETURN_ON_FALSE(!util_string_empty(resolved_ip),
                        ESP_ERR_INVALID_ARG,
                        TRACKER_MQTT_TAG,
                        "resolved_ip empty");
    ESP_RETURN_ON_NULL(server_addr, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "server_addr null");

    uint16_t port = s_tls_enabled ? MQTT_IMPLICIT_TLS_PORT : s_cfg.mqtt_port;
    int n = snprintf(server_addr, server_addr_size, "tcp://%s:%u", resolved_ip, (unsigned int)port);
    ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < server_addr_size,
                        ESP_ERR_INVALID_SIZE,
                        TRACKER_MQTT_TAG,
                        "resolved server addr too long");
    return ESP_OK;
}

static esp_err_t tracker_mqtt_connect_via_resolved_ip(int *out_connect_err_code, bool *out_timed_out) {
    // Retry the broker connect against an explicitly resolved IPv4 address when the modem reports hostname DNS failure.
    char resolved_ip[MQTT_RESOLVED_IPV4_MAX_LEN] = {0};
    if (!tracker_mqtt_resolve_host_ipv4(s_cfg.mqtt_host, resolved_ip, sizeof(resolved_ip))) {
        if (!util_string_empty(CONFIG_TRACKER_MQTT_DNS_FALLBACK_IPV4) &&
            tracker_mqtt_parse_ipv4_literal(CONFIG_TRACKER_MQTT_DNS_FALLBACK_IPV4,
                                            resolved_ip,
                                            sizeof(resolved_ip))) {
            ESP_LOGW(TRACKER_MQTT_TAG,
                     "mqtt dns lookup failed host=%s fallback_ip=%s source=kconfig",
                     s_cfg.mqtt_host,
                     resolved_ip);
        } else {
            if (out_connect_err_code != NULL) {
                *out_connect_err_code = MQTT_ERR_DNS_FAILURE;
            }
            return ESP_FAIL;
        }
    }

    char server_addr[MQTT_SERVER_ADDR_MAX_LEN] = {0};
    ESP_RETURN_ON_FALSE(tracker_mqtt_build_resolved_server_addr(resolved_ip,
                                                                server_addr,
                                                                sizeof(server_addr)) == ESP_OK,
                        ESP_ERR_INVALID_SIZE,
                        TRACKER_MQTT_TAG,
                        "resolved server addr build failed");

    ESP_LOGW(TRACKER_MQTT_TAG,
             "mqtt retry resolved_ip host=%s resolved_ip=%s endpoint=%s",
             s_cfg.mqtt_host,
             resolved_ip,
             server_addr);
    return tracker_mqtt_connect_once(server_addr, out_connect_err_code, out_timed_out);
}

/**
 * @brief Send lifecycle command to modem.
 *
 * @param cmd AT command.
 * @param timeout_ms Timeout in ms.
 * @param result_prefix Expected result prefix.
 * @param has_client_index Whether client index is used.
 * @param allowed_codes Allowed error codes.
 * @param allowed_count Count of allowed codes.
 * @param out_err_code Output error code.
 * @return ESP_OK on success.
 */
static esp_err_t tracker_mqtt_send_lifecycle_cmd(const char *cmd,
                                                 uint32_t timeout_ms,
                                                 const char *result_prefix,
                                                 bool has_client_index,
                                                 const int *allowed_codes,
                                                 size_t allowed_count,
                                                 int *out_err_code) {
    // Send the lifecycle AT command through one shared helper so result parsing and errors stay consistent.
    ESP_RETURN_ON_NULL(cmd, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "cmd is NULL");
    ESP_RETURN_ON_NULL(result_prefix, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "result_prefix is NULL");

    if (out_err_code != NULL) {
        *out_err_code = 0;
    }

    char response[MQTT_AT_RESPONSE_MAX_LEN] = {0};
    esp_err_t send_err = tracker_mqtt_send_cmd(cmd, timeout_ms, response, sizeof(response));

    int err_code = 0;
    bool parsed = false;
    esp_err_t expect_err = tracker_mqtt_expect_result(response,
                                                      result_prefix,
                                                      has_client_index,
                                                      allowed_codes,
                                                      allowed_count,
                                                      false,
                                                      &err_code,
                                                      &parsed);
    if (out_err_code != NULL) {
        *out_err_code = err_code;
    }

    if (expect_err == ESP_OK && (send_err == ESP_OK || parsed)) {
        if (send_err != ESP_OK && parsed) {
            ESP_LOGW(TRACKER_MQTT_TAG,
                     "Recovered lifecycle cmd via parsed result cmd=\"%s\" err=%s code=%d",
                     cmd,
                     esp_err_to_name(send_err),
                     err_code);
        }
        return ESP_OK;
    }

    int extracted_err_code = 0;
    bool extracted = tracker_mqtt_extract_error_code_from_response(response, &extracted_err_code);
    ESP_LOGW(TRACKER_MQTT_TAG,
             "lifecycle cmd failed cmd=\"%s\" send_err=%s expect_err=%s parsed=%d err_code=%d extracted=%d response_len=%u",
             cmd,
             esp_err_to_name(send_err),
             esp_err_to_name(expect_err),
             parsed ? 1 : 0,
             err_code,
             extracted ? extracted_err_code : -1,
             (unsigned)strlen(response));

    if (send_err != ESP_OK) {
        return send_err;
    }
    return expect_err == ESP_OK ? ESP_FAIL : expect_err;
}

static esp_err_t tracker_mqtt_configure_tls_certificate(char *cmd, size_t cmd_size) {
#if CONFIG_TRACKER_TLS_VERIFY_SERVER
    /*
     * SIM7600 validates against certificate files stored inside the modem, not
     * ESP-IDF's certificate bundle. Provisioning must upload this CA file before
     * enabling server verification on field devices.
     */
    if (util_string_empty(CONFIG_TRACKER_TLS_CA_CERT_NAME)) {
        ESP_LOGE(TRACKER_MQTT_TAG, "TLS verify enabled but CA certificate name is empty");
        return ESP_ERR_INVALID_STATE;
    }

    int n = snprintf(cmd,
                     cmd_size,
                     "AT+CSSLCFG=\"cacert\",%d,\"%s\"\r",
                     MQTT_SSL_CTX_INDEX,
                     CONFIG_TRACKER_TLS_CA_CERT_NAME);
    ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < cmd_size,
                        ESP_ERR_INVALID_SIZE,
                        TRACKER_MQTT_TAG,
                        "CSSLCFG cacert cmd too long");
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", MQTT_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TRACKER_MQTT_TAG,
                        "CSSLCFG cacert failed");
#else
    (void)cmd;
    (void)cmd_size;
    ESP_LOGW(TRACKER_MQTT_TAG, "TLS server certificate verification disabled by Kconfig");
#endif
    return ESP_OK;
}

/**
 * @brief Start MQTT service.
 *
 * @return ESP_OK on success.
 */
esp_err_t tracker_mqtt_start_service(void) {
    if (s_service_started) {
        return ESP_OK;
    }

    static const int accepted[] = {0, 23};
    int err_code = 0;
    esp_err_t err = tracker_mqtt_send_lifecycle_cmd("AT+CMQTTSTART\r",
                                                    MQTT_CONNECT_TIMEOUT_MS,
                                                    "+CMQTTSTART:",
                                                    false,
                                                    accepted,
                                                    ARRAY_SIZE(accepted),
                                                    &err_code);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TRACKER_MQTT_TAG, "CMQTTSTART failed");
    if (err_code == 23) {
        ESP_LOGW(TRACKER_MQTT_TAG, "CMQTTSTART reports already-started service");
    }
    s_service_started = true;
    return ESP_OK;
}

esp_err_t tracker_mqtt_configure_tls(void) {
    if (!s_tls_enabled) {
        return ESP_OK;
    }

    char cmd[96] = {0};
    (void)snprintf(cmd, sizeof(cmd), "AT+CSSLCFG=\"sslversion\",%d,4\r", MQTT_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", MQTT_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TRACKER_MQTT_TAG,
                        "CSSLCFG sslversion failed");

    (void)snprintf(cmd,
                   sizeof(cmd),
                   "AT+CSSLCFG=\"authmode\",%d,%d\r",
                   MQTT_SSL_CTX_INDEX,
                   CONFIG_TRACKER_TLS_VERIFY_SERVER ? 1 : 0);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", MQTT_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TRACKER_MQTT_TAG,
                        "CSSLCFG authmode failed");

    ESP_RETURN_ON_FALSE(tracker_mqtt_configure_tls_certificate(cmd, sizeof(cmd)) == ESP_OK,
                        ESP_FAIL,
                        TRACKER_MQTT_TAG,
                        "CSSLCFG certificate failed");

    (void)snprintf(cmd,
                   sizeof(cmd),
                   "AT+CSSLCFG=\"ignorelocaltime\",%d,%d\r",
                   MQTT_SSL_CTX_INDEX,
                   CONFIG_TRACKER_TLS_IGNORE_LOCAL_TIME ? 1 : 0);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", MQTT_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TRACKER_MQTT_TAG,
                        "CSSLCFG ignorelocaltime failed");

    (void)snprintf(cmd, sizeof(cmd), "AT+CSSLCFG=\"negotiatetime\",%d,300\r", MQTT_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", MQTT_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TRACKER_MQTT_TAG,
                        "CSSLCFG negotiatetime failed");

    (void)snprintf(cmd, sizeof(cmd), "AT+CSSLCFG=\"enableSNI\",%d,1\r", MQTT_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", MQTT_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TRACKER_MQTT_TAG,
                        "CSSLCFG enableSNI failed");

    (void)snprintf(cmd, sizeof(cmd), "AT+CMQTTSSLCFG=%d,%d\r", MQTT_CLIENT_INDEX, MQTT_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", MQTT_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TRACKER_MQTT_TAG,
                        "CMQTTSSLCFG failed");
    return ESP_OK;
}

esp_err_t tracker_mqtt_acquire_client(void) {
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
    ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < sizeof(cmd),
                        ESP_ERR_INVALID_SIZE,
                        TRACKER_MQTT_TAG,
                        "CMQTTACCQ cmd too long");

    int err_code = 0;
    esp_err_t err = tracker_mqtt_send_lifecycle_cmd(cmd,
                                                    MQTT_CMD_TIMEOUT_MS,
                                                    "+CMQTTACCQ:",
                                                    true,
                                                    accepted,
                                                    ARRAY_SIZE(accepted),
                                                    &err_code);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TRACKER_MQTT_TAG, "CMQTTACCQ failed");
    if (err_code == MQTT_ERR_CLIENT_IS_USED) {
        ESP_LOGW(TRACKER_MQTT_TAG, "CMQTTACCQ reports client already acquired");
    }
    s_client_acquired = true;
    return ESP_OK;
}

esp_err_t tracker_mqtt_apply_client_options(void) {
    // Apply the client-option defaults in one place so the modem session uses one consistent policy.
    ESP_RETURN_ON_FALSE(modem_at_send_expect("AT+CMQTTCFG=\"checkUTF8\",0,0\r", "OK", MQTT_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TRACKER_MQTT_TAG,
                        "CMQTTCFG checkUTF8 failed");

    char cmd[80] = {0};
    int n = snprintf(cmd, sizeof(cmd), "AT+CMQTTCFG=\"optimeout\",0,%u\r", (unsigned int)MQTT_DEFAULT_OPERATION_TIMEOUT_S);
    ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < sizeof(cmd),
                        ESP_ERR_INVALID_SIZE,
                        TRACKER_MQTT_TAG,
                        "CMQTTCFG optimeout cmd too long");
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", MQTT_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TRACKER_MQTT_TAG,
                        "CMQTTCFG optimeout failed");
    return ESP_OK;
}

bool tracker_mqtt_query_disconnect_state_with_policy(int *out_disc_state, bool quiet) {
    ESP_RETURN_ON_FALSE(out_disc_state != NULL, false, TRACKER_MQTT_TAG, "out_disc_state null");

    char response[MQTT_AT_RESPONSE_MAX_LEN] = {0};
    if (tracker_mqtt_send_cmd_with_policy("AT+CMQTTDISC?\r",
                                          MQTT_CMD_TIMEOUT_MS,
                                          response,
                                          sizeof(response),
                                          !quiet,
                                          !quiet) != ESP_OK) {
        return false;
    }
    return tracker_mqtt_parse_disconnect_state(response, out_disc_state);
}

bool tracker_mqtt_query_disconnect_state(int *out_disc_state) {
    return tracker_mqtt_query_disconnect_state_with_policy(out_disc_state, false);
}

bool tracker_mqtt_resume_connected_session(const char *reason, bool quiet_query) {
    int disc_state = -1;
    if (!tracker_mqtt_query_disconnect_state_with_policy(&disc_state, quiet_query) || disc_state != 0) {
        return false;
    }

    s_service_started = true;
    s_client_acquired = true;
    s_connected = true;
    s_commands_subscribed = false;
    tracker_mqtt_reset_connect_wait();
    ESP_LOGI(TRACKER_MQTT_TAG,
             "MQTT resumed existing modem session reason=%s disc_state=%d",
             reason != NULL ? reason : "unknown",
             disc_state);
    return true;
}

static esp_err_t tracker_mqtt_build_connect_cmd(const char *server_addr, char *cmd, size_t cmd_size) {
    // Build the CMQTTCONNECT command once here so every connect attempt uses the same broker contract.
    int n = 0;
    if (util_string_empty(s_cfg.mqtt_username)) {
        n = snprintf(cmd,
                     cmd_size,
                     "AT+CMQTTCONNECT=%d,\"%s\",%u,1\r",
                     MQTT_CLIENT_INDEX,
                     server_addr,
                     (unsigned int)MQTT_DEFAULT_KEEPALIVE_S);
    } else {
        n = snprintf(cmd,
                     cmd_size,
                     "AT+CMQTTCONNECT=%d,\"%s\",%u,1,\"%s\",\"%s\"\r",
                     MQTT_CLIENT_INDEX,
                     server_addr,
                     (unsigned int)MQTT_DEFAULT_KEEPALIVE_S,
                     s_cfg.mqtt_username,
                     s_cfg.mqtt_password);
    }

    ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < cmd_size,
                        ESP_ERR_INVALID_SIZE,
                        TRACKER_MQTT_TAG,
                        "CMQTTCONNECT cmd too long");
    return ESP_OK;
}

static bool tracker_mqtt_probe_connected_session_window(int *out_connect_err_code) {
    uint64_t probe_start_ms = util_uptime_ms();
    while ((util_uptime_ms() - probe_start_ms) < MQTT_CONNECT_SESSION_PROBE_WINDOW_MS) {
        int disc_state = -1;
        if (tracker_mqtt_query_disconnect_state(&disc_state) && disc_state == 0) {
            tracker_mqtt_reset_connect_wait();
            s_connected = true;
            s_commands_subscribed = false;
            ESP_LOGI(TRACKER_MQTT_TAG, "CMQTTCONNECT session probe connected (disc_state=%d)", disc_state);
            if (out_connect_err_code != NULL) {
                *out_connect_err_code = 0;
            }
            return true;
        }
        if (s_connect_result_ready) {
            break;
        }

        (void)modem_at_poll_urc(MQTT_POLL_MAX_BYTES);
        vTaskDelay(pdMS_TO_TICKS(MQTT_CONNECT_SESSION_PROBE_INTERVAL_MS));
    }

    return false;
}

static esp_err_t tracker_mqtt_handle_connect_timeout(const char *server_addr,
                                                     int *out_connect_err_code,
                                                     bool *out_timed_out) {
    int disc_state = -1;
    if (tracker_mqtt_query_disconnect_state(&disc_state) && disc_state == 0) {
        s_connected = true;
        s_commands_subscribed = false;
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "CMQTTCONNECT timeout but session state is connected (disc_state=%d), continue",
                 disc_state);
        if (out_connect_err_code != NULL) {
            *out_connect_err_code = 0;
        }
        return ESP_OK;
    }

    ESP_LOGW(TRACKER_MQTT_TAG,
             "CMQTTCONNECT result timeout endpoint=%s configured=%d",
             tracker_mqtt_endpoint_class(server_addr),
             util_string_empty(server_addr) ? 0 : 1);
    tracker_mqtt_mark_disconnected("+CMQTTCONNECT_timeout", MQTT_ERR_NO_CONNECTION);
    if (out_connect_err_code != NULL) {
        *out_connect_err_code = MQTT_ERR_NO_CONNECTION;
    }
    if (out_timed_out != NULL) {
        *out_timed_out = true;
    }
    return ESP_ERR_TIMEOUT;
}

static esp_err_t tracker_mqtt_handle_connect_rejection(const char *server_addr,
                                                       int connect_err,
                                                       int *out_connect_err_code) {
    if (tracker_mqtt_err_indicates_disconnect(connect_err)) {
        tracker_mqtt_mark_disconnected("+CMQTTCONNECT", connect_err);
    }

    ESP_LOGW(TRACKER_MQTT_TAG,
             "CMQTTCONNECT rejected endpoint=%s err=%d err_name=%s",
             tracker_mqtt_endpoint_class(server_addr),
             connect_err,
             tracker_mqtt_connect_err_name(connect_err));
    if (out_connect_err_code != NULL) {
        *out_connect_err_code = connect_err;
    }
    return ESP_FAIL;
}

esp_err_t tracker_mqtt_connect_once(const char *server_addr, int *out_connect_err_code, bool *out_timed_out) {
    ESP_RETURN_ON_FALSE(!util_string_empty(server_addr),
                        ESP_ERR_INVALID_ARG,
                        TRACKER_MQTT_TAG,
                        "server addr empty");

    if (out_connect_err_code != NULL) {
        *out_connect_err_code = 0;
    }
    if (out_timed_out != NULL) {
        *out_timed_out = false;
    }

    char cmd[420] = {0};
    ESP_RETURN_ON_FALSE(tracker_mqtt_build_connect_cmd(server_addr, cmd, sizeof(cmd)) == ESP_OK,
                        ESP_ERR_INVALID_SIZE,
                        TRACKER_MQTT_TAG,
                        "CMQTTCONNECT cmd build failed");

    // Start watching for connect completion before issuing CMQTTCONNECT because some modem builds answer asynchronously.
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
        // If the immediate response is inconclusive, probe for an already-open session before waiting out the full timeout.
        if (tracker_mqtt_probe_connected_session_window(out_connect_err_code)) {
            return ESP_OK;
        }

        // Fall back to the async connect-result wait path when no inline +CMQTTCONNECT result was parsed.
        esp_err_t wait_err = tracker_mqtt_wait_connect_result(&connect_err);
        tracker_mqtt_reset_connect_wait();
        if (wait_err != ESP_OK) {
            return tracker_mqtt_handle_connect_timeout(server_addr, out_connect_err_code, out_timed_out);
        }

        if (connect_err != 0) {
            return tracker_mqtt_handle_connect_rejection(server_addr, connect_err, out_connect_err_code);
        }
    } else {
        // Inline results are preferred, but a probe can still rescue the session if the modem response looked inconsistent.
        tracker_mqtt_reset_connect_wait();
        if (result_err != ESP_OK) {
            if (tracker_mqtt_resume_connected_session("connect_result_probe", false)) {
                if (out_connect_err_code != NULL) {
                    *out_connect_err_code = 0;
                }
                return ESP_OK;
            }
            if (out_connect_err_code != NULL) {
                *out_connect_err_code = connect_err;
            }
            return ESP_FAIL;
        }
    }

    // A fresh broker session always clears the subscription cache so the command topic can be reasserted afterwards.
    s_connected = true;
    s_commands_subscribed = false;
    ESP_LOGI(TRACKER_MQTT_TAG,
             "mqtt connected endpoint=%s tls=%d",
             tracker_mqtt_endpoint_class(server_addr),
             s_tls_enabled ? 1 : 0);
    return ESP_OK;
}

static void tracker_mqtt_log_diag_cmd(const char *cmd, uint32_t timeout_ms) {
    // Emit one diagnostic-command snapshot here so field logs show the modem view of MQTT state.
    if (util_string_empty(cmd)) {
        ESP_LOGW(TRACKER_MQTT_TAG, "diag cmd empty");
        return;
    }

    char response[MQTT_AT_RESPONSE_MAX_LEN] = {0};
    esp_err_t err = tracker_mqtt_send_cmd(cmd, timeout_ms, response, sizeof(response));
    if (err != ESP_OK) {
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "mqtt diag command failed cmd=\"%s\" err=%s response_len=%u",
                 cmd,
                 esp_err_to_name(err),
                 (unsigned)strlen(response));
        return;
    }

    ESP_LOGI(TRACKER_MQTT_TAG,
             "mqtt diag cmd=\"%s\" response_len=%u",
             cmd,
             (unsigned)strlen(response));
    if (strstr(cmd, "AT+CMQTTCONNECT?") == NULL) {
        tracker_mqtt_log_response_excerpt("mqtt diag", response);
    }
}

void tracker_mqtt_log_connect_diagnostics(void) {
    // Emit the standard MQTT connectivity diagnostic bundle here when a connect path needs more context.
    tracker_mqtt_log_diag_cmd("AT+CMQTTDISC?\r", MQTT_CMD_TIMEOUT_MS);
    tracker_mqtt_log_diag_cmd("AT+CMQTTACCQ?\r", MQTT_CMD_TIMEOUT_MS);
    tracker_mqtt_log_diag_cmd("AT+CMQTTCONNECT?\r", MQTT_CMD_TIMEOUT_MS);
    tracker_mqtt_log_diag_cmd("AT+CGCONTRDP=1\r", MQTT_CMD_TIMEOUT_MS);
    tracker_mqtt_log_diag_cmd("AT+CDNSCFG?\r", MQTT_CMD_TIMEOUT_MS);
    if (!util_string_empty(s_cfg.mqtt_host)) {
        char resolved_ip[MQTT_RESOLVED_IPV4_MAX_LEN] = {0};
        (void)tracker_mqtt_resolve_host_ipv4(s_cfg.mqtt_host, resolved_ip, sizeof(resolved_ip));
    }
}

esp_err_t tracker_mqtt_send_disconnect(void) {
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

    esp_err_t err = tracker_mqtt_send_lifecycle_cmd(cmd,
                                                    MQTT_CONNECT_TIMEOUT_MS,
                                                    "+CMQTTDISC:",
                                                    true,
                                                    accepted,
                                                    ARRAY_SIZE(accepted),
                                                    NULL);
    s_connected = false;
    s_commands_subscribed = false;
    return err;
}

esp_err_t tracker_mqtt_release_client(void) {
    if (!s_client_acquired) {
        return ESP_OK;
    }

    static const int accepted[] = {0, 20};
    int err_code = 0;
    esp_err_t err = tracker_mqtt_send_lifecycle_cmd("AT+CMQTTREL=0\r",
                                                    MQTT_CONNECT_TIMEOUT_MS,
                                                    "+CMQTTREL:",
                                                    true,
                                                    accepted,
                                                    ARRAY_SIZE(accepted),
                                                    &err_code);
    if (err == ESP_OK) {
        s_client_acquired = false;
        return ESP_OK;
    }
    if (err_code == MQTT_ERR_CLIENT_IS_USED) {
        ESP_LOGW(TRACKER_MQTT_TAG, "CMQTTREL deferred: client still in use");
        return ESP_ERR_NOT_FINISHED;
    }
    return err;
}

esp_err_t tracker_mqtt_stop_service(void) {
    if (!s_service_started) {
        return ESP_OK;
    }

    static const int accepted[] = {0, 9};
    int err_code = 0;
    esp_err_t err = tracker_mqtt_send_lifecycle_cmd("AT+CMQTTSTOP\r",
                                                    MQTT_CONNECT_TIMEOUT_MS,
                                                    "+CMQTTSTOP:",
                                                    false,
                                                    accepted,
                                                    ARRAY_SIZE(accepted),
                                                    &err_code);
    if (err == ESP_OK) {
        s_service_started = false;
        return ESP_OK;
    }
    if (err_code == MQTT_ERR_CLIENT_NOT_RELEASED) {
        ESP_LOGW(TRACKER_MQTT_TAG, "CMQTTSTOP deferred: client not released");
        return ESP_ERR_NOT_FINISHED;
    }
    return err;
}

esp_err_t tracker_mqtt_cleanup_after_connect_failure(void) {
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

    ESP_LOGW(TRACKER_MQTT_TAG,
             "MQTT connect cleanup disc=%s rel=%s stop=%s rel_attempts=%u stop_attempts=%u",
             esp_err_to_name(disc_err),
             esp_err_to_name(rel_err),
             esp_err_to_name(stop_err),
             (unsigned int)rel_attempts_performed,
             (unsigned int)stop_attempts_performed);
    return first_err;
}

esp_err_t tracker_mqtt_session_connect(void) {
    if (s_connected) {
        return ESP_OK;
    }
    if (tracker_mqtt_resume_connected_session("pre_connect_probe", true)) {
        return ESP_OK;
    }

    ESP_RETURN_ON_FALSE(tracker_mqtt_start_service() == ESP_OK, ESP_FAIL, TRACKER_MQTT_TAG, "start service failed");
    ESP_RETURN_ON_FALSE(tracker_mqtt_acquire_client() == ESP_OK, ESP_FAIL, TRACKER_MQTT_TAG, "acquire client failed");
    ESP_RETURN_ON_FALSE(tracker_mqtt_apply_client_options() == ESP_OK,
                        ESP_FAIL,
                        TRACKER_MQTT_TAG,
                        "apply options failed");
    ESP_RETURN_ON_FALSE(tracker_mqtt_configure_tls() == ESP_OK, ESP_FAIL, TRACKER_MQTT_TAG, "configure tls failed");
    if (tracker_mqtt_resume_connected_session("post_setup_probe", false)) {
        return ESP_OK;
    }

    int connect_err_code = 0;
    bool connect_timed_out = false;
    esp_err_t err = tracker_mqtt_connect_once(s_server_addr_primary, &connect_err_code, &connect_timed_out);

    if (err != ESP_OK && connect_err_code == MQTT_ERR_DNS_FAILURE) {
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "mqtt primary connect failed due to dns retry=resolved_ip host=%s",
                 s_cfg.mqtt_host);
        connect_err_code = 0;
        connect_timed_out = false;
        err = tracker_mqtt_connect_via_resolved_ip(&connect_err_code, &connect_timed_out);
    }

    bool should_try_fallback = s_server_addr_has_fallback;
    if (should_try_fallback &&
        (connect_err_code == MQTT_ERR_DNS_FAILURE || connect_err_code == MQTT_ERR_TIMEOUT)) {
        should_try_fallback = false;
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "MQTT hostname fallback skipped after post-primary retry connect_err=%d err_name=%s",
                 connect_err_code,
                 tracker_mqtt_connect_err_name(connect_err_code));
    }
    if (should_try_fallback && connect_err_code == MQTT_ERR_NOT_SUPPORTED_OPERATION) {
        should_try_fallback = false;
        ESP_LOGW(TRACKER_MQTT_TAG, "MQTT fallback skipped connect_err=%d; forcing cleanup", connect_err_code);
    }
    if (should_try_fallback && s_tls_enabled && connect_timed_out) {
        should_try_fallback = false;
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "MQTT fallback skipped after TLS primary timeout; keep retry path on direct TLS endpoint");
    }
    if (err != ESP_OK && should_try_fallback) {
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "mqtt primary connect failed retry=fallback configured=%d",
                 util_string_empty(s_server_addr_fallback) ? 0 : 1);
        connect_err_code = 0;
        connect_timed_out = false;
        err = tracker_mqtt_connect_once(s_server_addr_fallback, &connect_err_code, &connect_timed_out);
    }

    if (err != ESP_OK) {
        tracker_mqtt_log_connect_diagnostics();
        esp_err_t cleanup_err = tracker_mqtt_cleanup_after_connect_failure();
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "MQTT connect failed timeout=%d connect_err=%d cleanup=%s",
                 connect_timed_out ? 1 : 0,
                 connect_err_code,
                 esp_err_to_name(cleanup_err));
    }
    return err;
}

esp_err_t tracker_mqtt_session_disconnect(void) {
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
    tracker_mqtt_reset_publish_wait();
    return first_err;
}
