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

/**
 * @brief Convenience macro: guard + attempt + schedule-on-fail + reset-on-success.
 *
 * Usage:
 *   RETRY_ATTEMPT(s_network_retry, g_network_policy, now_ms, "lte_tick", modem_lte_tick(now_ms));
 *
 * Expands to the standard retry pattern without copy-pasting 8-10 lines each time.
 * The `operation` expression is evaluated once. On ESP_OK the state resets.
 * On failure the retry is scheduled and the enclosing scope should `return` or `break`.
 *
 * @param _state   retry_state_t variable (lvalue)
 * @param _policy  retry_policy_t variable (lvalue)
 * @param _now_ms  Current uptime in ms
 * @param _step    String literal for log identification
 * @param _op      Expression returning esp_err_t
 */
#define RETRY_ATTEMPT(_state, _policy, _now_ms, _step, _op) do { \
    if (!retry_state_can_run(&(_state), (_now_ms))) break; \
    esp_err_t _retry_err = (_op); \
    if (_retry_err != ESP_OK) { \
        uint32_t _retry_delay = retry_state_current_delay_ms(&(_state), &(_policy), (_now_ms)); \
        (void)retry_state_schedule(&(_state), &(_policy), (_now_ms), _retry_err); \
        ESP_LOGW(TAG, "event=retry_scheduled step=%s err=%s attempt=%lu delay_ms=%lu", \
                 (_step), esp_err_to_name(_retry_err), \
                 (unsigned long)(_state).attempts, (unsigned long)_retry_delay); \
        break; \
    } \
    retry_state_reset(&(_state)); \
} while (0)
