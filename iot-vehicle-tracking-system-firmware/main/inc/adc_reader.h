#pragma once

#include "esp_err.h"

/**
 * @file adc_reader.h
 * @brief ADC abstraction for reading battery voltage through a resistor divider.
 */

/**
 * @brief Initialize ADC one-shot driver and optional calibration backend.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t adc_reader_init(void);

/**
 * @brief Read and convert battery voltage to volts.
 *
 * @return Battery voltage in volts. Returns 0.0f if ADC is not initialized.
 */
float adc_read_battery_voltage(void);

/**
 * @brief Deinitialize ADC resources.
 */
void adc_reader_deinit(void);
