#include "modem_lte_internal.h"

#include <stdio.h>
#include <string.h>

#include "esp_log.h"

#include "modem_at.h"
#include "power_mgr.h"
#include "telemetry_counters.h"
#include "util.h"

/**
 * @file modem_lte_fsm.c
 * @brief LTE connection state machine handlers behind the modem facade.
 * This translation unit belongs to the SIM7600 AT modem adapter layer and keeps adapter-local state, protocol sequencing, and recovery policy isolated behind the exported entry points.
 */


/**
 * @brief Get state name string.
 *
 * @param state State enum.
 * @return State name string.
 */
const char *modem_lte_state_name(modem_lte_state_t state) {
    switch (state) {
        case MODEM_LTE_STATE_IDLE:
            return "IDLE";
        case MODEM_LTE_STATE_POWER_ON_PULSE:
            return "POWER_ON_PULSE";
        case MODEM_LTE_STATE_WAIT_BOOT:
            return "WAIT_BOOT";
        case MODEM_LTE_STATE_WAIT_RDY:
            return "WAIT_RDY";
        case MODEM_LTE_STATE_AT_SYNC:
            return "AT_SYNC";
        case MODEM_LTE_STATE_ATE0:
            return "ATE0";
        case MODEM_LTE_STATE_CPIN_CHECK:
            return "CPIN_CHECK";
        case MODEM_LTE_STATE_SET_NET_MODE:
            return "SET_NET_MODE";
        case MODEM_LTE_STATE_SET_PDP:
            return "SET_PDP";
        case MODEM_LTE_STATE_CEREG_WAIT:
            return "CEREG_WAIT";
        case MODEM_LTE_STATE_PDP_ACTIVATE:
            return "PDP_ACTIVATE";
        case MODEM_LTE_STATE_PDP_IP_CHECK:
            return "PDP_IP_CHECK";
        case MODEM_LTE_STATE_CONNECTED:
            return "CONNECTED";
        case MODEM_LTE_STATE_RECOVER_RESET:
            return "RECOVER_RESET";
        case MODEM_LTE_STATE_BACKOFF:
            return "BACKOFF";
        default:
            return "UNKNOWN";
    }
}

/**
 * @brief Transition to new state.
 *
 * @param next_state Target state.
 * @param now_ms Current timestamp.
 * @param delay_ms Delay before transition.
 */
void modem_lte_transition(modem_lte_state_t next_state, uint64_t now_ms, uint64_t delay_ms) {
    if (s_state != next_state) {
        ESP_LOGI(MODEM_LTE_TAG,
                 "event=lte_fsm_transition from=%s to=%s delay_ms=%llu",
                 modem_lte_state_name(s_state),
                 modem_lte_state_name(next_state),
                 (unsigned long long)delay_ms);
    }
    s_state = next_state;
    s_next_action_ms = now_ms + delay_ms;
}

static esp_err_t modem_lte_handle_idle(uint64_t now_ms) {
    if (!retry_state_can_run(&s_lte_backoff_retry, now_ms)) {
        return ESP_ERR_NOT_FINISHED;
    }

    modem_lte_transition(MODEM_LTE_STATE_POWER_ON_PULSE, now_ms, 0);
    return ESP_ERR_NOT_FINISHED;
}

static esp_err_t modem_lte_handle_power_on_pulse(uint64_t now_ms) {
    esp_err_t dtr_err = modem_set_dtr(false);
    if (dtr_err != ESP_OK && dtr_err != ESP_ERR_NOT_SUPPORTED) {
        ESP_LOGW(MODEM_LTE_TAG, "event=lte_wakeup_dtr_set_failed err=%s", esp_err_to_name(dtr_err));
    }

    modem_lte_force_dtr_wake_pulse();
    if (modem_lte_try_resume_alive_modem(now_ms)) {
        return ESP_ERR_NOT_FINISHED;
    }

    esp_err_t err = modem_power_on();
    if (err != ESP_OK) {
        modem_lte_enter_backoff(now_ms, err, "modem_power_on");
        return ESP_ERR_NOT_FINISHED;
    }

    modem_lte_transition(MODEM_LTE_STATE_WAIT_BOOT, util_uptime_ms(), MODEM_LTE_POWER_RAIL_SETTLE_MS);
    return ESP_ERR_NOT_FINISHED;
}

