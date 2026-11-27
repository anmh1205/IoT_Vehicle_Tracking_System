/**
 * @file board.h
 * @brief Board initialization, status and the public clock, power and sensor APIs.
 *
 * The application supplies policy and an event sink at startup. PCB constants
 * are available to the board implementation and app wiring through the
 * dedicated pin map.
 */
#pragma once

#include "board/board_clock.h"
#include "board/board_power.h"
#include "board/board_sensors.h"
#include "ivts_core/event/event.h"

/** Configuration supplied by app wiring when initializing the board. */
typedef struct {
    ivts_sink_t sink;              /**< Receives IVTS_EV_POWER_SAMPLE and IVTS_EV_MOTION_IRQ. */
    uint16_t    power_sample_ms;   /**< Period between power samples in milliseconds. */
    uint8_t     imu_threshold;     /**< Raw LIS3DSH THRS1_1 threshold at the ±2 g scale. */
    bool        imu_enabled;       /**< Set true to probe and initialize the IMU. */
    uint8_t     task_prio;         /**< FreeRTOS priority for the board task. */
    uint32_t    task_stack;        /**< Board task stack size in bytes. */
} board_cfg_t;

/**
 * @brief Initialize the board and create the sampling task.
 *
 * Call once during app startup. Missing IMU or RTC hardware is reported
 * through the corresponding availability flag. I2C, ADC or task-creation
 * failures prevent board startup.
 *
 * @return IVTS_OK on success, otherwise the error from the failed startup
 * step.
 */
ivts_err_t board_init(const board_cfg_t *cfg);

/** @brief Report whether LIS3DSH initialization succeeded. */
bool board_imu_ok(void);
/** @brief Report whether the DS3231M was detected and attached. */
bool board_rtc_ok(void);
