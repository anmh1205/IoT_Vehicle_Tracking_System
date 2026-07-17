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


/*
 * Kconfig-driven TLS/DNS defaults. Defined here as fallbacks so the file still
 * compiles when the matching sdkconfig options are absent (e.g. host builds).
 */
#ifndef CONFIG_TRACKER_TLS_VERIFY_SERVER
#define CONFIG_TRACKER_TLS_VERIFY_SERVER 0       // 0 = skip server-cert verification
#endif
#ifndef CONFIG_TRACKER_TLS_IGNORE_LOCAL_TIME
#define CONFIG_TRACKER_TLS_IGNORE_LOCAL_TIME 0   // 0 = enforce cert validity window
#endif
#ifndef CONFIG_TRACKER_TLS_CA_CERT_NAME
#define CONFIG_TRACKER_TLS_CA_CERT_NAME ""       // modem-side CA cert filename
#endif
#ifndef CONFIG_TRACKER_MQTT_DNS_FALLBACK_IPV4
#define CONFIG_TRACKER_MQTT_DNS_FALLBACK_IPV4 "" // static IPv4 to use if DNS fails
#endif

#define MQTT_DNS_LOOKUP_TIMEOUT_MS 15000U      // overall AT+CDNSGIP deadline
#define MQTT_DNS_LOOKUP_IDLE_TIMEOUT_MS 1500U  // inter-byte idle gap that ends collection
#define MQTT_RESOLVED_IPV4_MAX_LEN 16U         // "255.255.255.255" + NUL

static bool tracker_mqtt_parse_ipv4_literal(const char *value, char *out_ip, size_t out_ip_size);

/**
 * @brief Classify a server-address string for diagnostic logging.
 *
 * Distinguishes the fallback endpoint, an endpoint already rewritten to a
 * resolved IPv4 literal, and the default primary host. Used only to make
 * connect logs readable without leaking the full endpoint each time.
 *
 * @param server_addr Endpoint URL (e.g. "tcp://host:8883").
 * @return Static label: "fallback", "resolved_ip", or "primary".
 */
static const char *tracker_mqtt_endpoint_class(const char *server_addr) {
    // Exact match against the prebuilt fallback URL.
    if (!util_string_empty(server_addr) && strcmp(server_addr, s_server_addr_fallback) == 0) {
        return "fallback";
    }
    if (!util_string_empty(server_addr)) {
        const char *scheme = "tcp://";
        size_t scheme_len = strlen(scheme);
        if (strncmp(server_addr, scheme, scheme_len) == 0) {
            // Extract the host portion between "tcp://" and the optional ":port".
            char host[TRACKER_HOST_MAX_LEN] = {0};
            const char *host_start = server_addr + scheme_len;
            const char *host_end = strchr(host_start, ':');
            size_t host_len = host_end != NULL ? (size_t)(host_end - host_start) : strlen(host_start);
            if (host_len > 0U && host_len < sizeof(host)) {
                memcpy(host, host_start, host_len);
                host[host_len] = '\0';
                // A pure IPv4 literal means this endpoint was rewritten after DNS resolution.
                if (tracker_mqtt_parse_ipv4_literal(host, host, sizeof(host))) {
                    return "resolved_ip";
                }
            }
        }
    }
    return "primary";
}

/**
 * @brief Map a SIM7600 MQTT connect error code to a short human-readable label.
 *
 * @param err_code Modem MQTT error/status code.
 * @return Static label string; "unknown" for codes not in the known set.
 */
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

/**
 * @brief Find the last occurrence of @p needle in @p text (local copy).
 *
 * AT responses can repeat a keyword (command echo plus final line); the last
 * occurrence carries the authoritative value, so DNS parsing scans from it.
 *
 * @param text Haystack (may be NULL).
 * @param needle Substring to locate (must be non-empty).
 * @return Pointer to the last match, or NULL when absent.
 */
static const char *tracker_mqtt_find_last_text(const char *text, const char *needle) {
    if (text == NULL || needle == NULL || needle[0] == '\0') {
        return NULL;
    }

    const char *cursor = text;
    const char *last = NULL;
    while ((cursor = strstr(cursor, needle)) != NULL) {
        last = cursor;             // remember this hit
        cursor += strlen(needle);  // continue past it to find a later one
    }
    return last;
}

/**
 * @brief Validate that @p value is a dotted-quad IPv4 literal and copy it out.
 *
 * Rejects anything that is not exactly four octets <= 255 with no trailing
 * characters, so a hostname is never mistaken for an already-resolved IP.
 *
 * @param value Candidate string (e.g. "203.0.113.5").
 * @param out_ip Destination buffer for the validated literal.
 * @param out_ip_size Capacity of @p out_ip; must hold a full IPv4 literal.
 * @return true when @p value is a valid IPv4 literal (and was copied).
 */
