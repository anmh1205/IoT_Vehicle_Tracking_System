#include "tls.h"
#include "modem_internal.h"
#include "at/at_dispatch.h"
#include "ivts_core/base/civil.h"
#include "sdkconfig.h"

#include <stdio.h>
#include <string.h>

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
