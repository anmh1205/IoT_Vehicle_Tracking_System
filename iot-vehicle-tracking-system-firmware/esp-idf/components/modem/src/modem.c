#include "modem_internal.h"
#include "modem_task.h"
#include "slots/modem_slots.h"
#include "platform/platform_clock.h"

#include <stdatomic.h>
#include <stdio.h>
#include <string.h>

static modem_cfg_t s_modem_cfg;
static char s_topic_names[MODEM_TOPIC_COUNT][48];
static char s_command_topic[48];
static atomic_bool s_stopped = true;
static atomic_uchar s_link = IVTS_LINK_DOWN;

const modem_cfg_t *modem_config(void) { return &s_modem_cfg; }
const char *modem_topic_name(modem_topic_t topic) { return s_topic_names[topic]; }
const char *modem_command_topic(void) { return s_command_topic; }

uint64_t modem_now(void) { return platform_uptime_ms(); }

void modem_emit(const ivts_event_t *ev) { (void)ivts_sink_emit(&s_modem_cfg.sink, ev); }

/* Chỉ phát sự kiện khi link thay đổi so với lần báo trước. */
void modem_emit_link(uint8_t link, int32_t err)
{
    if (atomic_exchange(&s_link, link) == link) { return; }
    ivts_event_t ev = { .type = IVTS_EV_LINK_STATE, .ts_ms = modem_now() };
    ev.u.link_state.link = link;
    ev.u.link_state.err = err;
    modem_emit(&ev);
}

ivts_err_t modem_init(const modem_cfg_t *cfg)
{
    if (cfg == NULL || cfg->sink.fn == NULL) { return IVTS_ERR_INVALID_ARG; }
    size_t cid = strnlen(cfg->client_id, sizeof cfg->client_id);
    if (cid == 0u || cid > MODEM_CLIENT_ID_MAX) { return IVTS_ERR_INVALID_ARG; }
    s_modem_cfg = *cfg;
    static const char *const names[MODEM_TOPIC_COUNT] = { "rawdata", "status", "events", "firmware", "commands/ack" };
    for (int i = 0; i < MODEM_TOPIC_COUNT; i++) {
        int n = snprintf(s_topic_names[i], sizeof s_topic_names[i], "v1/%s/%s", cfg->device_id, names[i]);
        if (n < 0 || (size_t)n >= sizeof s_topic_names[i]) { return IVTS_ERR_FULL; }
    }
    int n = snprintf(s_command_topic, sizeof s_command_topic, "v1/%s/commands", cfg->device_id);
    if (n < 0 || (size_t)n >= sizeof s_command_topic) { return IVTS_ERR_FULL; }
    if (!modem_slots_init()) { return IVTS_ERR_FULL; }
    return (modem_task_start(cfg) == ESP_OK) ? IVTS_OK : IVTS_ERR_FULL;
}

ivts_err_t modem_set_link(bool on)
{
    modem_req_t r = { .op = REQ_LINK, .on = on };
    if (on) { atomic_store(&s_stopped, false); }
    return modem_task_post(&r, 0);
}

bool modem_is_stopped(void) { return atomic_load(&s_stopped); }
ivts_link_t modem_link_state(void) { return (ivts_link_t)atomic_load(&s_link); }
void modem_set_stopped(bool stopped) { atomic_store(&s_stopped, stopped); }
ivts_err_t modem_set_gnss(bool on) { modem_req_t r = { .op = REQ_GNSS, .on = on }; return modem_task_post(&r, 0); }