static bool tracker_mqtt_parse_ipv4_literal(const char *value, char *out_ip, size_t out_ip_size) {
    if (util_string_empty(value) || out_ip == NULL || out_ip_size < MQTT_RESOLVED_IPV4_MAX_LEN) {
        return false;
    }

    unsigned int octets[4] = {0};
    char tail = '\0';
    // The trailing %c catches junk after the 4th octet (e.g. "1.2.3.4x").
    int parsed = sscanf(value,
                        "%u.%u.%u.%u%c",
                        &octets[0],
                        &octets[1],
                        &octets[2],
                        &octets[3],
                        &tail);
    if (parsed != 4) {
        return false; // not exactly four octets (or trailing char present)
    }

    for (size_t i = 0; i < ARRAY_SIZE(octets); ++i) {
        if (octets[i] > 255U) {
            return false; // octet out of range -> not a valid IPv4 address
        }
    }

    util_copy_string(out_ip, out_ip_size, value);
    return true;
}

/**
 * @brief Parse a successful +CDNSGIP result and extract the resolved IPv4.
 *
 * Accepts the response only when the modem reports success status 1, the
 * echoed hostname matches @p host exactly, and the address is a valid IPv4
 * literal. Both spaced and unspaced "+CDNSGIP:" variants are handled.
 *
 * @param response Raw modem response text.
 * @param host Hostname that was queried (used to confirm the echoed name).
 * @param out_ip Destination for the resolved IPv4 literal.
 * @param out_ip_size Capacity of @p out_ip.
 * @return true on a confirmed successful resolution.
 */
static bool tracker_mqtt_parse_dns_success(const char *response,
                                           const char *host,
                                           char *out_ip,
                                           size_t out_ip_size) {
    if (response == NULL || util_string_empty(host) || out_ip == NULL || out_ip_size < MQTT_RESOLVED_IPV4_MAX_LEN) {
        return false;
    }

    // Use the last +CDNSGIP line: it holds the final result, not the echo.
    const char *line = tracker_mqtt_find_last_text(response, "+CDNSGIP:");
    if (line == NULL) {
        return false;
    }

    int status = 0;
    char resolved_host[TRACKER_HOST_MAX_LEN] = {0};
    char resolved_ip[MQTT_RESOLVED_IPV4_MAX_LEN] = {0};
    // Success layout: +CDNSGIP: <status>,"<host>","<ip>"  (status 1 = ok).
    int parsed = sscanf(line,
                        "+CDNSGIP: %d,\"%63[^\"]\",\"%15[^\"]\"",
                        &status,
                        resolved_host,
                        resolved_ip);
    if (parsed != 3) {
        // Retry without the space after the colon for firmware that omits it.
        parsed = sscanf(line,
                        "+CDNSGIP:%d,\"%63[^\"]\",\"%15[^\"]\"",
                        &status,
                        resolved_host,
                        resolved_ip);
    }
    if (parsed != 3 || status != 1) {
        return false; // malformed or non-success status
    }

    // Guard against a mismatched echo or a non-IPv4 address field.
    if (strcmp(resolved_host, host) != 0 || !tracker_mqtt_parse_ipv4_literal(resolved_ip, out_ip, out_ip_size)) {
        return false;
    }
    return true;
}

/**
 * @brief Parse a failed +CDNSGIP result and extract the DNS error code.
 *
 * The failure form carries status 0 followed by an error code. Used to log a
 * precise DNS failure reason distinct from broker/TLS errors.
 *
 * @param response Raw modem response text.
 * @param out_dns_err_code Out: the modem-reported DNS error code.
 * @return true when a failure line (status 0) was parsed.
 */
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
    // Failure layout: +CDNSGIP: <status=0>,<dns_err_code>.
    int parsed = sscanf(line, "+CDNSGIP: %d,%d", &status, &dns_err_code);
    if (parsed != 2) {
        parsed = sscanf(line, "+CDNSGIP:%d,%d", &status, &dns_err_code); // no-space variant
    }
    if (parsed != 2 || status != 0) {
        return false; // not a recognizable failure line
    }

    *out_dns_err_code = dns_err_code;
    return true;
}

/**
 * @brief Resolve @p host to an IPv4 literal using the modem's DNS resolver.
 *
 * If @p host is already an IPv4 literal it is returned as-is. Otherwise an
 * AT+CDNSGIP query is issued and the response parsed for either a successful
 * address or an explicit DNS error. Isolating resolution this way lets the
 * caller distinguish DNS faults from broker/TLS faults.
 *
 * @param host Hostname or IPv4 literal to resolve.
 * @param out_ip Destination for the resolved IPv4 literal.
 * @param out_ip_size Capacity of @p out_ip; must hold a full IPv4 literal.
 * @return true on a usable IPv4 address, false on transport or DNS failure.
 */
