#include "modem_lte.h"

#include <ctype.h>
#include <stdio.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "sdkconfig.h"

#include "esp_log.h"

#include "modem_at.h"
#include "pin_map.h"
#include "power_mgr.h"
#include "retry_manager.h"
#include "util.h"

/**
 * @file modem_lte.c
 * @brief LTE modem initialization, network registration, and PDP data session flow.
 */

#ifndef CONFIG_TRACKER_MODEM_APN
#define CONFIG_TRACKER_MODEM_APN "internet"
#endif

static const char *TAG = "MODEM_LTE";

#define MODEM_LTE_POWER_RAIL_SETTLE_MS 8000ULL
#define MODEM_LTE_WAKE_DTR_SETTLE_MS 50ULL
#define MODEM_LTE_DTR_WAKE_PULSE_MS 80ULL
#define MODEM_LTE_ENABLE_DTR_WAKE_PULSE 0
#define MODEM_LTE_SHORT_CMD_TIMEOUT_MS 5000U
#define MODEM_LTE_AT_SYNC_CMD_TIMEOUT_MS 1500U
#define MODEM_LTE_PDP_ACT_TIMEOUT_MS 15000U
#define MODEM_LTE_AT_READY_POLL_MS 500ULL
#define MODEM_LTE_AT_SYNC_RECOVER_THRESHOLD 3U
#define MODEM_LTE_CPIN_TIMEOUT_MS 30000ULL
#define MODEM_LTE_CPIN_POLL_MS 1000ULL
#define MODEM_LTE_CEREG_TIMEOUT_MS 60000ULL
#define MODEM_LTE_CEREG_POLL_MS 1000ULL
#define MODEM_LTE_REG_LOG_INTERVAL_MS 5000ULL
#define MODEM_LTE_BACKOFF_BASE_MS 3000ULL
#define MODEM_LTE_BACKOFF_MAX_MS 60000ULL
#define MODEM_LTE_MAX_RECOVER_ATTEMPTS 2U
#define MODEM_LTE_AT_SYNC_FIXED_INVERSE_MASK MODEM_UART_LINE_INVERSE_MASK

