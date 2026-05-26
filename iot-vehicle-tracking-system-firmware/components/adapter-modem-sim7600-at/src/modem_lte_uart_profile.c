#include "modem_lte_internal.h"

#include <ctype.h>
#include <stdio.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "esp_log.h"

#include "modem_at.h"
#include "power_mgr.h"

/**
 * @file modem_lte_uart_profile.c
 * @brief UART profile, RDY token, and AT-sync diagnostics for LTE startup.
 * This translation unit belongs to the SIM7600 AT modem adapter layer and keeps adapter-local state, protocol sequencing, and recovery policy isolated behind the exported entry points.
 */


bool modem_lte_rdy_seen_in_cycle(void) {
    return s_rdy_seen;
}

void modem_lte_clear_rdy_token(void) {
    s_rdy_seen = false;
}

void modem_lte_mark_rdy_seen(void) {
    s_rdy_seen = true;
}

/**
 * @brief Handle RDY URC from modem.
 *
 * Detects "RDY" message indicating modem is ready.
 *
 * @param urc_line URC line from modem.
 */
void modem_lte_on_urc_rdy(const char *urc_line) {
    if (urc_line == NULL) {
        return;
    }

    if (strcmp(urc_line, "RDY") == 0) {
        modem_lte_mark_rdy_seen();
        ESP_LOGI(MODEM_LTE_TAG, "RDY marker seen from UART");
    }
}

/**
 * @brief Get inverse setting name for logging.
 *
 * @param inverse_mask Inverse mask value.
 * @return String name ("ON" or "OFF").
 */
const char *modem_lte_inverse_name(uint32_t inverse_mask) {
    return (inverse_mask & UART_SIGNAL_RXD_INV) != 0U ? "ON" : "OFF";
}

/**
 * @brief Get data bits name for logging.
 *
 * @param data_bits UART data bits setting.
 * @return String representation ("5"-"8").
 */
const char *modem_lte_data_bits_name(uart_word_length_t data_bits) {
    switch (data_bits) {
        case UART_DATA_5_BITS:
            return "5";
        case UART_DATA_6_BITS:
            return "6";
        case UART_DATA_7_BITS:
            return "7";
        case UART_DATA_8_BITS:
            return "8";
        default:
            return "?";
    }
}

/**
 * @brief Get parity name for logging.
 *
 * @param parity UART parity setting.
 * @return String representation ("N", "E", "O").
 */
const char *modem_lte_parity_name(uart_parity_t parity) {
    switch (parity) {
        case UART_PARITY_DISABLE:
            return "N";
        case UART_PARITY_EVEN:
            return "E";
        case UART_PARITY_ODD:
            return "O";
        default:
            return "?";
    }
}

/**
 * @brief Get stop bits name for logging.
 *
 * @param stop_bits UART stop bits setting.
 * @return String representation ("1", "1.5", "2").
 */
const char *modem_lte_stop_bits_name(uart_stop_bits_t stop_bits) {
    switch (stop_bits) {
        case UART_STOP_BITS_1:
            return "1";
        case UART_STOP_BITS_1_5:
            return "1.5";
        case UART_STOP_BITS_2:
            return "2";
        default:
            return "?";
    }
}

/**
 * @brief Get source clock name for logging.
 *
 * @param source_clk UART clock source.
 * @return String name.
 */
const char *modem_lte_source_clk_name(uart_sclk_t source_clk) {
    if (source_clk == UART_SCLK_DEFAULT) {
        return "DEFAULT";
    }
#if defined(UART_SCLK_APB)
    if (source_clk == UART_SCLK_APB) {
        return "APB";
    }
#endif
#if defined(UART_SCLK_RTC)
    if (source_clk == UART_SCLK_RTC) {
        return "RTC";
    }
#endif
#if defined(UART_SCLK_XTAL)
    if (source_clk == UART_SCLK_XTAL) {
        return "XTAL";
    }
#endif
#if defined(UART_SCLK_REF_TICK)
    if (source_clk == UART_SCLK_REF_TICK) {
        return "REF_TICK";
    }
#endif
    return "UNKNOWN";
}

/**
 * @brief Apply UART configuration to modem.
 *
 * @param cfg UART configuration to apply.
 * @return ESP_OK on success, error code on failure.
 */
