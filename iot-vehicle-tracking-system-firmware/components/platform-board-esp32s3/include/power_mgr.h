#pragma once

#include <stdbool.h>

#include "esp_err.h"

/**
 * @file power_mgr.h
 * @brief Modem control helpers for SIM7600 hardware lines.
 * This header belongs to the ESP32-S3 board support layer and describes the board-facing contract that runtime code uses without baking GPIO details into app-core.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief Initialize GPIOs used by modem control/status lines.
 *
 * Configures PWRKEY/RESET/DTR as outputs and STATUS/NETLIGHT as inputs, then
 * drives every control line to its inactive/idle level so the modem is not
 * toggled unintentionally during boot.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 * @note Pins mapped to GPIO_NUM_NC are skipped; only wired lines are configured.
 */
esp_err_t power_mgr_init(void);

/**
 * @brief Toggle modem power-key sequence to power on modem.
 *
 * Drives a short active PWRKEY pulse (typical SIM7600 Ton) to boot the modem.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_power_on(void);

/**
 * @brief Toggle modem power-key sequence to power off modem.
 *
 * Drives an extended active PWRKEY pulse (> SIM7600 Toff) for a clean shutdown.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_power_off(void);

/**
 * @brief Configure whether MCU->PWRKEY path is inverted by external stage.
 *
 * @param inverted true when GPIO HIGH asserts modem PWRKEY (inverted stage).
 *
 * @return ESP_OK on success.
 */
/**
 * @brief Read current MCU->PWRKEY inversion profile.
 *
 * @return true when GPIO HIGH asserts modem PWRKEY.
 */
/**
 * @brief Pulse modem reset line when mapped.
 *
 * Asserts the hardware RESET line briefly to force a modem reboot; used as a
 * recovery action when the modem stops responding to AT commands.
 *
 * @return ESP_OK on success, ESP_ERR_NOT_SUPPORTED when reset pin is not mapped.
 * @note No-op-with-error on board revisions where RESET is GPIO_NUM_NC.
 */
esp_err_t modem_reset_pulse(void);

/**
 * @brief Set modem DTR level when mapped.
 *
 * DTR controls the modem low-power handshake: driving it active lets the modem
 * enter sleep when idle, while the inactive level keeps the modem awake.
 *
 * @param high True to drive modem-side DTR HIGH, false to drive modem-side DTR LOW.
 *
 * @return ESP_OK on success, ESP_ERR_NOT_SUPPORTED when DTR pin is not mapped.
 * @note The board may invert this line through a transistor stage; the modem-side
 *       level is what this argument refers to, not the raw MCU GPIO level.
 */
esp_err_t modem_set_dtr(bool high);

/**
 * @brief Read modem STATUS line when mapped.
 *
 * STATUS is an active-high modem output reflecting its power state
 * (HIGH = powered/ready).
 *
 * @param level Output level (true = HIGH).
 *
 * @return ESP_OK on success, ESP_ERR_NOT_SUPPORTED when status pin is not mapped.
 * @note Returns ESP_ERR_INVALID_ARG when @p level is NULL.
 */
esp_err_t modem_read_status(bool *level);

/**
 * @brief Read modem NET-LIGHT line when mapped.
 *
 * NET-LIGHT mirrors the modem network LED whose blink pattern encodes network
 * registration and data-activity state.
 *
 * @param level Output level (true = HIGH).
 *
 * @return ESP_OK on success, ESP_ERR_NOT_SUPPORTED when netlight pin is not mapped.
 * @note Returns ESP_ERR_INVALID_ARG when @p level is NULL. A single instantaneous
 *       sample cannot distinguish blink phases; sample over time to decode state.
 */
esp_err_t modem_read_netlight(bool *level);
