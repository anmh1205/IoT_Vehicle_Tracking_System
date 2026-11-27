/**
 * @file include/ivts_core/fsm/axes.h
 * @brief Ignition, motion and inferred vehicle-state axes from sensor inputs.
 *
 * The app task updates its own axes from board events and timer ticks.
 * The helpers borrow the supplied policy and time, update only the caller's
 * state, and leave hardware reads and event delivery to their callers.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/time.h"
#include "ivts_core/model/telemetry.h"

/** @brief Caller-owned ignition debounce and motion timing policy. */
typedef struct {
    uint16_t on_threshold_mv;   /**< Minimum vehicle voltage for an ignition ON candidate. */
    uint16_t hysteresis_mv;     /**< Hysteresis width in mV. The OFF boundary is clamped to zero. */
    uint32_t on_hold_ms;        /**< Stable interval before transition to ignition ON. */
    uint32_t off_hold_ms;       /**< Stable interval before transition to ignition OFF. */
    uint32_t motion_quiet_ms;   /**< Time without a motion interrupt before switching to STATIONARY. */
} ivts_axes_cfg_t;

/** @brief Mutable axis state owned by the app task. */
typedef struct {
    ivts_ignition_t ign;              /**< Debounced ignition value. */
    ivts_ignition_t candidate;        /**< Most recent raw ignition candidate. */
    ivts_ms_t       candidate_since;  /**< Monotonic milliseconds when this candidate first appears. */
    ivts_motion_t   motion;  /**< Motion state inferred from interrupts and the quiet interval. */
    ivts_ms_t       last_motion_ms;   /**< Timestamp of the most recent motion interrupt. */
} ivts_axes_t;

/**
 * @brief Initialize ignition and motion to UNKNOWN.
 * @param[out] a Required app-owned state. All fields are initialized.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void ivts_axes_init(ivts_axes_t *a);

/**
 * @brief Apply one vehicle supply voltage measurement.
 *
 * The first sample sets ignition immediately. An initial reading in the hysteresis band sets OFF.
 * Later candidates must persist across the configured hold interval. The band keeps the current state.
 *
 * @param[in,out] a Required initialized axis state.
 * @param c Required borrowed threshold and hold settings.
 * @param vehicle_mv Vehicle supply reading in millivolts.
 * @param now Current monotonic milliseconds since boot.
 * @retval true The debounced ignition changes.
 * @retval false Ignition is unchanged. The candidate and its start time can still change.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
bool ivts_axes_on_power(ivts_axes_t *a, const ivts_axes_cfg_t *c, uint16_t vehicle_mv, ivts_ms_t now);

/**
 * @brief Record an IMU motion interrupt.
 * @param[in,out] a Required initialized axis state.
 * @param now Motion observation time in monotonic milliseconds since boot.
 * @retval true Motion changes to MOVING.
 * @retval false Motion is already MOVING. The last interrupt timestamp still updates.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
bool ivts_axes_on_motion(ivts_axes_t *a, ivts_ms_t now);

/**
 * @brief Expire motion after the configured quiet interval.
 *
 * Before the first interrupt, UNKNOWN becomes STATIONARY when uptime reaches the quiet interval.
 *
 * @param[in,out] a Required initialized axis state.
 * @param c Required borrowed settings containing the quiet interval.
 * @param now Current monotonic milliseconds since boot.
 * @retval true Motion changes to STATIONARY.
 * @retval false Motion is unchanged.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
bool ivts_axes_tick(ivts_axes_t *a, const ivts_axes_cfg_t *c, ivts_ms_t now);

/**
 * @brief Combine ignition and motion into the reported vehicle state.
 * @param a Required initialized axis state, borrowed for the call.
 * @return Combined vehicle state, including values for unknown ignition or motion.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
ivts_vehicle_t ivts_axes_vehicle(const ivts_axes_t *a);