static esp_err_t modem_lte_apply_uart_cfg(const modem_lte_uart_probe_cfg_t *cfg) {
    // Apply LTE apply uart cfg in one place so this module keeps a single authoritative writer.
    if (cfg == NULL) {
        return ESP_ERR_INVALID_ARG;
    }

    esp_err_t pin_err = modem_at_set_pins(cfg->tx_pin, cfg->rx_pin);
    if (pin_err != ESP_OK) {
        return pin_err;
    }

    esp_err_t inverse_err = modem_at_set_line_inverse(cfg->inverse_mask);
    if (inverse_err != ESP_OK) {
        return inverse_err;
    }

    esp_err_t source_clk_err = modem_at_set_source_clk(cfg->source_clk);
    if (source_clk_err != ESP_OK) {
        return source_clk_err;
    }

    esp_err_t baud_err = modem_at_set_baud(cfg->baud);
    if (baud_err != ESP_OK) {
        return baud_err;
    }

    return modem_at_set_frame_format(cfg->data_bits, cfg->parity, cfg->stop_bits);
}

/**
 * @brief Apply saved AT-sync UART config.
 *
 * Applies the stored UART configuration for AT sync.
 *
 * @return ESP_OK on success.
 */
esp_err_t modem_lte_apply_at_sync_config(void) {
    return modem_lte_apply_uart_cfg(&s_active_uart_cfg);
}

/**
 * @brief Reset UART config to defaults.
 *
 * Sets active config to default values.
 */
void modem_lte_set_fixed_uart_cfg(void) {
    s_active_uart_cfg = (modem_lte_uart_probe_cfg_t){
        .tx_pin = PIN_MODEM_TX,
        .rx_pin = PIN_MODEM_RX,
        .baud = MODEM_UART_BAUD,
        .inverse_mask = MODEM_LTE_AT_SYNC_FIXED_INVERSE_MASK,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .source_clk = UART_SCLK_DEFAULT,
    };
}

/**
 * @brief Log partial AT probe response.
 *
 * Logs warning with response preview for debugging.
 *
 * @param response Response to log.
 */
void modem_lte_log_at_probe_response(const char *response) {
    if (response == NULL || response[0] == '\0') {
        return;
    }

    ESP_LOGW(MODEM_LTE_TAG,
             "AT probe partial_response len=%u has_ok=%d",
             (unsigned)strnlen(response, 64),
             strstr(response, "OK") != NULL ? 1 : 0);
}

/**
 * @brief Log current UART config.
 *
 * Logs active UART configuration for debugging.
 */
void modem_lte_log_fixed_uart_cfg(void) {
    ESP_LOGI(MODEM_LTE_TAG,
             "AT sync fixed UART tx=%d rx=%d baud=%lu invert=%s fmt=%s%s%s clk=%s",
             (int)s_active_uart_cfg.tx_pin,
             (int)s_active_uart_cfg.rx_pin,
             (unsigned long)s_active_uart_cfg.baud,
             modem_lte_inverse_name(s_active_uart_cfg.inverse_mask),
             modem_lte_data_bits_name(s_active_uart_cfg.data_bits),
             modem_lte_parity_name(s_active_uart_cfg.parity),
             modem_lte_stop_bits_name(s_active_uart_cfg.stop_bits),
             modem_lte_source_clk_name(s_active_uart_cfg.source_clk));
}

/**
 * @brief Force DTR toggle for wake.
 *
 * Toggles DTR line to wake modem from sleep.
 */
/**
 * @brief Force DTR toggle for wake.
 *
 * Toggles DTR line to wake modem from sleep.
 */
void modem_lte_force_dtr_wake_pulse(void) {
#if !MODEM_LTE_ENABLE_DTR_WAKE_PULSE
    return;
#else
    esp_err_t dtr_err = modem_set_dtr(true);
    if (dtr_err != ESP_OK && dtr_err != ESP_ERR_NOT_SUPPORTED) {
        ESP_LOGW(MODEM_LTE_TAG, "Set DTR high failed: %s", esp_err_to_name(dtr_err));
    }

    vTaskDelay(pdMS_TO_TICKS((uint32_t)MODEM_LTE_DTR_WAKE_PULSE_MS));

    dtr_err = modem_set_dtr(false);
    if (dtr_err != ESP_OK && dtr_err != ESP_ERR_NOT_SUPPORTED) {
        ESP_LOGW(MODEM_LTE_TAG, "Set DTR low failed: %s", esp_err_to_name(dtr_err));
    }

    vTaskDelay(pdMS_TO_TICKS((uint32_t)MODEM_LTE_DTR_WAKE_PULSE_MS));
#endif
}
