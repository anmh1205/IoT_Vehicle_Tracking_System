#include "modem_lte.h"

#include <stdio.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "esp_log.h"

#include "modem_at.h"
#include "modem_lte_internal.h"
#include "power_mgr.h"
#include "util.h"

/**
 * @file modem_lte.c
 * @brief Public compatibility facade for split LTE modem modules.
 * This translation unit belongs to the SIM7600 AT modem adapter layer and keeps adapter-local state, protocol sequencing, and recovery policy isolated behind the exported entry points.
 */

#define MODEM_LTE_WAKE_AT_RETRY_COUNT 3U
#define MODEM_LTE_WAKE_AT_RETRY_DELAY_MS 200U


/** LTE initialization state. */
bool s_lte_initialized = false;
/** LTE data connection state. */
bool s_lte_connected = false;
/** LTE connect request flag. */
bool s_connect_requested = false;
/** LTE FSM state. */
modem_lte_state_t s_state = MODEM_LTE_STATE_IDLE;
/** Next action timestamp. */
uint64_t s_next_action_ms = 0;
/** State deadline timestamp. */
uint64_t s_state_deadline_ms = 0;
/** Backoff retry state. */
retry_state_t s_lte_backoff_retry = {0};
/** Recovery attempt counter. */
uint32_t s_recover_attempts = 0;
/** AT sync fail counter. */
uint32_t s_at_sync_fail_count = 0;
/** Last CPIN diagnostic log timestamp. */
uint64_t s_cpin_diag_log_ms = 0;
/** Last CEREG diagnostic log timestamp. */
uint64_t s_cereg_diag_log_ms = 0;
/** Last RDY diagnostic log timestamp. */
uint64_t s_rdy_diag_log_ms = 0;
/** Last AT sync diagnostic log timestamp. */
uint64_t s_at_sync_diag_log_ms = 0;
/** Last CEREG stat value. */
int s_last_cereg_stat = -1;
/** Last error code. */
esp_err_t s_last_err = ESP_OK;
/** RDY URC registered flag. */
bool s_rdy_urc_registered = false;
/** Active UART configuration. */
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
/** LTE backoff retry policy. */
const retry_policy_t s_lte_backoff_policy = {
    .mode = RETRY_MODE_EXPONENTIAL,
    .base_delay_ms = (uint32_t)MODEM_LTE_BACKOFF_BASE_MS,
    .max_delay_ms = (uint32_t)MODEM_LTE_BACKOFF_MAX_MS,
    .max_attempts = 0,
    .jitter_ms = 0,
};
/** RDY token seen flag. */
bool s_rdy_seen = false;
/** Last hardware recovery timestamp. */
uint64_t s_last_hw_recover_ms = 0;
/** CPIN soft retry counter. */
uint32_t s_cpin_soft_retry_count = 0;
/** Active APN string. */
char s_active_apn[TRACKER_HOST_MAX_LEN] = CONFIG_TRACKER_MODEM_APN;

/**
 * @brief Set active APN for PDP context.
 *
 * @param apn APN string.
 */
void modem_lte_set_apn(const char *apn) {
    // Ignore empty/NULL overrides so an unconfigured build keeps the compiled-in default APN.
    if (util_string_empty(apn)) {
        return;
    }

    char next_apn[TRACKER_HOST_MAX_LEN] = {0};
    util_copy_string(next_apn, sizeof(next_apn), apn);
    // No-op when unchanged to avoid a redundant log line on every call.
    if (strcmp(s_active_apn, next_apn) == 0) {
        return;
    }

    util_copy_string(s_active_apn, sizeof(s_active_apn), next_apn);
    ESP_LOGI(MODEM_LTE_TAG, "event=lte_apn_override_applied configured=1");
}

/**
 * @brief Request LTE connection.
 *
 * Triggers connection if not already connected.
 */
void modem_lte_request_connect(void) {
    s_connect_requested = true;

    // Already up: nothing to kick off.
    if (s_lte_connected && s_state == MODEM_LTE_STATE_CONNECTED) {
        return;
    }

    // Only seed a fresh bring-up from the parked IDLE state; if the FSM is mid-flight, let it continue.
    if (s_state == MODEM_LTE_STATE_IDLE) {
        uint64_t now_ms = util_uptime_ms();
        // Reset all per-cycle state so the new attempt starts from a clean slate.
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
        // Respect an active backoff window: do not power-cycle the modem before the retry policy allows.
        if (!retry_state_can_run(&s_lte_backoff_retry, now_ms)) {
            return;
        }
        modem_lte_transition(MODEM_LTE_STATE_POWER_ON_PULSE, now_ms, 0);
    }
}

/**
 * @brief Disconnect LTE data path.
 *
 * @return ESP_OK on success.
 */
