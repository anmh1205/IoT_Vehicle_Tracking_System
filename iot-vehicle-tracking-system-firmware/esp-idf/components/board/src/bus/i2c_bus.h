#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "esp_err.h"

typedef enum { BOARD_DEV_RTC = 0, BOARD_DEV_IMU, BOARD_DEV_COUNT } board_dev_t;

/* Called before the board task starts. */
esp_err_t board_i2c_init(void);
esp_err_t board_i2c_add(board_dev_t device, uint16_t address, uint32_t speed_hz);

/* Serialize transactions on the shared bus. These calls may wait for the mutex. */
bool board_i2c_probe(uint16_t address);
esp_err_t board_i2c_read(board_dev_t device, uint8_t reg, uint8_t *data, size_t len);
esp_err_t board_i2c_write(board_dev_t device, uint8_t reg, const uint8_t *data, size_t len);
