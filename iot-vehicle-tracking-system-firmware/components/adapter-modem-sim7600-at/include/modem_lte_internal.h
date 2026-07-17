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


/* Fallback APN used in AT+CGDCONT when the build config provides none. */
#ifndef CONFIG_TRACKER_MODEM_APN
#define CONFIG_TRACKER_MODEM_APN "internet"
#endif

/* ESP-IDF log tag shared by every split LTE module so log lines group together. */
#define MODEM_LTE_TAG "MODEM_LTE"
/* Settle time after asserting PWRKEY before the SIM7600 power rail/UART is reliable. */
#define MODEM_LTE_POWER_RAIL_SETTLE_MS 8000ULL
/* Delay after toggling DTR so the modem wakes before the next AT command. */
#define MODEM_LTE_WAKE_DTR_SETTLE_MS 50ULL
/* Width of the DTR wake pulse used to bring the modem out of low-power sleep. */
#define MODEM_LTE_DTR_WAKE_PULSE_MS 80ULL
/* Compile-time switch (0=off) for emitting the DTR wake pulse during bring-up. */
#define MODEM_LTE_ENABLE_DTR_WAKE_PULSE 0
/* Default timeout for short, fast-answering AT commands (ATE0, AT+CNMP, ...). */
#define MODEM_LTE_SHORT_CMD_TIMEOUT_MS 5000U
/* Tight timeout for the bare "AT" sync probe; the modem must echo OK quickly. */
#define MODEM_LTE_AT_SYNC_CMD_TIMEOUT_MS 1500U
/* Very short probe timeout used to detect an already-alive modem on warm boot. */
#define MODEM_LTE_BOOT_ALIVE_PROBE_TIMEOUT_MS 800U
/* PDP context activation (AT+CGACT) can take seconds while the network attaches. */
#define MODEM_LTE_PDP_ACT_TIMEOUT_MS 15000U
/* Poll cadence while waiting for AT readiness / RDY between FSM ticks. */
#define MODEM_LTE_AT_READY_POLL_MS 500ULL
/* Consecutive failed "AT" probes before escalating to hardware recovery. */
#define MODEM_LTE_AT_SYNC_RECOVER_THRESHOLD 3U
/* Overall budget to wait for the SIM to report +CPIN: READY. */
#define MODEM_LTE_CPIN_TIMEOUT_MS 30000ULL
/* Poll cadence while re-issuing AT+CPIN? until the SIM is ready. */
#define MODEM_LTE_CPIN_POLL_MS 1000ULL
/* Soft retries tolerated for the transient "SIM not inserted" CME error. */
#define MODEM_LTE_CPIN_SOFT_RETRY_LIMIT 3U
/* Minimum gap between two hardware recovery (reset) pulses to avoid thrashing. */
#define MODEM_LTE_RECOVER_COOLDOWN_MS 15000ULL
/* Budget to wait for the boot-time "RDY" URC before falling back to AT sync. */
#define MODEM_LTE_RDY_WAIT_TIMEOUT_MS 30000ULL
/* Max bytes drained per URC poll so a single tick cannot block on UART. */
#define MODEM_LTE_URC_POLL_MAX_BYTES 256U
/* Overall budget to reach network registration (CEREG stat 1 or 5). */
#define MODEM_LTE_CEREG_TIMEOUT_MS 60000ULL
/* Poll cadence while re-issuing AT+CEREG? during registration wait. */
#define MODEM_LTE_CEREG_POLL_MS 1000ULL
/* Throttle interval for repeated registration/diagnostic log lines. */
#define MODEM_LTE_REG_LOG_INTERVAL_MS 5000ULL
/* Base delay for the exponential connect backoff after a failed bring-up. */
#define MODEM_LTE_BACKOFF_BASE_MS 3000ULL
/* Ceiling for the exponential connect backoff delay. */
#define MODEM_LTE_BACKOFF_MAX_MS 60000ULL
/* Hardware recovery attempts allowed before giving up and entering backoff. */
#define MODEM_LTE_MAX_RECOVER_ATTEMPTS 2U
/* Backoff attempts that force a recovery even when no RDY was ever observed. */
#define MODEM_LTE_FORCE_RECOVER_NO_RDY_ATTEMPTS 3U
/* Fixed UART RX inversion mask applied during AT sync (board wiring dependent). */
#define MODEM_LTE_AT_SYNC_FIXED_INVERSE_MASK MODEM_UART_LINE_INVERSE_MASK

