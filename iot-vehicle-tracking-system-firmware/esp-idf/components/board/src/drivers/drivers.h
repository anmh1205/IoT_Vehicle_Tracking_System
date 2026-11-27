/**
 * @file src/drivers/drivers.h
 * @brief Private startup, conversion and sensor access contracts for board drivers.
 *
 * Board startup supplies the GPIO, I2C and ADC configuration. The board task owns the IMU sample baseline.
 * The sleep adapter reads INT1 and the I2C adapter serializes RTC and IMU transactions.
 */
#pragma once
#include "board_internal.h"
#include <stdint.h>
#include "esp_err.h"

/**
 * @brief Probe the RTC and register its device slot.
 * @param device RTC slot for later calendar access.
 * @param address 7-bit RTC address.
 * @param speed_hz Bus clock in hertz.
 * @retval ESP_OK The RTC registers with the bus.
 * @retval ESP_ERR_NOT_FOUND The probe fails or cannot get the bus mutex.
 * @return Otherwise, the SDK device registration error.
 * @note Context: App startup after I2C initialization. Probe waits up to 100 ms for the mutex and uses a 50
 *       ms transfer timeout.
 */
esp_err_t ds3231_init(board_dev_t device, uint16_t address, uint32_t speed_hz);

/** @brief LIS3DSH wiring and motion threshold. The driver keeps a copy after startup. */
typedef struct {
    board_dev_t i2c_device;   /**< Board device slot reserved for the IMU. */
    uint16_t primary_address;   /**< First 7-bit I2C address to probe. */
    uint16_t alternate_address;   /**< Fallback 7-bit I2C address. */
    uint32_t i2c_speed_hz;   /**< SCL speed in hertz. */
    int int_gpio;   /**< GPIO wired to active-high INT1. */
    uint8_t threshold;   /**< Raw SM1 threshold register byte at the ±2 g scale. */
} lis3dsh_cfg_t;

/**
 * @brief Configure the LIS3DSH and install its INT1 handler.
 * @param cfg Non-null settings copied into driver state.
 * @retval ESP_OK SM1 is enabled and its latched status has been read.
 * @retval ESP_ERR_NOT_FOUND Neither configured address answers the probe.
 * @retval ESP_ERR_NOT_SUPPORTED The chip ID differs from the LIS3DSH ID.
 * @return Otherwise, the GPIO or I2C error returned by setup.
 * @note Context: App startup. Includes a 100 ms sampling delay and several I2C transfers, each with
 *       a 100 ms mutex timeout and 50 ms transfer timeout.
 */
esp_err_t lis3dsh_init(const lis3dsh_cfg_t *cfg);

/**
 * @brief Release latched INT1 by reading OUTS1.
 * @param[out] outs Non-null destination for the status byte. Contents are unspecified on transfer failure.
 * @return I2C read result.
 * @note Context: App startup or board task. Waits up to 100 ms for the bus mutex, then uses a 50 ms transfer
 *       timeout.
 */
esp_err_t lis3dsh_clear_interrupt(uint8_t *outs);
/**
 * @brief Read the INT1 GPIO level.
 * @return Zero for low, one for high.
 * @note Context: Board task or app sleep controller after IMU initialization. Non-blocking.
 */
int lis3dsh_interrupt_level(void);
/**
 * @brief Sample acceleration and update the previous-vector baseline.
 * @param now_ms Monotonic sample timestamp in milliseconds.
 * @return Magnitude of the change in mm/s², or zero with no usable baseline, no IMU, a read error or filtered
 *       motion.
 * @note Context: Board task. Waits up to 100 ms for the bus mutex, then uses a 50 ms transfer timeout.
 */
uint32_t lis3dsh_sample_delta(uint64_t now_ms);

/** @brief Caller-owned ADC wiring and calibration settings borrowed by startup. */
typedef struct {
    int vehicle_gpio;   /**< Vehicle supply ADC1 GPIO. */
    int device_gpio;   /**< Device supply ADC1 GPIO. */
    uint32_t divider;   /**< Input-to-pin voltage ratio for both channels. */
    uint32_t vehicle_gain_ppm;   /**< Vehicle voltage multiplier in parts per million. */
    uint32_t device_gain_ppm;   /**< Device voltage multiplier in parts per million. */
} power_adc_cfg_t;

/**
 * @brief Configure and calibrate both ADC1 channels.
 * @param cfg Non-null settings borrowed during setup. Scaling values are retained by value.
 * @retval ESP_OK Both channels are available.
 * @retval ESP_ERR_INVALID_ARG A GPIO maps outside ADC1 or the SDK rejects its arguments.
 * @return Otherwise, the SDK setup or calibration error.
 * @note Context: App startup before sampling. Synchronous SDK setup with no explicit timeout.
 */
esp_err_t power_adc_init(const power_adc_cfg_t *cfg);
