#pragma once

#include <stdbool.h>

#include "esp_err.h"

esp_err_t modem_lte_init(void);
esp_err_t modem_lte_connect(void);
esp_err_t modem_lte_disconnect(void);
esp_err_t modem_lte_sleep(void);
esp_err_t modem_lte_wakeup(void);
int modem_lte_get_rssi(void);
bool modem_lte_is_connected(void);
