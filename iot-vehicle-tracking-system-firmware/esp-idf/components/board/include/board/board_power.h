/**
 * @file board_power.h
 * @brief Board sleep entry, wake reporting and automatic light-sleep policy.
 *
 * The app coordinates radio shutdown before calling these functions. Supported
 * wake sources depend on the board's GPIO routing.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/err.h"

/** Wake reason reported by the board. */
typedef enum {
    BOARD_WAKE_POWER_ON = 0,   /**< Power-on or reset. */
    BOARD_WAKE_TIMER,
    BOARD_WAKE_IMU,
    BOARD_WAKE_OTHER
} board_wake_t;

/** Sleep parameters supplied by application policy. */
typedef struct {
    bool     deep;       /**< False selects light sleep and returns on wake. True selects deep sleep. */
    uint32_t seconds;    /**< Maximum sleep duration before timer wake, in milliseconds. */
    bool     arm_imu;    /**< Allow IMU wake when the INT GPIO supports the selected sleep mode. */
} board_sleep_req_t;

/** @brief Report whether the PCB's IMU interrupt can wake deep sleep. */
bool board_motion_deep_wake_capable(void);
/** Configure frequency scaling and automatic light sleep when tasks are idle. */
ivts_err_t board_set_auto_light_sleep(bool enabled);

/** @brief Return the wake reason captured once at the beginning of board_init(). */
board_wake_t board_wake_cause(void);

/** Return the lower-case log name of a wake source. */
const char *board_wake_name(board_wake_t wake);

/**
 * @brief Enter light sleep or deep sleep.
 *
 * Light sleep returns the wake reason. Deep sleep resumes by booting the
 * firmware. When the armed IMU interrupt is already high, return
 * BOARD_WAKE_IMU without entering sleep.
 */
board_wake_t board_sleep(const board_sleep_req_t *req);
