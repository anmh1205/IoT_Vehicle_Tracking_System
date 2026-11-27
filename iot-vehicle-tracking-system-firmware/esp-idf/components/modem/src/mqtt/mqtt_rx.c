/**
 * @file src/mqtt/mqtt_rx.c
 * @brief Incremental reception of SIM7600 MQTT topic and payload blocks.
 *
 * AT dispatch feeds unsolicited lines and raw chunks on the modem task. This assembler owns one
 * frame and validates its declared lengths and command topic before copying it to the shared FIFO.
 * Dispatch owns raw-mode deadlines. The app owns cloud command interpretation and acknowledgement.
 */
#include "mqtt/mqtt.h"
#include "modem_internal.h"
#include "platform/log.h"
#include "at/at.h"

#include <stdio.h>
#include <string.h>

/** @brief MQTT receive header kind, including the kind whose fields arrive on a later line. */
typedef enum {
    RX_HEADER_NONE = 0, /**< No header.
     */RX_HEADER_START, /**< Starts a frame and declares totals.
     */RX_HEADER_TOPIC, /**< Declares a topic block.
     */RX_HEADER_PAYLOAD, /**< Declares a payload block.
     */RX_HEADER_END, /**< Closes a frame and triggers validation. */
} rx_header_t;

/** @brief Destination for raw bytes announced by the most recent data header. */
typedef enum { MQTT_RX_TOPIC = 1, /**< Topic bytes.
 */MQTT_RX_PAYLOAD /**< Payload bytes. */} mqtt_rx_phase_t;

/** @brief One inbound frame initialized at startup and owned exclusively by the modem task. */
static struct {
    bool active;                   /**< Frame remains eligible for assembly. */
    mqtt_rx_phase_t phase;          /**< Destination selected by the latest data header. Zero before data. */
    rx_header_t pending_header;     /**< Header kind awaiting its field line, or RX_HEADER_NONE. */
    size_t topic_len;               /**< Number of topic bytes copied. */
    size_t payload_len;             /**< Number of payload bytes copied. */
    size_t topic_total;             /**< Topic bytes declared by the frame start. */
    size_t payload_total;           /**< Payload bytes declared by the frame start. */
    bool overflow;                  /**< Declared or received data exceeds the frame's storage. */
    char topic[64];                 /**< Assembled topic with room for a trailing NUL. */
    char payload[MODEM_CMD_MAX];    /**< Assembled payload bytes without a terminator. */
} s_rx;

void modem_mqtt_rx_init(void)
{
    memset(&s_rx, 0, sizeof s_rx);
}

void modem_mqtt_rx_discard_raw(void)
{
    s_rx.active = false;
    s_rx.pending_header = RX_HEADER_NONE;
}

/** @brief Replace any partial frame and admit declarations for client zero. */
static void on_rx_start(const char *fields, bool right_client)
{
    modem_mqtt_rx_init();
    int32_t topic_total, payload_total;
    if (right_client && at_field_int(fields, 1, &topic_total) && topic_total > 0 &&
        at_field_int(fields, 2, &payload_total) && payload_total > 0) {
        s_rx.topic_total = (size_t)topic_total;
        s_rx.payload_total = (size_t)payload_total;
        s_rx.active = true;
        s_rx.overflow = s_rx.topic_total >= sizeof s_rx.topic || s_rx.payload_total > sizeof s_rx.payload;
    }
}

/** @brief Deliver only a complete frame whose topic exactly matches the command topic. */
static void on_rx_end(bool right_client)
{
    const char *command_topic = modem_command_topic();
    if (s_rx.active && right_client && !s_rx.overflow &&
        s_rx.topic_len == s_rx.topic_total && s_rx.payload_len == s_rx.payload_total &&
        s_rx.topic_len == strlen(command_topic) && memcmp(s_rx.topic, command_topic, s_rx.topic_len) == 0) {
        modem_cmd_store(s_rx.payload, s_rx.payload_len);
    } else if (s_rx.overflow) {
        IVTS_LOGE(MODEM_TAG, "mqtt command result=dropped reason=too_large topic=%uB payload=%uB",
                  (unsigned)s_rx.topic_total, (unsigned)s_rx.payload_total);
    }
    s_rx.active = false;
}

