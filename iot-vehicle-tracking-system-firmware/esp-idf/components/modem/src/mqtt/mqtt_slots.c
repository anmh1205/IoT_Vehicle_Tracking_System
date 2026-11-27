/**
 * @file src/mqtt/mqtt_slots.c
 * @brief Modem cross-task publish slot and command FIFO.
 *
 * One mutex protects bounded copies and state updates. The modem holds the
 * transmit slot through completion and emits events after releasing the mutex.
 */
#include "modem_internal.h"
#include "platform/platform.h"
#include <string.h>
#include "platform/log.h"

static platform_mutex_t s_slot_mutex;

bool modem_slots_init(void)
{
    s_slot_mutex = platform_mutex_create();
    return s_slot_mutex != NULL;
}

static void modem_slots_lock(void) { platform_mutex_lock(s_slot_mutex); }
static void modem_slots_unlock(void) { platform_mutex_unlock(s_slot_mutex); }

/** Transmit slot holds a queued or in-flight payload. */
static struct {
    bool          busy;         /* The occupied slot cannot accept another publish. */
    bool          in_flight;    /* The modem task borrowed the slot for transmission. */
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
    (void)modem_task_post(&r, 0);                 /* A failed doorbell send is harmless because the modem checks the slot each loop. */
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

/* The payload pointer borrows slot storage until modem_tx_done() releases it. */
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

#define CMD_QUEUE_DEPTH 4u

/** Circular command FIFO protected by the shared slot mutex. */
static struct {
    struct {
        size_t len;
        char data[MODEM_CMD_MAX];
    } items[CMD_QUEUE_DEPTH];
    size_t head;
    size_t count;
} s_cmd;
static uint32_t s_cmd_dropped;  /* Commands dropped on FIFO overflow. */

void modem_cmd_store(const char *payload, size_t len)
{
    if (!modem_config()->command_subscribe_enabled || payload == NULL || len == 0u || len > MODEM_CMD_MAX) {
        return;
    }
    modem_slots_lock();
    bool stored = s_cmd.count < CMD_QUEUE_DEPTH;
    if (stored) {
        size_t tail = (s_cmd.head + s_cmd.count) % CMD_QUEUE_DEPTH;
        memcpy(s_cmd.items[tail].data, payload, len);
        s_cmd.items[tail].len = len;
        s_cmd.count++;
    } else {
        s_cmd_dropped++;
    }
    modem_slots_unlock();
    if (stored) {
        ivts_event_t ev = { .type = IVTS_EV_CMD_PENDING, .ts_ms = modem_now() };
        ev.u.cmd_pending.len = (uint16_t)len;
        modem_emit(&ev);
    } else {
        /*
         * SIM7600 has already sent broker PUBACK before delivering the URC. A
         * full FIFO drops the command. The cloud can retry the same command ID
         * when it receives no application acknowledgement on commands/ack.
         */
        IVTS_LOGE(MODEM_TAG, "mqtt command result=dropped reason=fifo_full size=%uB", (unsigned)len);
    }
}

ivts_err_t modem_cmd_take(char *out, size_t cap, size_t *len)
{
    if (out == NULL || len == NULL) { return IVTS_ERR_INVALID_ARG; }
    modem_slots_lock();
    ivts_err_t r = IVTS_ERR_NOT_FOUND;
    if (s_cmd.count != 0u) {
        size_t head = s_cmd.head;
        size_t n = s_cmd.items[head].len;
        if (cap < n) {
            r = IVTS_ERR_FULL;
        } else {
            memcpy(out, s_cmd.items[head].data, n);
            *len = n;
            s_cmd.head = (head + 1u) % CMD_QUEUE_DEPTH;
            s_cmd.count--;
            r = IVTS_OK;
        }
    }
    modem_slots_unlock();
    return r;
}

uint32_t modem_cmd_dropped(void)
{
    modem_slots_lock();
    uint32_t v = s_cmd_dropped;
    modem_slots_unlock();
    return v;
}
