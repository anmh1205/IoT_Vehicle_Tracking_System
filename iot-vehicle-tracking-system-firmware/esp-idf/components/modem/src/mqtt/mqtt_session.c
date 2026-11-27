/**
 * @file mqtt_session.c
 * @brief SIM7600 MQTT connection, subscription and TLS configuration.
 *
 * Use the deployment-selected transport and configure TLS with trusted time
 * and the requested certificate context.
 */
#include "mqtt/mqtt.h"
#include "modem_internal.h"
#include "at/at.h"
#include <stdio.h>
#include <string.h>
#include "ivts_core/base/civil.h"
#include "sdkconfig.h"

#define KEEPALIVE_S   60   /* MQTT keepalive in seconds. The modem supports 60 through 64800 seconds. */

static bool fmt_ok(int n, size_t cap) { return n > 0 && (size_t)n < cap; }

/** Subscribe to the command topic at QoS 1 and require modem confirmation. */
static bool sub_commands(void)
{
    char cmd[40];
    size_t tl = strlen(modem_command_topic());
    snprintf(cmd, sizeof cmd, "AT+CMQTTSUB=0,%u,1", (unsigned)tl);
    at_cmd_t c = { .text = cmd, .data = (const uint8_t *)modem_command_topic(), .data_len = tl,
                   .final_prefix = "+CMQTTSUB:", .final_err_field = 2, .timeout_ms = 15000 };
    return modem_at(&c) == AT_RES_OK;
}

/**
 * @brief Execute the requested MQTT link step.
 * @return true when the link state machine may advance.
 */
static void mqtt_cleanup_stale_service(void)
{
    (void)modem_at_simple("AT+CMQTTDISC=0,60", 5000);
    (void)modem_at_simple("AT+CMQTTREL=0", 3000);
    (void)modem_at_simple("AT+CMQTTSTOP", 5000);
}

static bool mqtt_start_service(void)
{
    at_cmd_t c = { .text = "AT+CMQTTSTART", .final_prefix = "+CMQTTSTART:", .final_err_field = 1,
                   .timeout_ms = 12000 };
    at_result_t r = modem_at(&c);
    /*
     * The modem MQTT service can survive an ESP32 reset. If START fails,
     * release the old client and stop the service so the retry starts from a
     * known state.
     */
    if (r != AT_RES_OK) {
        mqtt_cleanup_stale_service();
    }
    return r == AT_RES_OK;
}

static bool mqtt_acquire_client(bool tls)
{
    const modem_cfg_t *cfg = modem_config();
    char cmd[256];
    if (tls && !modem_tls_configure(0)) { return false; }
    if (!fmt_ok(snprintf(cmd, sizeof cmd, "AT+CMQTTACCQ=0,\"%s\",%u,4", cfg->client_id, tls ? 1u : 0u), sizeof cmd) ||
        modem_at_simple(cmd, 5000) != AT_RES_OK) {
        return false;
    }
    if (tls && modem_at_simple("AT+CMQTTSSLCFG=0,0", 3000) != AT_RES_OK) {
        (void)modem_at_simple("AT+CMQTTREL=0", 3000);
        return false;
    }
    return true;
}

bool modem_mqtt_format_connect_cmd(char *cmd, size_t cap, const modem_cfg_t *cfg, bool tls)
{
    int k;
    unsigned port = tls ? 8883u : cfg->mqtt_port;
    if (cfg->mqtt_user[0] != '\0') {
        k = snprintf(cmd, cap, "AT+CMQTTCONNECT=0,\"tcp://%s:%u\",%d,0,\"%s\",\"%s\"",
                     cfg->mqtt_host, port, KEEPALIVE_S, cfg->mqtt_user, cfg->mqtt_pass);
    } else {
        k = snprintf(cmd, cap, "AT+CMQTTCONNECT=0,\"tcp://%s:%u\",%d,0",
                     cfg->mqtt_host, port, KEEPALIVE_S);
    }
    return fmt_ok(k, cap);
}

static bool mqtt_connect(bool tls)
{
    char cmd[256];
    /*
     * A persistent session keeps subscriptions and queued QoS 1 commands while
     * offline.
     */
    if (!modem_mqtt_format_connect_cmd(cmd, sizeof cmd, modem_config(), tls)) { return false; }
    at_cmd_t c = { .text = cmd, .final_prefix = "+CMQTTCONNECT:", .final_err_field = 2,
                   .timeout_ms = 35000, .redact = modem_config()->mqtt_user[0] != '\0' };
    return modem_at(&c) == AT_RES_OK;
}

static bool mqtt_subscribe(void)
{
    return !modem_config()->command_subscribe_enabled || sub_commands();
}

bool modem_mqtt_step(modem_link_step_t step)
{
    bool tls = modem_config()->use_tls;
    switch (step) {
    case MODEM_LINK_STEP_MQTT_START: return mqtt_start_service();
    case MODEM_LINK_STEP_MQTT_ACQ: return mqtt_acquire_client(tls);
    case MODEM_LINK_STEP_MQTT_CONN: return mqtt_connect(tls);
    case MODEM_LINK_STEP_MQTT_SUB: return mqtt_subscribe();
    default: return false;
    }
}

void modem_mqtt_disconnect(void)
{
    if (modem_link_current_step() >= MODEM_LINK_STEP_MQTT_CONN) {
        (void)modem_at_simple("AT+CMQTTDISC=0,60", 5000);
    }
}

static void sync_modem_clock(void)
{
    char cmd[180];
    uint64_t unix_ms;
    if (modem_config()->time_get != NULL && modem_config()->time_get(&unix_ms)) {
        ivts_civil_t c;
        ivts_unix_ms_to_civil(unix_ms, &c);
        snprintf(cmd, sizeof cmd, "AT+CCLK=\"%02u/%02u/%02u,%02u:%02u:%02u+00\"",
                 (unsigned)c.year % 100u, c.month, c.day, c.hour, c.min, c.sec);
        (void)modem_at_simple(cmd, 2000);
    }
}

static bool apply_ssl_settings(unsigned index)
{
    char cmd[180];
    static const struct { const char *key; unsigned value; } settings[] = {
        { "sslversion", 3 }, { "authmode", 1 }, { "ignorelocaltime", 0 },
        { "enableSNI", 1 }, { "negotiatetime", 30 },
    };
    for (size_t i = 0; i < sizeof settings / sizeof settings[0]; i++) {
        int n = snprintf(cmd, sizeof cmd, "AT+CSSLCFG=\"%s\",%u,%u", settings[i].key, index, settings[i].value);
        if (n <= 0 || (size_t)n >= sizeof cmd || modem_at_simple(cmd, 3000) != AT_RES_OK) { return false; }
    }
    return true;
}

static bool set_ca_cert(unsigned index)
{
    char cmd[180];
    static const char ca[] = CONFIG_IVTS_MODEM_CA_CERT;
    if (ca[0] == '\0' || strpbrk(ca, "\"\\\r\n") != NULL) { return false; }
    int n = snprintf(cmd, sizeof cmd, "AT+CSSLCFG=\"cacert\",%u,\"%s\"", index, ca);
    return n > 0 && (size_t)n < sizeof cmd && modem_at_simple(cmd, 3000) == AT_RES_OK;
}

bool modem_tls_configure(unsigned index)
{
    sync_modem_clock();
    return apply_ssl_settings(index) && set_ca_cert(index);
}
