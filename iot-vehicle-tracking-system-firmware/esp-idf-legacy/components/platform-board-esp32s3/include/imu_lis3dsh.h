#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "esp_err.h"

/**
 * @file imu_lis3dsh.h
 * @brief LIS3DSH accelerometer driver interface.
 * This header belongs to the ESP32-S3 board support layer and describes the board-facing contract that runtime code uses without baking GPIO details into app-core.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief Initialize LIS3DSH over I2C and basic measurement configuration.
 *
 * Auto-detects which accelerometer variant (LIS3DH-legacy or LIS3DSH) is wired
 * via WHO_AM_I, sets up the I2C bus/device, and programs the per-chip control
 * registers for continuous XYZ sampling.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 * @note Idempotent: returns ESP_OK immediately if the device is already bound.
 */
esp_err_t imu_init(void);

/**
 * @brief Configure LIS3DSH motion interrupt threshold and duration.
 *
 * Sets the on-chip motion detector so the INT1 line asserts when acceleration
 * exceeds @p threshold_mg for at least @p duration_ms. Used to wake the MCU
 * from sleep on vehicle movement.
 *
 * @param threshold_mg Motion threshold in milli-g (quantized to ~16 mg/LSB).
 * @param duration_ms Minimum persistence time in milliseconds (~100 ms/LSB).
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 * @note Requires imu_init() to have run first (returns ESP_ERR_INVALID_STATE otherwise).
 */
esp_err_t imu_configure_motion_interrupt(uint8_t threshold_mg, uint8_t duration_ms);

/**
 * @brief Read digital state of configured interrupt pin.
 *
 * Samples the INT1 GPIO level directly; the line is configured active-high.
 *
 * @return true when motion interrupt line is asserted (HIGH).
 */
bool imu_motion_detected(void);

/**
 * @brief Clear the active motion interrupt source in the IMU.
 *
 * Reads INT1_SRC, which latches-clears the pending interrupt flags so the INT1
 * line can de-assert and re-arm for the next motion event.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t imu_clear_motion_interrupt(void);

/**
 * @brief Read raw acceleration registers for X/Y/Z axes.
 *
 * Performs a 6-byte burst read of the output registers and assembles each axis
 * from its little-endian (low byte, high byte) register pair.
 *
 * @param x Output X axis raw signed 16-bit count.
 * @param y Output Y axis raw signed 16-bit count.
 * @param z Output Z axis raw signed 16-bit count.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 * @note Raw counts are chip-specific; scale by 1/16 mg/LSB (LIS3DH) or
 *       0.06 mg/LSB (LIS3DSH) at full-scale +/-2g to obtain milli-g.
 */
esp_err_t imu_read_accel(int16_t *x, int16_t *y, int16_t *z);

/**
 * @brief Read the peak IMU acceleration delta for the current publish window.
 *
 * Returns the peak delta acceleration seen since the last reset so short
 * spikes survive until the next telemetry publish window.
 *
 * @return Peak acceleration delta in m/s^2.
 */
float imu_get_peak_accel_delta_mps2(void);

/**
 * @brief Reset the latched acceleration-delta peak after raw telemetry is emitted.
 */
void imu_reset_accel_delta_window(void);

/**
 * @brief Deinitialize LIS3DSH resources.
 */
void imu_deinit(void);
