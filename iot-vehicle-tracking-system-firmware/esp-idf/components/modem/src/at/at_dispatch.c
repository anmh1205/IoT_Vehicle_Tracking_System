/**
 * @file src/at/at_dispatch.c
 * @brief Routing between UART input, AT responses and raw protocol streams.
 *
 * The modem task pumps UART during its loop and during synchronous commands.
 * The active command has first claim on text and prompts. Unclaimed lines and raw chunks go to
 * the HTTP or MQTT handler. Each service interprets its own fields and payloads.
 * Dispatch owns the parser and drops partial protocol frames when raw input stalls.
 */
#include "at/at.h"
#include "modem_internal.h"
#include "platform/log.h"
#include "mqtt/mqtt.h"
#include "services/services.h"
#include "transport/transport.h"

#define RAW_TIMEOUT_MS 3000u /**< Raw block deadline in milliseconds from its header. */

/* Startup binds the parser and engine. The modem task owns both and the raw deadline thereafter. */
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

/** @brief Give HTTP headers first claim on text left by the AT engine, then route to MQTT. */
static void on_unsolicited(const char *line)
{
    IVTS_LOGD(AT_TAG, "< %s", line);
    if (modem_http_on_line(line)) { return; }       /* An HTTPREAD data header can switch the parser to raw mode. */
    modem_mqtt_rx_on_urc(line);
}

void modem_expect_raw(size_t len)
{
    at_parser_expect_raw(&s_parser, len);
    s_raw_deadline_at_ms = modem_now() + RAW_TIMEOUT_MS;
}

/** @brief Drop protocol frame state and buffered UART bytes together after a raw framing timeout. */
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
        IVTS_LOGW(MODEM_TAG, "uart raw_frame result=truncated left=%uB", (unsigned)s_parser.raw_left);
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

static const char *at_result_name(at_result_t r)
{
    switch (r) {
    case AT_RES_OK: return "OK";
    case AT_RES_TIMEOUT: return "timeout";
    case AT_RES_ERROR: return "error";
    default: return "pending";
    }
}

at_result_t modem_at(const at_cmd_t *c)
{
    uint64_t started_ms = modem_now();
    if (at_engine_start(&s_engine, c, started_ms) != IVTS_OK) { return AT_RES_ERROR; }
    for (;;) {
        modem_at_dispatch_pump(20);
        at_result_t r = at_engine_poll(&s_engine, modem_now());
        if (r != AT_RES_PENDING) {
            if (r == AT_RES_TIMEOUT && s_parser.raw_left != 0u) { discard_partial_frame(); }
            const char *text = c->redact ? "<redacted>" : c->text;
            const char *resp = c->redact ? "" : s_engine.resp;
            unsigned long took_ms = (unsigned long)(modem_now() - started_ms);
            IVTS_LOGD(AT_TAG, "> %s  < %s %s %lums", text, resp, at_result_name(r), took_ms);
            if (r != AT_RES_OK) {
                IVTS_LOGW(MODEM_TAG, "at fail cmd=\"%s\" result=%s resp=\"%s\" took=%lums", text, at_result_name(r),
                          resp, took_ms);
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