static esp_err_t modem_lte_handle_wait_boot(uint64_t now_ms) {
    esp_err_t err = modem_at_init();
    if (err != ESP_OK) {
        modem_lte_enter_backoff(now_ms, err, "modem_at_init");
        return ESP_ERR_NOT_FINISHED;
    }

    if (!s_rdy_urc_registered) {
        modem_at_register_urc("RDY", modem_lte_on_urc_rdy);
        s_rdy_urc_registered = true;
    }

    modem_lte_set_fixed_uart_cfg();
    modem_lte_reset_at_sync_sweep();
    esp_err_t setup_err = modem_lte_apply_at_sync_config();
    if (setup_err != ESP_OK) {
        modem_lte_enter_backoff(now_ms, setup_err, "AT setup");
        return ESP_ERR_NOT_FINISHED;
    }

    modem_lte_clear_rdy_token();
    s_state_deadline_ms = now_ms + MODEM_LTE_RDY_WAIT_TIMEOUT_MS;
    s_rdy_diag_log_ms = 0;
    modem_lte_log_fixed_uart_cfg();
    modem_lte_transition(MODEM_LTE_STATE_WAIT_RDY, now_ms, 0);
    return ESP_ERR_NOT_FINISHED;
}

static esp_err_t modem_lte_handle_wait_rdy(uint64_t now_ms) {
    (void)modem_at_poll_urc(MODEM_LTE_URC_POLL_MAX_BYTES);
    if (modem_lte_rdy_seen_in_cycle()) {
        ESP_LOGI(MODEM_LTE_TAG, "event=lte_rdy_gate_open next_state=AT_SYNC");
        modem_lte_transition(MODEM_LTE_STATE_AT_SYNC, now_ms, MODEM_LTE_WAKE_DTR_SETTLE_MS);
        return ESP_ERR_NOT_FINISHED;
    }

    if (modem_lte_diag_log_due(now_ms, &s_rdy_diag_log_ms, MODEM_LTE_REG_LOG_INTERVAL_MS)) {
        ESP_LOGI(MODEM_LTE_TAG, "event=lte_rdy_wait_pending reason=marker_missing");
    }

    if (now_ms >= s_state_deadline_ms) {
        ESP_LOGW(MODEM_LTE_TAG, "event=lte_rdy_wait_timeout action=fallback_at_sync");
        modem_lte_transition(MODEM_LTE_STATE_AT_SYNC, now_ms, MODEM_LTE_WAKE_DTR_SETTLE_MS);
        return ESP_ERR_NOT_FINISHED;
    }

    modem_lte_transition(MODEM_LTE_STATE_WAIT_RDY, now_ms, MODEM_LTE_AT_READY_POLL_MS);
    return ESP_ERR_NOT_FINISHED;
}

