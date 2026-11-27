/**
 * @file src/services/link.c
 * @brief LTE and MQTT link sequencing, retry backoff and power recovery.
 *
 * The modem task owns the step and retry deadlines. Its loop applies due steps and reports link changes.
 * MQTT receive and publish handlers can request reconnect on the same task.
 * The MQTT service owns broker commands and the transport owns PWRKEY and its restart guard.
 */
#include "modem_internal.h"
#include "services/services.h"
#include "platform/log.h"
#include "ivts_core/base/backoff.h"
#include "transport/transport.h"
#include "at/at.h"
#include "mqtt/mqtt.h"
#include <stdio.h>
#include <string.h>

/* Startup clears the link state. Only the modem task reads or mutates it once started. */
static modem_link_t s_link;

#define FAILS_POWER_CYCLE  8u        /**< Accumulated failures that trigger a modem power cycle. */

/* Retry delays grow from 1 to 60 seconds plus up to 2 seconds of jitter. */
static const ivts_backoff_t k_step_backoff = { .base_ms = 1000, .max_ms = 60000, .jitter_ms = 2000 };

/** @brief Map a link step to its stable log name. */
static const char *st_name(modem_link_step_t s)
{
    static const char *const n[] = { "OFF", "POWER", "SYNC", "SIM", "REG", "PDP",
                                     "MQTT_START", "MQTT_ACQ", "MQTT_CONN", "MQTT_SUB", "UP" };
    return (s <= MODEM_LINK_STEP_UP) ? n[s] : "?";
}

void modem_link_reset(modem_link_step_t to)
{
    s_link.step = to;
    s_link.attempt = 0;
    s_link.retry_at_ms = 0;
    s_link.entered_at_ms = modem_now();
    if (to <= MODEM_LINK_STEP_POWER) { s_link.fails_total = 0; }
}

/** @brief Sample signal quality at packet-data setup and broker readiness. RSSI 99 means unknown. */
static void log_signal(void)
{
    at_cmd_t q = { .text = "AT+CSQ", .capture = "+CSQ:", .timeout_ms = 1000 };
    int32_t rssi = 99, ber = 99;
    if (modem_at(&q) != AT_RES_OK || !at_field_int(modem_at_response(), 0, &rssi)) { return; }
    (void)at_field_int(modem_at_response(), 1, &ber);
    if (rssi == 99) {
        IVTS_LOGI(MODEM_TAG, "lte signal rssi=unknown ber=%ld", (long)ber);
    } else {
        IVTS_LOGI(MODEM_TAG, "lte signal rssi=%lddBm csq=%ld ber=%ld", (long)(-113 + 2 * rssi), (long)rssi, (long)ber);
    }
}

/** @brief Log and enter a step while preserving the accumulated failure count. */
static void go(modem_link_step_t to)
{
    uint64_t took_ms = modem_now() - s_link.entered_at_ms;
    IVTS_LOGI(MODEM_TAG, "lte %s -> %s took=%lu.%lus fails=%lu", st_name(s_link.step), st_name(to),
              (unsigned long)(took_ms / 1000u), (unsigned long)(took_ms % 1000u / 100u),
              (unsigned long)s_link.fails_total);
    if (to == MODEM_LINK_STEP_PDP || to == MODEM_LINK_STEP_UP) { log_signal(); }
    s_link.step = to;
    s_link.attempt = 0;
    s_link.retry_at_ms = 0;
    s_link.entered_at_ms = modem_now();
}

/** @brief Back off the current step or request guarded shutdown when failures reach the threshold. */
static void fail(void)
{
    modem_link_t *l = &s_link;
    l->fails_total++;
    if (l->fails_total >= FAILS_POWER_CYCLE) {
        IVTS_LOGW(MODEM_TAG, "lte power_cycle step=%s fails=%lu", st_name(l->step), (unsigned long)l->fails_total);
        modem_link_power_down();
        modem_emit_link(IVTS_LINK_DOWN, (int32_t)IVTS_ERR_TIMEOUT);
        modem_link_reset(MODEM_LINK_STEP_POWER);
        return;
    }
    uint32_t d = ivts_backoff_ms(&k_step_backoff, l->attempt, (uint32_t)modem_now());
    l->attempt++;
    l->retry_at_ms = modem_now() + d;
    IVTS_LOGW(MODEM_TAG, "lte retry step=%s attempt=%lu fails=%lu wait=%lums", st_name(l->step),
              (unsigned long)l->attempt, (unsigned long)l->fails_total, (unsigned long)d);
}

void modem_link_on_connection_lost(void)
{
    if (s_link.step >= MODEM_LINK_STEP_MQTT_CONN) {
        modem_emit_link(IVTS_LINK_NET_UP, 0);
        go(MODEM_LINK_STEP_MQTT_CONN);
    }
}
/** @brief Apply the step outcome, including any deadline or readiness event. */
static void apply_step_result(modem_link_t *link, step_result_t result)
{
    switch (result.action) {
    case MODEM_LINK_ADVANCE:
        go(result.target);
        if (result.delay_ms != 0u) { link->retry_at_ms = modem_now() + result.delay_ms; }
        break;
    case MODEM_LINK_FAIL: fail(); break;
    case MODEM_LINK_RETRY_LATER: link->retry_at_ms = modem_now() + result.delay_ms; break;
    case MODEM_LINK_RESTART: {
        fail();
        if (link->step == MODEM_LINK_STEP_POWER) { break; }  /* The threshold already started guarded recovery. */
        uint64_t retry_at_ms = link->retry_at_ms;
        go(MODEM_LINK_STEP_POWER);
        link->retry_at_ms = retry_at_ms;
        break;
    }
    case MODEM_LINK_BROKER_UP:
        go(MODEM_LINK_STEP_UP);
        modem_emit_link(IVTS_LINK_BROKER_UP, 0);
        break;
    case MODEM_LINK_IDLE: break;
    }
}