static bool tracker_mqtt_resolve_host_ipv4(const char *host, char *out_ip, size_t out_ip_size) {
    // Resolve the broker host explicitly so DNS failures can be isolated from broker or TLS failures.
    ESP_RETURN_ON_FALSE(!util_string_empty(host), false, TRACKER_MQTT_TAG, "dns host empty");
    ESP_RETURN_ON_FALSE(out_ip != NULL, false, TRACKER_MQTT_TAG, "dns out_ip null");
    ESP_RETURN_ON_FALSE(out_ip_size >= MQTT_RESOLVED_IPV4_MAX_LEN,
                        false,
                        TRACKER_MQTT_TAG,
                        "dns out_ip buffer too small");

    // Already an IP literal: skip the round-trip to the modem resolver.
    if (tracker_mqtt_parse_ipv4_literal(host, out_ip, out_ip_size)) {
        return true;
    }

    char cmd[96] = {0};
    int n = snprintf(cmd, sizeof(cmd), "AT+CDNSGIP=\"%s\"\r", host);
    ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < sizeof(cmd),
                        false,
                        TRACKER_MQTT_TAG,
                        "CDNSGIP cmd too long");

    // Collect mode: DNS replies can be multi-line and arrive with idle gaps.
    char response[MQTT_AT_RESPONSE_MAX_LEN] = {0};
    size_t response_len = 0U;
    esp_err_t err = modem_at_send_collect(cmd,
                                          (uint8_t *)response,
                                          sizeof(response),
                                          &response_len,
                                          MQTT_DNS_LOOKUP_TIMEOUT_MS,
                                          MQTT_DNS_LOOKUP_IDLE_TIMEOUT_MS);
    if (err != ESP_OK) {
        // Transport failure: the AT exchange itself did not complete.
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "mqtt dns lookup transport failed host=%s err=%s response_len=%u",
                 host,
                 esp_err_to_name(err),
                 (unsigned)response_len);
        tracker_mqtt_log_response_excerpt("mqtt dns lookup transport", response);
        return false;
    }

    // Preferred path: a confirmed address echoed for our exact hostname.
    if (tracker_mqtt_parse_dns_success(response, host, out_ip, out_ip_size)) {
        ESP_LOGI(TRACKER_MQTT_TAG, "mqtt dns lookup host=%s resolved_ip=%s", host, out_ip);
        return true;
    }

    // Explicit modem DNS error (status 0): log the precise reason.
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

    // Neither success nor a recognized error line: unparseable response.
    ESP_LOGW(TRACKER_MQTT_TAG,
             "mqtt dns lookup parse miss host=%s response_len=%u",
             host,
             (unsigned)response_len);
    tracker_mqtt_log_response_excerpt("mqtt dns lookup parse_miss", response);
    return false;
}

/**
 * @brief Build a `tcp://<ip>:<port>` endpoint from an already-resolved IPv4.
 *
 * Selects the implicit-TLS port when TLS is active, otherwise the configured
 * broker port, so a DNS-bypass retry connects on the correct transport.
 *
 * @param resolved_ip Resolved IPv4 literal.
 * @param server_addr Destination buffer for the endpoint URL.
 * @param server_addr_size Capacity of @p server_addr.
 * @return ESP_OK on success, ESP_ERR_INVALID_SIZE if the URL would overflow.
 */
static esp_err_t tracker_mqtt_build_resolved_server_addr(const char *resolved_ip,
                                                         char *server_addr,
                                                         size_t server_addr_size) {
    ESP_RETURN_ON_FALSE(!util_string_empty(resolved_ip),
                        ESP_ERR_INVALID_ARG,
                        TRACKER_MQTT_TAG,
                        "resolved_ip empty");
    ESP_RETURN_ON_NULL(server_addr, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "server_addr null");

    // TLS forces port 8883; otherwise honor the configured plaintext port.
    uint16_t port = s_tls_enabled ? MQTT_IMPLICIT_TLS_PORT : s_cfg.mqtt_port;
    int n = snprintf(server_addr, server_addr_size, "tcp://%s:%u", resolved_ip, (unsigned int)port);
    ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < server_addr_size,
                        ESP_ERR_INVALID_SIZE,
                        TRACKER_MQTT_TAG,
                        "resolved server addr too long");
    return ESP_OK;
}

/**
 * @brief Retry the broker connect against an explicitly resolved IPv4 address.
 *
 * Invoked after the hostname connect reports a DNS failure. Resolves the host
 * locally (or uses the Kconfig fallback IP), rebuilds the endpoint URL, and
 * issues a fresh CMQTTCONNECT so a flaky modem resolver does not block bring-up.
 *
 * @param out_connect_err_code Out: connect/DNS error code on failure.
 * @param out_timed_out Out: set when the underlying connect timed out.
 * @return ESP_OK on connect, ESP_FAIL when resolution and fallback both fail.
 */
