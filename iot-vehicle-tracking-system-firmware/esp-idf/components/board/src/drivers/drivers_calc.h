/**
 * @file src/drivers/drivers_calc.h
 * @brief Pure, hardware-free conversion helpers for the drivers in this folder.
 *
 * Units are explicit at the driver boundary. These functions accept ordinary
 * values and buffers and perform no peripheral I/O. They are unit-tested on
 * the host by tests/test_board_calc.py.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/err.h"

#define DS3231_OSF 0x80u   /**< Bit mask for the oscillator stop flag in the RTC status register. */

/**
 * @brief Decode seven DS3231M calendar registers to UTC.
 * @param registers Borrowed seven-byte BCD register block starting at the seconds register.
 * @param[out] unix_ms Non-null destination for Unix milliseconds. Unchanged on failure.
 * @retval IVTS_OK The decoded calendar is valid.
 * @retval IVTS_ERR_INVALID_ARG The decoded date is invalid or the output is missing.
 * @note Context: Caller-owned buffers in task or host context. Non-blocking.
 */
ivts_err_t ds3231_decode_time(const uint8_t registers[7], uint64_t *unix_ms);
/**
 * @brief Encode Unix time as seven DS3231M calendar registers.
 * @param unix_ms Unix milliseconds in years 2000 through 2099. Subsecond precision is discarded.
 * @param[out] registers Non-null seven-byte destination. Unchanged on failure.
 * @retval IVTS_OK The calendar is encoded in 24-hour format.
 * @retval IVTS_ERR_INVALID_ARG The converted year is outside the supported range.
 * @note Context: Caller-owned buffers in task or host context. Non-blocking.
 */
ivts_err_t ds3231_encode_time(uint64_t unix_ms, uint8_t registers[7]);
/**
 * @brief Check the RTC oscillator flag and minimum date.
 * @param status Raw RTC status byte.
 * @param unix_ms Decoded timestamp in Unix milliseconds.
 * @retval true Oscillator stop is clear and the date is at least 2024-01-01 UTC.
 * @retval false Oscillator stop is set or the date is earlier.
 * @note Context: Caller-owned buffers in task or host context. Non-blocking.
 */
bool ds3231_is_trusted(uint8_t status, uint64_t unix_ms);

/**
 * @brief Find the axis with the largest absolute sample.
 * @param axes Borrowed X, Y and Z readings in raw counts.
 * @return Axis index 0 through 2. Ties go to the lowest index.
 * @note Context: Caller-owned buffers in task or host context. Non-blocking.
 */
unsigned lis3dsh_gravity_axis(const int16_t axes[3]);

/**
 * @brief Measure the change between two acceleration vectors.
 * @param previous Borrowed earlier X, Y and Z readings in counts at ±2 g.
 * @param current Borrowed current X, Y and Z readings in counts at ±2 g.
 * @param age_ms Elapsed time between samples in milliseconds.
 * @return Rounded change in mm/s², or zero for a baseline older than 20 seconds or a change of at most 20 mg.
 * @note Context: Caller-owned buffers in task or host context. Non-blocking.
 */
uint32_t lis3dsh_delta_mmps2(const int16_t previous[3], const int16_t current[3], uint64_t age_ms);

/**
 * @brief Scale a calibrated ADC reading to input voltage.
 * @param pin_mv Average pin voltage in millivolts.
 * @param divider Input-to-pin voltage ratio.
 * @param gain_ppm Channel multiplier in parts per million. The intermediate product must fit in 64 bits.
 * @return Input millivolts truncated to a whole value and capped at UINT16_MAX.
 * @note Context: Caller-owned buffers in task or host context. Non-blocking.
 */
uint16_t power_adc_scale_mv(uint64_t pin_mv, uint32_t divider, uint32_t gain_ppm);
