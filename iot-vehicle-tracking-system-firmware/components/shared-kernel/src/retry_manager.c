#include "retry_manager.h"

#include "util.h"

/**
 * @file retry_manager.c
 * @brief Small retry helper shared by modem, SD, MQTT, and replay flows.
 */

/* Prevent undefined `1U << shift` behavior and runaway multiplication. */
#define RETRY_EXP_SHIFT_CAP 20U

static uint32_t retry_policy_base_delay_ms(const retry_policy_t *policy) {
    if (policy == NULL || policy->base_delay_ms == 0U) {
        /* Never return zero; callers expect retries to eventually move forward. */
        return 1U;
    }
    return policy->base_delay_ms;
}

static uint32_t retry_policy_cap_delay_ms(const retry_policy_t *policy, uint32_t delay_ms) {
    if (policy == NULL || policy->max_delay_ms == 0U) {
        return delay_ms;
    }
    return delay_ms > policy->max_delay_ms ? policy->max_delay_ms : delay_ms;
}

void retry_state_reset(retry_state_t *state) {
    if (state == NULL) {
        return;
    }

    state->attempts = 0;
    state->next_allowed_ms = 0;
    state->last_err = ESP_OK;
}

bool retry_state_can_run(const retry_state_t *state, uint64_t now_ms) {
    if (state == NULL) {
        return false;
    }
    return now_ms >= state->next_allowed_ms;
}

uint32_t retry_state_current_delay_ms(const retry_state_t *state,
                                      const retry_policy_t *policy,
                                      uint64_t seed_ms) {
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

esp_err_t retry_state_schedule(retry_state_t *state,
                               const retry_policy_t *policy,
                               uint64_t now_ms,
                               esp_err_t err) {
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
