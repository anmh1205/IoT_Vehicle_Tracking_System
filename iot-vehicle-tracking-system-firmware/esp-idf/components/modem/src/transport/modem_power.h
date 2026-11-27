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
