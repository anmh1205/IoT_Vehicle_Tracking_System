#pragma once
#include <stddef.h>
#include <stdint.h>

/* Modem task. Assemble fragmented MQTT frames from parsed URCs and raw chunks. */
void modem_mqtt_rx_init(void);
void modem_mqtt_rx_on_urc(const char *line);
void modem_mqtt_rx_on_data(const uint8_t *data, size_t len);
void modem_mqtt_rx_discard_raw(void);