static esp_err_t tracker_mqtt_connect_via_resolved_ip(int *out_connect_err_code, bool *out_timed_out) {
    // Retry the broker connect against an explicitly resolved IPv4 address when the modem reports hostname DNS failure.
    char resolved_ip[MQTT_RESOLVED_IPV4_MAX_LEN] = {0};
    if (!tracker_mqtt_resolve_host_ipv4(s_cfg.mqtt_host, resolved_ip, sizeof(resolved_ip))) {
        // Local resolution failed: fall back to a build-time configured IP if present.
        if (!util_string_empty(CONFIG_TRACKER_MQTT_DNS_FALLBACK_IPV4) &&
            tracker_mqtt_parse_ipv4_literal(CONFIG_TRACKER_MQTT_DNS_FALLBACK_IPV4,
                                            resolved_ip,
                                            sizeof(resolved_ip))) {
            ESP_LOGW(TRACKER_MQTT_TAG,
                     "mqtt dns lookup failed host=%s fallback_ip=%s source=kconfig",
                     s_cfg.mqtt_host,
                     resolved_ip);
        } else {
            // No resolved IP and no usable fallback: surface a DNS failure.
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
 * @brief Send a lifecycle AT command and validate its CMQTT* result line.
 *
 * Centralizes the send + result-parse + error-classification used by every
 * service/client lifecycle step (start, acquire, disconnect, release, stop).
 * A command is considered successful when either the transport succeeded or
 * the expected result prefix was parsed with an accepted code, so an idempotent
 * re-issue (e.g. "already started") that returns a benign code still passes.
 *
 * @param cmd AT command to send (with trailing CR).
 * @param timeout_ms Transport timeout for the command.
 * @param result_prefix Expected result prefix (e.g. "+CMQTTSTART:").
 * @param has_client_index true when the result line carries a client index.
 * @param allowed_codes Whitelist of tolerable status codes besides 0.
 * @param allowed_count Number of entries in @p allowed_codes.
 * @param out_err_code Optional out: the parsed status/error code.
 * @return ESP_OK on success/benign result, otherwise the transport or result
 *         error code.
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
            // Transport flagged an error, but the modem still emitted an accepted
            // result line: treat the parsed outcome as authoritative.
            ESP_LOGW(TRACKER_MQTT_TAG,
                     "Recovered lifecycle cmd via parsed result cmd=\"%s\" err=%s code=%d",
                     cmd,
                     esp_err_to_name(send_err),
                     err_code);
        }
        return ESP_OK;
    }

    // Both paths failed: salvage any error code from the raw text for diagnostics.
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
    // Transport ok but result rejected: report the result error (ESP_FAIL when
    // expect_err itself was ESP_OK but the code was not accepted).
    return expect_err == ESP_OK ? ESP_FAIL : expect_err;
}

/**
 * @brief Upload/select the CA certificate for server verification (TLS only).
 *
 * Only compiled in when server verification is enabled in Kconfig. The SIM7600
 * validates against certificate files stored inside the modem rather than the
 * ESP-IDF certificate bundle, so the named CA file must already be provisioned.
 * When verification is disabled the function is a logged no-op.
 *
 * @param cmd Scratch command buffer reused for the CSSLCFG command.
 * @param cmd_size Capacity of @p cmd.
 * @return ESP_OK on success/disabled, error code when the CA name is missing or
 *         the modem rejects the command.
 */
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
 * @brief Start the modem MQTT service (AT+CMQTTSTART).
 *
 * First step of session bring-up. Idempotent: a previously started service
 * short-circuits, and error code 23 ("already started") is accepted so a warm
 * modem does not fail the sequence.
 *
 * @return ESP_OK when the service is running, otherwise the command error.
 */
