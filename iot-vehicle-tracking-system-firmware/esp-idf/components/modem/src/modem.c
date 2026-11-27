/**
 * @file modem.c
 * @brief Khởi tạo modem, ô publish và hàng đợi command giữa các task.
 *
 * ## Mô hình thực thi
 *
 * Hai đường trao đổi dữ liệu giữa task gọi (thường là "app") và task "modem":
 * - Ô publish (s_tx): caller ghi qua modem_publish(); task "modem" đọc qua modem_tx_take() và
 *   giải phóng qua modem_tx_done(). Chỉ chứa một bản tin.
 * - Hàng đợi command (s_cmd): task "modem" ghi qua modem_cmd_store() khi nhận URC; caller lấy
 *   theo thứ tự nhận bằng modem_cmd_take().
 *
 * Hai đường này và bộ đếm s_cmd_dropped dùng chung mutex s_mx. Mutex chỉ bảo vệ việc sao chép và đổi
 * cờ; không bao giờ được giữ khi gọi sink hay gửi lệnh AT, nên không có khoá lồng nhau.
 *
 * modem_tx_take() trả con trỏ thẳng vào s_tx.data sau khi nhả mutex. Con trỏ này an toàn vì cờ
 * busy vẫn bật cho đến modem_tx_done(), và modem_publish() từ chối ghi đè khi busy.
 *
 * Yêu cầu điều khiển (set_link, set_gnss, kick) đi qua g_modem_q tới task "modem" (modem_os.c).
 *
 * ## Khi reset hoặc mất nguồn
 *
 * Bản tin đang trong ô publish bị mất khi reset; app giữ bản ghi RAW
 * tương ứng và đưa vào offline queue khi không nhận được ACK. Command chờ trong RAM mất khi
 * reset; module đã gửi PUBACK cho broker nên cloud phải gửi lại theo command_id.
 */

#include "modem_priv.h"
#include <stdatomic.h>
#include <stdio.h>
#include <string.h>
#include "esp_log.h"
#include "platform/platform_clock.h"
#include "freertos/queue.h"
#include "ivts_core/base/str.h"

modem_t g_modem;

#define CMD_QUEUE_DEPTH 4u

static SemaphoreHandle_t s_mx;     /* Bảo vệ s_tx, s_cmd và s_cmd_dropped. */
static atomic_bool s_stopped = true;
static atomic_uchar s_link = IVTS_LINK_DOWN;

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

/** Hàng đợi command vòng tròn, bảo vệ bởi s_mx. */
static struct {
    struct {
        size_t len;
        char data[MODEM_CMD_MAX];
    } items[CMD_QUEUE_DEPTH];
    size_t head;
    size_t count;
} s_cmd;
static uint32_t s_cmd_dropped;  /* Số command mất vì hàng đợi đầy. */

uint64_t modem_now(void) { return platform_uptime_ms(); }

void modem_emit(const ivts_event_t *ev) { (void)ivts_sink_emit(&g_modem.cfg.sink, ev); }

/* Chỉ phát sự kiện khi link thay đổi so với lần báo trước. */
void modem_emit_link(uint8_t link, int32_t err)
{
    if (atomic_exchange(&s_link, link) == link) { return; }
    ivts_event_t ev = { .type = IVTS_EV_LINK_STATE, .ts_ms = modem_now() };
    ev.u.link_state.link = link;
    ev.u.link_state.err = err;
    modem_emit(&ev);
}

/* Xem modem.h. Phải gọi trước mọi hàm modem_* khác, từ một task duy nhất. */
ivts_err_t modem_init(const modem_cfg_t *cfg)
{
    if (cfg == NULL || cfg->sink.fn == NULL) { return IVTS_ERR_INVALID_ARG; }
    size_t cid = strnlen(cfg->client_id, sizeof cfg->client_id);
    if (cid == 0u || cid > MODEM_CLIENT_ID_MAX) { return IVTS_ERR_INVALID_ARG; }
    memset(&g_modem, 0, sizeof g_modem);
    g_modem.cfg = *cfg;
    static const char *const names[MODEM_TOPIC_COUNT] = { "rawdata", "status", "events", "firmware", "commands/ack" };
    for (int i = 0; i < MODEM_TOPIC_COUNT; i++) {
        int n = snprintf(g_modem.topic[i], sizeof g_modem.topic[i], "v1/%s/%s", cfg->device_id, names[i]);
        if (n < 0 || (size_t)n >= sizeof g_modem.topic[i]) { return IVTS_ERR_FULL; }
    }
    int n = snprintf(g_modem.topic_cmd, sizeof g_modem.topic_cmd, "v1/%s/commands", cfg->device_id);
    if (n < 0 || (size_t)n >= sizeof g_modem.topic_cmd) { return IVTS_ERR_FULL; }
    s_mx = xSemaphoreCreateMutex();
    if (s_mx == NULL) { return IVTS_ERR_FULL; }
    return (modem_os_start() == ESP_OK) ? IVTS_OK : IVTS_ERR_FULL;
}

