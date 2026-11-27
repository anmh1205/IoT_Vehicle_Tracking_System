/**
 * @file modem_mqtt.c
 * @brief MQTT qua lệnh AT của SIM7600: kết nối, subscribe, publish QoS 1 và nhận command.
 *
 * Lệnh và URC theo SIM7500_SIM7600 Series MQTT AT Command Manual:
 *
 *     AT+CMQTTSTART           -> OK, +CMQTTSTART: <err>
 *     AT+CMQTTACCQ=0,"<id>"   -> OK
 *     AT+CMQTTCONNECT=0,"tcp://h:p",<keepalive 60..64800>,<clean>,"u","p"
 *                             -> OK, +CMQTTCONNECT: 0,<err>
 *     AT+CMQTTSUB=0,<len>,<qos>   -> '>' nhập topic -> OK, +CMQTTSUB: 0,<err>
 *     AT+CMQTTTOPIC=0,<len>       -> '>' nhập topic -> OK
 *     AT+CMQTTPAYLOAD=0,<len>     -> '>' nhập payload -> OK
 *     AT+CMQTTPUB=0,<qos>,<pub_timeout 60..180>
 *                             -> OK, +CMQTTPUB: 0,<err>   (QoS 1: err = 0 khi nhận PUBACK)
 *
 *     Nhận: +CMQTTRXSTART, +CMQTTRXTOPIC: 0,n <n byte>, +CMQTTRXPAYLOAD: 0,n <n byte>,
 *           +CMQTTRXEND: 0
 *     Mất kết nối: +CMQTTCONNLOST: 0,<cause>
 *
 * ## Mô hình thực thi
 *
 * Mọi hàm chạy trong task "modem". Lệnh chặn task trong tối đa timeout của lệnh (publish tối đa
 * PUB_TIMEOUT_S + 5 giây). Trong lúc chờ, modem_pump() vẫn xử lý URC nên command đến giữa chừng
 * được nhận và lưu vào ô command.
 *
 * ## Khi reset hoặc mất nguồn
 *
 * Bản tin QoS 1 đang gửi mà thiết bị reset thì ACK không bao giờ đến app; app xử lý như lỗi và
 * đưa bản ghi vào offline queue. Dịch vụ MQTT trên module có thể còn chạy sau khi ESP reset;
 * bước L_MQTT_START xử lý trường hợp này.
 */

#include "modem_priv.h"
#include <stdio.h>
#include <string.h>
#include "esp_log.h"

#define KEEPALIVE_S   60   /* Keepalive MQTT, giây (manual cho phép 60..64800). */
#define PUB_TIMEOUT_S 60   /* Thời gian module chờ PUBACK, giây (manual cho phép 60..180). */

/** @return true nếu snprintf trả về @p n hợp lệ và không bị cắt. Lệnh AT bị cắt không được gửi. */
static bool fmt_ok(int n, size_t cap) { return n > 0 && (size_t)n < cap; }

/** Subscribe topic command ở QoS 1. @return true nếu module xác nhận. */
static bool sub_commands(void)
{
    modem_t *m = &g_modem;
    char cmd[40];
    size_t tl = strlen(m->topic_cmd);
    snprintf(cmd, sizeof cmd, "AT+CMQTTSUB=0,%u,1", (unsigned)tl);
    at_cmd_t c = { .text = cmd, .data = (const uint8_t *)m->topic_cmd, .data_len = tl,
                   .final_prefix = "+CMQTTSUB:", .final_err_field = 2, .timeout_ms = 15000 };
    return modem_at(&c) == AT_RES_OK;
}

/**
 * @brief Thực hiện bước MQTT @p st của máy trạng thái kết nối.
 * @return true nếu bước thành công và máy trạng thái được phép sang bước kế.
 */
