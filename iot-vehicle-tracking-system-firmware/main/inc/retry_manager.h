#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "esp_err.h"

/**
 * @file retry_manager.h
 * @brief Shared retry policy/state helpers for non-blocking retry scheduling.
 */

typedef enum {
    RETRY_MODE_FIXED = 0,
    RETRY_MODE_EXPONENTIAL,
} retry_mode_t;

typedef struct {
    retry_mode_t mode;
    uint32_t base_delay_ms;
    uint32_t max_delay_ms;
    uint32_t max_attempts; /* 0 = unlimited */
    uint32_t jitter_ms; /* 0 = disabled */
} retry_policy_t;

typedef struct {
    uint32_t attempts;
    uint64_t next_allowed_ms;
    esp_err_t last_err;
} retry_state_t;

void retry_state_reset(retry_state_t *state);
bool retry_state_can_run(const retry_state_t *state, uint64_t now_ms);
esp_err_t retry_state_schedule(retry_state_t *state,
                               const retry_policy_t *policy,
                               uint64_t now_ms,
                               esp_err_t err);
uint32_t retry_state_current_delay_ms(const retry_state_t *state,
                                      const retry_policy_t *policy,
                                      uint64_t seed_ms);