esp_err_t tracker_mqtt_start_service(void) {
    if (s_service_started) {
        return ESP_OK; // already running this boot
    }

    static const int accepted[] = {0, 23}; // 0 = started, 23 = already started
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

/**
 * @brief Configure the modem TLS (SSL) context for an implicit-TLS broker.
 *
 * Runs the CSSLCFG sequence on the SSL context slot, then binds that context to
 * the MQTT client with CMQTTSSLCFG. No-op when TLS is not required. The settings
 * applied are: TLS 1.2 only, authmode from Kconfig (server verify on/off), CA
 * certificate (when verifying), local-time-ignore policy, negotiation timeout,
 * and SNI so the broker selects the correct virtual host.
 *
 * @return ESP_OK on success or when TLS is disabled, ESP_FAIL on any modem
 *         rejection.
 */
esp_err_t tracker_mqtt_configure_tls(void) {
    if (!s_tls_enabled) {
        return ESP_OK; // plaintext endpoint: nothing to configure
    }

    char cmd[96] = {0};
    // sslversion=4 pins TLS 1.2, the version the broker accepts.
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

/**
 * @brief Acquire the modem MQTT client slot (AT+CMQTTACCQ).
 *
 * Claims client index 0, names it with the device id (used as the MQTT client
 * id), and selects plaintext vs TLS transport via the server type field. Code
 * 19 ("client already in use") is tolerated so a re-run after a partial bring-up
 * succeeds idempotently.
 *
 * @return ESP_OK on success or when the slot is already held, otherwise an
 *         ESP-IDF error code.
 */
esp_err_t tracker_mqtt_acquire_client(void) {
    if (s_client_acquired) {
        return ESP_OK; // slot already held in this process
    }

    static const int accepted[] = {0, 19}; // 0=acquired, 19=already in use (benign)
    char cmd[220] = {0};
    // CMQTTACCQ=<client>,<client_id>,<server_type>,<utf8>: server_type 1 = TLS, 0 = plain.
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
    s_client_acquired = true; // slot now owned by this adapter
    return ESP_OK;
}

/**
 * @brief Apply per-client modem options before connecting (AT+CMQTTCFG).
 *
 * Disables the modem's UTF-8 validity check (payloads are raw JSON bytes, not
 * guaranteed UTF-8) and sets the modem-side operation timeout used for publish
 * and other client operations.
 *
 * @return ESP_OK on success, ESP_FAIL on any rejection.
 */
esp_err_t tracker_mqtt_apply_client_options(void) {
    // checkUTF8,0,0 turns off UTF-8 enforcement so arbitrary JSON bytes pass through.
    ESP_RETURN_ON_FALSE(modem_at_send_expect("AT+CMQTTCFG=\"checkUTF8\",0,0\r", "OK", MQTT_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TRACKER_MQTT_TAG,
                        "CMQTTCFG checkUTF8 failed");

    char cmd[80] = {0};
    // optimeout bounds how long the modem waits on a single MQTT operation.
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

/**
 * @brief Probe the modem for the current broker connection state via CMQTTDISC?.
 *
 * Issues AT+CMQTTDISC? and parses the +CMQTTDISC: <client>,<state> line, where
 * state 0 means the broker session is still live. This is the authoritative way
 * to learn whether the modem already holds a usable session (e.g. after a reset
 * of the firmware while the modem stayed powered).
 *
 * @param out_disc_state Out: parsed disconnect state (0 = connected).
 * @param quiet When true, suppress command/result logging to avoid noise on
 *        repeated background probes.
 * @return true if the state line was found and parsed for our client index.
 */
bool tracker_mqtt_query_disconnect_state_with_policy(int *out_disc_state, bool quiet) {
    ESP_RETURN_ON_FALSE(out_disc_state != NULL, false, TRACKER_MQTT_TAG, "out_disc_state null");

    char response[MQTT_AT_RESPONSE_MAX_LEN] = {0};
    // Use the policy-aware sender so a disconnect-implying error also flips cached state.
    if (tracker_mqtt_send_cmd_with_policy("AT+CMQTTDISC?\r",
                                          MQTT_CMD_TIMEOUT_MS,
                                          response,
                                          sizeof(response),
                                          !quiet,   // log command only when not quiet
                                          !quiet) != ESP_OK) { // log result only when not quiet
        return false;
    }
    return tracker_mqtt_parse_disconnect_state(response, out_disc_state);
}

/**
 * @brief Verbose wrapper around the disconnect-state probe.
 *
 * @param out_disc_state Out: parsed disconnect state (0 = connected).
 * @return true if the state line was found and parsed.
 */
bool tracker_mqtt_query_disconnect_state(int *out_disc_state) {
    return tracker_mqtt_query_disconnect_state_with_policy(out_disc_state, false);
}

/**
 * @brief Adopt a broker session the modem already holds, skipping full bring-up.
 *
 * When the modem reports an open session (disc_state 0) the firmware can resume
 * it instead of re-running CMQTTSTART/ACCQ/CONNECT. Cached lifecycle flags are
 * forced to the "connected" shape, but the subscription flag is cleared because
 * the adopted session has no guaranteed subscriptions.
 *
 * @param reason Short cause string for diagnostics only.
 * @param quiet_query Suppress probe logging when true.
 * @return true if a live session was found and adopted.
 */
bool tracker_mqtt_resume_connected_session(const char *reason, bool quiet_query) {
    int disc_state = -1;
    // Only adopt the session when the modem confirms it is still connected.
    if (!tracker_mqtt_query_disconnect_state_with_policy(&disc_state, quiet_query) || disc_state != 0) {
        return false;
    }

    // Reconstruct the cached lifecycle state to match a fully connected client.
    s_service_started = true;
    s_client_acquired = true;
    s_connected = true;
    s_commands_subscribed = false; // adopted session may have no live subscription
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
        // Anonymous connect: <client>,<addr>,<keepalive>,1 (1 = clean session).
        n = snprintf(cmd,
                     cmd_size,
                     "AT+CMQTTCONNECT=%d,\"%s\",%u,1\r",
                     MQTT_CLIENT_INDEX,
                     server_addr,
                     (unsigned int)MQTT_DEFAULT_KEEPALIVE_S);
    } else {
        // Authenticated connect appends quoted username/password credentials.
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

/**
 * @brief Poll for a silently-connected session after an inconclusive connect.
 *
 * Some modem builds open the broker socket without returning an inline
 * +CMQTTCONNECT result. This polls CMQTTDISC? for a short window and treats a
 * disc_state of 0 (still connected) as a successful connect, draining URC bytes
 * between probes so a late async result can also break the loop.
 *
 * @param out_connect_err_code Optional out: set to 0 when the probe succeeds.
 * @return true if the session is detected connected within the probe window.
 */
static bool tracker_mqtt_probe_connected_session_window(int *out_connect_err_code) {
    uint64_t probe_start_ms = util_uptime_ms();
    // Probe repeatedly until the bounded window elapses.
    while ((util_uptime_ms() - probe_start_ms) < MQTT_CONNECT_SESSION_PROBE_WINDOW_MS) {
        int disc_state = -1;
        // disc_state == 0 means the modem still holds a live broker connection.
        if (tracker_mqtt_query_disconnect_state(&disc_state) && disc_state == 0) {
            tracker_mqtt_reset_connect_wait();
            s_connected = true;
            s_commands_subscribed = false; // fresh session: re-subscribe later
            ESP_LOGI(TRACKER_MQTT_TAG, "CMQTTCONNECT session probe connected (disc_state=%d)", disc_state);
            if (out_connect_err_code != NULL) {
                *out_connect_err_code = 0;
            }
            return true;
        }
        if (s_connect_result_ready) {
            break; // an async +CMQTTCONNECT result arrived; let the caller handle it
        }

        (void)modem_at_poll_urc(MQTT_POLL_MAX_BYTES); // pull pending URC bytes
        vTaskDelay(pdMS_TO_TICKS(MQTT_CONNECT_SESSION_PROBE_INTERVAL_MS)); // pace the probe
    }

    return false;
}

/**
 * @brief Resolve a connect-result wait timeout into a final connect outcome.
 *
 * After the async connect wait times out, the broker may in fact be connected
 * (the result URC was lost). This makes one last CMQTTDISC? probe: if connected,
 * the timeout is downgraded to success; otherwise cached state is flipped to
 * disconnected and the timeout is reported.
 *
 * @param server_addr Endpoint that was attempted (for diagnostics only).
 * @param out_connect_err_code Optional out: 0 if rescued, else no-connection code.
 * @param out_timed_out Optional out: set true when the timeout stands.
 * @return ESP_OK if the session was found connected, ESP_ERR_TIMEOUT otherwise.
 */
static esp_err_t tracker_mqtt_handle_connect_timeout(const char *server_addr,
                                                     int *out_connect_err_code,
                                                     bool *out_timed_out) {
    int disc_state = -1;
    // Last-chance probe: the socket may have opened despite the lost result.
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

    // Probe also failed: the connection genuinely did not come up.

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

/**
 * @brief Report a broker-rejected connect attempt and update cached state.
 *
 * Called when the modem returns a non-zero +CMQTTCONNECT status. Flips cached
 * state to disconnected when the code implies a dead link, then logs a
 * human-readable error name for field diagnostics.
 *
 * @param server_addr Endpoint that was attempted (for diagnostics only).
 * @param connect_err Non-zero connect status code from the modem.
 * @param out_connect_err_code Optional out: echoes @p connect_err to the caller.
 * @return ESP_FAIL always (the attempt was rejected).
 */
static esp_err_t tracker_mqtt_handle_connect_rejection(const char *server_addr,
                                                       int connect_err,
                                                       int *out_connect_err_code) {
    // Only link-loss codes should clear the cached connected state.
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

/**
 * @brief Perform a single CMQTTCONNECT attempt against one endpoint.
 *
 * Issues the connect command and resolves completion across three modem
 * behaviours: an inline +CMQTTCONNECT result, a silently-opened session
 * (detected by probe), or a deferred async result. Cached connected state is
 * set only on a confirmed success; on a fresh session the command-subscription
 * cache is cleared so the command topic is reasserted afterwards.
 *
 * @param server_addr Endpoint URL (tcp://host:port) to connect to.
 * @param out_connect_err_code Optional out: final modem status/error code.
 * @param out_timed_out Optional out: true when the attempt timed out.
 * @return ESP_OK on connect, ESP_FAIL on rejection, ESP_ERR_TIMEOUT on timeout,
 *         ESP_ERR_INVALID_ARG/SIZE on bad input.
 */
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

/**
 * @brief Send one diagnostic AT query and log a bounded summary of the reply.
 *
 * Used by the connect-failure diagnostics bundle to capture the modem's own
 * view of MQTT/PDP/DNS state. The full response excerpt is suppressed for
 * AT+CMQTTCONNECT? because that reply can include the broker credentials.
 *
 * @param cmd Diagnostic AT command to issue.
 * @param timeout_ms Modem response timeout in milliseconds.
 */
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
        // CMQTTCONNECT? echoes credentials; log only its length, not its body.
        tracker_mqtt_log_response_excerpt("mqtt diag", response);
    }
}

void tracker_mqtt_log_connect_diagnostics(void) {
    // Emit the standard MQTT connectivity diagnostic bundle here when a connect path needs more context.
    tracker_mqtt_log_diag_cmd("AT+CMQTTDISC?\r", MQTT_CMD_TIMEOUT_MS);  // current MQTT disconnect state
    tracker_mqtt_log_diag_cmd("AT+CMQTTACCQ?\r", MQTT_CMD_TIMEOUT_MS);   // client-slot acquisition state
    tracker_mqtt_log_diag_cmd("AT+CMQTTCONNECT?\r", MQTT_CMD_TIMEOUT_MS); // broker connection state
    tracker_mqtt_log_diag_cmd("AT+CGCONTRDP=1\r", MQTT_CMD_TIMEOUT_MS);  // PDP context / assigned IP
    tracker_mqtt_log_diag_cmd("AT+CDNSCFG?\r", MQTT_CMD_TIMEOUT_MS);     // configured DNS servers
    if (!util_string_empty(s_cfg.mqtt_host)) {
        // Re-run a DNS lookup so its result/error is captured alongside the other diagnostics.
        char resolved_ip[MQTT_RESOLVED_IPV4_MAX_LEN] = {0};
        (void)tracker_mqtt_resolve_host_ipv4(s_cfg.mqtt_host, resolved_ip, sizeof(resolved_ip));
    }
}

/**
 * @brief Issue AT+CMQTTDISC to gracefully disconnect from the broker.
 *
 * Skipped when neither a connection nor a client slot is held. Codes 9
 * (network not opened) and 11 (no connection) are tolerated because they mean
 * the link is already gone, which is an acceptable outcome for a disconnect.
 * Cached connected/subscription flags are always cleared regardless of result.
 *
 * @return ESP_OK on success or tolerated state, otherwise the command error.
 */
esp_err_t tracker_mqtt_send_disconnect(void) {
    if (!s_connected && !s_client_acquired) {
        return ESP_OK; // nothing to disconnect
    }

    // Accept 0 (disconnected), 9 (network not opened), 11 (no connection): all mean "link is down".
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

/**
 * @brief Issue AT+CMQTTREL to release the acquired client slot.
 *
 * Skipped when no slot is held. Code 20 is tolerated as a benign outcome.
 * If the modem reports the client is still in use (cannot release yet), the
 * caller is told to retry later via ESP_ERR_NOT_FINISHED rather than failing
 * outright; the slot flag is cleared only on a real release.
 *
 * @return ESP_OK when released, ESP_ERR_NOT_FINISHED to retry, else the error.
 */
esp_err_t tracker_mqtt_release_client(void) {
    if (!s_client_acquired) {
        return ESP_OK; // no slot to release
    }

    // Accept 0 (released) and 20 (benign): both leave the slot free.
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
        s_client_acquired = false; // slot is now free
        return ESP_OK;
    }
    if (err_code == MQTT_ERR_CLIENT_IS_USED) {
        // Connection still tearing down: ask the caller to retry the release.
        ESP_LOGW(TRACKER_MQTT_TAG, "CMQTTREL deferred: client still in use");
        return ESP_ERR_NOT_FINISHED;
    }
    return err;
}

/**
 * @brief Issue AT+CMQTTSTOP to stop the modem MQTT service.
 *
 * Skipped when the service was never started. Code 9 is tolerated as benign.
 * If the modem reports the client has not been released yet, the caller is
 * asked to retry (release first) via ESP_ERR_NOT_FINISHED. The service flag
 * is cleared only on a real stop.
 *
 * @return ESP_OK when stopped, ESP_ERR_NOT_FINISHED to retry, else the error.
 */
esp_err_t tracker_mqtt_stop_service(void) {
    if (!s_service_started) {
        return ESP_OK; // service not running
    }

    // Accept 0 (stopped) and 9 (network not opened): both leave the service down.
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
        s_service_started = false; // service is now stopped
        return ESP_OK;
    }
    if (err_code == MQTT_ERR_CLIENT_NOT_RELEASED) {
        // Stop is invalid until the client slot is freed: ask caller to retry.
        ESP_LOGW(TRACKER_MQTT_TAG, "CMQTTSTOP deferred: client not released");
        return ESP_ERR_NOT_FINISHED;
    }
    return err;
}

/**
 * @brief Best-effort teardown after a failed connect attempt.
 *
 * Runs the disconnect -> release -> stop sequence with bounded retries so a
 * half-open modem state cannot strand the service. Release and stop are retried
 * because they can transiently report "still in use"/"not released" while the
 * link finishes tearing down. A global 60s deadline caps the whole sequence so
 * a pathological modem cannot block the connection state machine for minutes.
 * All cached state is force-cleared at the end regardless of per-step results.
 *
 * @return The first non-OK error encountered, or ESP_OK if every step cleared.
 */
esp_err_t tracker_mqtt_cleanup_after_connect_failure(void) {
    esp_err_t first_err = ESP_OK; // remember the earliest failure to report
    /* Total cleanup deadline: 60s max regardless of individual command timeouts.
     * Prevents pathological modem states from blocking the FSM for minutes. */
    uint64_t cleanup_deadline_ms = util_uptime_ms() + 60000ULL;

    esp_err_t disc_err = tracker_mqtt_send_disconnect();
    if (first_err == ESP_OK && disc_err != ESP_OK) {
        first_err = disc_err;
    }

    // Release stage: re-issue disconnect then release until the slot frees or retries/deadline exhaust.
    esp_err_t rel_err = ESP_OK;
    uint32_t rel_attempts_performed = 0;
    for (uint32_t i = 0; i < MQTT_CONNECT_CLEANUP_RETRY_MAX; ++i) {
        if (util_uptime_ms() >= cleanup_deadline_ms) {
            ESP_LOGW(TRACKER_MQTT_TAG, "MQTT cleanup deadline hit stage=release");
            break;
        }
        rel_attempts_performed = i + 1U;
        disc_err = tracker_mqtt_send_disconnect(); // ensure link is down before releasing
        if (first_err == ESP_OK && disc_err != ESP_OK) {
            first_err = disc_err;
        }

        rel_err = tracker_mqtt_release_client();
        if (rel_err == ESP_OK) {
            break; // slot freed
        }
        vTaskDelay(pdMS_TO_TICKS(MQTT_CONNECT_CLEANUP_RETRY_DELAY_MS)); // back off, then retry
    }
    if (first_err == ESP_OK && rel_err != ESP_OK) {
        first_err = rel_err;
    }

    // Stop stage: stop the service, re-releasing the client between attempts if it complains.
    esp_err_t stop_err = ESP_OK;
    uint32_t stop_attempts_performed = 0;
    for (uint32_t i = 0; i < MQTT_CONNECT_CLEANUP_RETRY_MAX; ++i) {
        if (util_uptime_ms() >= cleanup_deadline_ms) {
            ESP_LOGW(TRACKER_MQTT_TAG, "MQTT cleanup deadline hit stage=stop");
            break;
        }
        stop_attempts_performed = i + 1U;
        stop_err = tracker_mqtt_stop_service();
        if (stop_err == ESP_OK) {
            break; // service stopped
        }

        (void)tracker_mqtt_release_client(); // stop may need the client released first
        vTaskDelay(pdMS_TO_TICKS(MQTT_CONNECT_CLEANUP_RETRY_DELAY_MS)); // back off, then retry
    }
    if (first_err == ESP_OK && stop_err != ESP_OK) {
        first_err = stop_err;
    }

    // Force cached state back to a clean slate so the next connect starts fresh.
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

/**
 * @brief Full broker bring-up: start -> acquire -> configure -> connect.
 *
 * Idempotent: returns immediately when already connected, or adopts a session
 * the modem still holds (via the pre-connect probe) to avoid redundant
 * CMQTTSTART/ACCQ churn. After the modem-side setup steps it tries the primary
 * endpoint, then applies a tiered retry policy:
 *  - DNS failure on the hostname -> retry against an explicitly resolved IPv4.
 *  - A separate fallback endpoint (the TLS host's non-port variant) is tried
 *    only when the failure class makes it worthwhile; it is intentionally
 *    skipped for DNS/timeout/unsupported errors and after a TLS-primary timeout
 *    so the retry budget is not wasted on an endpoint that cannot help.
 * On final failure it logs modem-side diagnostics and runs the cleanup
 * sequence so the next attempt starts from a known-clean state.
 *
 * @return ESP_OK once connected, otherwise the last connect error.
 */
esp_err_t tracker_mqtt_session_connect(void) {
    if (s_connected) {
        return ESP_OK; // already connected
    }
    // Adopt a session the modem kept alive across our restart, if any.
    if (tracker_mqtt_resume_connected_session("pre_connect_probe", true)) {
        return ESP_OK;
    }

    // Modem-side bring-up must complete in order before the broker handshake.
    ESP_RETURN_ON_FALSE(tracker_mqtt_start_service() == ESP_OK, ESP_FAIL, TRACKER_MQTT_TAG, "start service failed");
    ESP_RETURN_ON_FALSE(tracker_mqtt_acquire_client() == ESP_OK, ESP_FAIL, TRACKER_MQTT_TAG, "acquire client failed");
    ESP_RETURN_ON_FALSE(tracker_mqtt_apply_client_options() == ESP_OK,
                        ESP_FAIL,
                        TRACKER_MQTT_TAG,
                        "apply options failed");
    ESP_RETURN_ON_FALSE(tracker_mqtt_configure_tls() == ESP_OK, ESP_FAIL, TRACKER_MQTT_TAG, "configure tls failed");
    // Setup may have re-established a live session; adopt it instead of reconnecting.
    if (tracker_mqtt_resume_connected_session("post_setup_probe", false)) {
        return ESP_OK;
    }

    // First attempt: the configured primary endpoint.
    int connect_err_code = 0;
    bool connect_timed_out = false;
    esp_err_t err = tracker_mqtt_connect_once(s_server_addr_primary, &connect_err_code, &connect_timed_out);

    // DNS-specific retry: bypass modem name resolution by connecting to a literal IPv4.
    if (err != ESP_OK && connect_err_code == MQTT_ERR_DNS_FAILURE) {
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "mqtt primary connect failed due to dns retry=resolved_ip host=%s",
                 s_cfg.mqtt_host);
        connect_err_code = 0;
        connect_timed_out = false;
        err = tracker_mqtt_connect_via_resolved_ip(&connect_err_code, &connect_timed_out);
    }

    // Decide whether the secondary endpoint is worth trying for this failure class.
    bool should_try_fallback = s_server_addr_has_fallback;
    if (should_try_fallback &&
        (connect_err_code == MQTT_ERR_DNS_FAILURE || connect_err_code == MQTT_ERR_TIMEOUT)) {
        // DNS/timeout already handled by the resolved-IP retry; fallback host would repeat it.
        should_try_fallback = false;
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "MQTT hostname fallback skipped after post-primary retry connect_err=%d err_name=%s",
                 connect_err_code,
                 tracker_mqtt_connect_err_name(connect_err_code));
    }
    if (should_try_fallback && connect_err_code == MQTT_ERR_NOT_SUPPORTED_OPERATION) {
        // Modem is in a state that needs a full cleanup, not another endpoint.
        should_try_fallback = false;
        ESP_LOGW(TRACKER_MQTT_TAG, "MQTT fallback skipped connect_err=%d; forcing cleanup", connect_err_code);
    }
    if (should_try_fallback && s_tls_enabled && connect_timed_out) {
        // TLS primary timed out: the plaintext fallback would downgrade security, so keep retrying TLS.
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
        // Capture modem-side state and reset to a clean slate for the next attempt.
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

/**
 * @brief Full broker teardown: disconnect -> release client -> stop service.
 *
 * Runs all three steps unconditionally (each is internally a no-op when its
 * resource is not held) so a partially-established session is fully unwound.
 * Cached state is force-cleared at the end. The first non-OK step is reported
 * but never short-circuits the remaining teardown.
 *
 * @return The first error encountered, or ESP_OK when every step cleared.
 */
esp_err_t tracker_mqtt_session_disconnect(void) {
    esp_err_t first_err = ESP_OK; // earliest failure wins for the return value

    // Tear down in reverse order of bring-up; keep going even if a step fails.
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

    // Clear all cached session state regardless of per-step outcomes.
    s_connected = false;
    s_service_started = false;
    s_client_acquired = false;
    s_commands_subscribed = false;
    tracker_mqtt_rx_reset();
    tracker_mqtt_reset_connect_wait();
    tracker_mqtt_reset_publish_wait();
    return first_err;
}