bool modem_mqtt_step(lte_state_t st)
{
    modem_t *m = &g_modem;
    bool tls = m->cfg.mqtt_port == 8883u || strcmp(m->cfg.mqtt_host, "mqtt.thingdock.dev") == 0;
    char cmd[256];
    switch (st) {
    case L_MQTT_START: {
        at_cmd_t c = { .text = "AT+CMQTTSTART", .final_prefix = "+CMQTTSTART:", .final_err_field = 1,
                       .timeout_ms = 12000 };
        at_result_t r = modem_at(&c);
        /* Dịch vụ MQTT có thể còn chạy từ phiên trước (ESP reset nhưng module không), khi đó
         * AT+CMQTTSTART trả lỗi. Giải phóng client và dừng dịch vụ để lần thử sau START lại từ
         * đầu; không coi lỗi này là thành công vì không biết client nào còn đang giữ. */
        if (r != AT_RES_OK) {
            (void)modem_at_simple("AT+CMQTTDISC=0,60", 5000);
            (void)modem_at_simple("AT+CMQTTREL=0", 3000);
            (void)modem_at_simple("AT+CMQTTSTOP", 5000);
        }
        return r == AT_RES_OK;
    }
    case L_MQTT_ACQ:
        if (tls && !modem_tls_configure(0)) { return false; }
        if (!fmt_ok(snprintf(cmd, sizeof cmd, "AT+CMQTTACCQ=0,\"%s\",%u,4", m->cfg.client_id, tls ? 1u : 0u), sizeof cmd) ||
            modem_at_simple(cmd, 5000) != AT_RES_OK) {
            return false;
        }
        if (tls && modem_at_simple("AT+CMQTTSSLCFG=0,0", 3000) != AT_RES_OK) {
            (void)modem_at_simple("AT+CMQTTREL=0", 3000);
            return false;
        }
        return true;
    case L_MQTT_CONN: {
        /* clean_session = 0: broker giữ subscription và các command QoS 1 trong lúc thiết bị
         * offline. */
        int k;
        unsigned port = tls ? 8883u : m->cfg.mqtt_port;
        if (m->cfg.mqtt_user[0] != '\0') {
            k = snprintf(cmd, sizeof cmd, "AT+CMQTTCONNECT=0,\"tcp://%s:%u\",%d,0,\"%s\",\"%s\"",
                         m->cfg.mqtt_host, port, KEEPALIVE_S, m->cfg.mqtt_user, m->cfg.mqtt_pass);
        } else {
            k = snprintf(cmd, sizeof cmd, "AT+CMQTTCONNECT=0,\"tcp://%s:%u\",%d,0",
                         m->cfg.mqtt_host, port, KEEPALIVE_S);
        }
        if (!fmt_ok(k, sizeof cmd)) { return false; }    /* Lệnh bị cắt sẽ mang credential sai: không gửi. */
        at_cmd_t c = { .text = cmd, .final_prefix = "+CMQTTCONNECT:", .final_err_field = 2,
                       .timeout_ms = 35000, .redact = m->cfg.mqtt_user[0] != '\0' };
        return modem_at(&c) == AT_RES_OK;
    }
    case L_MQTT_SUB:
        return !m->cfg.command_subscribe_enabled || sub_commands();
    default:
        return false;
    }
}

/**
 * @brief Nhập topic hoặc payload cho bản tin sắp publish bằng AT+CMQTT<what>=0,<len>.
 * @param what "TOPIC" hoặc "PAYLOAD".
 */
static bool input(const char *what, const char *data, size_t len)
{
    char cmd[40];
    snprintf(cmd, sizeof cmd, "AT+CMQTT%s=0,%u", what, (unsigned)len);
    at_cmd_t c = { .text = cmd, .data = (const uint8_t *)data, .data_len = len, .timeout_ms = 10000 };
    return modem_at(&c) == AT_RES_OK;
}

/**
 * @brief Gửi bản tin trong ô publish (nếu có) và báo kết quả cho app.
 *
 * Mã lỗi báo qua IVTS_EV_MQTT_ACK: 0 = thành công; -2 = lỗi khi nhập topic hoặc payload;
 * -1 = không có kết quả trong PUB_TIMEOUT_S + 5 giây; giá trị khác là mã <err> trong bảng lỗi
 * MQTT của module. Mã 11 (không có kết nối) làm máy trạng thái quay lại bước kết nối.
 */
void modem_mqtt_publish_pending(void)
{
    modem_topic_t t;
    const char *p;
    size_t n;
    uint32_t id;
    if (!modem_tx_take(&t, &p, &n, &id)) { return; }
    const char *topic = g_modem.topic[t];
    bool ok = input("TOPIC", topic, strlen(topic)) && input("PAYLOAD", p, n);
    int16_t err = -2;                                   /* Lỗi trước khi PUB (nhập topic hoặc payload). */
    if (ok) {
        char cmd[40];
        snprintf(cmd, sizeof cmd, "AT+CMQTTPUB=0,1,%d", PUB_TIMEOUT_S);
        at_cmd_t c = { .text = cmd, .final_prefix = "+CMQTTPUB:", .final_err_field = 2,
                       .timeout_ms = (PUB_TIMEOUT_S + 5) * 1000u };
        at_result_t r = modem_at(&c);
        int32_t e = 0;
        ok = (r == AT_RES_OK);
        if (ok) {
            err = 0;
        } else if (r == AT_RES_TIMEOUT) {
            err = -1;                                   /* Không có kết quả trong PUB_TIMEOUT_S + 5 giây. */
        } else if (at_field_int(g_modem.eng.resp, 1, &e)) {
            err = (int16_t)e;                           /* Mã <err> theo bảng lỗi MQTT của module. */
        }
    }
    modem_tx_done(ok, err);
    /* Mã 11 là "no connection" trong bảng lỗi MQTT: broker đã mất. */
    if (!ok && err == 11) { modem_lte_conn_lost(); }
    if (!ok && err == -1) {
        /* Đóng phiên cũ để kết quả PUB đến trễ không khớp nhầm vào lần gửi kế tiếp. */
        modem_emit_link(IVTS_LINK_NET_UP, (int32_t)IVTS_ERR_TIMEOUT);
        modem_lte_reset(L_MQTT_START);
    }
}

