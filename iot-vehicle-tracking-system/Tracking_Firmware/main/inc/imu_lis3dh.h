#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "esp_err.h"

esp_err_t imu_init(void);
esp_err_t imu_configure_motion_interrupt(uint8_t threshold_mg, uint8_t duration_ms);
bool imu_motion_detected(void);
esp_err_t imu_read_accel(int16_t *x, int16_t *y, int16_t *z);
uint16_t imu_get_vibration_composite(void);
void imu_deinit(void);
