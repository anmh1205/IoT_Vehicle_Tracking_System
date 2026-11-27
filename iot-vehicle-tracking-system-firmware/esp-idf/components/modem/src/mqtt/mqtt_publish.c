/**
 * @file src/mqtt/mqtt_publish.c
 * @brief QoS 1 message submission and acknowledgement routing.
 *
 * The modem loop calls this with the broker session up. The modem task borrows the transmit slot
 * through AT completion and records the local transaction ID for app correlation.
 * A timeout triggers MQTT setup before the next publish attempt. The app owns message retries.
 */
#include "mqtt/mqtt.h"
#include "modem_internal.h"
#include "at/at.h"

#include <stdio.h>
#include <string.h>

#define PUB_TIMEOUT_S 60   /**< SIM7600 PUBACK timeout in seconds. The modem accepts 60 through 180 seconds. */

/** @brief Supply a declared-length topic or payload after the modem issues its data prompt. */
static bool input(const char *what, const char *data, size_t len)
{
    char cmd[40];
    snprintf(cmd, sizeof cmd, "AT+CMQTT%s=0,%u", what, (unsigned)len);
    at_cmd_t c = { .text = cmd, .data = (const uint8_t *)data, .data_len = len, .timeout_ms = 10000 };
    return modem_at(&c) == AT_RES_OK;
}

static bool send_topic(const char *topic)
{
    return input("TOPIC", topic, strlen(topic));
}

static bool send_payload(const char *payload, size_t len)
{
    return input("PAYLOAD", payload, len);
}

/** @brief Wait for the modem QoS 1 result and retain the input error code if no result field parses. */
static bool send_publish(int16_t *err)
{
    char cmd[40];
    snprintf(cmd, sizeof cmd, "AT+CMQTTPUB=0,1,%d", PUB_TIMEOUT_S);
    at_cmd_t c = { .text = cmd, .final_prefix = "+CMQTTPUB:", .final_err_field = 2,
                   .timeout_ms = (PUB_TIMEOUT_S + 5) * 1000u };
    at_result_t r = modem_at(&c);
    int32_t e = 0;
    bool ok = (r == AT_RES_OK);
    if (ok) {
        *err = 0;
    } else if (r == AT_RES_TIMEOUT) {
        *err = -1;                                   /* No publish result before PUB_TIMEOUT_S plus five seconds. */
    } else if (at_field_int(modem_at_response(), 1, &e)) {
        *err = (int16_t)e;                           /* Error field from the SIM7600 MQTT result. */
    }
    return ok;
}

/** @brief Restart the appropriate MQTT setup step after a disconnect or missing publish result. */
static void on_pub_result(int16_t err)
{
    /* SIM7600 error 11 indicates that the broker session has disconnected. */
    if (err == 11) { modem_link_on_connection_lost(); }
    if (err == -1) {
        /* Reenter MQTT setup before sending another publish after an ambiguous result. */
        modem_emit_link(IVTS_LINK_NET_UP, (int32_t)IVTS_ERR_TIMEOUT);
        modem_link_reset(MODEM_LINK_STEP_MQTT_START);
    }
}

void modem_mqtt_publish_pending(void)
{
    modem_topic_t t;
    const char *p;
    size_t n;
    uint32_t id;
    if (!modem_tx_take(&t, &p, &n, &id)) { return; }
    const char *topic = modem_topic_name(t);
    bool ok = send_topic(topic) && send_payload(p, n);
    int16_t err = -2;                                   /* Failed before publishing while submitting the topic or body. */
    if (ok) { ok = send_publish(&err); }
    modem_tx_done(ok, err);
    if (!ok) { on_pub_result(err); }
}
