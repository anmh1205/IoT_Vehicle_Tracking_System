#include "at/at.h"
#include "modem_internal.h"
#include "esp_log.h"
#include "mqtt/mqtt.h"
#include "transport/transport.h"

#define RAW_TIMEOUT_MS 3000u

static at_parser_t s_parser;
static at_engine_t s_engine;
static uint64_t s_raw_deadline_at_ms;

void modem_at_dispatch_init(void)
{
    at_parser_init(&s_parser);
    at_engine_init(&s_engine, (at_tx_t){ modem_uart_write, NULL });
}

const char *modem_at_response(void)
{
    return s_engine.resp;
}

static void on_unsolicited(const char *line)
{
    if (modem_http_on_line(line)) { return; }       /* "+HTTPREAD: DATA,n" chuyển parser sang chế độ thô. */
    modem_mqtt_rx_on_urc(line);
}

void modem_expect_raw(size_t len)
{
    at_parser_expect_raw(&s_parser, len);
    s_raw_deadline_at_ms = modem_now() + RAW_TIMEOUT_MS;
}

static void discard_partial_frame(void)
{
    modem_http_discard_raw();
    modem_mqtt_rx_discard_raw();
    at_parser_init(&s_parser);
    modem_uart_flush();
}

void modem_at_dispatch_pump(uint32_t wait_ms)
{
    if (s_parser.raw_left != 0u && modem_now() >= s_raw_deadline_at_ms) {
        ESP_LOGW(MODEM_TAG, "UART: khung dữ liệu thô bị cắt");
        discard_partial_frame();
    }
    uint8_t buf[128];
    int n = modem_uart_read(buf, sizeof buf, wait_ms);
    for (int i = 0; i < n; i++) {
        at_unit_t u = at_parser_feed(&s_parser, buf[i]);
        if (u == AT_UNIT_LINE) {
            if (!at_engine_on_line(&s_engine, s_parser.buf)) {
                on_unsolicited(s_parser.buf);
            }
        } else if (u == AT_UNIT_PROMPT) {
            at_engine_on_prompt(&s_engine);
        } else if (u == AT_UNIT_DATA) {
            const uint8_t *data = (const uint8_t *)s_parser.buf;
            if (!modem_http_route_raw(data, s_parser.len, s_parser.raw_left == 0u)) {
                modem_mqtt_rx_on_data(data, s_parser.len);
            }
        }
    }
}

at_result_t modem_at(const at_cmd_t *c)
{
    if (at_engine_start(&s_engine, c, modem_now()) != IVTS_OK) { return AT_RES_ERROR; }
    for (;;) {
        modem_at_dispatch_pump(20);
        at_result_t r = at_engine_poll(&s_engine, modem_now());
        if (r != AT_RES_PENDING) {
            if (r == AT_RES_TIMEOUT && s_parser.raw_left != 0u) { discard_partial_frame(); }
            if (r != AT_RES_OK) {
                ESP_LOGW(MODEM_TAG, "%s -> %s %s", c->redact ? "AT (credential/URL)" : c->text,
                         r == AT_RES_TIMEOUT ? "TIMEOUT" : "ERROR", c->redact ? "" : s_engine.resp);
            }
            return r;
        }
    }
}

at_result_t modem_at_simple(const char *text, uint32_t timeout_ms)
{
    at_cmd_t c = { .text = text, .timeout_ms = timeout_ms };
    return modem_at(&c);
}
