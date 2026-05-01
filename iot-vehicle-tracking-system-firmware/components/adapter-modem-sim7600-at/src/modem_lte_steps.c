#include "modem_lte_internal.h"

#include <stdio.h>
#include <string.h>

#include "esp_log.h"

#include "modem_at.h"
#include "power_mgr.h"

/**
 * @file modem_lte_steps.c
 * @brief Reusable LTE step helpers for AT commands, registration parsing, and diagnostics.
 */

/**
 * @brief Send AT command and check expected response.
 *
 * Simple wrapper for sending AT with expect token.
 *
 * @param cmd AT command to send.
 * @param expect Expected token in response.
 * @param timeout_ms Timeout in ms.
 * @return ESP_OK on success, error on failure.
 */
esp_err_t modem_lte_send_simple(const char *cmd, const char *expect, uint32_t timeout_ms) {
    return modem_at_send_expect(cmd, expect, timeout_ms);
}

/**
 * @brief Check if diagnostic log is due.
 *
 * Timestamps-based logging throttle.
 *
 * @param now_ms Current time in ms.
 * @param last_log_ms Pointer to last log timestamp.
 * @param interval_ms Interval threshold.
 * @return True if logging is due.
 */
bool modem_lte_diag_log_due(uint64_t now_ms, uint64_t *last_log_ms, uint64_t interval_ms) {
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
 * @brief Try to resume alive modem via AT probe.
 *
 * Fast-path: probe AT, skip power/RESET toggle on success.
 *
 * @param now_ms Current timestamp.
 * @return True if modem is alive.
 */
bool modem_lte_try_resume_alive_modem(uint64_t now_ms) {
    esp_err_t at_init_err = modem_at_init();
    if (at_init_err != ESP_OK) {
        return false;
    }

    if (!s_rdy_urc_registered) {
        modem_at_register_urc("RDY", modem_lte_on_urc_rdy);
        s_rdy_urc_registered = true;
    }

    modem_lte_set_fixed_uart_cfg();
    modem_lte_reset_at_sync_sweep();
    if (modem_lte_apply_at_sync_config() != ESP_OK) {
        return false;
    }

    char response[128] = {0};
    modem_at_reset_uart_diag();
    esp_err_t probe_err = modem_at_send("AT\r",
                                        response,
                                        sizeof(response),
                                        MODEM_LTE_BOOT_ALIVE_PROBE_TIMEOUT_MS);
    bool at_ready = probe_err == ESP_OK && strstr(response, "OK") != NULL;
    if (!at_ready) {
        return false;
    }

    s_at_sync_fail_count = 0;
    s_at_sync_diag_log_ms = 0;
    s_rdy_diag_log_ms = 0;
    s_state_deadline_ms = 0;
    modem_lte_clear_rdy_token();
    ESP_LOGI(MODEM_LTE_TAG, "startup fast-path: modem alive, skip PWRKEY/RESET pulse");
    modem_lte_transition(MODEM_LTE_STATE_ATE0, now_ms, 0);
    return true;
}

/**
 * @brief Log modem hardware lines if available.
 *
 * Logs STATUS and NET-LIGHT GPIO states for diagnostics.
 */
void modem_lte_log_hw_lines_if_available(void) {
    bool level = false;

    esp_err_t status_err = modem_read_status(&level);
    if (status_err == ESP_OK) {
        ESP_LOGI(MODEM_LTE_TAG, "SIM7600 STATUS=%d", level ? 1 : 0);
    } else if (status_err == ESP_ERR_NOT_SUPPORTED) {
        ESP_LOGI(MODEM_LTE_TAG, "SIM7600 STATUS unsupported (GPIO_NUM_NC)");
    } else {
        ESP_LOGW(MODEM_LTE_TAG, "Read STATUS failed: %s", esp_err_to_name(status_err));
    }

    esp_err_t netlight_err = modem_read_netlight(&level);
    if (netlight_err == ESP_OK) {
        ESP_LOGI(MODEM_LTE_TAG, "SIM7600 NET-LIGHT=%d", level ? 1 : 0);
    } else if (netlight_err == ESP_ERR_NOT_SUPPORTED) {
        ESP_LOGI(MODEM_LTE_TAG, "SIM7600 NET-LIGHT unsupported (GPIO_NUM_NC)");
    } else {
        ESP_LOGW(MODEM_LTE_TAG, "Read NET-LIGHT failed: %s", esp_err_to_name(netlight_err));
    }
}

/**
 * @brief Parse +CEREG registration response.
 *
 * Extracts n and stat values from +CEREG URC.
 *
 * @param response AT response.
 * @param out_n Output for n value (optional).
 * @param out_stat Output for stat value (optional).
 * @return True if parsed successfully.
 */
bool modem_lte_parse_cereg(const char *response, int *out_n, int *out_stat) {
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
 * @brief Get registration state name.
 *
 * @param stat CEREG stat value.
 * @return String name for stat value.
 */
const char *modem_lte_cereg_stat_name(int stat) {
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
 * @brief Log registration diagnostics snapshot.
 *
 * Logs CPIN, CEREG, CSQ, COPS for debugging.
 */
void modem_lte_log_registration_snapshot(void) {
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
            ESP_LOGW(MODEM_LTE_TAG, "diag %s failed: %s", k_diag_cmds[i].label, esp_err_to_name(err));
            continue;
        }

        ESP_LOGW(MODEM_LTE_TAG,
                 "diag %s response_len=%u",
                 k_diag_cmds[i].label,
                 (unsigned)strlen(response));
    }
}