static esp_err_t modem_lte_handle_at_sync(uint64_t now_ms) {
    char response[256] = {0};
    modem_at_reset_uart_diag();
    esp_err_t err = modem_at_send("AT\r", response, sizeof(response), MODEM_LTE_AT_SYNC_CMD_TIMEOUT_MS);
    bool at_ready = err == ESP_OK && strstr(response, "OK") != NULL;
    if (at_ready) {
        s_at_sync_fail_count = 0;
        s_at_sync_diag_log_ms = 0;
        ESP_LOGI(MODEM_LTE_TAG,
                 "event=lte_at_sync_ready tx=%d rx=%d baud=%lu invert=%s fmt=%s%s%s clk=%s",
                 (int)s_active_uart_cfg.tx_pin,
                 (int)s_active_uart_cfg.rx_pin,
                 (unsigned long)s_active_uart_cfg.baud,
                 modem_lte_inverse_name(s_active_uart_cfg.inverse_mask),
                 modem_lte_data_bits_name(s_active_uart_cfg.data_bits),
                 modem_lte_parity_name(s_active_uart_cfg.parity),
                 modem_lte_stop_bits_name(s_active_uart_cfg.stop_bits),
                 modem_lte_source_clk_name(s_active_uart_cfg.source_clk));
        modem_lte_transition(MODEM_LTE_STATE_ATE0, now_ms, 0);
        return ESP_ERR_NOT_FINISHED;
    }

    s_at_sync_fail_count += 1U;
    if (s_at_sync_fail_count == 1U) {
        modem_lte_force_dtr_wake_pulse();
    }
    if (s_at_sync_fail_count >= MODEM_LTE_AT_SYNC_RECOVER_THRESHOLD) {
        s_at_sync_fail_count = 0;
        modem_lte_enter_recover_or_backoff(now_ms, err == ESP_OK ? ESP_FAIL : err, "AT sync threshold");
        return ESP_ERR_NOT_FINISHED;
    }

    if (modem_lte_diag_log_due(now_ms, &s_at_sync_diag_log_ms, MODEM_LTE_REG_LOG_INTERVAL_MS)) {
        modem_lte_log_at_probe_response(response);

        modem_at_uart_diag_t diag = {0};
        modem_at_get_uart_diag(&diag);
        ESP_LOGW(MODEM_LTE_TAG,
                 "event=lte_at_sync_not_ready reason=%s cmd=AT tx=%d rx=%d baud=%lu invert=%s fmt=%s%s%s clk=%s fe=%u pe=%u ovf=%u full=%u brk=%u retry_ms=%llu",
                 err == ESP_OK ? "unexpected_response" : esp_err_to_name(err),
                 (int)s_active_uart_cfg.tx_pin,
                 (int)s_active_uart_cfg.rx_pin,
                 (unsigned long)s_active_uart_cfg.baud,
                 modem_lte_inverse_name(s_active_uart_cfg.inverse_mask),
                 modem_lte_data_bits_name(s_active_uart_cfg.data_bits),
                 modem_lte_parity_name(s_active_uart_cfg.parity),
                 modem_lte_stop_bits_name(s_active_uart_cfg.stop_bits),
                 modem_lte_source_clk_name(s_active_uart_cfg.source_clk),
                 (unsigned)diag.frame_err_count,
                 (unsigned)diag.parity_err_count,
                 (unsigned)diag.fifo_overflow_count,
                 (unsigned)diag.buffer_full_count,
                 (unsigned)diag.break_count,
                 (unsigned long long)MODEM_LTE_AT_READY_POLL_MS);
    }

    modem_lte_transition(MODEM_LTE_STATE_AT_SYNC, now_ms, MODEM_LTE_AT_READY_POLL_MS);
    return ESP_ERR_NOT_FINISHED;
}

static esp_err_t modem_lte_handle_ate0(uint64_t now_ms) {
    esp_err_t err = modem_lte_send_simple("ATE0\r", "OK", MODEM_LTE_SHORT_CMD_TIMEOUT_MS);
    if (err != ESP_OK) {
        modem_lte_enter_recover_or_backoff(now_ms, err, "ATE0");
        return ESP_ERR_NOT_FINISHED;
    }

    s_cpin_diag_log_ms = 0;
    s_cpin_soft_retry_count = 0;
    s_state_deadline_ms = now_ms + MODEM_LTE_CPIN_TIMEOUT_MS;
    modem_lte_transition(MODEM_LTE_STATE_CPIN_CHECK, now_ms, 0);
    return ESP_ERR_NOT_FINISHED;
}

