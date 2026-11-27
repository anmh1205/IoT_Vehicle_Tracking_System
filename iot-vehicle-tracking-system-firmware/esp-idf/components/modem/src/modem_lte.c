/**
 * @file modem_lte.c
 * @brief Máy trạng thái đưa SIM7600 từ tắt nguồn đến khi kết nối broker.
 *
 * Mỗi lần gọi modem_lte_step() thực hiện tối đa một bước (một hoặc vài lệnh AT). Bước thất bại
 * được thử lại theo backoff luỹ thừa có jitter (attempt, retry_at); sau FAILS_POWER_CYCLE lần
 * thất bại từ lần bật nguồn thì tắt nguồn module và bật lại.
 *
 *     L_OFF -> L_POWER -> L_SYNC -> L_SIM -> L_REG -> L_PDP
 *           -> L_MQTT_START -> L_MQTT_ACQ -> L_MQTT_CONN -> L_MQTT_SUB -> L_UP
 *
 * Lệnh AT theo AT manual SIM7500_SIM7600 V2.00.
 *
 * ## Mô hình thực thi
 *
 * Mọi hàm trong file chạy trong task "modem" và là writer duy nhất của g_modem.lte. Lệnh AT chặn
 * task "modem" trong tối đa timeout của lệnh; riêng AT+CGACT (150 s) có thể chặn lâu. Vì vậy
 * yêu cầu mới trong g_modem_q được phục vụ ở đầu vòng lặp kế tiếp, sau khi lệnh hiện tại xong.
 * Khi power-cycle, bước L_POWER đợi phần cứng tắt xong trước khi thăm dò UART.
 */

#include "modem_priv.h"
#include <stdio.h>
#include <string.h>
#include "esp_log.h"
#include "ivts_core/base/backoff.h"

#define REG_TIMEOUT_MS     180000u   /* Thời gian tối đa chờ đăng ký mạng trước khi bật nguồn lại. */
#define FAILS_POWER_CYCLE  8u        /* Số thất bại tích luỹ dẫn đến power-cycle. */

/* Backoff giữa các lần thử lại: 1 s tăng dần đến 60 s, cộng jitter đến 2 s. */
static const ivts_backoff_t k_backoff = { .base_ms = 1000, .max_ms = 60000, .jitter_ms = 2000 };

/** Tên bước, dùng cho log. */
static const char *st_name(lte_state_t s)
{
    static const char *const n[] = { "OFF", "POWER", "SYNC", "SIM", "REG", "PDP",
                                     "MQTT_START", "MQTT_ACQ", "MQTT_CONN", "MQTT_SUB", "UP" };
    return (s <= L_UP) ? n[s] : "?";
}

/* Đặt máy trạng thái về @p to và xoá bộ đếm; fails_total chỉ xoá khi về L_OFF hoặc L_POWER. */
void modem_lte_reset(lte_state_t to)
{
    g_modem.lte.st = to;
    g_modem.lte.attempt = 0;
    g_modem.lte.retry_at = 0;
    g_modem.lte.st_since = modem_now();
    if (to <= L_POWER) { g_modem.lte.fails_total = 0; }
}

/** Chuyển sang bước @p to, xoá bộ đếm thử lại và ghi log. */
static void go(lte_state_t to)
{
    ESP_LOGI(MODEM_TAG, "lte %s -> %s", st_name(g_modem.lte.st), st_name(to));
    g_modem.lte.st = to;
    g_modem.lte.attempt = 0;
    g_modem.lte.retry_at = 0;
    g_modem.lte.st_since = modem_now();
}

/**
 * @brief Ghi nhận một lần thất bại và đặt thời điểm thử lại theo backoff.
 *
 * Đủ FAILS_POWER_CYCLE lần thất bại tích luỹ thì tắt nguồn module bằng PWRKEY, báo link xuống
 * và quay về L_POWER.
 */
static void fail(void)
{
    modem_lte_t *l = &g_modem.lte;
    l->fails_total++;
    if (l->fails_total >= FAILS_POWER_CYCLE) {
        ESP_LOGW(MODEM_TAG, "lte: %lu lần lỗi, power-cycle modem", (unsigned long)l->fails_total);
        modem_power_down();
        modem_emit_link(IVTS_LINK_DOWN, (int32_t)IVTS_ERR_TIMEOUT);
        modem_lte_reset(L_POWER);
        return;
    }
    uint32_t d = ivts_backoff_ms(&k_backoff, l->attempt, (uint32_t)modem_now());
    l->attempt++;
    l->retry_at = modem_now() + d;
}

