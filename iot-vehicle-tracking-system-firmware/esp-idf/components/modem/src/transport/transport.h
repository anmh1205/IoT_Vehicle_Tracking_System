#pragma once
#include "esp_err.h"
#include "modem/modem.h"

/* Prepare the PWRKEY output and power-management lock before creating the task. */
esp_err_t modem_power_gpio_init(const modem_cfg_t *cfg);
esp_err_t modem_pm_lock_create(void);
void modem_power_init(void);

/* Modem task only. Pulsing PWRKEY blocks for the pulse duration. */
void modem_pm_hold(bool hold);
void modem_power_pulse(uint32_t duration_ms);
bool modem_power_down(void);
bool modem_power_restart_is_blocked(void);

/* Open UART before starting the modem task. The modem task then owns all I/O. */
esp_err_t modem_uart_open(const modem_cfg_t *cfg);
void modem_uart_write(void *ctx, const void *data, size_t len);
int modem_uart_read(uint8_t *data, size_t cap, uint32_t wait_ms);
void modem_uart_flush(void);