static esp_err_t modem_lte_handle_cpin_check(uint64_t now_ms) {
    char response[256] = {0};
    esp_err_t err = modem_at_send("AT+CPIN?\r", response, sizeof(response), MODEM_LTE_SHORT_CMD_TIMEOUT_MS);
    bool cpin_ready = (err == ESP_OK) && (strstr(response, "+CPIN: READY") != NULL);
    if (cpin_ready) {
        s_cpin_soft_retry_count = 0;
        s_cereg_diag_log_ms = 0;
        s_last_cereg_stat = -1;
        modem_lte_transition(MODEM_LTE_STATE_SET_NET_MODE, now_ms, 0);
        return ESP_ERR_NOT_FINISHED;
    }

    bool sim_not_inserted = (err == ESP_OK) && (strstr(response, "+CME ERROR: SIM not inserted") != NULL);
    if (sim_not_inserted && s_cpin_soft_retry_count < MODEM_LTE_CPIN_SOFT_RETRY_LIMIT) {
        s_cpin_soft_retry_count += 1U;
        ESP_LOGW(MODEM_LTE_TAG,
                 "event=lte_cpin_soft_retry attempt=%lu limit=%u",
                 (unsigned long)s_cpin_soft_retry_count,
                 (unsigned)MODEM_LTE_CPIN_SOFT_RETRY_LIMIT);
        modem_lte_transition(MODEM_LTE_STATE_CPIN_CHECK, now_ms, MODEM_LTE_CPIN_POLL_MS);
        return ESP_ERR_NOT_FINISHED;
    }

    if (modem_lte_diag_log_due(now_ms, &s_cpin_diag_log_ms, MODEM_LTE_REG_LOG_INTERVAL_MS)) {
        if (err != ESP_OK) {
            ESP_LOGW(MODEM_LTE_TAG, "event=lte_cpin_query_failed err=%s", esp_err_to_name(err));
        } else {
            ESP_LOGI(MODEM_LTE_TAG,
                     "event=lte_cpin_wait response_len=%u ready=%d sim_missing=%d",
                     (unsigned)strlen(response),
                     strstr(response, "+CPIN: READY") != NULL ? 1 : 0,
                     strstr(response, "SIM not inserted") != NULL ? 1 : 0);
        }
    }

    if (now_ms >= s_state_deadline_ms) {
        modem_lte_log_registration_snapshot();
        modem_lte_enter_recover_or_backoff(now_ms, err == ESP_OK ? ESP_ERR_TIMEOUT : err, "CPIN timeout");
        return ESP_ERR_NOT_FINISHED;
    }

    modem_lte_transition(MODEM_LTE_STATE_CPIN_CHECK, now_ms, MODEM_LTE_CPIN_POLL_MS);
    return ESP_ERR_NOT_FINISHED;
}

static esp_err_t modem_lte_handle_set_net_mode(uint64_t now_ms) {
    esp_err_t err = modem_lte_send_simple("AT+CNMP=2\r", "OK", MODEM_LTE_SHORT_CMD_TIMEOUT_MS);
    if (err != ESP_OK) {
        modem_lte_enter_recover_or_backoff(now_ms, err, "AT+CNMP=2");
        return ESP_ERR_NOT_FINISHED;
    }

    modem_lte_transition(MODEM_LTE_STATE_SET_PDP, now_ms, 0);
    return ESP_ERR_NOT_FINISHED;
}

static esp_err_t modem_lte_handle_set_pdp(uint64_t now_ms) {
    char pdp_cmd[96] = {0};
    (void)snprintf(pdp_cmd, sizeof(pdp_cmd), "AT+CGDCONT=1,\"IP\",\"%s\"\r", s_active_apn);
    esp_err_t err = modem_lte_send_simple(pdp_cmd, "OK", MODEM_LTE_SHORT_CMD_TIMEOUT_MS);
    if (err != ESP_OK) {
        modem_lte_enter_recover_or_backoff(now_ms, err, "AT+CGDCONT");
        return ESP_ERR_NOT_FINISHED;
    }

    ESP_LOGI(MODEM_LTE_TAG, "event=lte_pdp_profile_configured apn_configured=1");
    modem_lte_log_hw_lines_if_available();
    /* s_lte_initialized deferred to finalize_connected() — AT is ready but IP not yet available */
    s_cereg_diag_log_ms = 0;
    s_last_cereg_stat = -1;
    s_state_deadline_ms = now_ms + MODEM_LTE_CEREG_TIMEOUT_MS;
    modem_lte_transition(MODEM_LTE_STATE_CEREG_WAIT, now_ms, 0);
    return ESP_ERR_NOT_FINISHED;
}

