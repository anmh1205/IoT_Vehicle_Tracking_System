#pragma once
#include "modem_internal.h"
#include "modem/modem.h"
#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>

/* Modem task. Drive one MQTT setup step or disconnect the active client. */
bool modem_mqtt_step(modem_link_step_t step);
void modem_mqtt_disconnect(void);
/* Pure command formatting. Reject truncation before a credential can be sent. */
bool modem_mqtt_format_connect_cmd(char *out, size_t cap, const modem_cfg_t *cfg, bool tls);

/* Modem task. Send the queued copy at QoS 1 and complete the publish slot. */
void modem_mqtt_publish_pending(void);

/* Modem task. Assemble fragmented MQTT frames from parsed URCs and raw chunks. */
void modem_mqtt_rx_init(void);
void modem_mqtt_rx_on_urc(const char *line);
void modem_mqtt_rx_on_data(const uint8_t *data, size_t len);
void modem_mqtt_rx_discard_raw(void);

/* Modem task. Configure certificate validation for MQTT or HTTPS. */
bool modem_tls_configure(unsigned index);
