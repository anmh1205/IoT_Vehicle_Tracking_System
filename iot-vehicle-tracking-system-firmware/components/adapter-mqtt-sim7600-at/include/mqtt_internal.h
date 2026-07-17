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


/* Log tag shared by every TU in this adapter so field logs are filterable. */
#define TRACKER_MQTT_TAG "TRACKER_MQTT"
/* Bounded buffer sizes for device-scoped topics and the modem AT response. */
#define MQTT_TOPIC_MAX_LEN 96
#define MQTT_SERVER_ADDR_MAX_LEN 128
#define MQTT_AT_RESPONSE_MAX_LEN 1024
/* Largest inbound command payload (JSON) accepted from the command topic. */
#define MQTT_COMMAND_PAYLOAD_MAX_LEN 1024
/* Broker keepalive interval advertised in the CMQTTCONNECT request, seconds. */
#define MQTT_DEFAULT_KEEPALIVE_S 60
/* Modem-side operation/publish/disconnect timeouts (CMQTTCFG optimeout etc.), seconds. */
#define MQTT_DEFAULT_OPERATION_TIMEOUT_S 120
#define MQTT_DEFAULT_PUBLISH_TIMEOUT_S 120
#define MQTT_DEFAULT_DISCONNECT_TIMEOUT_S 120
/* Single-client adapter: SIM7600 MQTT client slot and TLS (SSL) context slot. */
#define MQTT_CLIENT_INDEX 0
#define MQTT_SSL_CTX_INDEX 1
/* Prompt-mode data entry timeout when streaming topic/payload bytes to the modem. */
#define MQTT_INPUT_TIMEOUT_MS 8000U
/* Upper bound to wait for CMQTTCONNECT completion (sync or async URC). */
#define MQTT_CONNECT_TIMEOUT_MS 30000U
/* Default timeout for short lifecycle/config AT commands. */
#define MQTT_CMD_TIMEOUT_MS 15000U
/* Max bytes pulled per modem_at_poll_urc() drain while waiting for results. */
#define MQTT_POLL_MAX_BYTES 256U
/* Poll cadence while waiting for an async connect/publish result. */
#define MQTT_CONNECT_RESULT_POLL_MS 100U
/* Window/interval for probing CMQTTDISC? to detect a session that connected silently. */
#define MQTT_CONNECT_SESSION_PROBE_WINDOW_MS 8000U
#define MQTT_CONNECT_SESSION_PROBE_INTERVAL_MS 500U
/* Standard implicit-TLS MQTT port; selecting it forces the TLS code path. */
#define MQTT_IMPLICIT_TLS_PORT 8883U
/* Host that always implies implicit TLS on the default secure port. */
#define TRACKER_MQTT_TLS_HOST "mqtt.thingdock.dev"
/* SIM7600 MQTT error codes treated as actionable by this adapter. */
#define MQTT_ERR_NETWORK_NOT_OPENED 9       // PDP/socket layer not opened
#define MQTT_ERR_NO_CONNECTION 11           // no live broker connection
#define MQTT_ERR_NOT_SUPPORTED_OPERATION 13 // operation invalid in current state
#define MQTT_ERR_TIMEOUT 17                 // modem-reported operation timeout
#define MQTT_ERR_CLIENT_IS_USED 19          // client slot already acquired
#define MQTT_ERR_CLIENT_NOT_RELEASED 21     // stop attempted before client release
#define MQTT_ERR_DNS_FAILURE 25             // hostname resolution failed
#define MQTT_ERR_SOCKET_CLOSED_BY_SERVER 26 // broker closed the TCP socket
/* Bounded retry budget for the disconnect/release/stop cleanup sequence. */
#define MQTT_CONNECT_CLEANUP_RETRY_MAX 3U
#define MQTT_CONNECT_CLEANUP_RETRY_DELAY_MS 500U

/**
 * @brief Reassembly state for an inbound MQTT message split across modem URCs.
 *
 * The SIM7600 delivers a received message as a sequence of URCs
 * (+CMQTTRXSTART -> +CMQTTRXTOPIC -> +CMQTTRXPAYLOAD -> +CMQTTRXEND). This
 * context accumulates the topic and payload bytes and tracks per-chunk
 * remaining counts so a frame is only dispatched once fully and exactly
 * reassembled.
 */
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