void modem_link_tick(void)
{
    modem_link_t *link = &s_link;
    if (link->step == MODEM_LINK_STEP_OFF || link->step == MODEM_LINK_STEP_UP || modem_now() < link->retry_at_ms) { return; }
    apply_step_result(link, modem_link_run_step(link));
}

void modem_link_init(void)
{
    s_link = (modem_link_t){0};
}

modem_link_step_t modem_link_current_step(void)
{
    return s_link.step;
}

void modem_link_power_down(void)
{
    if (modem_power_down()) { modem_gnss_reset_power(); }
}

#define REG_TIMEOUT_MS 180000u /**< Elapsed registration time in milliseconds before returning to power. */

/** @brief Accept the registration status for a home or roaming network. */
static bool reg_ok(const char *resp)
{
    int32_t stat;
    return at_field_int(resp, 1, &stat) && (stat == 1 || stat == 5);
}

static step_result_t advance_to(modem_link_step_t target)
{
    return (step_result_t){ .action = MODEM_LINK_ADVANCE, .target = target };
}

/** @brief Probe for an already-responsive module before pulsing PWRKEY. */
static step_result_t step_power(void)
{
    if (modem_power_restart_is_blocked()) { return (step_result_t){ .action = MODEM_LINK_IDLE }; }
    modem_pm_hold(true);
    if (modem_at_simple("AT", 500) == AT_RES_OK) { return advance_to(MODEM_LINK_STEP_SYNC); }
    modem_power_pulse(500);
    /* Wait for the module to finish starting before the next AT command. */
    return (step_result_t){ .action = MODEM_LINK_ADVANCE, .target = MODEM_LINK_STEP_SYNC, .delay_ms = 12000u };
}

/** @brief Synchronize AT and let the accumulated-failure threshold handle recovery. */
static step_result_t step_sync(void)
{
    if (modem_at_simple("AT", 1000) == AT_RES_OK && modem_at_simple("ATE0", 1000) == AT_RES_OK) {
        (void)modem_at_simple("AT+CMEE=2", 1000);
        (void)modem_at_simple("AT+CTZU=1", 1000);
        return advance_to(MODEM_LINK_STEP_SIM);
    }
    return (step_result_t){ .action = MODEM_LINK_FAIL };
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
    if (modem_at(&command) == AT_RES_OK && parse_cpin_ready(modem_at_response())) { return advance_to(MODEM_LINK_STEP_REG); }
    return (step_result_t){ .action = MODEM_LINK_FAIL };
}

/** @brief Poll registration without counting normal registration waits as failures. */
static step_result_t step_register(const modem_link_t *link)
{
    at_cmd_t command = { .text = "AT+CEREG?", .capture = "+CEREG:", .timeout_ms = 3000 };
    if (modem_at(&command) == AT_RES_OK && reg_ok(modem_at_response())) { return advance_to(MODEM_LINK_STEP_PDP); }
    if (modem_now() - link->entered_at_ms > REG_TIMEOUT_MS) {
        return (step_result_t){ .action = MODEM_LINK_RESTART };
    }
    return (step_result_t){ .action = MODEM_LINK_RETRY_LATER, .delay_ms = 2000u };
}

static bool format_cgdcont(char *command, size_t capacity, const char *apn)
{
    int len = snprintf(command, capacity, "AT+CGDCONT=1,\"IP\",\"%s\"", apn);
    return len > 0 && (size_t)len < capacity;
}

static step_result_t step_pdp(void)
{
    char command[96];
    if (format_cgdcont(command, sizeof command, modem_config()->apn) &&
        modem_at_simple(command, 5000) == AT_RES_OK && modem_at_simple("AT+CGACT=1,1", 150000) == AT_RES_OK) {
        modem_emit_link(IVTS_LINK_NET_UP, 0);
        return advance_to(MODEM_LINK_STEP_MQTT_START);
    }
    return (step_result_t){ .action = MODEM_LINK_FAIL };
}

/** @brief Escalate repeated broker connection errors to MQTT service setup. */
static step_result_t step_mqtt(const modem_link_t *link)
{
    if (modem_mqtt_step(link->step)) {
        if (link->step == MODEM_LINK_STEP_MQTT_SUB) { return (step_result_t){ .action = MODEM_LINK_BROKER_UP }; }
        return advance_to((modem_link_step_t)(link->step + 1));
    }
    if (link->step == MODEM_LINK_STEP_MQTT_CONN && link->attempt >= 3u) { return advance_to(MODEM_LINK_STEP_MQTT_START); }
    return (step_result_t){ .action = MODEM_LINK_FAIL };
}

step_result_t modem_link_run_step(const modem_link_t *link)
{
    switch (link->step) {
    case MODEM_LINK_STEP_POWER: return step_power();
    case MODEM_LINK_STEP_SYNC: return step_sync();
    case MODEM_LINK_STEP_SIM: return step_sim();
    case MODEM_LINK_STEP_REG: return step_register(link);
    case MODEM_LINK_STEP_PDP: return step_pdp();
    case MODEM_LINK_STEP_MQTT_START: case MODEM_LINK_STEP_MQTT_ACQ: case MODEM_LINK_STEP_MQTT_CONN: case MODEM_LINK_STEP_MQTT_SUB:
        return step_mqtt(link);
    default: return (step_result_t){ .action = MODEM_LINK_IDLE };
    }
}