/* Mất kết nối broker: về bước kết nối lại, mạng dữ liệu vẫn giữ. */
void modem_lte_conn_lost(void)
{
    if (g_modem.lte.st >= L_MQTT_CONN) {
        modem_emit_link(IVTS_LINK_NET_UP, 0);
        go(L_MQTT_CONN);
    }
}

/** @return true nếu dòng +CEREG báo đã đăng ký (1 = mạng nhà, 5 = roaming). */
static bool reg_ok(const char *resp)
{
    int32_t stat;
    return at_field_int(resp, 1, &stat) && (stat == 1 || stat == 5);
}

/**
 * @brief Thực hiện một bước của máy trạng thái nếu đến hạn thử lại.
 *
 * Không làm gì khi ở L_OFF (link đã tắt, xem modem_os.c) hoặc L_UP, hoặc khi chưa đến retry_at.
 */
void modem_lte_step(void)
{
    modem_t *m = &g_modem;
    modem_lte_t *l = &m->lte;
    if (l->st == L_OFF || l->st == L_UP || modem_now() < l->retry_at) { return; }

    switch (l->st) {
    case L_POWER:
        if (modem_now() < m->power_restart_at) { return; }
        modem_pm_hold(true);
        if (modem_at_simple("AT", 500) == AT_RES_OK) {       /* Module đã chạy sẵn (ESP reset nhưng module còn nguồn). */
            go(L_SYNC);
            break;
        }
        modem_power_pulse(500);                              /* Xung PWRKEY bật nguồn 500 ms. */
        go(L_SYNC);
        l->retry_at = modem_now() + 12000;                   /* Chờ module khởi động xong rồi mới đồng bộ AT. */
        break;
    case L_SYNC:
        if (modem_at_simple("AT", 1000) == AT_RES_OK && modem_at_simple("ATE0", 1000) == AT_RES_OK) {
            (void)modem_at_simple("AT+CMEE=2", 1000);         /* Báo lỗi dạng chữ để log dễ đọc. */
            (void)modem_at_simple("AT+CTZU=1", 1000);        /* Giờ mạng cho TLS khi chưa có giờ RTC. */
            go(L_SIM);
        } else if (l->attempt >= 10) {
            go(L_POWER);
        } else {
            fail();
        }
        break;
    case L_SIM: {
        at_cmd_t c = { .text = "AT+CPIN?", .capture = "+CPIN:", .timeout_ms = 5000 };
        if (modem_at(&c) == AT_RES_OK && at_has_prefix(m->eng.resp, "+CPIN:")) {
            const char *state = m->eng.resp + sizeof("+CPIN:") - 1u;
            while (*state == ' ') { state++; }
            if (strcmp(state, "READY") == 0) {
                go(L_REG);
                break;
            }
        }
        fail();
        break;
    }
    case L_REG: {
        at_cmd_t c = { .text = "AT+CEREG?", .capture = "+CEREG:", .timeout_ms = 3000 };
        if (modem_at(&c) == AT_RES_OK && reg_ok(m->eng.resp)) {
            go(L_PDP);
        } else if (modem_now() - l->st_since > REG_TIMEOUT_MS) {
            fail();
            go(L_POWER);
        } else {
            l->retry_at = modem_now() + 2000;               /* Đang chờ đăng ký: hỏi lại sau 2 s, không tính là lỗi. */
        }
        break;
    }
    case L_PDP: {
        char cmd[96];
        int k = snprintf(cmd, sizeof cmd, "AT+CGDCONT=1,\"IP\",\"%s\"", m->cfg.apn);
        if (k > 0 && (size_t)k < sizeof cmd && modem_at_simple(cmd, 5000) == AT_RES_OK && modem_at_simple("AT+CGACT=1,1", 150000) == AT_RES_OK) {
            modem_emit_link(IVTS_LINK_NET_UP, 0);
            go(L_MQTT_START);
        } else {
            fail();
        }
        break;
    }
    case L_MQTT_START: case L_MQTT_ACQ: case L_MQTT_CONN: case L_MQTT_SUB:
        if (modem_mqtt_step(l->st)) {
            if (l->st == L_MQTT_SUB) {
                go(L_UP);
                modem_emit_link(IVTS_LINK_BROKER_UP, 0);
            } else {
                go((lte_state_t)(l->st + 1));
            }
        } else if (l->st == L_MQTT_CONN && l->attempt >= 3) {
            go(L_MQTT_START);                               /* Kết nối lỗi liên tiếp: làm lại từ khởi động dịch vụ MQTT. */
        } else {
            fail();
        }
        break;
    default:
        break;
    }
}