/**
 * @brief Tracks an RX URC whose numeric header arrives on the next line.
 *
 * Some modem firmware emits the URC keyword and its integer fields on
 * separate lines. When that happens the keyword handler records which header
 * is still expected so the following line can be parsed as the missing
 * integer list rather than mistaken for a new URC.
 */
typedef enum {
    MQTT_RX_PENDING_NONE = 0,        ///< No split header outstanding.
    MQTT_RX_PENDING_START_HEADER,    ///< Awaiting client/topic_len/body_len for +CMQTTRXSTART.
    MQTT_RX_PENDING_TOPIC_HEADER,    ///< Awaiting client/chunk_len for +CMQTTRXTOPIC.
    MQTT_RX_PENDING_PAYLOAD_HEADER,  ///< Awaiting client/chunk_len for +CMQTTRXPAYLOAD.
} mqtt_rx_pending_header_t;

/*
 * Adapter-wide singleton state shared by the split MQTT TUs. The adapter
 * manages exactly one SIM7600 MQTT client, so this state is intentionally
 * file-scope global rather than per-instance. Defined once in mqtt_client.c.
 */
extern mqtt_command_cb_t s_command_callback; // user callback for inbound command-topic messages
extern config_t s_cfg;                       // cached runtime configuration (host, port, creds, device id)
extern bool s_connected;                     // cached broker connection state
extern bool s_service_started;               // CMQTTSTART has succeeded
extern bool s_client_acquired;               // CMQTTACCQ client slot is held
extern bool s_commands_subscribed;           // command topic subscription is active
extern bool s_tls_enabled;                   // connection must use implicit TLS
extern bool s_urc_registered;                // URC handler registered with modem layer
extern int s_next_msg_id;                    // locally-assigned publish id (modem returns none)
extern mqtt_rx_ctx_t s_rx_ctx;               // inbound-message reassembly context
extern mqtt_rx_pending_header_t s_rx_pending_header; // split-header wait state
extern bool s_connect_result_pending;        // a CMQTTCONNECT result is being awaited
extern bool s_connect_result_ready;          // connect result has arrived (sync or URC)
extern int s_connect_result_err;             // last connect result error code
extern bool s_publish_result_pending;        // a CMQTTPUB result is being awaited
extern bool s_publish_result_ready;          // publish result has arrived
extern int s_publish_result_err;             // last publish result error code
extern char s_topic_rawdata[MQTT_TOPIC_MAX_LEN];  // v1/{device}/rawdata
extern char s_topic_status[MQTT_TOPIC_MAX_LEN];   // v1/{device}/status
extern char s_topic_events[MQTT_TOPIC_MAX_LEN];   // v1/{device}/events
extern char s_topic_firmware[MQTT_TOPIC_MAX_LEN]; // v1/{device}/firmware
extern char s_topic_commands[MQTT_TOPIC_MAX_LEN]; // v1/{device}/commands
extern char s_server_addr_primary[MQTT_SERVER_ADDR_MAX_LEN];  // primary broker endpoint URL
extern char s_server_addr_fallback[MQTT_SERVER_ADDR_MAX_LEN]; // fallback endpoint (TLS host only)
extern bool s_server_addr_has_fallback;      // a fallback endpoint string is available

/* ---- Connection-state helpers and RX reset (mqtt_urc_parser.c) ---- */
bool tracker_mqtt_err_indicates_disconnect(int err_code);   // maps modem err -> "link is down"
void tracker_mqtt_mark_disconnected(const char *reason, int err_code); // clear cached connected state
bool tracker_mqtt_host_forces_tls_default_port(const char *host); // host == TLS host sentinel
bool tracker_mqtt_use_tls(const config_t *cfg);             // decide implicit-TLS from host/port
void tracker_mqtt_rx_reset(void);                           // wipe inbound reassembly context
/* ---- AT/URC text parsing primitives ---- */
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
/* ---- AT command transport with disconnect-detection policy ---- */
esp_err_t tracker_mqtt_send_cmd_with_policy(const char *cmd,
                                            uint32_t timeout_ms,
                                            char *response,
                                            size_t response_size,
                                            bool log_command,
                                            bool log_result);
