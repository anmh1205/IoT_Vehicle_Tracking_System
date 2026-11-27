/**
 * @file publisher.c
 * @brief Single in-flight publish and acknowledgement correlation.
 *
 * Attempt to submit a complete payload to the modem. Only a matching
 * transaction acknowledgement releases the publisher and invokes the
 * registered handler.
 */
#include "publish/publish.h"
#include "platform/log.h"
#include "device/device.h"
#include "app_internal.h"

static bool s_publish_in_flight;
static app_msg_kind_t s_in_flight_kind;
static uint32_t s_in_flight_tx_id;
static uint32_t s_next_tx_id;
static const app_msg_ack_fn *s_ack_handlers;
static uint64_t s_in_flight_since_ms;
static size_t s_in_flight_size;

/** Return the lower-case log name of a message kind. */
static const char *kind_name(app_msg_kind_t kind)
{
    static const char *const names[APP_MSG_COUNT] = {
        [APP_MSG_NONE] = "none", [APP_MSG_RAW_LIVE] = "raw_live", [APP_MSG_RAW_REPLAY] = "raw_replay",
        [APP_MSG_LOCATION] = "location", [APP_MSG_STATUS] = "status", [APP_MSG_BOUNDARY] = "boundary",
        [APP_MSG_EVENT] = "event", [APP_MSG_ALARM] = "alarm", [APP_MSG_FW] = "firmware", [APP_MSG_CMD_ACK] = "cmd_ack",
    };
    return (kind < APP_MSG_COUNT && names[kind] != NULL) ? names[kind] : "unknown";
}

void app_publisher_set_ack_handlers(const app_msg_ack_fn handlers[APP_MSG_COUNT])
{
    s_ack_handlers = handlers;
}

bool app_publisher_is_busy(void)
{
    return s_publish_in_flight;
}

bool app_publisher_send(app_msg_kind_t kind, modem_topic_t topic, const char *payload, size_t len)
{
    uint32_t tx = ++s_next_tx_id;
    if (!app_link_is_broker_up() || s_publish_in_flight) {
        IVTS_LOGD(APP_TAG, "publish skip kind=%s reason=%s", kind_name(kind),
                  s_publish_in_flight ? "busy" : "link_down");
        return false;
    }
    if (modem_publish(topic, payload, len, tx) != IVTS_OK) {
        IVTS_LOGW(APP_TAG, "publish submit kind=%s tx=%lu size=%uB result=fail", kind_name(kind), (unsigned long)tx,
                  (unsigned)len);
        return false;
    }
    IVTS_LOGD(APP_TAG, "publish sent kind=%s tx=%lu size=%uB", kind_name(kind), (unsigned long)tx, (unsigned)len);
    s_in_flight_since_ms = app_now();
    s_in_flight_size = len;
    s_publish_in_flight = true;
    s_in_flight_kind = kind;
    s_in_flight_tx_id = tx;
    return true;
}

void app_publisher_on_ack(const ivts_event_t *event)
{
    if (!s_publish_in_flight || event->u.mqtt_ack.tx_id != s_in_flight_tx_id) { return; }

    bool ok = event->u.mqtt_ack.ok != 0u;
    app_msg_kind_t kind = s_in_flight_kind;
    s_publish_in_flight = false;
    if (s_ack_handlers != NULL && s_ack_handlers[kind] != NULL) {
        s_ack_handlers[kind](ok);
    }
    unsigned long rtt_ms = (unsigned long)(app_now() - s_in_flight_since_ms);
    if (ok) {
        IVTS_LOGD(APP_TAG, "publish ok kind=%s tx=%lu size=%uB rtt=%lums", kind_name(kind),
                  (unsigned long)event->u.mqtt_ack.tx_id, (unsigned)s_in_flight_size, rtt_ms);
    } else {
        IVTS_LOGW(APP_TAG, "publish fail kind=%s tx=%lu err=%d rtt=%lums", kind_name(kind),
                  (unsigned long)event->u.mqtt_ack.tx_id, (int)event->u.mqtt_ack.err, rtt_ms);
    }
}

void app_publisher_poll(void)
{
    bool ok;
    int16_t err;
    if (s_publish_in_flight && modem_publish_result(s_in_flight_tx_id, &ok, &err)) {
        ivts_event_t ev = { .type = IVTS_EV_MQTT_ACK };
        ev.u.mqtt_ack.tx_id = s_in_flight_tx_id;
        ev.u.mqtt_ack.ok = ok ? 1u : 0u;
        ev.u.mqtt_ack.err = err;
        app_publisher_on_ack(&ev);
    }
}