typedef enum {
    RX_NONE = 0, RX_START, RX_TOPIC, RX_PAYLOAD, RX_END,
} rx_header_t;

/** Xử lý header sau khi đã có đầy đủ phần số, kể cả header modem tách thành hai dòng. */
static void rx_header(rx_header_t header, const char *fields)
{
    modem_t *m = &g_modem;
    int32_t client, length;
    bool right_client = at_field_int(fields, 0, &client) && client == 0;

    if (header == RX_START) {
        memset(&m->rx, 0, sizeof m->rx);
        int32_t topic_total, payload_total;
        if (right_client && at_field_int(fields, 1, &topic_total) && topic_total > 0 &&
            at_field_int(fields, 2, &payload_total) && payload_total > 0) {
            m->rx.topic_total = (size_t)topic_total;
            m->rx.payload_total = (size_t)payload_total;
            m->rx.active = true;
            m->rx.overflow = m->rx.topic_total >= sizeof m->rx.topic ||
                             m->rx.payload_total > sizeof m->rx.payload;
        }
    } else if (header == RX_END) {
        if (m->rx.active && right_client && !m->rx.overflow &&
            m->rx.tlen == m->rx.topic_total && m->rx.plen == m->rx.payload_total &&
            m->rx.tlen == strlen(m->topic_cmd) && memcmp(m->rx.topic, m->topic_cmd, m->rx.tlen) == 0) {
            modem_cmd_store(m->rx.payload, m->rx.plen);
        } else if (m->rx.overflow) {
            ESP_LOGW(MODEM_TAG, "command vượt bộ đệm, bị bỏ");
        }
        m->rx.active = false;
    } else {
        bool topic = header == RX_TOPIC;
        if (!at_field_int(fields, 1, &length) || length <= 0) {
            m->rx.active = false;
            return;
        }
        if (!right_client || (topic ? m->rx.phase == 2u : m->rx.tlen != m->rx.topic_total)) {
            m->rx.active = false;
        }
        m->rx.phase = topic ? 1u : 2u;
        modem_expect_raw((size_t)length);    /* Rút cả byte của khung sai để giữ đồng bộ UART. */
    }
}

/** Nhận URC MQTT và các dòng số theo sau header dạng tách dòng. */
void modem_mqtt_on_urc(const char *line)
{
    modem_t *m = &g_modem;
    rx_header_t header = RX_NONE;
    if (at_has_prefix(line, "+CMQTTRXSTART:")) { header = RX_START; }
    else if (at_has_prefix(line, "+CMQTTRXTOPIC:")) { header = RX_TOPIC; }
    else if (at_has_prefix(line, "+CMQTTRXPAYLOAD:")) { header = RX_PAYLOAD; }
    else if (at_has_prefix(line, "+CMQTTRXEND:")) { header = RX_END; }

    if (header != RX_NONE) {
        const char *fields = strchr(line, ':');
        const char *first = fields + 1;
        while (*first == ' ') { first++; }
        m->rx.pending_header = RX_NONE;
        if (*first == '\0') {
            m->rx.pending_header = (uint8_t)header;
        } else {
            rx_header(header, fields);
        }
    } else if (at_has_prefix(line, "+CMQTTCONNLOST:")) {
        ESP_LOGW(MODEM_TAG, "%s", line);
        memset(&m->rx, 0, sizeof m->rx);
        modem_lte_conn_lost();
    } else if (m->rx.pending_header != RX_NONE) {
        while (*line == ' ') { line++; }
        if (*line < '0' || *line > '9') { return; }
        char fields[48];
        int n = snprintf(fields, sizeof fields, ":%s", line);
        header = (rx_header_t)m->rx.pending_header;
        m->rx.pending_header = RX_NONE;
        if (fmt_ok(n, sizeof fields)) {
            rx_header(header, fields);
        } else {
            m->rx.active = false;
        }
    }
}

/* Ngắt kết nối broker nếu đã tới bước kết nối; không làm gì nếu chưa. */
void modem_mqtt_disconnect(void)
{
    if (g_modem.lte.st >= L_MQTT_CONN) {
        (void)modem_at_simple("AT+CMQTTDISC=0,60", 5000);
    }
}
