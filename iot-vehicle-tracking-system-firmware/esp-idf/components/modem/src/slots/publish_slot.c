#include "modem_slots.h"
#include "modem_internal.h"
#include "modem_task.h"

#include <string.h>

/** Ô publish. */
static struct {
    bool          busy;         /* Có bản tin chưa có kết quả; ô không nhận bản tin mới. */
    bool          in_flight;    /* Task "modem" đã lấy bản tin đi gửi. */
    bool          result_ready;
    bool          ok;
    int16_t       err;
    modem_topic_t topic;
    uint32_t      tx_id;
    size_t        len;
    char          data[MODEM_PAYLOAD_MAX];
} s_tx;

ivts_err_t modem_publish(modem_topic_t topic, const char *payload, size_t len, uint32_t tx_id)
{
    if (payload == NULL || len == 0u || len > MODEM_PAYLOAD_MAX || topic >= MODEM_TOPIC_COUNT) {
        return IVTS_ERR_INVALID_ARG;
    }
    modem_slots_lock();
    if (s_tx.busy) {
        modem_slots_unlock();
        return IVTS_ERR_FULL;
    }
    memcpy(s_tx.data, payload, len);
    s_tx.len = len;
    s_tx.topic = topic;
    s_tx.tx_id = tx_id;
    s_tx.busy = true;
    s_tx.in_flight = false;
    s_tx.result_ready = false;
    modem_slots_unlock();
    modem_req_t r = { .op = REQ_PUB_KICK };
    (void)modem_task_post(&r, 0);                 /* Queue đầy vẫn được: vòng lặp của task "modem" kiểm tra ô publish ở mỗi vòng. */
    return IVTS_OK;
}

bool modem_publish_busy(void)
{
    modem_slots_lock();
    bool b = s_tx.busy;
    modem_slots_unlock();
    return b;
}

bool modem_publish_result(uint32_t tx_id, bool *ok, int16_t *err)
{
    modem_slots_lock();
    bool ready = s_tx.result_ready && s_tx.tx_id == tx_id;
    if (ready) {
        *ok = s_tx.ok;
        *err = s_tx.err;
    }
    modem_slots_unlock();
    return ready;
}

/* payload trỏ thẳng vào ô publish; xem phần "Mô hình thực thi" về tính an toàn của con trỏ này. */
bool modem_tx_take(modem_topic_t *topic, const char **payload, size_t *len, uint32_t *tx_id)
{
    modem_slots_lock();
    bool ok = s_tx.busy && !s_tx.in_flight;
    if (ok) {
        s_tx.in_flight = true;
        *topic = s_tx.topic;
        *payload = s_tx.data;
        *len = s_tx.len;
        *tx_id = s_tx.tx_id;
    }
    modem_slots_unlock();
    return ok;
}

void modem_tx_done(bool ok, int16_t err)
{
    modem_slots_lock();
    uint32_t id = s_tx.tx_id;
    bool was = s_tx.busy;
    s_tx.busy = false;
    s_tx.in_flight = false;
    if (was) {
        s_tx.result_ready = true;
        s_tx.ok = ok;
        s_tx.err = err;
    }
    modem_slots_unlock();
    if (!was) { return; }
    ivts_event_t ev = { .type = IVTS_EV_MQTT_ACK, .ts_ms = modem_now() };
    ev.u.mqtt_ack.tx_id = id;
    ev.u.mqtt_ack.ok = ok ? 1u : 0u;
    ev.u.mqtt_ack.err = err;
    modem_emit(&ev);
}
