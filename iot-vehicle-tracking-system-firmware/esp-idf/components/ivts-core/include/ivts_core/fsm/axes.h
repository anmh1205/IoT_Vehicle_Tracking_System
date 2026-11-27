/**
 * @file axes.h
 * @brief Ignition, motion and inferred vehicle-state axes from sensor inputs.
 *
 * All state is caller-owned. The caller supplies the monotonic timestamp.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/time.h"
#include "ivts_core/model/telemetry.h"

/** Ignition hysteresis and debounce settings, plus the motion timeout. */
typedef struct {
    uint16_t on_threshold_mv;   /**< Minimum vehicle voltage for an ignition ON candidate. */
    uint16_t hysteresis_mv;     /**< Voltage below on_threshold_mv minus hysteresis_mv indicates OFF. */
    uint32_t on_hold_ms;        /**< Stable interval before transition to ignition ON. */
    uint32_t off_hold_ms;       /**< Stable interval before transition to ignition OFF. */
    uint32_t motion_quiet_ms;   /**< Time without a motion interrupt before switching to STATIONARY. */
} ivts_axes_cfg_t;

typedef struct {
    ivts_ignition_t ign;              /**< Debounced ignition value. */
    ivts_ignition_t candidate;        /**< Most recent raw ignition candidate. */
    ivts_ms_t       candidate_since;  /**< Time when the current candidate became stable. */
    ivts_motion_t   motion;
    ivts_ms_t       last_motion_ms;   /**< Timestamp of the most recent motion interrupt. */
} ivts_axes_t;

/** @brief Initialize the axes to UNKNOWN. */
void ivts_axes_init(ivts_axes_t *a);

/**
 * @brief Apply one vehicle supply voltage measurement.
 *
 * The first sample after initialization sets ignition immediately. Later
 * transitions require a stable candidate for on_hold_ms (OFF to ON) or
 * off_hold_ms (ON to OFF). Inside the hysteresis band, keep the current value.
 *
 * @return true when the debounced ignition state changes.
 */
bool ivts_axes_on_power(ivts_axes_t *a, const ivts_axes_cfg_t *c, uint16_t vehicle_mv, ivts_ms_t now);

/**
 * @brief Record an IMU motion interrupt.
 * @return true when the motion state changes.
 */
bool ivts_axes_on_motion(ivts_axes_t *a, ivts_ms_t now);

/**
 * @brief Advance the motion timer and expire motion after motion_quiet_ms.
 * @return true when the motion state changes.
 */
bool ivts_axes_tick(ivts_axes_t *a, const ivts_axes_cfg_t *c, ivts_ms_t now);

/** @brief Combine ignition and motion into the reported vehicle state. */
ivts_vehicle_t ivts_axes_vehicle(const ivts_axes_t *a);
