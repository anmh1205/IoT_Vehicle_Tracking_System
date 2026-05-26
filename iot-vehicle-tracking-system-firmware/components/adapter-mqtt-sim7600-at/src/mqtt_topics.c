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
 * @brief Check if host forces default TLS port.
 *
 * @param host Server host.
 * @return True if forces TLS.
 */
bool tracker_mqtt_host_forces_tls_default_port(const char *host) {
    return !util_string_empty(host) && strcmp(host, TRACKER_MQTT_TLS_HOST) == 0;
}

/**
 * @brief Check if TLS should be used.
 *
 * @param cfg Configuration.
 * @return True if TLS required.
 */
bool tracker_mqtt_use_tls(const config_t *cfg) {
    return cfg != NULL &&
           (tracker_mqtt_host_forces_tls_default_port(cfg->mqtt_host) || cfg->mqtt_port == MQTT_IMPLICIT_TLS_PORT);
}

esp_err_t tracker_mqtt_build_server_addrs(const config_t *cfg) {
    // Build the broker endpoint strings here once so connect logic can switch between primary and fallback cleanly.
    ESP_RETURN_ON_NULL(cfg, ESP_ERR_INVALID_ARG, TRACKER_MQTT_TAG, "cfg null");
    ESP_RETURN_ON_FALSE(!util_string_empty(cfg->mqtt_host),
                        ESP_ERR_INVALID_ARG,
                        TRACKER_MQTT_TAG,
                        "mqtt_host empty");

    s_server_addr_has_fallback = false;
    if (tracker_mqtt_host_forces_tls_default_port(cfg->mqtt_host)) {
        int n = snprintf(s_server_addr_primary,
                         sizeof(s_server_addr_primary),
                         "tcp://%s:%u",
                         cfg->mqtt_host,
                         (unsigned int)MQTT_IMPLICIT_TLS_PORT);
        ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < sizeof(s_server_addr_primary),
                            ESP_ERR_INVALID_SIZE,
                            TRACKER_MQTT_TAG,
                            "primary addr too long");

        n = snprintf(s_server_addr_fallback, sizeof(s_server_addr_fallback), "tcp://%s", cfg->mqtt_host);
        ESP_RETURN_ON_FALSE(n > 0 && (size_t)n < sizeof(s_server_addr_fallback),
                            ESP_ERR_INVALID_SIZE,
                            TRACKER_MQTT_TAG,
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
                        TRACKER_MQTT_TAG,
                        "server addr too long");
    return ESP_OK;
}

/**
 * @brief Build MQTT topics from device ID.
 */
void tracker_mqtt_build_topics(void) {
    // Compose every device-scoped topic here once so publish and subscribe paths share the exact same names.
    int n = snprintf(s_topic_rawdata, sizeof(s_topic_rawdata), "v1/%s/rawdata", s_cfg.device_id);
    if (n < 0 || (size_t)n >= sizeof(s_topic_rawdata)) {
        ESP_LOGW(TRACKER_MQTT_TAG, "rawdata topic truncated");
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