typedef enum {
    MODEM_LTE_STATE_IDLE = 0,
    MODEM_LTE_STATE_POWER_ON_PULSE,
    MODEM_LTE_STATE_WAIT_BOOT,
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

/* True after static modem setup is complete. */
static bool s_lte_initialized = false;
/* True when PDP context is active. */
static bool s_lte_connected = false;
/* One-shot guard: issue one startup PWRKEY fallback after AT retry threshold. */
static bool s_initial_power_pulse_attempted = false;
/* One-shot guard: issue one startup RESET fallback before PWRKEY pulse. */
static bool s_initial_reset_pulse_attempted = false;
/* When true, next recover pass uses a full PWRKEY cycle before AT sync retry. */
static bool s_force_power_cycle_recover = false;
static bool s_connect_requested = false;
static modem_lte_state_t s_state = MODEM_LTE_STATE_IDLE;
static uint64_t s_next_action_ms = 0;
static uint64_t s_state_deadline_ms = 0;
static retry_state_t s_lte_backoff_retry = {0};
static uint32_t s_recover_attempts = 0;
static uint32_t s_at_sync_fail_count = 0;
static uint64_t s_cpin_diag_log_ms = 0;
static uint64_t s_cereg_diag_log_ms = 0;
static int s_last_cereg_stat = -1;
static esp_err_t s_last_err = ESP_OK;

static const retry_policy_t s_lte_backoff_policy = {
    .mode = RETRY_MODE_EXPONENTIAL,
    .base_delay_ms = (uint32_t)MODEM_LTE_BACKOFF_BASE_MS,
    .max_delay_ms = (uint32_t)MODEM_LTE_BACKOFF_MAX_MS,
    .max_attempts = 0,
    .jitter_ms = 0,
};

static void modem_lte_reset_at_sync_sweep(void) {
    s_at_sync_fail_count = 0;
}

static esp_err_t modem_lte_apply_at_sync_config(void) {
    esp_err_t pin_err = modem_at_set_pins(PIN_MODEM_TX, PIN_MODEM_RX);
    if (pin_err != ESP_OK) {
        return pin_err;
    }

    esp_err_t inverse_err = modem_at_set_line_inverse(MODEM_LTE_AT_SYNC_FIXED_INVERSE_MASK);
    if (inverse_err != ESP_OK) {
        return inverse_err;
    }

    return modem_at_set_baud(MODEM_UART_BAUD);
}

static const char *modem_lte_state_name(modem_lte_state_t state) {
    switch (state) {
        case MODEM_LTE_STATE_IDLE:
            return "IDLE";
        case MODEM_LTE_STATE_POWER_ON_PULSE:
            return "POWER_ON_PULSE";
        case MODEM_LTE_STATE_WAIT_BOOT:
            return "WAIT_BOOT";
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

static void modem_lte_transition(modem_lte_state_t next_state, uint64_t now_ms, uint64_t delay_ms) {
    if (s_state != next_state) {
        ESP_LOGI(TAG, "FSM %s -> %s", modem_lte_state_name(s_state), modem_lte_state_name(next_state));
    }
    s_state = next_state;
    s_next_action_ms = now_ms + delay_ms;
}

/**
 * @brief Send AT command and check expected token.
 */
static esp_err_t modem_lte_send_simple(const char *cmd, const char *expect, uint32_t timeout_ms) {
    return modem_at_send_expect(cmd, expect, timeout_ms);
}

/**
 * @brief Sanitize AT response for compact logs.
 */
static void modem_lte_response_preview(const char *response, char *preview, size_t preview_size) {
    if (preview == NULL || preview_size == 0U) {
        return;
    }
    preview[0] = '\0';
    if (response == NULL) {
        return;
    }

    size_t src_len = strnlen(response, 255);
    size_t copy_len = src_len < (preview_size - 1U) ? src_len : (preview_size - 1U);
    for (size_t i = 0; i < copy_len; ++i) {
        unsigned char ch = (unsigned char)response[i];
        preview[i] = isprint((int)ch) ? (char)ch : '.';
    }
    preview[copy_len] = '\0';
}

/**
 * @brief Interval gate for periodic diagnostic logs.
 */
static bool modem_lte_diag_log_due(uint64_t now_ms, uint64_t *last_log_ms, uint64_t interval_ms) {
    if (last_log_ms == NULL) {
        return true;
    }
    if (*last_log_ms == 0 || (now_ms - *last_log_ms) >= interval_ms) {
        *last_log_ms = now_ms;
        return true;
    }
    return false;
}

/**
 * @brief Log AT probe payload when modem sends bytes but does not return terminal OK.
 *
 * @param response Raw response buffer from AT transport.
 */
static void modem_lte_log_at_probe_response(const char *response) {
    if (response == NULL || response[0] == '\0') {
        return;
    }

    char preview[81] = {0};
    size_t src_len = strnlen(response, 255);
    modem_lte_response_preview(response, preview, sizeof(preview));

    ESP_LOGW(TAG, "AT probe partial-response len=%u preview=\"%s\"", (unsigned)src_len, preview);
}

/**
 * @brief Toggle DTR to force wake sequence then leave modem-side DTR LOW.
 *
 * Many SIM7600 sleep profiles wake on DTR edge/level. This sequence is cheap and safe to
 * retry before declaring AT path dead.
 */
static void modem_lte_force_dtr_wake_pulse(void) {
#if !MODEM_LTE_ENABLE_DTR_WAKE_PULSE
    return;
#else
    esp_err_t dtr_err = modem_set_dtr(true);
    if (dtr_err != ESP_OK && dtr_err != ESP_ERR_NOT_SUPPORTED) {
        ESP_LOGW(TAG, "Set DTR high failed: %s", esp_err_to_name(dtr_err));
    }

    vTaskDelay(pdMS_TO_TICKS((uint32_t)MODEM_LTE_DTR_WAKE_PULSE_MS));

    dtr_err = modem_set_dtr(false);
    if (dtr_err != ESP_OK && dtr_err != ESP_ERR_NOT_SUPPORTED) {
        ESP_LOGW(TAG, "Set DTR low failed: %s", esp_err_to_name(dtr_err));
    }

    vTaskDelay(pdMS_TO_TICKS((uint32_t)MODEM_LTE_DTR_WAKE_PULSE_MS));
#endif
}

/**
 * @brief Log modem STATUS/NET-LIGHT lines when mapping exists.
 */
static void modem_lte_log_hw_lines_if_available(void) {
    bool level = false;

    esp_err_t status_err = modem_read_status(&level);
    if (status_err == ESP_OK) {
        ESP_LOGI(TAG, "SIM7600 STATUS=%d", level ? 1 : 0);
    } else if (status_err == ESP_ERR_NOT_SUPPORTED) {
        ESP_LOGI(TAG, "SIM7600 STATUS unsupported (GPIO_NUM_NC)");
    } else {
        ESP_LOGW(TAG, "Read STATUS failed: %s", esp_err_to_name(status_err));
    }

    esp_err_t netlight_err = modem_read_netlight(&level);
    if (netlight_err == ESP_OK) {
        ESP_LOGI(TAG, "SIM7600 NET-LIGHT=%d", level ? 1 : 0);
    } else if (netlight_err == ESP_ERR_NOT_SUPPORTED) {
        ESP_LOGI(TAG, "SIM7600 NET-LIGHT unsupported (GPIO_NUM_NC)");
    } else {
        ESP_LOGW(TAG, "Read NET-LIGHT failed: %s", esp_err_to_name(netlight_err));
    }
}

/**
 * @brief Parse `+CEREG` response values.
 */
static bool modem_lte_parse_cereg(const char *response, int *out_n, int *out_stat) {
    if (response == NULL) {
        return false;
    }

    const char *marker = strstr(response, "+CEREG:");
    if (marker == NULL) {
        return false;
    }

    int n = 0;
    int stat = 0;
    if (sscanf(marker, "+CEREG: %d,%d", &n, &stat) != 2) {
        return false;
    }

    if (out_n != NULL) {
        *out_n = n;
    }
    if (out_stat != NULL) {
        *out_stat = stat;
    }
    return true;
}

/**
 * @brief Convert CEREG stat to readable state text.
 */
static const char *modem_lte_cereg_stat_name(int stat) {
    switch (stat) {
        case 0:
            return "not_registered_not_searching";
        case 1:
            return "registered_home";
        case 2:
            return "searching";
        case 3:
            return "registration_denied";
        case 4:
            return "unknown";
        case 5:
            return "registered_roaming";
        default:
            return "unhandled";
    }
}

/**
 * @brief Log one-shot radio/SIM diagnostics when registration times out.
 */
static void modem_lte_log_registration_snapshot(void) {
    static const struct {
        const char *cmd;
        const char *label;
    } k_diag_cmds[] = {
        {"AT+CPIN?\r", "CPIN"},
        {"AT+CEREG?\r", "CEREG"},
        {"AT+CSQ\r", "CSQ"},
        {"AT+COPS?\r", "COPS"},
    };

    for (size_t i = 0; i < (sizeof(k_diag_cmds) / sizeof(k_diag_cmds[0])); ++i) {
        char response[256] = {0};
        esp_err_t err = modem_at_send(k_diag_cmds[i].cmd,
                                      response,
                                      sizeof(response),
                                      MODEM_LTE_SHORT_CMD_TIMEOUT_MS);
        if (err != ESP_OK) {
            ESP_LOGW(TAG, "diag %s failed: %s", k_diag_cmds[i].label, esp_err_to_name(err));
            continue;
        }

        char preview[97] = {0};
        modem_lte_response_preview(response, preview, sizeof(preview));
        ESP_LOGW(TAG, "diag %s response=\"%s\"", k_diag_cmds[i].label, preview);
    }
}

static void modem_lte_enter_backoff(uint64_t now_ms, esp_err_t err, const char *reason) {
    uint32_t delay_ms = retry_state_current_delay_ms(&s_lte_backoff_retry,
                                                     &s_lte_backoff_policy,
                                                     now_ms);
    s_last_err = err;
    (void)retry_state_schedule(&s_lte_backoff_retry,
                               &s_lte_backoff_policy,
                               now_ms,
                               err);
    s_recover_attempts = 0;
    s_lte_initialized = false;
    s_lte_connected = false;
    s_initial_power_pulse_attempted = false;
    s_initial_reset_pulse_attempted = false;
    s_force_power_cycle_recover = false;
    s_cpin_diag_log_ms = 0;
    s_cereg_diag_log_ms = 0;
    s_last_cereg_stat = -1;
    modem_lte_reset_at_sync_sweep();
    (void)modem_lte_apply_at_sync_config();

    ESP_LOGE(TAG,
             "retry step=%s err=%s attempt=%lu next_delay_ms=%lu",
             reason,
             esp_err_to_name(err),
             (unsigned long)s_lte_backoff_retry.attempts,
             (unsigned long)delay_ms);

    modem_lte_transition(MODEM_LTE_STATE_BACKOFF, now_ms, delay_ms);
}

static void modem_lte_enter_recover_or_backoff(uint64_t now_ms, esp_err_t err, const char *reason) {
    if (s_recover_attempts >= MODEM_LTE_MAX_RECOVER_ATTEMPTS) {
        modem_lte_enter_backoff(now_ms, err, reason);
        return;
    }

    s_last_err = err;
    s_recover_attempts += 1;
    s_lte_initialized = false;
    s_lte_connected = false;
    s_initial_power_pulse_attempted = false;
    s_initial_reset_pulse_attempted = false;
    s_force_power_cycle_recover = false;
    s_cpin_diag_log_ms = 0;
    s_cereg_diag_log_ms = 0;
    s_last_cereg_stat = -1;
    modem_lte_reset_at_sync_sweep();
    (void)modem_lte_apply_at_sync_config();
    ESP_LOGW(TAG,
             "%s failed: %s, recover reset (%lu/%u)",
             reason,
             esp_err_to_name(err),
             (unsigned long)s_recover_attempts,
             (unsigned)MODEM_LTE_MAX_RECOVER_ATTEMPTS);
    modem_lte_transition(MODEM_LTE_STATE_RECOVER_RESET, now_ms, 0);
}

void modem_lte_request_connect(void) {
    s_connect_requested = true;

    if (s_lte_connected && s_state == MODEM_LTE_STATE_CONNECTED) {
        return;
    }

    if (s_state == MODEM_LTE_STATE_IDLE) {
        uint64_t now_ms = util_uptime_ms();
        s_lte_initialized = false;
        s_lte_connected = false;
        s_initial_power_pulse_attempted = false;
        s_initial_reset_pulse_attempted = false;
        s_force_power_cycle_recover = false;
        s_cpin_diag_log_ms = 0;
        s_cereg_diag_log_ms = 0;
        s_last_cereg_stat = -1;
        s_state_deadline_ms = 0;
        modem_lte_reset_at_sync_sweep();
        if (!retry_state_can_run(&s_lte_backoff_retry, now_ms)) {
            return;
        }
        modem_lte_transition(MODEM_LTE_STATE_POWER_ON_PULSE, now_ms, 0);
    }
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
            if (!retry_state_can_run(&s_lte_backoff_retry, now_ms)) {
                return ESP_ERR_NOT_FINISHED;
            }
            modem_lte_transition(MODEM_LTE_STATE_POWER_ON_PULSE, now_ms, 0);
            return ESP_ERR_NOT_FINISHED;

        case MODEM_LTE_STATE_POWER_ON_PULSE: {
            esp_err_t dtr_err = modem_set_dtr(false);
            if (dtr_err != ESP_OK && dtr_err != ESP_ERR_NOT_SUPPORTED) {
                ESP_LOGW(TAG, "Set DTR wake failed: %s", esp_err_to_name(dtr_err));
            }
            modem_lte_force_dtr_wake_pulse();

            esp_err_t err = modem_power_on();
            if (err != ESP_OK) {
                modem_lte_enter_backoff(now_ms, err, "modem_power_on");
                return ESP_ERR_NOT_FINISHED;
            }

            modem_lte_transition(MODEM_LTE_STATE_WAIT_BOOT, now_ms, MODEM_LTE_POWER_RAIL_SETTLE_MS);
            return ESP_ERR_NOT_FINISHED;
        }

        case MODEM_LTE_STATE_WAIT_BOOT: {
            esp_err_t err = modem_at_init();
            if (err != ESP_OK) {
                modem_lte_enter_backoff(now_ms, err, "modem_at_init");
                return ESP_ERR_NOT_FINISHED;
            }

            modem_lte_reset_at_sync_sweep();
            esp_err_t setup_err = modem_lte_apply_at_sync_config();
            if (setup_err != ESP_OK) {
                modem_lte_enter_backoff(now_ms, setup_err, "AT setup");
                return ESP_ERR_NOT_FINISHED;
            }
            modem_lte_transition(MODEM_LTE_STATE_AT_SYNC, now_ms, MODEM_LTE_WAKE_DTR_SETTLE_MS);
            return ESP_ERR_NOT_FINISHED;
        }

        case MODEM_LTE_STATE_AT_SYNC: {
            const gpio_num_t active_tx = PIN_MODEM_TX;
            const gpio_num_t active_rx = PIN_MODEM_RX;
            const uint32_t active_baud = MODEM_UART_BAUD;
            const char *probe_cmd = "AT\r";
            char response[256] = {0};
            esp_err_t err = modem_at_send(probe_cmd,
                                          response,
                                          sizeof(response),
                                          MODEM_LTE_AT_SYNC_CMD_TIMEOUT_MS);
            if (err == ESP_OK && strstr(response, "OK") != NULL) {
                s_at_sync_fail_count = 0;
                s_initial_power_pulse_attempted = false;
                s_initial_reset_pulse_attempted = false;
                s_force_power_cycle_recover = false;
                ESP_LOGI(TAG,
                         "AT sync ready tx=%d rx=%d baud=%lu invert=%s",
                         (int)active_tx,
                         (int)active_rx,
                         (unsigned long)active_baud,
                         "NONE");
                modem_lte_transition(MODEM_LTE_STATE_ATE0, now_ms, 0);
                return ESP_ERR_NOT_FINISHED;
            }

            modem_lte_log_at_probe_response(response);

            s_at_sync_fail_count += 1U;
            if (s_at_sync_fail_count == 1U) {
                modem_lte_force_dtr_wake_pulse();
            }

            if (s_at_sync_fail_count >= MODEM_LTE_AT_SYNC_RECOVER_THRESHOLD) {
                s_at_sync_fail_count = 0;
                if (!s_initial_reset_pulse_attempted) {
                    s_initial_reset_pulse_attempted = true;
                    ESP_LOGW(TAG,
                             "AT sync fallback: no response on fixed UART config, issuing RESET pulse");
                    esp_err_t reset_err = modem_reset_pulse();
                    if (reset_err == ESP_OK) {
                        modem_lte_transition(MODEM_LTE_STATE_WAIT_BOOT, now_ms, MODEM_LTE_POWER_RAIL_SETTLE_MS);
                        return ESP_ERR_NOT_FINISHED;
                    }
                    if (reset_err != ESP_ERR_NOT_SUPPORTED) {
                        modem_lte_enter_backoff(now_ms, reset_err, "startup fallback reset");
                        return ESP_ERR_NOT_FINISHED;
                    }
                    ESP_LOGW(TAG, "Startup fallback RESET unsupported, continuing to PWRKEY fallback");
                }

                if (!s_initial_power_pulse_attempted) {
                    s_initial_power_pulse_attempted = true;
                    ESP_LOGW(TAG,
                             "AT sync fallback: no response on fixed UART config, issuing PWRKEY pulse");
                    esp_err_t power_on_err = modem_power_on();
                    if (power_on_err != ESP_OK) {
                        modem_lte_enter_backoff(now_ms, power_on_err, "startup fallback power_on");
                        return ESP_ERR_NOT_FINISHED;
                    }
                    modem_lte_transition(MODEM_LTE_STATE_WAIT_BOOT, now_ms, MODEM_LTE_POWER_RAIL_SETTLE_MS);
                    return ESP_ERR_NOT_FINISHED;
                }

                ESP_LOGW(TAG,
                         "AT sync no response on fixed UART config after reset/pwrkey fallbacks, forcing power-cycle recover (tx=%d rx=%d baud=%lu invert=%s)",
                         (int)active_tx,
                         (int)active_rx,
                         (unsigned long)active_baud,
                         "NONE");
                s_force_power_cycle_recover = true;
                modem_lte_transition(MODEM_LTE_STATE_RECOVER_RESET, now_ms, 0);
                return ESP_ERR_NOT_FINISHED;
            }

            ESP_LOGW(TAG,
                     "AT not ready (%s, cmd=AT, tx=%d rx=%d, baud=%lu invert=%s), retry in %llums",
                     err == ESP_OK ? "unexpected_response" : esp_err_to_name(err),
                     (int)active_tx,
                     (int)active_rx,
                     (unsigned long)active_baud,
                     "NONE",
                     (unsigned long long)MODEM_LTE_AT_READY_POLL_MS);
            modem_lte_transition(MODEM_LTE_STATE_AT_SYNC, now_ms, MODEM_LTE_AT_READY_POLL_MS);
            return ESP_ERR_NOT_FINISHED;
        }

        case MODEM_LTE_STATE_ATE0: {
            esp_err_t err = modem_lte_send_simple("ATE0\r", "OK", MODEM_LTE_SHORT_CMD_TIMEOUT_MS);
            if (err != ESP_OK) {
                modem_lte_enter_recover_or_backoff(now_ms, err, "ATE0");
                return ESP_ERR_NOT_FINISHED;
            }

            s_cpin_diag_log_ms = 0;
            s_state_deadline_ms = now_ms + MODEM_LTE_CPIN_TIMEOUT_MS;
            modem_lte_transition(MODEM_LTE_STATE_CPIN_CHECK, now_ms, 0);
            return ESP_ERR_NOT_FINISHED;
        }

        case MODEM_LTE_STATE_CPIN_CHECK: {
            char response[256] = {0};
            esp_err_t err = modem_at_send("AT+CPIN?\r", response, sizeof(response), MODEM_LTE_SHORT_CMD_TIMEOUT_MS);
            bool cpin_ready = (err == ESP_OK) && (strstr(response, "+CPIN: READY") != NULL);
            if (cpin_ready) {
                s_cereg_diag_log_ms = 0;
                s_last_cereg_stat = -1;
                modem_lte_transition(MODEM_LTE_STATE_SET_NET_MODE, now_ms, 0);
                return ESP_ERR_NOT_FINISHED;
            }

            if (modem_lte_diag_log_due(now_ms, &s_cpin_diag_log_ms, MODEM_LTE_REG_LOG_INTERVAL_MS)) {
                if (err != ESP_OK) {
                    ESP_LOGW(TAG, "CPIN wait: AT+CPIN? failed: %s", esp_err_to_name(err));
                } else {
                    char preview[97] = {0};
                    modem_lte_response_preview(response, preview, sizeof(preview));
                    ESP_LOGI(TAG, "CPIN wait response=\"%s\"", preview);
                }
            }

            if (now_ms >= s_state_deadline_ms) {
                modem_lte_log_registration_snapshot();
                modem_lte_enter_recover_or_backoff(now_ms, err, "CPIN timeout");
                return ESP_ERR_NOT_FINISHED;
            }

            modem_lte_transition(MODEM_LTE_STATE_CPIN_CHECK, now_ms, MODEM_LTE_CPIN_POLL_MS);
            return ESP_ERR_NOT_FINISHED;
        }

        case MODEM_LTE_STATE_SET_NET_MODE: {
            esp_err_t err = modem_lte_send_simple("AT+CNMP=2\r", "OK", MODEM_LTE_SHORT_CMD_TIMEOUT_MS);
            if (err != ESP_OK) {
                modem_lte_enter_recover_or_backoff(now_ms, err, "AT+CNMP=2");
                return ESP_ERR_NOT_FINISHED;
            }

            modem_lte_transition(MODEM_LTE_STATE_SET_PDP, now_ms, 0);
            return ESP_ERR_NOT_FINISHED;
        }

        case MODEM_LTE_STATE_SET_PDP: {
            char pdp_cmd[96] = {0};
            snprintf(pdp_cmd, sizeof(pdp_cmd), "AT+CGDCONT=1,\"IP\",\"%s\"\r", CONFIG_TRACKER_MODEM_APN);
            esp_err_t err = modem_lte_send_simple(pdp_cmd, "OK", MODEM_LTE_SHORT_CMD_TIMEOUT_MS);
            if (err != ESP_OK) {
                modem_lte_enter_recover_or_backoff(now_ms, err, "AT+CGDCONT");
                return ESP_ERR_NOT_FINISHED;
            }

            modem_lte_log_hw_lines_if_available();
            s_lte_initialized = true;
            s_cereg_diag_log_ms = 0;
            s_last_cereg_stat = -1;
            s_state_deadline_ms = now_ms + MODEM_LTE_CEREG_TIMEOUT_MS;
            modem_lte_transition(MODEM_LTE_STATE_CEREG_WAIT, now_ms, 0);
            return ESP_ERR_NOT_FINISHED;
        }

        case MODEM_LTE_STATE_CEREG_WAIT: {
            char response[256] = {0};
            esp_err_t err = modem_at_send("AT+CEREG?\r", response, sizeof(response), MODEM_LTE_SHORT_CMD_TIMEOUT_MS);
            if (err == ESP_OK) {
                int n = 0;
                int stat = -1;
                if (modem_lte_parse_cereg(response, &n, &stat)) {
                    bool is_registered = stat == 1 || stat == 5;
                    bool should_log = (stat != s_last_cereg_stat);
                    if (modem_lte_diag_log_due(now_ms,
                                               &s_cereg_diag_log_ms,
                                               MODEM_LTE_REG_LOG_INTERVAL_MS)) {
                        should_log = true;
                    }
                    if (should_log) {
                        ESP_LOGI(TAG,
                                 "CEREG n=%d stat=%d (%s)%s",
                                 n,
                                 stat,
                                 modem_lte_cereg_stat_name(stat),
                                 is_registered ? " [registered]" : "");
                        s_cereg_diag_log_ms = now_ms;
                    }
                    s_last_cereg_stat = stat;

                    if (is_registered) {
                        modem_lte_transition(MODEM_LTE_STATE_PDP_ACTIVATE, now_ms, 0);
                        return ESP_ERR_NOT_FINISHED;
                    }
                } else if (modem_lte_diag_log_due(now_ms,
                                                  &s_cereg_diag_log_ms,
                                                  MODEM_LTE_REG_LOG_INTERVAL_MS)) {
                    char preview[97] = {0};
                    modem_lte_response_preview(response, preview, sizeof(preview));
                    ESP_LOGW(TAG, "CEREG wait: parse-miss response=\"%s\"", preview);
                }
            } else if (modem_lte_diag_log_due(now_ms,
                                              &s_cereg_diag_log_ms,
                                              MODEM_LTE_REG_LOG_INTERVAL_MS)) {
                ESP_LOGW(TAG, "CEREG wait: AT+CEREG? failed: %s", esp_err_to_name(err));
            }

            if (now_ms >= s_state_deadline_ms) {
                modem_lte_log_registration_snapshot();
                modem_lte_enter_recover_or_backoff(now_ms,
                                                   err == ESP_OK ? ESP_ERR_TIMEOUT : err,
                                                   "CEREG timeout");
                return ESP_ERR_NOT_FINISHED;
            }

            modem_lte_transition(MODEM_LTE_STATE_CEREG_WAIT, now_ms, MODEM_LTE_CEREG_POLL_MS);
            return ESP_ERR_NOT_FINISHED;
        }

        case MODEM_LTE_STATE_PDP_ACTIVATE: {
            esp_err_t err = modem_lte_send_simple("AT+CGACT=1,1\r", "OK", MODEM_LTE_PDP_ACT_TIMEOUT_MS);
            if (err != ESP_OK) {
                modem_lte_enter_recover_or_backoff(now_ms, err, "AT+CGACT=1,1");
                return ESP_ERR_NOT_FINISHED;
            }

            modem_lte_transition(MODEM_LTE_STATE_PDP_IP_CHECK, now_ms, 0);
            return ESP_ERR_NOT_FINISHED;
        }

        case MODEM_LTE_STATE_PDP_IP_CHECK: {
            esp_err_t err = modem_lte_send_simple("AT+CGPADDR=1\r", "+CGPADDR:", MODEM_LTE_SHORT_CMD_TIMEOUT_MS);
            if (err != ESP_OK) {
                modem_lte_enter_recover_or_backoff(now_ms, err, "AT+CGPADDR=1");
                return ESP_ERR_NOT_FINISHED;
            }

            s_lte_connected = true;
            s_connect_requested = false;
            retry_state_reset(&s_lte_backoff_retry);
            s_recover_attempts = 0;
            s_initial_power_pulse_attempted = false;
            s_initial_reset_pulse_attempted = false;
            s_force_power_cycle_recover = false;
            s_cpin_diag_log_ms = 0;
            s_cereg_diag_log_ms = 0;
            s_last_cereg_stat = -1;
            modem_lte_reset_at_sync_sweep();
            (void)modem_lte_apply_at_sync_config();
            s_last_err = ESP_OK;
            modem_lte_transition(MODEM_LTE_STATE_CONNECTED, now_ms, 0);
            ESP_LOGI(TAG, "LTE connected and PDP active");
            return ESP_OK;
        }

        case MODEM_LTE_STATE_RECOVER_RESET: {
            if (s_force_power_cycle_recover) {
                s_force_power_cycle_recover = false;
                ESP_LOGW(TAG, "Recover path: forcing modem power-cycle via PWRKEY");

                // esp_err_t power_off_err = modem_power_off();
                // if (power_off_err != ESP_OK) {
                //     modem_lte_enter_backoff(now_ms, power_off_err, "recover power_off");
                //     return ESP_ERR_NOT_FINISHED;
                // }

                esp_err_t power_on_err = modem_power_on();
                if (power_on_err != ESP_OK) {
                    modem_lte_enter_backoff(now_ms, power_on_err, "recover power_on");
                    return ESP_ERR_NOT_FINISHED;
                }

                modem_lte_transition(MODEM_LTE_STATE_WAIT_BOOT, now_ms, MODEM_LTE_POWER_RAIL_SETTLE_MS);
                return ESP_ERR_NOT_FINISHED;
            }

            esp_err_t reset_err = modem_reset_pulse();
            if (reset_err == ESP_ERR_NOT_SUPPORTED) {
                ESP_LOGW(TAG, "RESET pin unavailable, retrying startup with PWRKEY pulse");
                reset_err = modem_power_on();
            }

            if (reset_err != ESP_OK) {
                modem_lte_enter_backoff(now_ms, reset_err, "recover reset");
                return ESP_ERR_NOT_FINISHED;
            }

            modem_lte_transition(MODEM_LTE_STATE_WAIT_BOOT, now_ms, MODEM_LTE_POWER_RAIL_SETTLE_MS);
            return ESP_ERR_NOT_FINISHED;
        }

        case MODEM_LTE_STATE_BACKOFF:
            modem_lte_transition(MODEM_LTE_STATE_POWER_ON_PULSE, now_ms, 0);
            return ESP_ERR_NOT_FINISHED;

        case MODEM_LTE_STATE_CONNECTED:
            return s_lte_connected ? ESP_OK : ESP_ERR_NOT_FINISHED;

        default:
            modem_lte_enter_backoff(now_ms, ESP_FAIL, "invalid_state");
            return ESP_ERR_NOT_FINISHED;
    }
}

esp_err_t modem_lte_init(void) {
    if (s_lte_initialized) {
        return ESP_OK;
    }

    modem_lte_request_connect();
    esp_err_t err = modem_lte_tick(util_uptime_ms());
    if (err == ESP_OK || s_lte_initialized) {
        return ESP_OK;
    }

    return err;
}

esp_err_t modem_lte_connect(void) {
    if (s_lte_connected) {
        return ESP_OK;
    }

    modem_lte_request_connect();
    return modem_lte_tick(util_uptime_ms());
}

esp_err_t modem_lte_disconnect(void) {
    if (!s_lte_connected) {
        return ESP_OK;
    }

    esp_err_t err = modem_lte_send_simple("AT+CGACT=0,1\r", "OK", 10000);
    if (err == ESP_OK) {
        s_lte_connected = false;
        s_lte_initialized = false;
        s_connect_requested = false;
        s_initial_power_pulse_attempted = false;
        s_initial_reset_pulse_attempted = false;
        s_force_power_cycle_recover = false;
        s_cpin_diag_log_ms = 0;
        s_cereg_diag_log_ms = 0;
        s_last_cereg_stat = -1;
        s_state = MODEM_LTE_STATE_IDLE;
        s_next_action_ms = 0;
        s_state_deadline_ms = 0;
        retry_state_reset(&s_lte_backoff_retry);
        s_recover_attempts = 0;
        modem_lte_reset_at_sync_sweep();
        (void)modem_lte_apply_at_sync_config();
        s_last_err = ESP_OK;
    }
    return err;
}

esp_err_t modem_lte_sleep(void) {
    if (!util_is_sleep_enabled()) {
        ESP_LOGI(TAG, "modem_lte_sleep bypassed (sleep disabled)");
        return ESP_OK;
    }

    esp_err_t dtr_err = modem_set_dtr(true);
    if (dtr_err != ESP_OK && dtr_err != ESP_ERR_NOT_SUPPORTED) {
        ESP_LOGW(TAG, "Set DTR sleep failed: %s", esp_err_to_name(dtr_err));
    }

    return modem_lte_send_simple("AT+CSCLK=1\r", "OK", MODEM_LTE_SHORT_CMD_TIMEOUT_MS);
}

esp_err_t modem_lte_wakeup(void) {
    if (!util_is_sleep_enabled()) {
        ESP_LOGI(TAG, "modem_lte_wakeup bypassed (sleep disabled)");
        return ESP_OK;
    }

    esp_err_t dtr_err = modem_set_dtr(false);
    if (dtr_err != ESP_OK && dtr_err != ESP_ERR_NOT_SUPPORTED) {
        ESP_LOGW(TAG, "Set DTR wake failed: %s", esp_err_to_name(dtr_err));
    }

    return modem_lte_send_simple("AT\r", "OK", MODEM_LTE_SHORT_CMD_TIMEOUT_MS);
}

int modem_lte_get_rssi(void) {
    char response[256] = {0};
    if (modem_at_send("AT+CSQ\r", response, sizeof(response), MODEM_LTE_SHORT_CMD_TIMEOUT_MS) != ESP_OK) {
        return -1;
    }

    char *marker = strstr(response, "+CSQ:");
    if (marker == NULL) {
        return -1;
    }

    int rssi = 99;
    if (sscanf(marker, "+CSQ: %d", &rssi) != 1 || rssi == 99) {
        return -1;
    }

    return -113 + (2 * rssi);
}

bool modem_lte_is_connected(void) {
    return s_lte_connected;
}

bool modem_lte_is_initialized(void) {
    return s_lte_initialized;
}