esp_err_t tracker_mqtt_send_cmd(const char *cmd, uint32_t timeout_ms, char *response, size_t response_size);
/* ---- Async connect/publish result wait state machine ---- */
void tracker_mqtt_reset_connect_wait(void);                 // clear pending connect-result flags
void tracker_mqtt_begin_connect_wait(void);                 // arm wait before issuing CMQTTCONNECT
void tracker_mqtt_reset_publish_wait(void);                 // clear pending publish-result flags
void tracker_mqtt_begin_publish_wait(void);                 // arm wait before issuing CMQTTPUB
void tracker_mqtt_on_connect_result_line(int client_index, int err_code); // URC -> connect result
void tracker_mqtt_on_publish_result_line(int client_index, int err_code); // URC -> publish result
esp_err_t tracker_mqtt_wait_connect_result(int *out_err_code); // block until connect URC or timeout
esp_err_t tracker_mqtt_wait_publish_result(int *out_err_code); // block until publish URC or timeout
/* ---- Prompt-mode data entry (topic/payload/subscribe bytes) ---- */
esp_err_t tracker_mqtt_input_data(const char *prepare_cmd,
                                  const char *data,
                                  const char *result_prefix,
                                  bool has_client_index);
/* ---- URC dispatch entry point and registration ---- */
void tracker_mqtt_on_urc_line(const char *line);            // parse one URC line from modem
void tracker_mqtt_register_urc_handler(void);               // hook URC callback into modem layer

/* ---- Endpoint and topic string builders (mqtt_topics.c) ---- */
esp_err_t tracker_mqtt_build_server_addrs(const config_t *cfg); // build primary/fallback URLs
void tracker_mqtt_build_topics(void);                          // build device-scoped topics

/* ---- Session lifecycle helpers (mqtt_session.c) ---- */
bool tracker_mqtt_query_disconnect_state_with_policy(int *out_disc_state, bool quiet); // CMQTTDISC? probe
bool tracker_mqtt_query_disconnect_state(int *out_disc_state);                         // verbose probe wrapper
bool tracker_mqtt_resume_connected_session(const char *reason, bool quiet_query);      // adopt live modem session
esp_err_t tracker_mqtt_connect_once(const char *server_addr, int *out_connect_err_code, bool *out_timed_out); // one CMQTTCONNECT attempt
void tracker_mqtt_log_connect_diagnostics(void);   // dump modem-side MQTT/DNS state on failure
esp_err_t tracker_mqtt_start_service(void);         // AT+CMQTTSTART
esp_err_t tracker_mqtt_configure_tls(void);         // AT+CSSLCFG / CMQTTSSLCFG sequence
esp_err_t tracker_mqtt_acquire_client(void);        // AT+CMQTTACCQ (claim client slot)
esp_err_t tracker_mqtt_apply_client_options(void);  // AT+CMQTTCFG (UTF-8 check, optimeout)
esp_err_t tracker_mqtt_send_disconnect(void);       // AT+CMQTTDISC (graceful broker disconnect)
esp_err_t tracker_mqtt_release_client(void);        // AT+CMQTTREL (free client slot)
esp_err_t tracker_mqtt_stop_service(void);          // AT+CMQTTSTOP
esp_err_t tracker_mqtt_cleanup_after_connect_failure(void); // bounded disconnect/release/stop recovery
esp_err_t tracker_mqtt_session_connect(void);    // full bring-up: start->acquire->cfg->connect
esp_err_t tracker_mqtt_session_disconnect(void); // full teardown: disconnect->release->stop

/* ---- Publish/subscribe internals (mqtt_publish.c) ---- */
int tracker_mqtt_publish_with_msg_id_internal(const char *topic, const char *payload, int qos);
esp_err_t tracker_mqtt_subscribe_commands_internal(void);
