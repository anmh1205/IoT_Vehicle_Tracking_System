#include "modem_gnss.h"
#include "gnss_parse.h"
#include "modem_internal.h"
#include "at/at_dispatch.h"
#include "at/at_parser.h"
#include "esp_log.h"


static bool s_gnss_requested;
static bool s_gnss_on;
static uint64_t s_next_fix_at_ms;

void modem_gnss_init(void)
{
    s_gnss_requested = false;
    s_gnss_on = false;
    s_next_fix_at_ms = 0;
}

void modem_gnss_request(bool enabled) { s_gnss_requested = enabled; }
void modem_gnss_reset_power(void) { s_gnss_on = false; }

void modem_gnss_step(void)
{
    if (s_gnss_requested != s_gnss_on) {
        bool previous = s_gnss_on;
        at_result_t r = modem_at_simple(s_gnss_requested ? "AT+CGPS=1,1" : "AT+CGPS=0", 5000);
        if (r != AT_RES_OK) {
            at_cmd_t q = { .text = "AT+CGPS?", .capture = "+CGPS:", .timeout_ms = 2000 };
            int32_t on = 0;
            if (modem_at(&q) == AT_RES_OK && at_field_int(modem_at_response(), 0, &on)) {
                s_gnss_on = (on == 1);
            }
        } else {
            s_gnss_on = s_gnss_requested;
        }
        if (s_gnss_on != previous) {
            ESP_LOGI(MODEM_TAG, "GNSS %s", s_gnss_on ? "on" : "off");
        }
        s_next_fix_at_ms = modem_now() + 1000;
        return;
    }
    if (!s_gnss_on || modem_now() < s_next_fix_at_ms) { return; }
    s_next_fix_at_ms = modem_now() + (uint64_t)modem_config()->gnss_period_s * 1000u;

    ivts_gnss_t g;
    at_cmd_t c = { .text = "AT+CGNSSINFO", .capture = "+CGNSSINFO:", .timeout_ms = 2000 };
    bool ok = modem_at(&c) == AT_RES_OK && gnss_parse_cgnssinfo(modem_at_response(), &g) == IVTS_OK;
    if (!ok) {
        at_cmd_t c2 = { .text = "AT+CGPSINFO", .capture = "+CGPSINFO:", .timeout_ms = 2000 };
        ok = modem_at(&c2) == AT_RES_OK && gnss_parse_cgpsinfo(modem_at_response(), &g) == IVTS_OK;
    }
    if (!ok) { return; }
    ivts_event_t ev = { .type = IVTS_EV_GNSS_FIX, .ts_ms = modem_now() };
    ev.u.gnss = g;
    modem_emit(&ev);
}
