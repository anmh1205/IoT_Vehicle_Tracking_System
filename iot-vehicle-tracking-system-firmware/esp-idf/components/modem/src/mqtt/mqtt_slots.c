/**
 * @file src/mqtt/mqtt_slots.c
 * @brief Modem cross-task publish slot, result snapshot and command FIFO.
 *
 * The app submits publishes and drains commands. The modem task claims publishes and stores commands.
 * One mutex protects bounded copies and state updates. The occupied transmit slot keeps borrowed bytes
 * stable through AT completion. Event delivery happens outside the copy lock.
 * Queued data and result snapshots live in RAM. The app owns durable delivery and retry policy.
 */
#include "modem_internal.h"
#include "platform/platform.h"
#include <string.h>
#include "platform/log.h"

/* Startup creates this mutex for app and modem task access to both slots and the drop counter. */
static platform_mutex_t s_slot_mutex;

bool modem_slots_init(void)
{
    s_slot_mutex = platform_mutex_create();
    return s_slot_mutex != NULL;
}

static void modem_slots_lock(void) { platform_mutex_lock(s_slot_mutex); }
static void modem_slots_unlock(void) { platform_mutex_unlock(s_slot_mutex); }

/** @brief Mutex-protected publish slot, with access to borrowed bytes reserved for the modem while in flight. */
static struct {
    bool          busy;         /**< The occupied slot cannot accept another publish. */
    bool          in_flight;    /**< The modem task has claimed the slot for transmission. */
    bool          result_ready; /**< A stored result is available for the current transaction ID. */
    bool          ok;           /**< Outcome of the stored publish result. */
    int16_t       err;          /**< Stored modem or local failure code. */
    modem_topic_t topic;        /**< Topic ID of the queued or in-flight publish. */
    uint32_t      tx_id;        /**< App transaction ID for the message or stored result. */
    size_t        len;          /**< Payload size in bytes, from 1 through MODEM_PAYLOAD_MAX when occupied. */
    char          data[MODEM_PAYLOAD_MAX]; /**< Slot-owned payload bytes. */
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

#define CMD_QUEUE_DEPTH 4u /**< Maximum number of commands in the FIFO. */

/** @brief Modem-owned command FIFO. The modem appends and the app drains under the shared slot mutex. */
static struct {
    /** @brief One FIFO-owned command copy. */
    struct {
        size_t len;                 /**< Payload size in bytes, from 1 through MODEM_CMD_MAX when occupied. */
        char data[MODEM_CMD_MAX];   /**< Payload bytes without a terminator. */
    } items[CMD_QUEUE_DEPTH];      /**< Command storage indexed as a ring. */
    size_t head; /**< Index of the oldest item when the FIFO contains a command. */
    size_t count; /**< Occupied entries, from zero through CMD_QUEUE_DEPTH. */
} s_cmd;
static uint32_t s_cmd_dropped;  /* FIFO overflow count under the shared slot mutex. */

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
         * The module handles broker PUBACK independently of FIFO admission.
         * Retrying a dropped command depends on the application acknowledgement on commands/ack.
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
