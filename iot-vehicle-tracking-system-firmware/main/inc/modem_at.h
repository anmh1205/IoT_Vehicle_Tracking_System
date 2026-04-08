#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "driver/gpio.h"
#include "esp_err.h"

/**
 * @file modem_at.h
 * @brief AT command transport interface over modem UART.
 */

/**
 * @brief Callback type for unsolicited modem result codes (URC).
 *
 * @param urc_line Null-terminated URC line (without trailing CRLF).
 */
typedef void (*modem_urc_cb_t)(const char *urc_line);

/**
 * @brief Initialize UART and AT transport synchronization primitives.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_at_init(void);

/**
 * @brief Deinitialize UART and AT transport resources.
 */
void modem_at_deinit(void);

/**
 * @brief Send AT command and read full response until completion marker.
 *
 * @param cmd AT command string including CR/LF terminator if needed.
 * @param response Optional output response buffer.
 * @param resp_len Output buffer size in bytes.
 * @param timeout_ms Timeout for the whole command transaction.
 *
 * @return ESP_OK when command succeeds, ESP_FAIL for `ERROR`, or timeout/state errors.
 */
esp_err_t modem_at_send(const char *cmd, char *response, size_t resp_len, uint32_t timeout_ms);

/**
 * @brief Send AT command and assert expected substring appears in response.
 *
 * @param cmd AT command string.
 * @param expect Expected substring (NULL to skip content check).
 * @param timeout_ms Timeout in milliseconds.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_at_send_expect(const char *cmd, const char *expect, uint32_t timeout_ms);

/**
 * @brief Update modem UART baudrate at runtime.
 *
 * @param baud New baudrate value.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_at_set_baud(uint32_t baud);

/**
 * @brief Get current modem UART baudrate.
 *
 * @return Active UART baudrate.
 */
uint32_t modem_at_get_baud(void);

/**
 * @brief Update modem UART TX/RX pin mapping at runtime.
 *
 * @param tx_pin UART TX GPIO.
 * @param rx_pin UART RX GPIO.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_at_set_pins(gpio_num_t tx_pin, gpio_num_t rx_pin);

/**
 * @brief Get current modem UART TX/RX pin mapping.
 *
 * @param out_tx_pin Optional output TX GPIO pointer.
 * @param out_rx_pin Optional output RX GPIO pointer.
 */
void modem_at_get_pins(gpio_num_t *out_tx_pin, gpio_num_t *out_rx_pin);

/**
 * @brief Configure UART signal inversion mask for modem AT transport.
 *
 * @param inverse_mask OR mask of uart_signal_inv_t flags.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_at_set_line_inverse(uint32_t inverse_mask);

/**
 * @brief Get active UART signal inversion mask.
 *
 * @return Current inversion mask.
 */
uint32_t modem_at_get_line_inverse(void);

/**
 * @brief Register callback for URC lines matching a prefix.
 *
 * @param prefix Prefix string to match, e.g. `"+CMTI"`.
 * @param cb Callback invoked when prefix matches.
 */
void modem_at_register_urc(const char *prefix, modem_urc_cb_t cb);