/**
 * @brief LTE bring-up state machine states, ordered as the connect flow advances.
 *
 * The FSM walks these states from power-on to a usable PDP/IP session. The
 * relative ordering matters: modem_lte_is_at_ready() treats CPIN_CHECK..PDP_IP_CHECK
 * as "AT usable" so GNSS can warm up in parallel with network registration.
 */
typedef enum {
    MODEM_LTE_STATE_IDLE = 0,          /**< No connect requested; FSM parked. */
    MODEM_LTE_STATE_POWER_ON_PULSE,    /**< Asserting PWRKEY / DTR to power the modem. */
    MODEM_LTE_STATE_WAIT_BOOT,         /**< Waiting for power rail + UART driver to settle. */
    MODEM_LTE_STATE_WAIT_RDY,          /**< Waiting for the boot-time "RDY" URC. */
    MODEM_LTE_STATE_AT_SYNC,           /**< Probing bare "AT" until the modem echoes OK. */
    MODEM_LTE_STATE_ATE0,              /**< Disabling command echo via ATE0. */
    MODEM_LTE_STATE_CPIN_CHECK,        /**< Polling AT+CPIN? until the SIM is READY. */
    MODEM_LTE_STATE_SET_NET_MODE,      /**< Selecting network mode via AT+CNMP. */
    MODEM_LTE_STATE_SET_PDP,           /**< Configuring the PDP profile via AT+CGDCONT. */
    MODEM_LTE_STATE_CEREG_WAIT,        /**< Polling AT+CEREG? until registered (stat 1/5). */
    MODEM_LTE_STATE_PDP_ACTIVATE,      /**< Activating the PDP context via AT+CGACT=1,1. */
    MODEM_LTE_STATE_PDP_IP_CHECK,      /**< Confirming an assigned IP via AT+CGPADDR. */
    MODEM_LTE_STATE_CONNECTED,         /**< PDP active, IP assigned; data path usable. */
    MODEM_LTE_STATE_RECOVER_RESET,     /**< Issuing a hardware reset pulse to recover. */
    MODEM_LTE_STATE_BACKOFF,           /**< Waiting out the exponential backoff delay. */
} modem_lte_state_t;

/**
 * @brief Snapshot of the UART line parameters used to talk to the modem.
 *
 * Captures everything needed to re-apply the transport after a reset so AT sync
 * always starts from a known, board-correct serial configuration.
 */
typedef struct {
    gpio_num_t tx_pin;          /**< ESP32 UART TX GPIO routed to the modem RX. */
    gpio_num_t rx_pin;          /**< ESP32 UART RX GPIO routed to the modem TX. */
    uint32_t baud;              /**< UART baud rate (bits per second). */
    uint32_t inverse_mask;      /**< OR mask of uart_signal_inv_t line-inversion flags. */
    uart_word_length_t data_bits; /**< Frame data bits (typically 8). */
    uart_parity_t parity;       /**< Frame parity mode (typically disabled). */
    uart_stop_bits_t stop_bits; /**< Frame stop bits (typically 1). */
    uart_sclk_t source_clk;     /**< UART peripheral source clock selector. */
} modem_lte_uart_probe_cfg_t;

/* --- Shared FSM state (defined in modem_lte.c, used across split modules) --- */
extern bool s_lte_initialized;              /* AT layer + PDP profile ready. */
extern bool s_lte_connected;                /* PDP context active with IP. */
extern bool s_connect_requested;            /* Caller asked the FSM to connect. */
extern modem_lte_state_t s_state;           /* Current FSM state. */
extern uint64_t s_next_action_ms;           /* Earliest uptime the FSM may act again. */
extern uint64_t s_state_deadline_ms;        /* Hard deadline for the current waiting state. */
extern retry_state_t s_lte_backoff_retry;   /* Exponential backoff bookkeeping. */
extern uint32_t s_recover_attempts;         /* Hardware recovery attempts this cycle. */
extern uint32_t s_at_sync_fail_count;       /* Consecutive failed "AT" probes. */
extern uint64_t s_cpin_diag_log_ms;         /* Throttle timestamp for CPIN logs. */
extern uint64_t s_cereg_diag_log_ms;        /* Throttle timestamp for CEREG logs. */
extern uint64_t s_rdy_diag_log_ms;          /* Throttle timestamp for RDY-wait logs. */
extern uint64_t s_at_sync_diag_log_ms;      /* Throttle timestamp for AT-sync logs. */
extern int s_last_cereg_stat;               /* Last seen CEREG stat (-1 = none). */
extern esp_err_t s_last_err;                /* Last error that drove backoff/recovery. */
extern bool s_rdy_urc_registered;           /* RDY URC handler already registered. */
extern modem_lte_uart_probe_cfg_t s_active_uart_cfg; /* Active UART line profile. */
extern const retry_policy_t s_lte_backoff_policy;    /* Backoff timing policy. */
extern bool s_rdy_seen;                     /* RDY token observed in this connect cycle. */
extern uint64_t s_last_hw_recover_ms;       /* Uptime of last hardware recovery pulse. */
extern uint32_t s_cpin_soft_retry_count;    /* Soft retries used for "SIM not inserted". */
extern char s_active_apn[TRACKER_HOST_MAX_LEN]; /* APN string written into AT+CGDCONT. */

