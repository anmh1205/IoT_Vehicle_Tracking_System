#include "publish/publish.h"
#include "esp_log.h"
#include "device/device.h"

static bool s_publish_in_flight;
static app_msg_kind_t s_in_flight_kind;
static uint32_t s_in_flight_tx_id;
static uint32_t s_next_tx_id;
static const app_msg_ack_fn *s_ack_handlers;

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
    if (!app_link_is_broker_up() || s_publish_in_flight ||
        modem_publish(topic, payload, len, tx) != IVTS_OK) {
        return false;
    }
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
    if (!ok) {
        ESP_LOGW("app", "publish kind=%d lỗi err=%d", (int)kind, (int)event->u.mqtt_ack.err);
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
