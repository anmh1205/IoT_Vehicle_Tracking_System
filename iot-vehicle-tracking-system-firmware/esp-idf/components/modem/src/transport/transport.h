/**
 * @file transport.h
 * @brief Private SIM7600 UART, PWRKEY and power-management interfaces.
 *
 * UART and GPIO SDK calls are confined to the transport implementation. Only
 * the modem task uses the initialized modem I/O.
 */
#pragma once
#include "esp_err.h"
#include "modem/modem.h"

/* Prepare the PWRKEY output and power-management lock before creating the task. */
esp_err_t modem_power_gpio_init(const modem_cfg_t *cfg);
esp_err_t modem_pm_lock_create(void);
void modem_power_init(void);

/** @brief Keep automatic light sleep disabled during active modem I/O. */
void modem_pm_hold(bool hold);
/** @brief Assert PWRKEY for duration_ms using the configured polarity. Blocks the caller. */
void modem_power_pulse(uint32_t duration_ms);
/** @brief Begin shutdown if the restart guard permits another PWRKEY pulse. */
bool modem_power_down(void);
/** @brief Report whether the shutdown interval still prevents powering on. */
bool modem_power_restart_is_blocked(void);

/* Open UART before starting the modem task. The modem task then owns all I/O. */
esp_err_t modem_uart_open(const modem_cfg_t *cfg);
void modem_uart_write(void *ctx, const void *data, size_t len);
/** @brief Read up to cap bytes from UART, waiting at most wait_ms after tick conversion. */
int modem_uart_read(uint8_t *data, size_t cap, uint32_t wait_ms);
void modem_uart_flush(void);
