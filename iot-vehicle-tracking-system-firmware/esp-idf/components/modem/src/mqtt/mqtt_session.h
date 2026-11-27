#pragma once
#include "link/modem_link.h"
#include "modem/modem.h"

/* Modem task. Drive one MQTT setup step or disconnect the active client. */
bool modem_mqtt_step(modem_link_step_t step);
void modem_mqtt_disconnect(void);
/* Pure command formatting. Reject truncation before a credential can be sent. */
bool modem_mqtt_format_connect_cmd(char *out, size_t cap, const modem_cfg_t *cfg, bool tls);