static esp_err_t modem_lte_handle_cereg_wait(uint64_t now_ms) {
    char response[256] = {0};
    esp_err_t err = modem_at_send("AT+CEREG?\r", response, sizeof(response), MODEM_LTE_SHORT_CMD_TIMEOUT_MS);
    if (err == ESP_OK) {
        int n = 0;
        int stat = -1;
        if (modem_lte_parse_cereg(response, &n, &stat)) {
            bool is_registered = stat == 1 || stat == 5;
            bool should_log = stat != s_last_cereg_stat;
            if (modem_lte_diag_log_due(now_ms, &s_cereg_diag_log_ms, MODEM_LTE_REG_LOG_INTERVAL_MS)) {
                should_log = true;
            }
            if (should_log) {
                ESP_LOGI(MODEM_LTE_TAG,
                         "event=lte_cereg_status n=%d stat=%d state=%s registered=%d",
                         n,
                         stat,
                         modem_lte_cereg_stat_name(stat),
                         is_registered ? 1 : 0);
                s_cereg_diag_log_ms = now_ms;
            }
            s_last_cereg_stat = stat;
            if (is_registered) {
                modem_lte_transition(MODEM_LTE_STATE_PDP_ACTIVATE, now_ms, 0);
                return ESP_ERR_NOT_FINISHED;
            }
        } else if (modem_lte_diag_log_due(now_ms, &s_cereg_diag_log_ms, MODEM_LTE_REG_LOG_INTERVAL_MS)) {
            ESP_LOGW(MODEM_LTE_TAG,
                     "event=lte_cereg_parse_miss response_len=%u",
                     (unsigned)strlen(response));
        }
    } else if (modem_lte_diag_log_due(now_ms, &s_cereg_diag_log_ms, MODEM_LTE_REG_LOG_INTERVAL_MS)) {
        ESP_LOGW(MODEM_LTE_TAG, "event=lte_cereg_query_failed err=%s", esp_err_to_name(err));
    }

    if (now_ms >= s_state_deadline_ms) {
        modem_lte_log_registration_snapshot();
        modem_lte_enter_recover_or_backoff(now_ms, err == ESP_OK ? ESP_ERR_TIMEOUT : err, "CEREG timeout");
        return ESP_ERR_NOT_FINISHED;
    }

    modem_lte_transition(MODEM_LTE_STATE_CEREG_WAIT, now_ms, MODEM_LTE_CEREG_POLL_MS);
    return ESP_ERR_NOT_FINISHED;
}

static esp_err_t modem_lte_handle_pdp_activate(uint64_t now_ms) {
    esp_err_t err = modem_lte_send_simple("AT+CGACT=1,1\r", "OK", MODEM_LTE_PDP_ACT_TIMEOUT_MS);
    if (err != ESP_OK) {
        modem_lte_enter_recover_or_backoff(now_ms, err, "AT+CGACT=1,1");
        return ESP_ERR_NOT_FINISHED;
    }

    modem_lte_transition(MODEM_LTE_STATE_PDP_IP_CHECK, now_ms, 0);
    return ESP_ERR_NOT_FINISHED;
}

static esp_err_t modem_lte_finalize_connected(uint64_t now_ms) {
    bool recovered = s_recover_attempts > 0 || s_last_hw_recover_ms != 0;
    if (recovered) {
        telemetry_counters_inc_lte_recovery_success();
    }
    s_lte_connected = true;
    s_lte_initialized = true;
    s_connect_requested = false;
    retry_state_reset(&s_lte_backoff_retry);
    s_recover_attempts = 0;
    s_cpin_diag_log_ms = 0;
    s_cereg_diag_log_ms = 0;
    s_rdy_diag_log_ms = 0;
    s_at_sync_diag_log_ms = 0;
    s_last_cereg_stat = -1;
    s_cpin_soft_retry_count = 0;
    s_last_hw_recover_ms = 0;
    modem_lte_clear_rdy_token();
    modem_lte_reset_at_sync_sweep();
    (void)modem_lte_apply_at_sync_config();
    s_last_err = ESP_OK;
    modem_lte_transition(MODEM_LTE_STATE_CONNECTED, now_ms, 0);
    ESP_LOGI(MODEM_LTE_TAG, "event=lte_connected pdp_active=1 recovered=%d", recovered ? 1 : 0);
    return ESP_OK;
}