esp_err_t modem_lte_disconnect(void) {
    esp_err_t err = ESP_OK;

    // Tear down the data bearer only if it is currently active (AT+CGACT=0,1 deactivates PDP context 1).
    if (s_lte_connected) {
        err = modem_lte_send_simple("AT+CGACT=0,1\r", "OK", 10000);
    }

    // Drop all session/bring-up state back to a clean IDLE so a later connect restarts cleanly.
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

/**
 * @brief Put modem into low-power sleep mode.
 *
 * @return ESP_OK on success.
 */
esp_err_t modem_lte_sleep(void) {
    // Honor the global sleep policy: when sleep is disabled, keep the modem fully powered.
    if (!util_is_sleep_enabled()) {
        ESP_LOGI(MODEM_LTE_TAG, "event=lte_sleep_skipped reason=sleep_disabled");
        return ESP_OK;
    }

    // Drop DTR low first so AT+CSCLK=1 takes effect; a board without a DTR pin cannot sleep this way.
    esp_err_t dtr_err = modem_set_dtr(false);
    if (dtr_err == ESP_ERR_NOT_SUPPORTED) {
        ESP_LOGW(MODEM_LTE_TAG, "event=lte_sleep_skipped reason=dtr_unmapped");
        return ESP_ERR_NOT_SUPPORTED;
    }
    if (dtr_err != ESP_OK && dtr_err != ESP_ERR_NOT_SUPPORTED) {
        ESP_LOGW(MODEM_LTE_TAG, "event=lte_sleep_dtr_wake_set_failed err=%s", esp_err_to_name(dtr_err));
        return dtr_err;
    }

    // AT+CSCLK=1 enables DTR-gated slow-clock sleep on the SIM7600.
    esp_err_t csclk_err = modem_lte_send_simple("AT+CSCLK=1\r", "OK", MODEM_LTE_SHORT_CMD_TIMEOUT_MS);
    if (csclk_err != ESP_OK) {
        ESP_LOGW(MODEM_LTE_TAG, "event=lte_sleep_csclk_failed err=%s", esp_err_to_name(csclk_err));
        return csclk_err;
    }

    // Raise DTR high to actually let the modem enter low-power sleep.
    dtr_err = modem_set_dtr(true);
    if (dtr_err != ESP_OK) {
        ESP_LOGW(MODEM_LTE_TAG, "event=lte_sleep_dtr_set_failed err=%s", esp_err_to_name(dtr_err));
        return dtr_err;
    }

    ESP_LOGI(MODEM_LTE_TAG, "event=lte_sleep_entered dtr=1 csclk=1");
    return ESP_OK;
}

/**
 * @brief Wake modem from low-power sleep mode.
 *
 * @return ESP_OK on success.
 */
esp_err_t modem_lte_wakeup(void) {
    // Undo low-power gating here before active I/O touches the hardware again.
    if (!util_is_sleep_enabled()) {
        ESP_LOGI(MODEM_LTE_TAG, "event=lte_wakeup_skipped reason=sleep_disabled");
        return ESP_OK;
    }

    esp_err_t dtr_err = modem_set_dtr(false);
    if (dtr_err == ESP_ERR_NOT_SUPPORTED) {
        ESP_LOGW(MODEM_LTE_TAG, "event=lte_wakeup_limited reason=dtr_unmapped");
    }
    if (dtr_err != ESP_OK && dtr_err != ESP_ERR_NOT_SUPPORTED) {
        ESP_LOGW(MODEM_LTE_TAG, "event=lte_wakeup_dtr_set_failed err=%s", esp_err_to_name(dtr_err));
        return dtr_err;
    }

    vTaskDelay(pdMS_TO_TICKS((uint32_t)MODEM_LTE_WAKE_DTR_SETTLE_MS));

    // Confirm the modem is responsive again by retrying a bare "AT" a few times after wake.
    esp_err_t at_err = ESP_FAIL;
    for (uint32_t attempt = 1; attempt <= MODEM_LTE_WAKE_AT_RETRY_COUNT; ++attempt) {
        at_err = modem_lte_send_simple("AT\r", "OK", MODEM_LTE_SHORT_CMD_TIMEOUT_MS);
        if (at_err == ESP_OK) {
            ESP_LOGI(MODEM_LTE_TAG, "event=lte_wakeup_ok attempt=%lu", (unsigned long)attempt);
            return ESP_OK;
        }
        ESP_LOGW(MODEM_LTE_TAG,
                 "event=lte_wakeup_at_failed attempt=%lu err=%s",
                 (unsigned long)attempt,
                 esp_err_to_name(at_err));
        // Brief pause between probes to give the modem clock time to ramp back up.
        vTaskDelay(pdMS_TO_TICKS((uint32_t)MODEM_LTE_WAKE_AT_RETRY_DELAY_MS));
    }

    return at_err;
}

/**
 * @brief Get RSSI value.
 *
 * @return RSSI in dBm, or -1 on failure.
 */
int modem_lte_get_rssi(void) {
    char response[256] = {0};
    // AT+CSQ returns "+CSQ: <rssi>,<ber>" where rssi is the raw signal-quality index.
    if (modem_at_send("AT+CSQ\r", response, sizeof(response), MODEM_LTE_SHORT_CMD_TIMEOUT_MS) != ESP_OK) {
        return -1;
    }

    char *marker = strstr(response, "+CSQ:");
    if (marker == NULL) {
        return -1;
    }

    // rssi==99 is the modem's "not known / not detectable" sentinel, so treat it as unavailable.
    int rssi = 99;
    if (sscanf(marker, "+CSQ: %d", &rssi) != 1 || rssi == 99) {
        return -1;
    }

    // Map the 3GPP CSQ index (0..31) to dBm: 0 -> -113 dBm, each step is +2 dBm.
    return -113 + (2 * rssi);
}

/**
 * @brief Check LTE connection state.
 *
 * @return True if connected.
 */
bool modem_lte_is_connected(void) {
    return s_lte_connected;
}

/**
 * @brief Check LTE initialization state.
 *
 * @return True if initialized.
 */
bool modem_lte_is_initialized(void) {
    return s_lte_initialized;
}

/**
 * @brief Check whether the AT command channel is usable.
 *
 * GNSS control does not need PDP activation, so app-core can start GNSS as soon
 * as the modem has passed AT sync and echo setup.
 *
 * @return True if AT commands can be exchanged.
 */
bool modem_lte_is_at_ready(void) {
    if (s_lte_initialized || s_lte_connected) {
        return true;
    }

    // Before full PDP readiness, AT is already usable once the SIM-check stage is reached, so GNSS can warm up early.
    return s_state >= MODEM_LTE_STATE_CPIN_CHECK &&
           s_state <= MODEM_LTE_STATE_PDP_IP_CHECK;
}
