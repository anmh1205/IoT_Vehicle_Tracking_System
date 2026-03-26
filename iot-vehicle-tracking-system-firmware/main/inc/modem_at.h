#pragma once

#include <stddef.h>
#include <stdint.h>

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
 * @brief Register callback for URC lines matching a prefix.
 *
 * @param prefix Prefix string to match, e.g. `"+CMTI"`.
 * @param cb Callback invoked when prefix matches.
 */
void modem_at_register_urc(const char *prefix, modem_urc_cb_t cb);
