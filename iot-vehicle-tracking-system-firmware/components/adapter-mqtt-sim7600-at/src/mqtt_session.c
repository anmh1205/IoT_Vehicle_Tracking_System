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

static esp_err_t tracker_mqtt_send_lifecycle_cmd(const char *cmd,
                                                 uint32_t timeout_ms,
                                                 const char *result_prefix,
                                                 bool has_client_index,
                                                 const int *allowed_codes,
                                                 size_t allowed_count,
                                                 int *out_err_code) {
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
             "Lifecycle cmd failed cmd=\"%s\" send_err=%s expect_err=%s parsed=%d err_code=%d extracted=%d resp=\"%s\"",
             cmd,
             esp_err_to_name(send_err),
             esp_err_to_name(expect_err),
             parsed ? 1 : 0,
             err_code,
             extracted ? extracted_err_code : -1,
             response);

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

    ESP_LOGW(TRACKER_MQTT_TAG, "CMQTTCONNECT result timeout server=%s", server_addr);
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

    ESP_LOGW(TRACKER_MQTT_TAG, "CMQTTCONNECT rejected server=%s err=%d", server_addr, connect_err);
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
        if (tracker_mqtt_probe_connected_session_window(out_connect_err_code)) {
            return ESP_OK;
        }

        esp_err_t wait_err = tracker_mqtt_wait_connect_result(&connect_err);
        tracker_mqtt_reset_connect_wait();
        if (wait_err != ESP_OK) {
            return tracker_mqtt_handle_connect_timeout(server_addr, out_connect_err_code, out_timed_out);
        }

        if (connect_err != 0) {
            return tracker_mqtt_handle_connect_rejection(server_addr, connect_err, out_connect_err_code);
        }
    } else {
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

    s_connected = true;
    s_commands_subscribed = false;
    ESP_LOGI(TRACKER_MQTT_TAG, "MQTT connected server=%s", server_addr);
    return ESP_OK;
}

static void tracker_mqtt_log_diag_cmd(const char *cmd, uint32_t timeout_ms) {
    if (util_string_empty(cmd)) {
        ESP_LOGW(TRACKER_MQTT_TAG, "diag cmd empty");
        return;
    }

    char response[MQTT_AT_RESPONSE_MAX_LEN] = {0};
    esp_err_t err = tracker_mqtt_send_cmd(cmd, timeout_ms, response, sizeof(response));
    if (err != ESP_OK) {
        ESP_LOGW(TRACKER_MQTT_TAG,
                 "MQTT diag command failed cmd=\"%s\" err=%s resp=\"%s\"",
                 cmd,
                 esp_err_to_name(err),
                 response);
        return;
    }

    ESP_LOGI(TRACKER_MQTT_TAG, "MQTT diag cmd=\"%s\" resp=\"%s\"", cmd, response);
}

void tracker_mqtt_log_connect_diagnostics(void) {
    tracker_mqtt_log_diag_cmd("AT+CMQTTDISC?\r", MQTT_CMD_TIMEOUT_MS);
    tracker_mqtt_log_diag_cmd("AT+CMQTTACCQ?\r", MQTT_CMD_TIMEOUT_MS);
    tracker_mqtt_log_diag_cmd("AT+CMQTTCONNECT?\r", MQTT_CMD_TIMEOUT_MS);
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

    bool should_try_fallback = s_server_addr_has_fallback;
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
        ESP_LOGW(TRACKER_MQTT_TAG, "MQTT primary connect failed, retry fallback server=%s", s_server_addr_fallback);
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
