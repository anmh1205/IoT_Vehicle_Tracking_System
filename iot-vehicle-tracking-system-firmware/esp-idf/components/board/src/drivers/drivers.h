#pragma once
#include "board_internal.h"
#include <stdint.h>
#include "esp_err.h"

/* Discover and register the RTC during board initialization. */
esp_err_t ds3231_init(board_dev_t device, uint16_t address, uint32_t speed_hz);

typedef struct {
    board_dev_t i2c_device;
    uint16_t primary_address;
    uint16_t alternate_address;
    uint32_t i2c_speed_hz;
    int int_gpio;
    uint8_t threshold;
} lis3dsh_cfg_t;

/* Set up SM1 and INT1 before the board task starts. */
esp_err_t lis3dsh_init(const lis3dsh_cfg_t *cfg);

/* Release the latched INT1 by I2C. This call may block on the bus. */
esp_err_t lis3dsh_clear_interrupt(uint8_t *outs);
/* Read INT1 without blocking. */
int lis3dsh_interrupt_level(void);
/* Take an I2C sample and update the baseline. Called by the board task. */
uint32_t lis3dsh_sample_delta(uint64_t now_ms);

typedef struct {
    int vehicle_gpio;
    int device_gpio;
    uint32_t divider;
    uint32_t vehicle_gain_ppm;
    uint32_t device_gain_ppm;
} power_adc_cfg_t;

/* Configure both channels before the board task starts. */
esp_err_t power_adc_init(const power_adc_cfg_t *cfg);
