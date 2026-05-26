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
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t power_mgr_init(void);

/**
 * @brief Toggle modem power-key sequence to power on modem.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_power_on(void);

/**
 * @brief Toggle modem power-key sequence to power off modem.
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
 * @return ESP_OK on success, ESP_ERR_NOT_SUPPORTED when reset pin is not mapped.
 */
esp_err_t modem_reset_pulse(void);

/**
 * @brief Set modem DTR level when mapped.
 *
 * @param high True to drive modem-side DTR HIGH, false to drive modem-side DTR LOW.
 *
 * @return ESP_OK on success, ESP_ERR_NOT_SUPPORTED when DTR pin is not mapped.
 */
esp_err_t modem_set_dtr(bool high);

/**
 * @brief Read modem STATUS line when mapped.
 *
 * @param level Output level.
 *
 * @return ESP_OK on success, ESP_ERR_NOT_SUPPORTED when status pin is not mapped.
 */
esp_err_t modem_read_status(bool *level);

/**
 * @brief Read modem NET-LIGHT line when mapped.
 *
 * @param level Output level.
 *
 * @return ESP_OK on success, ESP_ERR_NOT_SUPPORTED when netlight pin is not mapped.
 */
esp_err_t modem_read_netlight(bool *level);
