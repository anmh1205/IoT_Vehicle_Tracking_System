#include "retry_manager.h"

#include "util.h"

/**
 * @file retry_manager.c
 * @brief Small retry helper shared by modem, SD, MQTT, and replay flows.
 * This translation unit belongs to the shared kernel layer and centralizes shared primitives, validation bounds, retry helpers, and generic utilities used across components.
 */

// File-local constants, retained state, and helper wiring stay private here so
// higher layers interact with this module through its exported contract.


/* Prevent undefined `1U << shift` behavior and runaway multiplication. */
#define RETRY_EXP_SHIFT_CAP 20U

/**
 * @brief Get base delay from policy, ensure non-zero.
 *
 * @param policy Retry policy.
 * @return Base delay in ms (minimum 1).
 */
static uint32_t retry_policy_base_delay_ms(const retry_policy_t *policy) {
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
    if (policy == NULL || policy->base_delay_ms == 0U) {
        /* Never return zero; callers expect retries to eventually move forward. */
        return 1U;
    }
    return policy->base_delay_ms;
}

/**
 * @brief Apply max delay cap from policy.
 *
 * @param policy Retry policy.
 * @param delay_ms Current delay.
 * @return Capped delay.
 */
static uint32_t retry_policy_cap_delay_ms(const retry_policy_t *policy, uint32_t delay_ms) {
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
    if (policy == NULL || policy->max_delay_ms == 0U) {
        return delay_ms;
    }
    return delay_ms > policy->max_delay_ms ? policy->max_delay_ms : delay_ms;
}

/**
 * @brief Reset retry state for fresh attempt sequence.
 *
 * @param state Retry state to reset.
 */
void retry_state_reset(retry_state_t *state) {
    // Reset the retry state here so a recovered operation restarts with a clean attempt history.
    if (state == NULL) {
        return;
    }

    state->attempts = 0;
    state->next_allowed_ms = 0;
    state->last_err = ESP_OK;
}

/**
 * @brief Check if retry is allowed now.
 *
 * @param state Current retry state.
 * @param now_ms Current timestamp.
 * @return true if delay has elapsed, false if must wait.
 */
bool retry_state_can_run(const retry_state_t *state, uint64_t now_ms) {
    // Advance one cooperative step here using the current state, time gates, and retry policy.
    if (state == NULL) {
        return false;
    }
    return now_ms >= state->next_allowed_ms;
}

/**
 * @brief Calculate current delay based on policy and attempts.
 *
 * @param state Retry state.
 * @param policy Retry policy.
 * @param seed_ms Timestamp for jitter calculation.
 * @return Delay in ms for next retry.
 */
uint32_t retry_state_current_delay_ms(const retry_state_t *state,
                                      const retry_policy_t *policy,
                                      uint64_t seed_ms) {
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
    uint32_t delay_ms = retry_policy_base_delay_ms(policy);

    if (policy != NULL && policy->mode == RETRY_MODE_EXPONENTIAL && state != NULL && state->attempts > 0U) {
        /*
         * Attempt 0 uses the base delay.
         * Attempt N scales as base * 2^N until capped.
         */
        uint32_t shift = state->attempts;
        if (shift > RETRY_EXP_SHIFT_CAP) {
            shift = RETRY_EXP_SHIFT_CAP;
        }

        if (shift < 31U) {
            uint32_t mul = 1U << shift;
            uint64_t scaled = (uint64_t)delay_ms * (uint64_t)mul;
            if (scaled > UINT32_MAX) {
                delay_ms = UINT32_MAX;
            } else {
                delay_ms = (uint32_t)scaled;
            }
        } else {
            delay_ms = UINT32_MAX;
        }
    }

    delay_ms = retry_policy_cap_delay_ms(policy, delay_ms);

    if (policy != NULL && policy->jitter_ms > 0U) {
        /* Deterministic jitter from uptime spreads retries without extra RNG state. */
        uint64_t jitter_span = (uint64_t)policy->jitter_ms + 1ULL;
        uint32_t jitter = (uint32_t)(seed_ms % jitter_span);
        uint64_t jittered = (uint64_t)delay_ms + (uint64_t)jitter;
        if (jittered > UINT32_MAX) {
            delay_ms = UINT32_MAX;
        } else {
            delay_ms = (uint32_t)jittered;
        }
    }

    return retry_policy_cap_delay_ms(policy, delay_ms);
}

/**
 * @brief Schedule next retry with backoff.
 *
 * Advances attempt counter and calculates next allowed timestamp.
 *
 * @param state Retry state to update.
 * @param policy Retry policy to use.
 * @param now_ms Current timestamp.
 * @param err Last error that triggered retry.
 * @return ESP_OK if scheduled, ESP_ERR_INVALID_STATE if max attempts reached.
 */
esp_err_t retry_state_schedule(retry_state_t *state,
                               const retry_policy_t *policy,
                               uint64_t now_ms,
                               esp_err_t err) {
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
    if (state == NULL || policy == NULL) {
        return ESP_ERR_INVALID_ARG;
    }

    if (policy->max_attempts != 0U && state->attempts >= policy->max_attempts) {
        /* Preserve the terminal error so callers can report the real reason. */
        state->last_err = err;
        return ESP_ERR_INVALID_STATE;
    }

    uint32_t delay_ms = retry_state_current_delay_ms(state, policy, now_ms);
    state->attempts += 1U;
    state->next_allowed_ms = now_ms + (uint64_t)delay_ms;
    state->last_err = err;
    return ESP_OK;
}
