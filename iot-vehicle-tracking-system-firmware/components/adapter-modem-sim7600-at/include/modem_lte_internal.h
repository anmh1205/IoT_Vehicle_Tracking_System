#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "driver/gpio.h"
#include "driver/uart.h"
#include "esp_err.h"

#include "app_config.h"
#include "pin_map.h"
#include "retry_manager.h"

/**
 * @file modem_lte_internal.h
 * @brief Shared LTE FSM state and helper declarations for split modem modules.
 * This header belongs to the SIM7600 AT modem adapter layer and exposes the modem boundary so higher layers do not depend on UART- or AT-private details.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


#ifndef CONFIG_TRACKER_MODEM_APN
#define CONFIG_TRACKER_MODEM_APN "internet"
#endif

#define MODEM_LTE_TAG "MODEM_LTE"
#define MODEM_LTE_POWER_RAIL_SETTLE_MS 8000ULL
#define MODEM_LTE_WAKE_DTR_SETTLE_MS 50ULL
#define MODEM_LTE_DTR_WAKE_PULSE_MS 80ULL
#define MODEM_LTE_ENABLE_DTR_WAKE_PULSE 0
#define MODEM_LTE_SHORT_CMD_TIMEOUT_MS 5000U
#define MODEM_LTE_AT_SYNC_CMD_TIMEOUT_MS 1500U
#define MODEM_LTE_BOOT_ALIVE_PROBE_TIMEOUT_MS 800U
#define MODEM_LTE_PDP_ACT_TIMEOUT_MS 15000U
#define MODEM_LTE_AT_READY_POLL_MS 500ULL
#define MODEM_LTE_AT_SYNC_RECOVER_THRESHOLD 3U
#define MODEM_LTE_CPIN_TIMEOUT_MS 30000ULL
#define MODEM_LTE_CPIN_POLL_MS 1000ULL
#define MODEM_LTE_CPIN_SOFT_RETRY_LIMIT 3U
#define MODEM_LTE_RECOVER_COOLDOWN_MS 15000ULL
#define MODEM_LTE_RDY_WAIT_TIMEOUT_MS 30000ULL
#define MODEM_LTE_URC_POLL_MAX_BYTES 256U
#define MODEM_LTE_CEREG_TIMEOUT_MS 60000ULL
#define MODEM_LTE_CEREG_POLL_MS 1000ULL
#define MODEM_LTE_REG_LOG_INTERVAL_MS 5000ULL
#define MODEM_LTE_BACKOFF_BASE_MS 3000ULL
#define MODEM_LTE_BACKOFF_MAX_MS 60000ULL
#define MODEM_LTE_MAX_RECOVER_ATTEMPTS 2U
#define MODEM_LTE_FORCE_RECOVER_NO_RDY_ATTEMPTS 3U
#define MODEM_LTE_AT_SYNC_FIXED_INVERSE_MASK MODEM_UART_LINE_INVERSE_MASK

typedef enum {
    MODEM_LTE_STATE_IDLE = 0,
    MODEM_LTE_STATE_POWER_ON_PULSE,
    MODEM_LTE_STATE_WAIT_BOOT,
    MODEM_LTE_STATE_WAIT_RDY,
    MODEM_LTE_STATE_AT_SYNC,
    MODEM_LTE_STATE_ATE0,
    MODEM_LTE_STATE_CPIN_CHECK,
    MODEM_LTE_STATE_SET_NET_MODE,
    MODEM_LTE_STATE_SET_PDP,
    MODEM_LTE_STATE_CEREG_WAIT,
    MODEM_LTE_STATE_PDP_ACTIVATE,
    MODEM_LTE_STATE_PDP_IP_CHECK,
    MODEM_LTE_STATE_CONNECTED,
    MODEM_LTE_STATE_RECOVER_RESET,
    MODEM_LTE_STATE_BACKOFF,
} modem_lte_state_t;

typedef struct {
    gpio_num_t tx_pin;
    gpio_num_t rx_pin;
    uint32_t baud;
    uint32_t inverse_mask;
    uart_word_length_t data_bits;
    uart_parity_t parity;
    uart_stop_bits_t stop_bits;
    uart_sclk_t source_clk;
} modem_lte_uart_probe_cfg_t;

extern bool s_lte_initialized;
extern bool s_lte_connected;
extern bool s_connect_requested;
extern modem_lte_state_t s_state;
extern uint64_t s_next_action_ms;
extern uint64_t s_state_deadline_ms;
extern retry_state_t s_lte_backoff_retry;
extern uint32_t s_recover_attempts;
extern uint32_t s_at_sync_fail_count;
extern uint64_t s_cpin_diag_log_ms;
extern uint64_t s_cereg_diag_log_ms;
extern uint64_t s_rdy_diag_log_ms;
extern uint64_t s_at_sync_diag_log_ms;
extern int s_last_cereg_stat;
extern esp_err_t s_last_err;
extern bool s_rdy_urc_registered;
extern modem_lte_uart_probe_cfg_t s_active_uart_cfg;
extern const retry_policy_t s_lte_backoff_policy;
extern bool s_rdy_seen;
extern uint64_t s_last_hw_recover_ms;
extern uint32_t s_cpin_soft_retry_count;
extern char s_active_apn[TRACKER_HOST_MAX_LEN];

bool modem_lte_rdy_seen_in_cycle(void);
void modem_lte_clear_rdy_token(void);
void modem_lte_mark_rdy_seen(void);
void modem_lte_on_urc_rdy(const char *urc_line);
bool modem_lte_can_hw_recover(uint64_t now_ms);
void modem_lte_reset_at_sync_sweep(void);
const char *modem_lte_inverse_name(uint32_t inverse_mask);
const char *modem_lte_data_bits_name(uart_word_length_t data_bits);
const char *modem_lte_parity_name(uart_parity_t parity);
const char *modem_lte_stop_bits_name(uart_stop_bits_t stop_bits);
const char *modem_lte_source_clk_name(uart_sclk_t source_clk);
esp_err_t modem_lte_apply_at_sync_config(void);
void modem_lte_set_fixed_uart_cfg(void);
const char *modem_lte_state_name(modem_lte_state_t state);
void modem_lte_transition(modem_lte_state_t next_state, uint64_t now_ms, uint64_t delay_ms);
esp_err_t modem_lte_send_simple(const char *cmd, const char *expect, uint32_t timeout_ms);
bool modem_lte_diag_log_due(uint64_t now_ms, uint64_t *last_log_ms, uint64_t interval_ms);
void modem_lte_log_at_probe_response(const char *response);
void modem_lte_log_fixed_uart_cfg(void);
void modem_lte_force_dtr_wake_pulse(void);
bool modem_lte_try_resume_alive_modem(uint64_t now_ms);
void modem_lte_log_hw_lines_if_available(void);
bool modem_lte_parse_cereg(const char *response, int *out_n, int *out_stat);
const char *modem_lte_cereg_stat_name(int stat);
void modem_lte_log_registration_snapshot(void);
void modem_lte_enter_backoff(uint64_t now_ms, esp_err_t err, const char *reason);
void modem_lte_restart_wait_rdy(uint64_t now_ms, const char *reason);
void modem_lte_enter_recover_or_backoff(uint64_t now_ms, esp_err_t err, const char *reason);
