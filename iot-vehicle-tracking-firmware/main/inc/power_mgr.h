#pragma once

#include <stdbool.h>

#include "esp_err.h"

typedef struct {
    float voltage;
    bool is_low;
    bool charger_on;
} power_status_t;

esp_err_t power_mgr_init(void);
void power_select_battery(void);
void power_select_backup(void);
void charger_enable(void);
void charger_disable(void);
bool power_is_low_voltage(void);
esp_err_t modem_power_on(void);
esp_err_t modem_power_off(void);
power_status_t power_get_status(float lvd_threshold_v, float lvd_hysteresis_v);
