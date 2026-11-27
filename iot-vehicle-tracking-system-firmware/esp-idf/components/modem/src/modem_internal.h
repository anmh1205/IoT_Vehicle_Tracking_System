#pragma once
#include "modem/modem.h"

#define MODEM_TAG "modem"

/* Configuration and topics are initialized before starting the modem task. */
const modem_cfg_t *modem_config(void);
const char *modem_topic_name(modem_topic_t topic);
const char *modem_command_topic(void);
uint64_t modem_now(void);
void modem_emit(const ivts_event_t *event);
void modem_emit_link(uint8_t link, int32_t error);
void modem_set_stopped(bool stopped);
