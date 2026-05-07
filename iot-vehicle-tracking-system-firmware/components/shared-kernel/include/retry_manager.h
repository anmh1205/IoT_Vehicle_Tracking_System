#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "esp_err.h"

/**
 * @file retry_manager.h
 * @brief Shared retry policy/state helpers for non-blocking retry scheduling.
 * This header belongs to the shared kernel layer and collects the shared models, bounds, and helper contracts that multiple components reuse.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


typedef enum {
    /** Always wait the same base delay between attempts. */
    RETRY_MODE_FIXED = 0,
    /** Multiply the base delay by `2 ^ attempts` before capping. */
    RETRY_MODE_EXPONENTIAL,
} retry_mode_t;

typedef struct {
    /** Retry curve selection. */
    retry_mode_t mode;
    /** Starting delay before the first retry window opens. */
    uint32_t base_delay_ms;
    /** Upper bound applied after exponential scaling and jitter. */
    uint32_t max_delay_ms;
    /** Maximum number of retries, where `0` means unbounded. */
    uint32_t max_attempts; /* 0 = unlimited */
    /** Extra pseudo-random delay span added from `seed_ms`, where `0` disables jitter. */
    uint32_t jitter_ms; /* 0 = disabled */
} retry_policy_t;

typedef struct {
    /** Number of retries already scheduled. */
    uint32_t attempts;
    /** Earliest uptime timestamp when the guarded operation may run again. */
    uint64_t next_allowed_ms;
    /** Last error that caused the retry to be scheduled. */
    esp_err_t last_err;
} retry_state_t;

/** @brief Reset retry history and open the gate immediately. */
void retry_state_reset(retry_state_t *state);

/**
 * @brief Check whether the caller may attempt the guarded operation now.
 *
 * @param state Retry state to inspect.
 * @param now_ms Current monotonic uptime in milliseconds.
 *
 * @return true when `now_ms >= next_allowed_ms`.
 */
bool retry_state_can_run(const retry_state_t *state, uint64_t now_ms);

/**
 * @brief Advance retry state after a failed attempt.
 *
 * Computes the current delay from `policy`, increments attempt count,
 * stores the triggering error, and updates `next_allowed_ms`.
 *
 * @param state Mutable retry state.
 * @param policy Retry policy to apply.
 * @param now_ms Current monotonic uptime in milliseconds.
 * @param err Error that caused the retry scheduling.
 *
 * @return ESP_OK on success, ESP_ERR_INVALID_STATE when max attempts is reached,
 *         or ESP_ERR_INVALID_ARG for invalid pointers.
 */
esp_err_t retry_state_schedule(retry_state_t *state,
                               const retry_policy_t *policy,
                               uint64_t now_ms,
                               esp_err_t err);

/**
 * @brief Compute the effective delay for the current retry attempt.
 *
 * @param state Retry state whose `attempts` field drives scaling.
 * @param policy Retry policy to apply.
 * @param seed_ms Monotonic timestamp or other changing value used for jitter.
 *
 * @return Delay in milliseconds after exponential scaling, cap, and jitter.
 */
uint32_t retry_state_current_delay_ms(const retry_state_t *state,
                                      const retry_policy_t *policy,
                                      uint64_t seed_ms);
