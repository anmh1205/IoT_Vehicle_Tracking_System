/**
 * @file include/board/board_sensors.h
 * @brief Synchronous supply voltage readings and user LED control.
 *
 * The board task measures both supplies and forwards samples to the app, which infers ignition.
 * The app drives the LED. ADC conversions can take time and write into caller-owned buffers.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/err.h"

/**
 * @brief Measure vehicle and device supply voltages in calibrated millivolts.
 *
 * Eight calibrated samples per input are averaged before divider and gain correction.
 *
 * @param[out] vehicle_mv Non-null destination. Written when the vehicle measurement succeeds, even if device
 *       sampling fails.
 * @param[out] device_mv Non-null destination. Written only when the device measurement succeeds.
 * @retval IVTS_OK Both voltages were written.
 * @retval IVTS_ERR_INVALID_ARG An output is missing or the ADC SDK rejects its arguments.
 * @retval IVTS_ERR_INVALID_STATE An ADC or calibration operation reports an invalid state.
 * @retval IVTS_ERR_TIMEOUT An ADC or calibration operation times out.
 * @retval IVTS_ERR_NOT_FOUND An SDK operation reports a missing resource.
 * @retval IVTS_ERR_IO Another ADC or calibration error.
 * @note Context: Board task after initialization. Synchronous ADC and calibration calls with no
 *       component-level timeout.
 */
ivts_err_t board_power_read(uint16_t *vehicle_mv, uint16_t *device_mv);
/**
 * @brief Drive the user LED if its GPIO initialized successfully.
 * @param on True drives the output high. False drives it low.
 * @note Context: App startup or task context. Non-blocking.
 */
void board_led_set(bool on);
