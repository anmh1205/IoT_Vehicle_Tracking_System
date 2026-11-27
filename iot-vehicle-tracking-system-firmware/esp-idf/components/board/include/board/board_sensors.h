/**
 * @file board_sensors.h
 * @brief Board ADC and IMU operations exposed to application policy.
 *
 * The board task publishes sensor samples. Synchronous calls to inspect or
 * adjust the IMU can wait for the shared I2C bus.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/err.h"

/**
 * @brief Measure vehicle and device supply voltages in calibrated millivolts.
 *
 * The ADC one-shot read API permits calls from the board and app tasks.
 */
ivts_err_t board_power_read(uint16_t *vehicle_mv, uint16_t *device_mv);
/** Drive the user LED. Board initialization sets it off. */
void board_led_set(bool on);
