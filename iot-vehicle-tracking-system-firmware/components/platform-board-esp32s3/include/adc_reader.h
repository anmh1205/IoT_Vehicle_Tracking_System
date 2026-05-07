#pragma once

#include "esp_err.h"

/**
 * @file adc_reader.h
 * @brief ADC abstraction for reading battery voltage through a resistor divider.
 * This header belongs to the ESP32-S3 board support layer and describes the board-facing contract that runtime code uses without baking GPIO details into app-core.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief Initialize ADC one-shot driver and optional calibration backend.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t adc_reader_init(void);

/**
 * @brief Read and convert tracker backup battery voltage to volts.
 *
 * @return Device battery voltage in volts. Returns 0.0f if ADC is not initialized.
 */
float adc_read_device_battery_voltage(void);

/**
 * @brief Read and convert vehicle +12V supply sense voltage to volts.
 *
 * @return Vehicle battery/supply voltage in volts. Returns 0.0f if ADC is not initialized.
 */
float adc_read_vehicle_battery_voltage(void);

/**
 * @brief Deinitialize ADC resources.
 */
void adc_reader_deinit(void);
