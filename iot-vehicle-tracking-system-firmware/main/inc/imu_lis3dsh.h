#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "esp_err.h"

/**
 * @file imu_lis3dsh.h
 * @brief LIS3DSH accelerometer driver interface.
 */

/**
 * @brief Initialize LIS3DSH over I2C and basic measurement configuration.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t imu_init(void);

/**
 * @brief Configure LIS3DSH motion interrupt threshold and duration.
 *
 * @param threshold_mg Threshold in milli-g.
 * @param duration_ms Duration in milliseconds.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t imu_configure_motion_interrupt(uint8_t threshold_mg, uint8_t duration_ms);

/**
 * @brief Read digital state of configured interrupt pin.
 *
 * @return true when motion interrupt line is asserted.
 */
bool imu_motion_detected(void);

/**
 * @brief Read raw acceleration registers for X/Y/Z axes.
 *
 * @param x Output X axis raw value.
 * @param y Output Y axis raw value.
 * @param z Output Z axis raw value.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t imu_read_accel(int16_t *x, int16_t *y, int16_t *z);

/**
 * @brief Compute vibration score (0..1000) from acceleration magnitude.
 *
 * @return Composite vibration score.
 */
uint16_t imu_get_vibration_composite(void);

/**
 * @brief Deinitialize LIS3DSH resources.
 */
void imu_deinit(void);
