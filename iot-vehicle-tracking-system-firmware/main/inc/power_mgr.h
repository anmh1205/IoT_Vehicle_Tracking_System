#pragma once

#include <stdbool.h>

#include "esp_err.h"

/**
 * @file power_mgr.h
 * @brief Power routing, charger control, and modem power-key helpers.
 */

/**
 * @brief Snapshot of current power subsystem status.
 */
typedef struct {
    /** Measured battery voltage. */
    float voltage;
    /** Latched low-voltage state. */
    bool is_low;
    /** Current charger output state. */
    bool charger_on;
} power_status_t;

/**
 * @brief Initialize GPIOs used by power subsystem.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t power_mgr_init(void);

/**
 * @brief Select main battery as active power source.
 */
void power_select_battery(void);

/**
 * @brief Select backup source as active power source.
 */
void power_select_backup(void);

/**
 * @brief Enable charger path.
 */
void charger_enable(void);

/**
 * @brief Disable charger path.
 */
void charger_disable(void);

/**
 * @brief Read digital low-voltage detector state.
 *
 * @return true when low-voltage input is asserted.
 */
bool power_is_low_voltage(void);

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
 * @brief Pulse modem reset line when mapped.
 *
 * @return ESP_OK on success, ESP_ERR_NOT_SUPPORTED when reset pin is not mapped.
 */
esp_err_t modem_reset_pulse(void);

/**
 * @brief Set modem DTR level when mapped.
 *
 * @param high True to set HIGH level, false to set LOW.
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

/**
 * @brief Read battery voltage and evaluate low-voltage latch with hysteresis.
 *
 * @param lvd_threshold_v Threshold to enter low-voltage state.
 * @param lvd_hysteresis_v Threshold to clear low-voltage state.
 *
 * @return Current power status snapshot.
 */
power_status_t power_get_status(float lvd_threshold_v, float lvd_hysteresis_v);
