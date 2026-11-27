/**
 * @file include/ivts_core/base/backoff.h
 * @brief Capped exponential retry delays with caller-supplied jitter.
 *
 * The modem and OBD tasks supply the retry attempt and jitter seed.
 * The stateless calculation borrows the caller's settings and leaves waiting
 * and retry scheduling to the caller.
 */
#pragma once
#include <stdint.h>

/** @brief Caller-owned retry settings borrowed by the delay calculation. */
typedef struct {
    uint32_t base_ms;    /**< Delay for attempt zero. A zero value is treated as one. */
    uint32_t max_ms;     /**< Delay cap before jitter. Values below base_ms are treated as base_ms. */
    uint32_t jitter_ms;  /**< Add a jitter value in [0, jitter_ms]. Zero disables jitter. */
} ivts_backoff_t;

/**
 * @brief Compute the delay before retry attempt.
 *
 * The base grows by powers of two with the exponent limited to 31. The configured cap applies
 * before adding jitter in the inclusive range zero through jitter_ms. The result saturates at UINT32_MAX.
 * Adding jitter after the cap spreads devices already waiting at the maximum interval.
 *
 * @param p Retry curve borrowed for the call. NULL returns one millisecond.
 * @param attempt Consecutive failure index, zero for the first retry.
 * @param seed Input for deterministic jitter, such as uptime in milliseconds.
 * @return Delay in milliseconds.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
uint32_t ivts_backoff_ms(const ivts_backoff_t *p, uint32_t attempt, uint32_t seed);
