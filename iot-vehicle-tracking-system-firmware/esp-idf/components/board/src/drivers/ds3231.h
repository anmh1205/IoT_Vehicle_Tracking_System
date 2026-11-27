#pragma once
#include "bus/i2c_bus.h"

/* Discover and register the RTC during board initialization. */
esp_err_t ds3231_init(board_dev_t device, uint16_t address, uint32_t speed_hz);