/* --- RDY token helpers (set by URC handler, consumed by the FSM) --- */
bool modem_lte_rdy_seen_in_cycle(void);   /* True once "RDY" was seen this cycle. */
void modem_lte_clear_rdy_token(void);     /* Reset the RDY-seen flag for a new cycle. */
void modem_lte_mark_rdy_seen(void);       /* Mark that the modem emitted "RDY". */
void modem_lte_on_urc_rdy(const char *urc_line); /* URC callback matching the "RDY" prefix. */
/* --- Recovery / UART-profile / diagnostics helpers (split across modules) --- */
bool modem_lte_can_hw_recover(uint64_t now_ms);  /* Recovery allowed (RDY/cooldown gates). */
void modem_lte_reset_at_sync_sweep(void);        /* Reset the consecutive AT-fail counter. */
const char *modem_lte_inverse_name(uint32_t inverse_mask);     /* "ON"/"OFF" for logs. */
const char *modem_lte_data_bits_name(uart_word_length_t data_bits); /* "5".."8" for logs. */
const char *modem_lte_parity_name(uart_parity_t parity);       /* "N"/"E"/"O" for logs. */
const char *modem_lte_stop_bits_name(uart_stop_bits_t stop_bits); /* "1"/"1.5"/"2" for logs. */
const char *modem_lte_source_clk_name(uart_sclk_t source_clk); /* Clock name for logs. */
esp_err_t modem_lte_apply_at_sync_config(void);  /* Push s_active_uart_cfg to the UART. */
void modem_lte_set_fixed_uart_cfg(void);         /* Reset s_active_uart_cfg to defaults. */
const char *modem_lte_state_name(modem_lte_state_t state); /* FSM state name for logs. */
void modem_lte_transition(modem_lte_state_t next_state, uint64_t now_ms, uint64_t delay_ms); /* Move FSM + schedule next action. */
esp_err_t modem_lte_send_simple(const char *cmd, const char *expect, uint32_t timeout_ms); /* Send AT + assert expect token. */
bool modem_lte_diag_log_due(uint64_t now_ms, uint64_t *last_log_ms, uint64_t interval_ms); /* Log throttle gate. */
void modem_lte_log_at_probe_response(const char *response); /* Log partial AT probe reply. */
void modem_lte_log_fixed_uart_cfg(void);         /* Log the active UART profile. */
void modem_lte_force_dtr_wake_pulse(void);       /* Pulse DTR to wake the modem (if enabled). */
bool modem_lte_try_resume_alive_modem(uint64_t now_ms); /* Fast-path skip if modem already alive. */
void modem_lte_log_hw_lines_if_available(void);  /* Log STATUS/NET-LIGHT GPIO levels. */
bool modem_lte_parse_cereg(const char *response, int *out_n, int *out_stat); /* Parse +CEREG: n,stat. */
const char *modem_lte_cereg_stat_name(int stat); /* Human-readable CEREG stat. */
void modem_lte_log_registration_snapshot(void);  /* Dump CPIN/CEREG/CSQ/COPS on failure. */
void modem_lte_enter_backoff(uint64_t now_ms, esp_err_t err, const char *reason); /* Schedule backoff. */
void modem_lte_restart_wait_rdy(uint64_t now_ms, const char *reason); /* Restart bring-up at WAIT_RDY. */
void modem_lte_enter_recover_or_backoff(uint64_t now_ms, esp_err_t err, const char *reason); /* Recover if allowed, else backoff. */
