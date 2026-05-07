#include "modem_lte_internal.h"

#include "esp_log.h"

#include "telemetry_counters.h"

/**
 * @file modem_lte_recovery.c
 * @brief Backoff and hardware-recovery helpers for LTE bring-up failures.
 * This translation unit belongs to the SIM7600 AT modem adapter layer and keeps adapter-local state, protocol sequencing, and recovery policy isolated behind the exported entry points.
 */

// File-local constants, retained state, and helper wiring stay private here so
// higher layers interact with this module through its exported contract.


/**
 * @brief Reset recovery markers to initial state.
 */
static void modem_lte_reset_recovery_markers(void) {
    // Reset LTE reset recovery markers here so stale data does not leak into the next cycle.
    s_lte_initialized = false;
    s_lte_connected = false;
    s_cpin_diag_log_ms = 0;
    s_cereg_diag_log_ms = 0;
    s_rdy_diag_log_ms = 0;
    s_at_sync_diag_log_ms = 0;
    s_last_cereg_stat = -1;
    s_cpin_soft_retry_count = 0;
    modem_lte_clear_rdy_token();
    modem_lte_set_fixed_uart_cfg();
    modem_lte_reset_at_sync_sweep();
    (void)modem_lte_apply_at_sync_config();
}

/**
 * @brief Check if hardware recovery is allowed.
 *
 * @param now_ms Current timestamp.
 * @return True if recovery allowed.
 */
bool modem_lte_can_hw_recover(uint64_t now_ms) {
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
    bool rdy_seen = modem_lte_rdy_seen_in_cycle();
    bool force_no_rdy_recover = !rdy_seen &&
                                s_lte_backoff_retry.attempts >= MODEM_LTE_FORCE_RECOVER_NO_RDY_ATTEMPTS;

    if (!rdy_seen && !force_no_rdy_recover) {
        return false;
    }

    if (s_last_hw_recover_ms == 0) {
        if (force_no_rdy_recover) {
            ESP_LOGW(MODEM_LTE_TAG,
                     "forcing hardware recover without RDY after backoff attempts=%lu",
                     (unsigned long)s_lte_backoff_retry.attempts);
        }
        return true;
    }

    bool cooldown_elapsed = (now_ms - s_last_hw_recover_ms) >= MODEM_LTE_RECOVER_COOLDOWN_MS;
    if (cooldown_elapsed && force_no_rdy_recover) {
        ESP_LOGW(MODEM_LTE_TAG,
                 "forcing hardware recover without RDY after cooldown attempts=%lu",
                 (unsigned long)s_lte_backoff_retry.attempts);
    }
    return cooldown_elapsed;
}

/**
 * @brief Reset AT sync sweep counter.
 */
void modem_lte_reset_at_sync_sweep(void) {
    // Reset LTE reset AT sync sweep here so stale data does not leak into the next cycle.
    s_at_sync_fail_count = 0;
}

/**
 * @brief Enter backoff state after failure.
 *
 * @param now_ms Current timestamp.
 * @param err Error code.
 * @param reason Failure reason.
 */
void modem_lte_enter_backoff(uint64_t now_ms, esp_err_t err, const char *reason) {
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
    uint32_t delay_ms = retry_state_current_delay_ms(&s_lte_backoff_retry,
                                                     &s_lte_backoff_policy,
                                                     now_ms);
    s_last_err = err;
    (void)retry_state_schedule(&s_lte_backoff_retry, &s_lte_backoff_policy, now_ms, err);
    s_recover_attempts = 0;
    s_state_deadline_ms = 0;
    modem_lte_reset_recovery_markers();

    ESP_LOGE(MODEM_LTE_TAG,
             "retry step=%s err=%s attempt=%lu next_delay_ms=%lu",
             reason,
             esp_err_to_name(err),
             (unsigned long)s_lte_backoff_retry.attempts,
             (unsigned long)delay_ms);

    modem_lte_transition(MODEM_LTE_STATE_BACKOFF, now_ms, delay_ms);
}

void modem_lte_restart_wait_rdy(uint64_t now_ms, const char *reason) {
    // Initialize module-local state and dependencies before later runtime paths rely on them.
    modem_lte_reset_recovery_markers();
    s_state_deadline_ms = now_ms + MODEM_LTE_RDY_WAIT_TIMEOUT_MS;
    ESP_LOGW(MODEM_LTE_TAG, "restart wait-rdy reason=%s", reason);
    modem_lte_transition(MODEM_LTE_STATE_WAIT_RDY, now_ms, 0);
}

void modem_lte_enter_recover_or_backoff(uint64_t now_ms, esp_err_t err, const char *reason) {
    // Keep this helper boundary explicit so its local policy and side effects stay predictable.
    if (!modem_lte_can_hw_recover(now_ms)) {
        uint64_t cooldown_left_ms = 0;
        if (s_last_hw_recover_ms != 0 && now_ms > s_last_hw_recover_ms &&
            (now_ms - s_last_hw_recover_ms) < MODEM_LTE_RECOVER_COOLDOWN_MS) {
            cooldown_left_ms = MODEM_LTE_RECOVER_COOLDOWN_MS - (now_ms - s_last_hw_recover_ms);
        }

        telemetry_counters_inc_lte_recovery_fail();
        ESP_LOGW(MODEM_LTE_TAG,
                 "recover skipped step=%s reason=%s rdy_seen=%d cooldown_left_ms=%llu",
                 reason,
                 esp_err_to_name(err),
                 modem_lte_rdy_seen_in_cycle() ? 1 : 0,
                 (unsigned long long)cooldown_left_ms);
        modem_lte_enter_backoff(now_ms, err, "recover_guard");
        return;
    }

    if (s_recover_attempts >= MODEM_LTE_MAX_RECOVER_ATTEMPTS) {
        telemetry_counters_inc_lte_recovery_fail();
        modem_lte_enter_backoff(now_ms, err, reason);
        return;
    }

    s_last_err = err;
    s_recover_attempts += 1;
    s_last_hw_recover_ms = now_ms;
    s_state_deadline_ms = 0;
    modem_lte_reset_recovery_markers();
    telemetry_counters_inc_lte_recovery_start();
    ESP_LOGW(MODEM_LTE_TAG,
             "recover start step=%s err=%s attempt=%lu max_attempts=%u",
             reason,
             esp_err_to_name(err),
             (unsigned long)s_recover_attempts,
             (unsigned)MODEM_LTE_MAX_RECOVER_ATTEMPTS);
    modem_lte_transition(MODEM_LTE_STATE_RECOVER_RESET, now_ms, 0);
}
