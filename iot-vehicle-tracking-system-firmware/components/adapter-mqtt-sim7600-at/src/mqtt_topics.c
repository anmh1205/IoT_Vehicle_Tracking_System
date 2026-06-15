#include "mqtt_internal.h"

#include <stdio.h>

#include "esp_log.h"

#include "util.h"

/**
 * @file mqtt_topics.c
 * @brief Topic and server-address builders for the tracker MQTT facade.
 * This translation unit belongs to the SIM7600 AT MQTT adapter layer and keeps adapter-local state, topic wiring, and broker command sequencing isolated behind the exported entry points.
 */


/**
 * @brief Test whether a host must use implicit TLS on the default secure port.
 *
 * The adapter recognizes one well-known broker hostname that always implies
 * implicit TLS on port 8883 regardless of the configured port value. This lets
 * a bare hostname (no explicit port) still select the secure code path.
 *
 * @param host Configured broker hostname (may be NULL/empty).
 * @return true when @p host matches the TLS-only sentinel host.
 */
bool tracker_mqtt_host_forces_tls_default_port(const char *host) {
    return !util_string_empty(host) && strcmp(host, TRACKER_MQTT_TLS_HOST) == 0;
}

/**
 * @brief Decide whether the MQTT connection must use implicit TLS.
 *
 * TLS is selected when either the host is the TLS-only sentinel or the
 * configured port is the standard implicit-TLS MQTT port (8883). The result
 * drives CMQTTACCQ/CSSLCFG so the modem opens a secure socket.
 *
 * @param cfg Runtime configuration (may be NULL).
 * @return true when implicit TLS is required.
 */
bool tracker_mqtt_use_tls(const config_t *cfg) {
    return cfg != NULL &&
           (tracker_mqtt_host_forces_tls_default_port(cfg->mqtt_host) || cfg->mqtt_port == MQTT_IMPLICIT_TLS_PORT);
}

/**
 * @brief Build the primary (and optional fallback) broker endpoint URLs.
 *
 * Formats the `tcp://host:port` strings the modem's CMQTTCONNECT consumes.
 * For the TLS-only sentinel host two endpoints are produced: a primary with an
 * explicit `:8883` port and a fallback without an explicit port, so connect
 * logic can retry a bare-host form if the explicit-port form fails. For every
 * other host a single primary endpoint using the configured port is built.
 *
 * @param cfg Runtime configuration providing host and port.
 * @return ESP_OK on success, ESP_ERR_INVALID_ARG on NULL/empty host,
 *         ESP_ERR_INVALID_SIZE if a formatted endpoint would overflow.
 */
esp_err_t tracker_mqtt_build_server_addrs(const config_t *cfg) {
    // Build the broker endpoint strings here once so connect logic can switch between primary and fallback cleanly.
    ESP_RETURN_ON_NULL(cfg, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "cfg null");
    ESP_RETURN_ON_FALSE(!util_string_empty(cfg->mqtt_host),
                        ESP_ERR_INVALID_ARG,
                        TRACKER_MQTT_TAG,
                        "mqtt_host empty");

    s_server_addr_has_fallback = false; // assume no fallback until the TLS host path sets one
    if (tracker_mqtt_host_forces_tls_default_port(cfg->mqtt_host)) {
        // Primary form pins the implicit-TLS port (tcp://host:8883).
        int n = snprintf(s_server_addr_primary,
                         sizeof(s_server_addr_primary),
                         "tcp://%s:%u",
                         cfg->mqtt_host,
                         (unsigned int)MQTT_IMPLICIT_TLS_PORT);
        ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < sizeof(s_server_addr_primary),
                            ESP_ERR_INVALID_SIZE,
                            TRACKER_MQTT_TAG,
                            "primary addr too long");

        // Fallback form omits the explicit port so the modem applies its own default.
        n = snprintf(s_server_addr_fallback, sizeof(s_server_addr_fallback), "tcp://%s", cfg->mqtt_host);
        ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < sizeof(s_server_addr_fallback),
                            ESP_ERR_INVALID_SIZE,
                            TRACKER_MQTT_TAG,
                            "fallback addr too long");
        s_server_addr_has_fallback = true; // both endpoints valid; connect path may retry
        return ESP_OK;
    }

    // Generic host: a single endpoint using the explicitly configured port.
    int n = snprintf(s_server_addr_primary,
                     sizeof(s_server_addr_primary),
                     "tcp://%s:%u",
                     cfg->mqtt_host,
                     (unsigned int)cfg->mqtt_port);
    ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < sizeof(s_server_addr_primary),
                        ESP_ERR_INVALID_SIZE,
                        TRACKER_MQTT_TAG,
                        "server addr too long");
    return ESP_OK;
}

/**
 * @brief Build all device-scoped MQTT topic strings from the device ID.
 *
 * Composes the five `v1/{device_id}/<class>` topics (rawdata, status, events,
 * firmware, commands) into their bounded buffers. Truncation is logged but not
 * treated as fatal here; the publish/subscribe paths validate topic length
 * before use. Centralizing construction guarantees publish and subscribe refer
 * to byte-identical topic names.
 */
void tracker_mqtt_build_topics(void) {
    // Compose every device-scoped topic here once so publish and subscribe paths share the exact same names.
    int n = snprintf(s_topic_rawdata, sizeof(s_topic_rawdata), "v1/%s/rawdata", s_cfg.device_id);
    if (n < 0 || (size_t)n >= sizeof(s_topic_rawdata)) {
        ESP_LOGW(TRACKER_MQTT_TAG, "rawdata topic truncated"); // device_id too long for buffer
    }

    n = snprintf(s_topic_status, sizeof(s_topic_status), "v1/%s/status", s_cfg.device_id);
    if (n < 0 || (size_t)n >= sizeof(s_topic_status)) {
        ESP_LOGW(TRACKER_MQTT_TAG, "status topic truncated");
    }

    n = snprintf(s_topic_events, sizeof(s_topic_events), "v1/%s/events", s_cfg.device_id);
    if (n < 0 || (size_t)n >= sizeof(s_topic_events)) {
        ESP_LOGW(TRACKER_MQTT_TAG, "events topic truncated");
    }

    n = snprintf(s_topic_firmware, sizeof(s_topic_firmware), "v1/%s/firmware", s_cfg.device_id);
    if (n < 0 || (size_t)n >= sizeof(s_topic_firmware)) {
        ESP_LOGW(TRACKER_MQTT_TAG, "firmware topic truncated");
    }

    n = snprintf(s_topic_commands, sizeof(s_topic_commands), "v1/%s/commands", s_cfg.device_id);
    if (n < 0 || (size_t)n >= sizeof(s_topic_commands)) {
        ESP_LOGW(TRACKER_MQTT_TAG, "commands topic truncated");
    }
}