/** Đưa yêu cầu vào queue của task "modem" mà không chờ. */
static ivts_err_t post(const modem_req_t *r)
{
    if (g_modem_q == NULL) { return IVTS_ERR_INVALID_STATE; }
    return (xQueueSend(g_modem_q, r, 0) == pdTRUE) ? IVTS_OK : IVTS_ERR_FULL;
}

ivts_err_t modem_set_link(bool on)
{
    modem_req_t r = { .op = REQ_LINK, .on = on };
    if (on) { atomic_store(&s_stopped, false); }
    return post(&r);
}

bool modem_is_stopped(void) { return atomic_load(&s_stopped); }
ivts_link_t modem_link_state(void) { return (ivts_link_t)atomic_load(&s_link); }
void modem_set_stopped(bool stopped) { atomic_store(&s_stopped, stopped); }
ivts_err_t modem_set_gnss(bool on) { modem_req_t r = { .op = REQ_GNSS, .on = on }; return post(&r); }

ivts_err_t modem_publish(modem_topic_t topic, const char *payload, size_t len, uint32_t tx_id)
{
    if (payload == NULL || len == 0u || len > MODEM_PAYLOAD_MAX || topic >= MODEM_TOPIC_COUNT) {
        return IVTS_ERR_INVALID_ARG;
    }
    xSemaphoreTake(s_mx, portMAX_DELAY);
    if (s_tx.busy) {
        xSemaphoreGive(s_mx);
        return IVTS_ERR_FULL;
    }
    memcpy(s_tx.data, payload, len);
    s_tx.len = len;
    s_tx.topic = topic;
    s_tx.tx_id = tx_id;
    s_tx.busy = true;
    s_tx.in_flight = false;
    s_tx.result_ready = false;
    xSemaphoreGive(s_mx);
    modem_req_t r = { .op = REQ_PUB_KICK };
    (void)post(&r);                 /* Queue đầy vẫn được: vòng lặp của task "modem" kiểm tra ô publish ở mỗi vòng. */
    return IVTS_OK;
}

bool modem_publish_busy(void)
{
    xSemaphoreTake(s_mx, portMAX_DELAY);
    bool b = s_tx.busy;
    xSemaphoreGive(s_mx);
    return b;
}

bool modem_publish_result(uint32_t tx_id, bool *ok, int16_t *err)
{
    xSemaphoreTake(s_mx, portMAX_DELAY);
    bool ready = s_tx.result_ready && s_tx.tx_id == tx_id;
    if (ready) {
        *ok = s_tx.ok;
        *err = s_tx.err;
    }
    xSemaphoreGive(s_mx);
    return ready;
}

/* payload trỏ thẳng vào ô publish; xem phần "Mô hình thực thi" về tính an toàn của con trỏ này. */
bool modem_tx_take(modem_topic_t *topic, const char **payload, size_t *len, uint32_t *tx_id)
{
    xSemaphoreTake(s_mx, portMAX_DELAY);
    bool ok = s_tx.busy && !s_tx.in_flight;
    if (ok) {
        s_tx.in_flight = true;
        *topic = s_tx.topic;
        *payload = s_tx.data;
        *len = s_tx.len;
        *tx_id = s_tx.tx_id;
    }
    xSemaphoreGive(s_mx);
    return ok;
}

void modem_tx_done(bool ok, int16_t err)
{
    xSemaphoreTake(s_mx, portMAX_DELAY);
    uint32_t id = s_tx.tx_id;
    bool was = s_tx.busy;
    s_tx.busy = false;
    s_tx.in_flight = false;
    if (was) {
        s_tx.result_ready = true;
        s_tx.ok = ok;
        s_tx.err = err;
    }
    xSemaphoreGive(s_mx);
    if (!was) { return; }
    ivts_event_t ev = { .type = IVTS_EV_MQTT_ACK, .ts_ms = modem_now() };
    ev.u.mqtt_ack.tx_id = id;
    ev.u.mqtt_ack.ok = ok ? 1u : 0u;
    ev.u.mqtt_ack.err = err;
    modem_emit(&ev);
}

void modem_cmd_store(const char *payload, size_t len)
{
    if (!g_modem.cfg.command_subscribe_enabled || payload == NULL || len == 0u || len > MODEM_CMD_MAX) {
        return;
    }
    xSemaphoreTake(s_mx, portMAX_DELAY);
    bool stored = s_cmd.count < CMD_QUEUE_DEPTH;
    if (stored) {
        size_t tail = (s_cmd.head + s_cmd.count) % CMD_QUEUE_DEPTH;
        memcpy(s_cmd.items[tail].data, payload, len);
        s_cmd.items[tail].len = len;
        s_cmd.count++;
    } else {
        s_cmd_dropped++;
    }
    xSemaphoreGive(s_mx);
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
    xSemaphoreTake(s_mx, portMAX_DELAY);
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
    xSemaphoreGive(s_mx);
    return r;
}

uint32_t modem_cmd_dropped(void)
{
    xSemaphoreTake(s_mx, portMAX_DELAY);
    uint32_t v = s_cmd_dropped;
    xSemaphoreGive(s_mx);
    return v;
}
