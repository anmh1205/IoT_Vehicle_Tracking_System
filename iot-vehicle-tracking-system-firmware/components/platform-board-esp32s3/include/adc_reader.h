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
 * Sets up ADC1 in one-shot mode for the battery and supply sense channels at
 * 12 dB attenuation, then best-effort enables per-channel curve-fitting
 * calibration for accurate raw->millivolt conversion.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 * @note Calibration is optional; reads fall back to a nominal 3.3V/4095-count
 *       formula when no calibration scheme is available.
 */
esp_err_t adc_reader_init(void);

/**
 * @brief Read and convert tracker backup battery voltage to volts.
 *
 * Oversamples the battery sense channel and undoes the 11:1 input divider to
 * recover the true backup-battery node voltage.
 *
 * @return Device battery voltage in volts. Returns 0.0f if ADC is not initialized.
 */
float adc_read_device_battery_voltage(void);

/**
 * @brief Read and convert vehicle +12V supply sense voltage to volts.
 *
 * Oversamples the supply sense channel and undoes the 11:1 input divider to
 * recover the vehicle +12V system voltage.
 *
 * @return Vehicle battery/supply voltage in volts. Returns 0.0f if ADC is not initialized.
 */
float adc_read_vehicle_battery_voltage(void);

/**
 * @brief Deinitialize ADC resources.
 *
 * Deletes any calibration schemes and releases the one-shot ADC unit so the
 * channels can be reconfigured or the peripheral powered down.
 */
void adc_reader_deinit(void);
