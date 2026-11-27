#include "modem_slots.h"
#include "modem_internal.h"
#include "esp_log.h"

#include <string.h>

#define CMD_QUEUE_DEPTH 4u

/** Hàng đợi command vòng tròn, bảo vệ bởi mutex của slots. */
static struct {
    struct {
        size_t len;
        char data[MODEM_CMD_MAX];
    } items[CMD_QUEUE_DEPTH];
    size_t head;
    size_t count;
} s_cmd;
static uint32_t s_cmd_dropped;  /* Số command mất vì hàng đợi đầy. */

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
        /* SIM7600 đã gửi PUBACK cho broker khi đẩy URC, nên không thể từ chối nhận: command này
         * mất. Cloud không thấy ACK trên commands/ack và phải gửi lại theo command_id. */
        ESP_LOGW(MODEM_TAG, "hàng đợi command đầy, bỏ command %u byte", (unsigned)len);
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
