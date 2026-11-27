/**
 * @file include/board/board.h
 * @brief Board initialization, hardware status and access to clock, power and sensor APIs.
 *
 * App wiring initializes the board and supplies the event sink before starting other consumers.
 * The board task samples the ADC and handles IMU notifications. The app interprets those events.
 * The configuration is copied. Availability flags are fixed after initialization.
 */
#pragma once

#include "board/board_clock.h"
#include "board/board_power.h"
#include "board/board_sensors.h"
#include "ivts_core/event/event.h"

/** @brief Startup configuration copied by value. The sink context must remain valid for the board task. */
typedef struct {
    ivts_sink_t sink;              /**< Receives IVTS_EV_POWER_SAMPLE and IVTS_EV_MOTION_IRQ. */
    uint16_t    power_sample_ms;   /**< ADC idle wait in ms. App range is 100–10000 ms. */
    uint8_t     imu_threshold;     /**< THRS1_1 register value at ±2 g. App configuration allows 1–255. */
    bool        imu_enabled;       /**< Set true to probe and initialize the IMU. */
    uint8_t     task_prio;         /**< FreeRTOS priority for the board task. */
    uint32_t    task_stack;        /**< Board task stack size in bytes. */
} board_cfg_t;

/**
 * @brief Initialize the peripherals and create the sampling task.
 *
 * Missing RTC, IMU or LED hardware does not by itself prevent startup.
 * Call once before clock, power and sensor use. A failed startup may leave peripherals initialized.
 *
 * @param cfg Non-null startup settings with a sink callback. Copied by value before the task starts.
 * @retval IVTS_OK The board task starts.
 * @retval IVTS_ERR_INVALID_ARG Configuration is missing or a driver rejects its arguments.
 * @retval IVTS_ERR_INVALID_STATE A required driver reports an invalid state.
 * @retval IVTS_ERR_TIMEOUT A required driver times out.
 * @retval IVTS_ERR_NOT_FOUND A required driver reports a missing resource.
 * @retval IVTS_ERR_IO Allocation, task creation or another required driver operation fails.
 * @note Context: App startup. Blocks on peripheral setup, including I2C and a 100 ms delay if IMU setup
 *       reaches sampling.
 */
ivts_err_t board_init(const board_cfg_t *cfg);

/**
 * @brief Report whether the LIS3DSH is available.
 * @retval true IMU initialization succeeds.
 * @retval false The IMU is disabled, unavailable or initialization has not completed.
 * @note Context: Task context after startup. Non-blocking.
 */
bool board_imu_ok(void);
/**
 * @brief Report whether the DS3231M is available.
 * @retval true The RTC responds to probing and attaches to the bus.
 * @retval false The RTC is unavailable or initialization has not completed.
 * @note Context: Task context after startup. Non-blocking.
 */
bool board_rtc_ok(void);
