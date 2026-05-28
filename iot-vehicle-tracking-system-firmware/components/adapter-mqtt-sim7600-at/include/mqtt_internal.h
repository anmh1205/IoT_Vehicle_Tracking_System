#pragma once

#include <stdbool.h>
#include <stddef.h>

#include "app_config.h"
#include "mqtt_client.h"

/**
 * @file mqtt_internal.h
 * @brief Shared runtime state and helper declarations for split MQTT modules.
 * This header belongs to the SIM7600 AT MQTT adapter layer and exposes the MQTT transport boundary so higher layers do not depend on CMQTT command details.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


#define TRACKER_MQTT_TAG "TRACKER_MQTT"
#define MQTT_TOPIC_MAX_LEN 96
#define MQTT_SERVER_ADDR_MAX_LEN 128
#define MQTT_AT_RESPONSE_MAX_LEN 1024
#define MQTT_COMMAND_PAYLOAD_MAX_LEN 1024
#define MQTT_DEFAULT_KEEPALIVE_S 60
#define MQTT_DEFAULT_OPERATION_TIMEOUT_S 120
#define MQTT_DEFAULT_PUBLISH_TIMEOUT_S 120
#define MQTT_DEFAULT_DISCONNECT_TIMEOUT_S 120
#define MQTT_CLIENT_INDEX 0
#define MQTT_SSL_CTX_INDEX 1
#define MQTT_INPUT_TIMEOUT_MS 8000U
#define MQTT_CONNECT_TIMEOUT_MS 30000U
#define MQTT_CMD_TIMEOUT_MS 15000U
#define MQTT_POLL_MAX_BYTES 256U
#define MQTT_CONNECT_RESULT_POLL_MS 100U
#define MQTT_CONNECT_SESSION_PROBE_WINDOW_MS 8000U
#define MQTT_CONNECT_SESSION_PROBE_INTERVAL_MS 500U
#define MQTT_IMPLICIT_TLS_PORT 8883U
#define TRACKER_MQTT_TLS_HOST "mqtt.thingdock.dev"
#define MQTT_ERR_NETWORK_NOT_OPENED 9
#define MQTT_ERR_NO_CONNECTION 11
#define MQTT_ERR_NOT_SUPPORTED_OPERATION 13
#define MQTT_ERR_TIMEOUT 17
#define MQTT_ERR_CLIENT_IS_USED 19
#define MQTT_ERR_CLIENT_NOT_RELEASED 21
#define MQTT_ERR_DNS_FAILURE 25
#define MQTT_ERR_SOCKET_CLOSED_BY_SERVER 26
#define MQTT_CONNECT_CLEANUP_RETRY_MAX 3U
#define MQTT_CONNECT_CLEANUP_RETRY_DELAY_MS 500U

typedef struct {
    /** True while a `+CMQTTRXSTART` frame is being assembled. */
    bool active;
    /** SIM7600 MQTT client index reported by the RX frame. */
    int client_index;
    /** Total topic length declared by the modem header. */
    int topic_total_len;
    /** Total payload length declared by the modem header. */
    int payload_total_len;
    /** Bytes still expected for the current topic chunk. */
    int topic_chunk_remaining;
    /** Bytes still expected for the current payload chunk. */
    int payload_chunk_remaining;
    /** Set when topic bytes exceed `topic` capacity; frame must be dropped. */
    bool topic_truncated;
    /** Set when payload bytes exceed `payload` capacity; frame must be dropped. */
    bool payload_truncated;
    /** Number of topic bytes copied into the bounded buffer. */
    size_t topic_len;
    /** Number of payload bytes copied into the bounded buffer. */
    size_t payload_len;
    /** Null-terminated topic buffer used only after full-frame validation. */
    char topic[MQTT_TOPIC_MAX_LEN];
    /** Null-terminated command payload used only after full-frame validation. */
    char payload[MQTT_COMMAND_PAYLOAD_MAX_LEN];
} mqtt_rx_ctx_t;

typedef enum {
    MQTT_RX_PENDING_NONE = 0,
    MQTT_RX_PENDING_START_HEADER,
    MQTT_RX_PENDING_TOPIC_HEADER,
    MQTT_RX_PENDING_PAYLOAD_HEADER,
} mqtt_rx_pending_header_t;

