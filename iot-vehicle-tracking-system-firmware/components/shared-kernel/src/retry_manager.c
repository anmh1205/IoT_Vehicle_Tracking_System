#include "retry_manager.h"

#include "util.h"

/**
 * @file retry_manager.c
 * @brief Small retry helper shared by modem, SD, MQTT, and replay flows.
 * This translation unit belongs to the shared kernel layer and centralizes shared primitives, validation bounds, retry helpers, and generic utilities used across components.
 */


/*
 * Cap on the exponential shift amount. 1U << shift is undefined for shift >= 32,
 * and even shift values in the high 20s explode the delay past any sane cap, so
 * we clamp the exponent to keep `base * 2^shift` bounded and well-defined.
 */
#define RETRY_EXP_SHIFT_CAP 20U

/**
 * @brief Get base delay from policy, ensure non-zero.
 *
 * @param policy Retry policy.
 * @return Base delay in ms (minimum 1).
 */
static uint32_t retry_policy_base_delay_ms(const retry_policy_t *policy) {
    // A zero base delay (or missing policy) would let retries fire with no spacing
    // and stall exponential growth (2^N * 0 == 0). Floor at 1ms so backoff always
    // advances and the guarded operation eventually gets a real retry window.
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
    // max_delay_ms == 0 means "no ceiling": pass the delay through untouched.
    if (policy == NULL || policy->max_delay_ms == 0U) {
        return delay_ms;
    }
    // Otherwise clamp so exponential growth + jitter can never exceed the cap.
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
        return;  // tolerate NULL so callers can reset unconditionally
    }

    state->attempts = 0;          // back to attempt 0 -> next delay uses base delay
    state->next_allowed_ms = 0;   // gate fully open: operation may run immediately
    state->last_err = ESP_OK;     // clear the remembered failure cause
}

/**
 * @brief Check if retry is allowed now.
 *
 * @param state Current retry state.
 * @param now_ms Current timestamp.
 * @return true if delay has elapsed, false if must wait.
 */
bool retry_state_can_run(const retry_state_t *state, uint64_t now_ms) {
    // No state means nothing scheduled to guard; deny to be safe.
    if (state == NULL) {
        return false;
    }
    // The backoff window has elapsed once the monotonic clock reaches the
    // earliest-allowed timestamp set by the last schedule() call.
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
    // Start from the policy base delay (floored to >=1ms). Fixed-mode policies
    // keep this value; exponential-mode policies scale it below.
    uint32_t delay_ms = retry_policy_base_delay_ms(policy);

    // Apply exponential backoff only for exponential policies past the first
    // attempt. Attempt 0 intentionally keeps the raw base delay.
    if (policy != NULL && policy->mode == RETRY_MODE_EXPONENTIAL && state != NULL && state->attempts > 0U) {
        /*
         * Attempt 0 uses the base delay.
         * Attempt N scales as base * 2^N until capped.
         */
        // Use the attempt count as the exponent, clamped so the shift stays
        // well-defined and the multiplier cannot blow past the cap logic below.
        uint32_t shift = state->attempts;
        if (shift > RETRY_EXP_SHIFT_CAP) {
            shift = RETRY_EXP_SHIFT_CAP;
        }

        // Guard the shift against UB (1U << 31+ is undefined for uint32_t here).
        if (shift < 31U) {
            uint32_t mul = 1U << shift;                                   // 2^shift multiplier
            // Compute in 64-bit to detect overflow before narrowing back to 32-bit.
            uint64_t scaled = (uint64_t)delay_ms * (uint64_t)mul;
            if (scaled > UINT32_MAX) {
                delay_ms = UINT32_MAX;       // saturate instead of wrapping around
            } else {
                delay_ms = (uint32_t)scaled;
            }
        } else {
            // Shift too large to represent: saturate to the maximum delay.
            delay_ms = UINT32_MAX;
        }
    }

    // Clamp the scaled delay to the policy ceiling before adding jitter, so jitter
    // is layered on top of an already-bounded base value.
    delay_ms = retry_policy_cap_delay_ms(policy, delay_ms);

    if (policy != NULL && policy->jitter_ms > 0U) {
        /* Deterministic jitter from uptime spreads retries without extra RNG state. */
        // jitter is in [0, jitter_ms]; the +1 makes the upper bound inclusive.
        // Deriving it from seed_ms (monotonic uptime) avoids consuming RNG entropy
        // yet still de-synchronizes many devices retrying at the same instant.
        uint64_t jitter_span = (uint64_t)policy->jitter_ms + 1ULL;
        uint32_t jitter = (uint32_t)(seed_ms % jitter_span);
        // Add jitter in 64-bit and saturate to avoid 32-bit overflow wraparound.
        uint64_t jittered = (uint64_t)delay_ms + (uint64_t)jitter;
        if (jittered > UINT32_MAX) {
            delay_ms = UINT32_MAX;
        } else {
            delay_ms = (uint32_t)jittered;
        }
    }

    // Re-apply the cap: jitter may have pushed the delay back above max_delay_ms.
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
    // Both pointers are mandatory: without them there is no state to advance.
    if (state == NULL || policy == NULL) {
        return ESP_ERR_INVALID_ARG;
    }

    // Enforce the attempt budget (max_attempts == 0 means unlimited). Once the
    // budget is exhausted we stop scheduling and surface a terminal failure.
    if (policy->max_attempts != 0U && state->attempts >= policy->max_attempts) {
        /* Preserve the terminal error so callers can report the real reason. */
        state->last_err = err;
        return ESP_ERR_INVALID_STATE;
    }

    // Compute the delay for the *current* attempt count, then advance state:
    // increment attempts (drives the next exponential step), push out the gate
    // by delay_ms, and remember the error that triggered this retry.
    uint32_t delay_ms = retry_state_current_delay_ms(state, policy, now_ms);
    state->attempts += 1U;
    state->next_allowed_ms = now_ms + (uint64_t)delay_ms;
    state->last_err = err;
    return ESP_OK;
}
