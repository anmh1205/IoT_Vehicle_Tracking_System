#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "driver/gpio.h"
#include "driver/uart.h"
#include "esp_err.h"

/**
 * @file modem_at.h
 * @brief AT command transport interface over modem UART.
 * This header belongs to the SIM7600 AT modem adapter layer and exposes the modem boundary so higher layers do not depend on UART- or AT-private details.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief Callback type for unsolicited modem result codes (URC).
 *
 * @param urc_line Null-terminated URC line (without trailing CRLF).
 */
typedef void (*modem_urc_cb_t)(const char *urc_line);

/**
 * @brief UART receive error counters captured from ESP-IDF UART event queue.
 */
typedef struct {
    uint32_t frame_err_count;
    uint32_t parity_err_count;
    uint32_t fifo_overflow_count;
    uint32_t buffer_full_count;
    uint32_t break_count;
} modem_at_uart_diag_t;

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
 * @brief Run one prompt-mode transaction atomically on the modem UART.
 *
 * Sends the prepare command, waits for the `>` prompt, writes exactly `data_len`
 * raw bytes, then collects the modem result text for the same transaction.
 *
 * @param prepare_cmd AT command string that should return a prompt.
 * @param data Raw bytes to write after prompt.
 * @param data_len Number of raw bytes to write.
 * @param response Optional output response buffer for prompt + final result.
 * @param resp_len Output buffer size in bytes.
 * @param timeout_ms Timeout for the whole prompt transaction.
 *
 * @return ESP_OK on success, ESP_FAIL for modem error, or timeout/state errors.
 */
esp_err_t modem_at_send_prompt_data(const char *prepare_cmd,
                                    const uint8_t *data,
                                    size_t data_len,
                                    char *response,
                                    size_t resp_len,
                                    uint32_t timeout_ms);

/**
 * @brief Send AT command and collect raw UART bytes until idle timeout.
 *
 * Use this for commands that may stream binary payloads where `OK/ERROR`
 * markers can appear before the full payload transfer completes.
 *
 * @param cmd AT command string including CR/LF terminator if needed.
 * @param response Output buffer for raw bytes.
 * @param resp_len Output buffer capacity.
 * @param out_len Optional output length of collected bytes.
 * @param timeout_ms Overall timeout for the whole command transaction.
 * @param idle_timeout_ms Stop collecting when no new bytes arrive within this window.
 *
 * @return ESP_OK when bytes were collected, otherwise timeout/state errors.
 */
esp_err_t modem_at_send_collect(const char *cmd,
                                uint8_t *response,
                                size_t resp_len,
                                size_t *out_len,
                                uint32_t timeout_ms,
                                uint32_t idle_timeout_ms);

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
 * @brief Configure UART frame format at runtime.
 *
 * @param data_bits UART data bits.
 * @param parity UART parity mode.
 * @param stop_bits UART stop bits.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_at_set_frame_format(uart_word_length_t data_bits,
                                    uart_parity_t parity,
                                    uart_stop_bits_t stop_bits);

/**
 * @brief Read current UART frame format.
 *
 * @param out_data_bits Optional output data bits pointer.
 * @param out_parity Optional output parity pointer.
 * @param out_stop_bits Optional output stop bits pointer.
 */
void modem_at_get_frame_format(uart_word_length_t *out_data_bits,
                               uart_parity_t *out_parity,
                               uart_stop_bits_t *out_stop_bits);

/**
 * @brief Configure UART source clock.
 *
 * @param source_clk UART source clock selector.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_at_set_source_clk(uart_sclk_t source_clk);

/**
 * @brief Read active UART source clock.
 *
 * @return Active source clock selector.
 */
uart_sclk_t modem_at_get_source_clk(void);

/**
 * @brief Snapshot UART receive diagnostics.
 *
 * @param out_diag Output diagnostics structure.
 */
void modem_at_get_uart_diag(modem_at_uart_diag_t *out_diag);

/**
 * @brief Reset UART receive diagnostics counters.
 */
void modem_at_reset_uart_diag(void);

/**
 * @brief Register callback for URC lines matching a prefix.
 *
 * @param prefix Prefix string to match, e.g. `"+CMTI"`.
 * @param cb Callback invoked when prefix matches.
 */
void modem_at_register_urc(const char *prefix, modem_urc_cb_t cb);

/**
 * @brief Poll UART RX and dispatch URC lines without sending an AT command.
 *
 * @param max_read_bytes Maximum bytes to drain from UART RX in one call.
 *
 * @return ESP_OK on success, ESP_ERR_TIMEOUT if AT transport is busy, or state errors.
 */
esp_err_t modem_at_poll_urc(uint32_t max_read_bytes);