static esp_err_t modem_lte_handle_pdp_ip_check(uint64_t now_ms) {
    char response[256] = {0};
    esp_err_t err = modem_at_send("AT+CGPADDR=1\r", response, sizeof(response), MODEM_LTE_SHORT_CMD_TIMEOUT_MS);
    bool has_cgpaddr = err == ESP_OK && strstr(response, "+CGPADDR:") != NULL;
    if (!has_cgpaddr) {
        modem_lte_enter_recover_or_backoff(now_ms, err == ESP_OK ? ESP_FAIL : err, "AT+CGPADDR=1");
        return ESP_ERR_NOT_FINISHED;
    }

    ESP_LOGI(MODEM_LTE_TAG,
             "event=lte_pdp_ip_check_ok response_len=%u",
             (unsigned)strlen(response));
    return modem_lte_finalize_connected(now_ms);
}

static esp_err_t modem_lte_handle_recover_reset(void) {
    esp_err_t reset_err = modem_reset_pulse();
    if (reset_err == ESP_ERR_NOT_SUPPORTED) {
        ESP_LOGW(MODEM_LTE_TAG, "event=lte_reset_pin_unavailable action=fallback_power_on");
        reset_err = modem_power_on();
    }

    if (reset_err != ESP_OK) {
        telemetry_counters_inc_lte_recovery_fail();
        modem_lte_enter_backoff(util_uptime_ms(), reset_err, "recover reset");
        return ESP_ERR_NOT_FINISHED;
    }

    modem_lte_restart_wait_rdy(util_uptime_ms(), "recover_done");
    return ESP_ERR_NOT_FINISHED;
}

static esp_err_t modem_lte_handle_connected(void) {
    (void)modem_at_poll_urc(MODEM_LTE_URC_POLL_MAX_BYTES);
    return s_lte_connected ? ESP_OK : ESP_ERR_NOT_FINISHED;
}

esp_err_t modem_lte_tick(uint64_t now_ms) {
    if (s_lte_connected && s_state == MODEM_LTE_STATE_CONNECTED) {
        return ESP_OK;
    }

    if (!s_connect_requested && s_state == MODEM_LTE_STATE_IDLE) {
        return ESP_ERR_NOT_FINISHED;
    }

    if (now_ms < s_next_action_ms) {
        return ESP_ERR_NOT_FINISHED;
    }

    switch (s_state) {
        case MODEM_LTE_STATE_IDLE:
            return modem_lte_handle_idle(now_ms);
        case MODEM_LTE_STATE_POWER_ON_PULSE:
            return modem_lte_handle_power_on_pulse(now_ms);
        case MODEM_LTE_STATE_WAIT_BOOT:
            return modem_lte_handle_wait_boot(now_ms);
        case MODEM_LTE_STATE_WAIT_RDY:
            return modem_lte_handle_wait_rdy(now_ms);
        case MODEM_LTE_STATE_AT_SYNC:
            return modem_lte_handle_at_sync(now_ms);
        case MODEM_LTE_STATE_ATE0:
            return modem_lte_handle_ate0(now_ms);
        case MODEM_LTE_STATE_CPIN_CHECK:
            return modem_lte_handle_cpin_check(now_ms);
        case MODEM_LTE_STATE_SET_NET_MODE:
            return modem_lte_handle_set_net_mode(now_ms);
        case MODEM_LTE_STATE_SET_PDP:
            return modem_lte_handle_set_pdp(now_ms);
        case MODEM_LTE_STATE_CEREG_WAIT:
            return modem_lte_handle_cereg_wait(now_ms);
        case MODEM_LTE_STATE_PDP_ACTIVATE:
            return modem_lte_handle_pdp_activate(now_ms);
        case MODEM_LTE_STATE_PDP_IP_CHECK:
            return modem_lte_handle_pdp_ip_check(now_ms);
        case MODEM_LTE_STATE_RECOVER_RESET:
            return modem_lte_handle_recover_reset();
        case MODEM_LTE_STATE_BACKOFF:
            modem_lte_transition(MODEM_LTE_STATE_POWER_ON_PULSE, now_ms, 0);
            return ESP_ERR_NOT_FINISHED;
        case MODEM_LTE_STATE_CONNECTED:
            return modem_lte_handle_connected();
        default:
            modem_lte_enter_backoff(now_ms, ESP_FAIL, "invalid_state");
            return ESP_ERR_NOT_FINISHED;
    }
}