/** @brief Enter raw mode for a declared block, including one from a rejected frame. */
static void on_rx_data_header(const char *fields, bool valid_order, mqtt_rx_phase_t phase)
{
    int32_t length;
    if (!at_field_int(fields, 1, &length) || length <= 0) {
        s_rx.active = false;
        return;
    }
    if (!valid_order) { s_rx.active = false; }
    s_rx.phase = phase;
    modem_expect_raw((size_t)length);    /* Consume bad frames too, to keep UART synchronized. */
}

static void on_rx_topic_header(const char *fields, bool right_client)
{
    on_rx_data_header(fields, right_client && s_rx.phase != MQTT_RX_PAYLOAD, MQTT_RX_TOPIC);
}

/** @brief Accept payload blocks only after the advertised topic length arrives. */
static void on_rx_payload_header(const char *fields, bool right_client)
{
    on_rx_data_header(fields, right_client && s_rx.topic_len == s_rx.topic_total, MQTT_RX_PAYLOAD);
}

/** @brief Route header fields with the result of the client-zero check. */
static void rx_header(rx_header_t header, const char *fields)
{
    int32_t client;
    bool right_client = at_field_int(fields, 0, &client) && client == 0;
    switch (header) {
    case RX_HEADER_START: on_rx_start(fields, right_client); break;
    case RX_HEADER_TOPIC: on_rx_topic_header(fields, right_client); break;
    case RX_HEADER_PAYLOAD: on_rx_payload_header(fields, right_client); break;
    case RX_HEADER_END: on_rx_end(right_client); break;
    case RX_HEADER_NONE: break;
    }
}

static void on_conn_lost(const char *line)
{
    IVTS_LOGW(MODEM_TAG, "mqtt connection_lost urc=\"%s\"", line);
    modem_mqtt_rx_init();
    modem_link_on_connection_lost();
}

void modem_mqtt_rx_on_urc(const char *line)
{
    rx_header_t header = RX_HEADER_NONE;
    if (at_has_prefix(line, "+CMQTTRXSTART:")) { header = RX_HEADER_START; }
    else if (at_has_prefix(line, "+CMQTTRXTOPIC:")) { header = RX_HEADER_TOPIC; }
    else if (at_has_prefix(line, "+CMQTTRXPAYLOAD:")) { header = RX_HEADER_PAYLOAD; }
    else if (at_has_prefix(line, "+CMQTTRXEND:")) { header = RX_HEADER_END; }

    if (header != RX_HEADER_NONE) {
        const char *fields = strchr(line, ':');
        const char *first = fields + 1;
        while (*first == ' ') { first++; }
        s_rx.pending_header = RX_HEADER_NONE;
        /* A receive header can carry its numeric fields on a separate line. */
        if (*first == '\0') {
            s_rx.pending_header = header;
        } else {
            rx_header(header, fields);
        }
    } else if (at_has_prefix(line, "+CMQTTCONNLOST:")) {
        on_conn_lost(line);
    } else if (s_rx.pending_header != RX_HEADER_NONE) {
        while (*line == ' ') { line++; }
        if (*line < '0' || *line > '9') { return; }
        char fields[48];
        int n = snprintf(fields, sizeof fields, ":%s", line);
        header = s_rx.pending_header;
        s_rx.pending_header = RX_HEADER_NONE;
        if (n > 0 && (size_t)n < sizeof fields) {
            rx_header(header, fields);
        } else {
            s_rx.active = false;
        }
    }
}

static void append_rx_topic(const uint8_t *data, size_t len)
{
    size_t copied = append_bounded(s_rx.topic, sizeof s_rx.topic - 1u, &s_rx.topic_len, data, len);
    s_rx.topic[s_rx.topic_len] = '\0';
    s_rx.overflow |= copied < len;
}

static void append_rx_payload(const uint8_t *data, size_t len)
{
    size_t copied = append_bounded(s_rx.payload, sizeof s_rx.payload, &s_rx.payload_len, data, len);
    s_rx.overflow |= copied < len;
}

void modem_mqtt_rx_on_data(const uint8_t *data, size_t len)
{
    if (!s_rx.active) { return; }
    if (s_rx.phase == MQTT_RX_TOPIC) { append_rx_topic(data, len); }
    else if (s_rx.phase == MQTT_RX_PAYLOAD) { append_rx_payload(data, len); }
}
