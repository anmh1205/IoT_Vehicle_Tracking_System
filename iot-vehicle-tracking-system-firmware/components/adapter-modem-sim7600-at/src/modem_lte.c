#include "modem_lte.h"

#include <stdio.h>
#include <string.h>

#include "esp_log.h"

#include "modem_at.h"
#include "modem_lte_internal.h"
#include "power_mgr.h"
#include "util.h"

/**
 * @file modem_lte.c
 * @brief Public compatibility facade for split LTE modem modules.
 */

bool s_lte_initialized = false;
bool s_lte_connected = false;
bool s_connect_requested = false;
modem_lte_state_t s_state = MODEM_LTE_STATE_IDLE;
uint64_t s_next_action_ms = 0;
uint64_t s_state_deadline_ms = 0;
retry_state_t s_lte_backoff_retry = {0};
uint32_t s_recover_attempts = 0;
uint32_t s_at_sync_fail_count = 0;
uint64_t s_cpin_diag_log_ms = 0;
uint64_t s_cereg_diag_log_ms = 0;
uint64_t s_rdy_diag_log_ms = 0;
uint64_t s_at_sync_diag_log_ms = 0;
int s_last_cereg_stat = -1;
esp_err_t s_last_err = ESP_OK;
bool s_rdy_urc_registered = false;
modem_lte_uart_probe_cfg_t s_active_uart_cfg = {
    .tx_pin = PIN_MODEM_TX,
    .rx_pin = PIN_MODEM_RX,
    .baud = MODEM_UART_BAUD,
    .inverse_mask = MODEM_LTE_AT_SYNC_FIXED_INVERSE_MASK,
    .data_bits = UART_DATA_8_BITS,
    .parity = UART_PARITY_DISABLE,
    .stop_bits = UART_STOP_BITS_1,
    .source_clk = UART_SCLK_DEFAULT,
};
const retry_policy_t s_lte_backoff_policy = {
    .mode = RETRY_MODE_EXPONENTIAL,
    .base_delay_ms = (uint32_t)MODEM_LTE_BACKOFF_BASE_MS,
    .max_delay_ms = (uint32_t)MODEM_LTE_BACKOFF_MAX_MS,
    .max_attempts = 0,
    .jitter_ms = 0,
};
bool s_rdy_seen = false;
uint64_t s_last_hw_recover_ms = 0;
uint32_t s_cpin_soft_retry_count = 0;
char s_active_apn[TRACKER_HOST_MAX_LEN] = CONFIG_TRACKER_MODEM_APN;

void modem_lte_set_apn(const char *apn) {
    if (util_string_empty(apn)) {
        return;
    }

    char next_apn[TRACKER_HOST_MAX_LEN] = {0};
    util_copy_string(next_apn, sizeof(next_apn), apn);
    if (strcmp(s_active_apn, next_apn) == 0) {
        return;
    }

    util_copy_string(s_active_apn, sizeof(s_active_apn), next_apn);
    ESP_LOGI(MODEM_LTE_TAG, "APN override applied apn=%s", s_active_apn);
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
        s_cpin_diag_log_ms = 0;
        s_cereg_diag_log_ms = 0;
        s_rdy_diag_log_ms = 0;
        s_at_sync_diag_log_ms = 0;
        s_last_cereg_stat = -1;
        s_cpin_soft_retry_count = 0;
        modem_lte_clear_rdy_token();
        modem_lte_set_fixed_uart_cfg();
        s_state_deadline_ms = 0;
        modem_lte_reset_at_sync_sweep();
        if (!retry_state_can_run(&s_lte_backoff_retry, now_ms)) {
            return;
        }
        modem_lte_transition(MODEM_LTE_STATE_POWER_ON_PULSE, now_ms, 0);
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
    esp_err_t err = ESP_OK;

    if (s_lte_connected) {
        err = modem_lte_send_simple("AT+CGACT=0,1\r", "OK", 10000);
    }

    s_lte_connected = false;
    s_lte_initialized = false;
    s_connect_requested = false;
    s_cpin_diag_log_ms = 0;
    s_cereg_diag_log_ms = 0;
    s_rdy_diag_log_ms = 0;
    s_at_sync_diag_log_ms = 0;
    s_last_cereg_stat = -1;
    s_state = MODEM_LTE_STATE_IDLE;
    s_next_action_ms = 0;
    s_state_deadline_ms = 0;
    retry_state_reset(&s_lte_backoff_retry);
    s_recover_attempts = 0;
    s_cpin_soft_retry_count = 0;
    s_last_hw_recover_ms = 0;
    modem_lte_clear_rdy_token();
    modem_lte_set_fixed_uart_cfg();
    modem_lte_reset_at_sync_sweep();
    (void)modem_lte_apply_at_sync_config();
    s_last_err = ESP_OK;
    return err;
}

esp_err_t modem_lte_sleep(void) {
    if (!util_is_sleep_enabled()) {
        ESP_LOGI(MODEM_LTE_TAG, "modem_lte_sleep bypassed (sleep disabled)");
        return ESP_OK;
    }

    esp_err_t dtr_err = modem_set_dtr(true);
    if (dtr_err != ESP_OK && dtr_err != ESP_ERR_NOT_SUPPORTED) {
        ESP_LOGW(MODEM_LTE_TAG, "Set DTR sleep failed: %s", esp_err_to_name(dtr_err));
    }

    return modem_lte_send_simple("AT+CSCLK=1\r", "OK", MODEM_LTE_SHORT_CMD_TIMEOUT_MS);
}

esp_err_t modem_lte_wakeup(void) {
    if (!util_is_sleep_enabled()) {
        ESP_LOGI(MODEM_LTE_TAG, "modem_lte_wakeup bypassed (sleep disabled)");
        return ESP_OK;
    }

    esp_err_t dtr_err = modem_set_dtr(false);
    if (dtr_err != ESP_OK && dtr_err != ESP_ERR_NOT_SUPPORTED) {
        ESP_LOGW(MODEM_LTE_TAG, "Set DTR wake failed: %s", esp_err_to_name(dtr_err));
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
