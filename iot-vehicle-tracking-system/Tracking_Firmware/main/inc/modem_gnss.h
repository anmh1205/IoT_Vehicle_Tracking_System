#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "esp_err.h"

typedef struct {
    double latitude;
    double longitude;
    float speed_kmh;
    float course_deg;
    uint8_t satellites;
    uint64_t timestamp_ms;
    bool fix_valid;
} gnss_data_t;

esp_err_t modem_gnss_power_on(void);
esp_err_t modem_gnss_power_off(void);
bool modem_gnss_has_fix(void);
esp_err_t modem_gnss_get_location(gnss_data_t *data);
