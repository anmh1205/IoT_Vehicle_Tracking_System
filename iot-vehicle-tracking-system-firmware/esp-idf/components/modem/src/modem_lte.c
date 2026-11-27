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

typedef enum {
    STEP_IDLE, STEP_ADVANCE, STEP_FAIL, STEP_RETRY_LATER, STEP_RESTART, STEP_BROKER_UP,
} step_action_t;

typedef struct {
    step_action_t action;
    lte_state_t target;
    uint32_t delay_ms;
} step_result_t;

static step_result_t advance_to(lte_state_t target)
{
    return (step_result_t){ .action = STEP_ADVANCE, .target = target };
}

static step_result_t step_power(void)
{
    if (modem_now() < g_modem.power_restart_at) { return (step_result_t){ .action = STEP_IDLE }; }
    modem_pm_hold(true);
    if (modem_at_simple("AT", 500) == AT_RES_OK) { return advance_to(L_SYNC); }
    modem_power_pulse(500);
    /* Wait for the module to finish starting before the next AT command. */
    return (step_result_t){ .action = STEP_ADVANCE, .target = L_SYNC, .delay_ms = 12000u };
}

static step_result_t step_sync(const modem_lte_t *link)
{
    if (modem_at_simple("AT", 1000) == AT_RES_OK && modem_at_simple("ATE0", 1000) == AT_RES_OK) {
        (void)modem_at_simple("AT+CMEE=2", 1000);
        (void)modem_at_simple("AT+CTZU=1", 1000);
        return advance_to(L_SIM);
    }
    return link->attempt >= 10u ? advance_to(L_POWER) : (step_result_t){ .action = STEP_FAIL };
}

static bool parse_cpin_ready(const char *response)
{
    if (!at_has_prefix(response, "+CPIN:")) { return false; }
    const char *state = response + sizeof("+CPIN:") - 1u;
    while (*state == ' ') { state++; }
    return strcmp(state, "READY") == 0;
}

static step_result_t step_sim(void)
{
    at_cmd_t command = { .text = "AT+CPIN?", .capture = "+CPIN:", .timeout_ms = 5000 };
    if (modem_at(&command) == AT_RES_OK && parse_cpin_ready(g_modem.eng.resp)) { return advance_to(L_REG); }
    return (step_result_t){ .action = STEP_FAIL };
}

static step_result_t step_register(const modem_lte_t *link)
{
    at_cmd_t command = { .text = "AT+CEREG?", .capture = "+CEREG:", .timeout_ms = 3000 };
    if (modem_at(&command) == AT_RES_OK && reg_ok(g_modem.eng.resp)) { return advance_to(L_PDP); }
    if (modem_now() - link->st_since > REG_TIMEOUT_MS) {
        return (step_result_t){ .action = STEP_RESTART };
    }
    return (step_result_t){ .action = STEP_RETRY_LATER, .delay_ms = 2000u };
}

static bool format_cgdcont(char *command, size_t capacity, const char *apn)
{
    int len = snprintf(command, capacity, "AT+CGDCONT=1,\"IP\",\"%s\"", apn);
    return len > 0 && (size_t)len < capacity;
}

static step_result_t step_pdp(void)
{
    char command[96];
    if (format_cgdcont(command, sizeof command, g_modem.cfg.apn) &&
        modem_at_simple(command, 5000) == AT_RES_OK && modem_at_simple("AT+CGACT=1,1", 150000) == AT_RES_OK) {
        modem_emit_link(IVTS_LINK_NET_UP, 0);
        return advance_to(L_MQTT_START);
    }
    return (step_result_t){ .action = STEP_FAIL };
}

static step_result_t step_mqtt(const modem_lte_t *link)
{
    if (modem_mqtt_step(link->st)) {
        if (link->st == L_MQTT_SUB) { return (step_result_t){ .action = STEP_BROKER_UP }; }
        return advance_to((lte_state_t)(link->st + 1));
    }
    if (link->st == L_MQTT_CONN && link->attempt >= 3u) { return advance_to(L_MQTT_START); }
    return (step_result_t){ .action = STEP_FAIL };
}

static step_result_t run_step(const modem_lte_t *link)
{
    switch (link->st) {
    case L_POWER: return step_power();
    case L_SYNC: return step_sync(link);
    case L_SIM: return step_sim();
    case L_REG: return step_register(link);
    case L_PDP: return step_pdp();
    case L_MQTT_START: case L_MQTT_ACQ: case L_MQTT_CONN: case L_MQTT_SUB:
        return step_mqtt(link);
    default: return (step_result_t){ .action = STEP_IDLE };
    }
}

static void apply_step_result(modem_lte_t *link, step_result_t result)
{
    switch (result.action) {
    case STEP_ADVANCE:
        go(result.target);
        if (result.delay_ms != 0u) { link->retry_at = modem_now() + result.delay_ms; }
        break;
    case STEP_FAIL: fail(); break;
    case STEP_RETRY_LATER: link->retry_at = modem_now() + result.delay_ms; break;
    case STEP_RESTART:
        fail();
        go(L_POWER);
        break;
    case STEP_BROKER_UP:
        go(L_UP);
        modem_emit_link(IVTS_LINK_BROKER_UP, 0);
        break;
    case STEP_IDLE: break;
    }
}

void modem_lte_step(void)
{
    modem_lte_t *link = &g_modem.lte;
    if (link->st == L_OFF || link->st == L_UP || modem_now() < link->retry_at) { return; }
    apply_step_result(link, run_step(link));
}
