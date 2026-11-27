#pragma once
#include "esp_err.h"
#include "modem/modem.h"

/* Open UART before starting the modem task. The modem task then owns all I/O. */
esp_err_t modem_uart_open(const modem_cfg_t *cfg);
void modem_uart_write(void *ctx, const void *data, size_t len);
int modem_uart_read(uint8_t *data, size_t cap, uint32_t wait_ms);
void modem_uart_flush(void);
