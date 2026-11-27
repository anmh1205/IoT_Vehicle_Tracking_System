/**
 * @file backoff.h
 * @brief Capped exponential retry delays with caller-supplied jitter.
 *
 * The calculation is stateless and can be called from any task.
 */
#pragma once
#include <stdint.h>

/** Parameters of the retry delay curve. */
typedef struct {
    uint32_t base_ms;    /**< Delay for attempt zero. A zero value is treated as one. */
    uint32_t max_ms;     /**< Delay cap before jitter. Values below base_ms are treated as base_ms. */
    uint32_t jitter_ms;  /**< Add a jitter value in [0, jitter_ms]. Zero disables jitter. */
} ivts_backoff_t;

/**
 * @brief Compute the delay before retry @p attempt.
 *
 * The delay is min(base * 2^attempt, max) + seed % (jitter_ms + 1), saturated
 * at UINT32_MAX. Adding jitter after the cap spreads retries by devices
 * already waiting at the maximum interval.
 *
 * @param p Delay curve. A null pointer returns one millisecond.
 * @param attempt Consecutive failure count, zero for the first attempt.
 * @param seed Input to the jitter calculation, such as uptime in milliseconds.
 * @return Delay in milliseconds.
 */
uint32_t ivts_backoff_ms(const ivts_backoff_t *p, uint32_t attempt, uint32_t seed);