extern mqtt_command_cb_t s_command_callback;
extern config_t s_cfg;
extern bool s_connected;
extern bool s_service_started;
extern bool s_client_acquired;
extern bool s_commands_subscribed;
extern bool s_tls_enabled;
extern bool s_urc_registered;
extern int s_next_msg_id;
extern mqtt_rx_ctx_t s_rx_ctx;
extern mqtt_rx_pending_header_t s_rx_pending_header;
extern bool s_connect_result_pending;
extern bool s_connect_result_ready;
extern int s_connect_result_err;
extern bool s_publish_result_pending;
extern bool s_publish_result_ready;
extern int s_publish_result_err;
extern char s_topic_rawdata[MQTT_TOPIC_MAX_LEN];
extern char s_topic_status[MQTT_TOPIC_MAX_LEN];
extern char s_topic_events[MQTT_TOPIC_MAX_LEN];
extern char s_topic_firmware[MQTT_TOPIC_MAX_LEN];
extern char s_topic_commands[MQTT_TOPIC_MAX_LEN];
extern char s_server_addr_primary[MQTT_SERVER_ADDR_MAX_LEN];
extern char s_server_addr_fallback[MQTT_SERVER_ADDR_MAX_LEN];
extern bool s_server_addr_has_fallback;

bool tracker_mqtt_err_indicates_disconnect(int err_code);
void tracker_mqtt_mark_disconnected(const char *reason, int err_code);
bool tracker_mqtt_host_forces_tls_default_port(const char *host);
bool tracker_mqtt_use_tls(const config_t *cfg);
void tracker_mqtt_rx_reset(void);
bool tracker_mqtt_parse_next_int(const char **cursor, int *out_value);
bool tracker_mqtt_parse_int_list_from_text(const char *text,
                                           const char *prefix,
                                           int *out_values,
                                           size_t value_count);
bool tracker_mqtt_parse_disconnect_state(const char *response, int *out_disc_state);
esp_err_t tracker_mqtt_expect_result(const char *response,
                                     const char *prefix,
                                     bool has_client_index,
                                     const int *allowed_codes,
                                     size_t allowed_count,
                                     bool require_prefix,
                                     int *out_err_code,
                                     bool *out_parsed);
bool tracker_mqtt_extract_error_code_from_response(const char *response, int *out_err_code);
esp_err_t tracker_mqtt_send_cmd_with_policy(const char *cmd,
                                            uint32_t timeout_ms,
                                            char *response,
                                            size_t response_size,
                                            bool log_command,
                                            bool log_result);
esp_err_t tracker_mqtt_send_cmd(const char *cmd, uint32_t timeout_ms, char *response, size_t response_size);
void tracker_mqtt_reset_connect_wait(void);
void tracker_mqtt_begin_connect_wait(void);
void tracker_mqtt_reset_publish_wait(void);
void tracker_mqtt_begin_publish_wait(void);
void tracker_mqtt_on_connect_result_line(int client_index, int err_code);
void tracker_mqtt_on_publish_result_line(int client_index, int err_code);
esp_err_t tracker_mqtt_wait_connect_result(int *out_err_code);
esp_err_t tracker_mqtt_wait_publish_result(int *out_err_code);
esp_err_t tracker_mqtt_input_data(const char *prepare_cmd,
                                  const char *data,
                                  const char *result_prefix,
                                  bool has_client_index);
void tracker_mqtt_on_urc_line(const char *line);
void tracker_mqtt_register_urc_handler(void);

esp_err_t tracker_mqtt_build_server_addrs(const config_t *cfg);
void tracker_mqtt_build_topics(void);

bool tracker_mqtt_query_disconnect_state_with_policy(int *out_disc_state, bool quiet);
bool tracker_mqtt_query_disconnect_state(int *out_disc_state);
bool tracker_mqtt_resume_connected_session(const char *reason, bool quiet_query);
esp_err_t tracker_mqtt_connect_once(const char *server_addr, int *out_connect_err_code, bool *out_timed_out);
void tracker_mqtt_log_connect_diagnostics(void);
esp_err_t tracker_mqtt_start_service(void);
esp_err_t tracker_mqtt_configure_tls(void);
esp_err_t tracker_mqtt_acquire_client(void);
esp_err_t tracker_mqtt_apply_client_options(void);
esp_err_t tracker_mqtt_send_disconnect(void);
esp_err_t tracker_mqtt_release_client(void);
esp_err_t tracker_mqtt_stop_service(void);
esp_err_t tracker_mqtt_cleanup_after_connect_failure(void);
esp_err_t tracker_mqtt_session_connect(void);
esp_err_t tracker_mqtt_session_disconnect(void);

int tracker_mqtt_publish_with_msg_id_internal(const char *topic, const char *payload, int qos);
esp_err_t tracker_mqtt_subscribe_commands_internal(void);
