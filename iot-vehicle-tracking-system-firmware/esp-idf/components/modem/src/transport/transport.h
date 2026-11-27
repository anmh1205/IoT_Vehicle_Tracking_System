/**
 * @file src/transport/transport.h
 * @brief Private SIM7600 UART, PWRKEY and power-management interfaces.
 *
 * Modem startup configures SDK resources before the modem task takes ownership.
 * AT dispatch supplies buffers and interprets received bytes. The link service controls power sequencing.
 * UART and GPIO I/O stay here. The transport borrows caller buffers only for the duration of each call.
 */
#pragma once
#include "esp_err.h"
#include "modem/modem.h"

/**
 * @brief Configure PWRKEY as an output and drive it inactive.
 *
 * @param cfg Required configuration borrowed for the call. Power state retains the pin and polarity.
 * @return ESP_OK after GPIO configuration succeeds, or the GPIO configuration error.
 * @note Context: Modem startup before the task runs. Blocking: Synchronous GPIO setup without a pulse delay.
 */
esp_err_t modem_power_gpio_init(const modem_cfg_t *cfg);
/**
 * @brief Create the modem's no-light-sleep lock when power management is enabled.
 *
 * @return ESP_OK on success or when power management is disabled, otherwise the SDK allocation error.
 * @note Context: Modem startup before the task runs. Blocking: Synchronous SDK allocation.
 */
esp_err_t modem_pm_lock_create(void);
/**
 * @brief Clear the initial PWRKEY restart guard.
 *
 * @note Context: Modem startup before the task runs. Blocking: Non-blocking.
 */
void modem_power_init(void);

/**
 * @brief Change the modem's no-light-sleep lock request.
 *
 * A repeated request or an absent lock has no effect.
 *
 * @param hold True requests the lock. False requests release.
 * @note Context: Modem task. Blocking: Calls SDK lock operations without waiting for a sleep transition.
 */
void modem_pm_hold(bool hold);
/**
 * @brief Assert PWRKEY using the configured active polarity, then release it.
 *
 * @param duration_ms Pulse duration in milliseconds before native tick conversion.
 * @note Context: Modem task after PWRKEY setup. Blocking: Delays for the converted number of ticks.
 */
void modem_power_pulse(uint32_t duration_ms);
/**
 * @brief Begin shutdown if the restart guard permits another PWRKEY pulse.
 *
 * After the 3 s pulse, a 30 s guard allows for shutdown before another start attempt.
 *
 * @retval true The shutdown pulse finishes and the guard is armed.
 * @retval false The existing guard suppresses the pulse.
 * @note Context: Modem task. Blocking: The pulse delays for 3000 ms after tick conversion when allowed.
 */
bool modem_power_down(void);
/**
 * @brief Check whether the PWRKEY shutdown guard remains active.
 *
 * @retval true The monotonic restart time is in the future.
 * @retval false The guard is clear or has expired.
 * @note Context: Modem task. Blocking: Non-blocking.
 */
bool modem_power_restart_is_blocked(void);

/**
 * @brief Install and configure the UART for SIM7600 bytes.
 *
 * @param cfg Required configuration borrowed for the call, with the UART number, baud rate and GPIOs.
 * @return ESP_OK on success, otherwise the first UART SDK setup error.
 * @note Context: Modem startup. Blocking: Synchronous driver setup and allocation.
 * @warning Failure after installation can leave the driver allocated.
 */
esp_err_t modem_uart_open(const modem_cfg_t *cfg);
/**
 * @brief Copy outgoing AT bytes into the UART driver.
 *
 * @param ctx Unused callback context. NULL is accepted.
 * @param data Required source buffer borrowed for the write.
 * @param len Number of source bytes to write.
 * @note Context: Modem task after UART setup. Blocking: Can wait for transmit ring space without a timeout.
 */
void modem_uart_write(void *ctx, const void *data, size_t len);
/**
 * @brief Read up to @p cap bytes into a caller-owned buffer.
 *
 * @param[out] data Required destination borrowed for the read. Only the returned byte count is valid.
 * @param cap Capacity of @p data in bytes.
 * @param wait_ms UART receive timeout in milliseconds before native tick conversion. Zero polls.
 * @return Number of bytes read, including zero when none are available, or -1 on driver error.
 * @note Context: Modem task after UART setup. Blocking: The UART driver can apply the converted
 *       timeout to more than one buffer wait in the same read.
 */
int modem_uart_read(uint8_t *data, size_t cap, uint32_t wait_ms);
/**
 * @brief Discard buffered UART input.
 *
 * @note Context: Modem task after UART setup. Blocking: The driver acquires its RX mutex without a timeout.
 */
void modem_uart_flush(void);
