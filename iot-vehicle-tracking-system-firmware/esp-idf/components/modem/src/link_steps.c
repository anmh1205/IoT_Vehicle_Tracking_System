#include "modem_internal.h"
#include "at/at.h"
#include "mqtt/mqtt.h"
#include "transport/transport.h"

#include <stdio.h>
#include <string.h>

#define REG_TIMEOUT_MS 180000u

static bool reg_ok(const char *resp)
{
    int32_t stat;
    return at_field_int(resp, 1, &stat) && (stat == 1 || stat == 5);
}

static step_result_t advance_to(modem_link_step_t target)
{
    return (step_result_t){ .action = MODEM_LINK_ADVANCE, .target = target };
}

static step_result_t step_power(void)
{
    if (modem_power_restart_is_blocked()) { return (step_result_t){ .action = MODEM_LINK_IDLE }; }
    modem_pm_hold(true);
    if (modem_at_simple("AT", 500) == AT_RES_OK) { return advance_to(MODEM_LINK_STEP_SYNC); }
    modem_power_pulse(500);
    /* Wait for the module to finish starting before the next AT command. */
    return (step_result_t){ .action = MODEM_LINK_ADVANCE, .target = MODEM_LINK_STEP_SYNC, .delay_ms = 12000u };
}

static step_result_t step_sync(const modem_link_t *link)
{
    if (modem_at_simple("AT", 1000) == AT_RES_OK && modem_at_simple("ATE0", 1000) == AT_RES_OK) {
        (void)modem_at_simple("AT+CMEE=2", 1000);
        (void)modem_at_simple("AT+CTZU=1", 1000);
        return advance_to(MODEM_LINK_STEP_SIM);
    }
    return link->attempt >= 10u ? advance_to(MODEM_LINK_STEP_POWER) : (step_result_t){ .action = MODEM_LINK_FAIL };
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
    case MODEM_LINK_STEP_SYNC: return step_sync(link);
    case MODEM_LINK_STEP_SIM: return step_sim();
    case MODEM_LINK_STEP_REG: return step_register(link);
    case MODEM_LINK_STEP_PDP: return step_pdp();
    case MODEM_LINK_STEP_MQTT_START: case MODEM_LINK_STEP_MQTT_ACQ: case MODEM_LINK_STEP_MQTT_CONN: case MODEM_LINK_STEP_MQTT_SUB:
        return step_mqtt(link);
    default: return (step_result_t){ .action = MODEM_LINK_IDLE };
    }
}
