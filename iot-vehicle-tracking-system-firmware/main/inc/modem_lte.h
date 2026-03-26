#pragma once

#include <stdbool.h>

#include "esp_err.h"

/**
 * @file modem_lte.h
 * @brief LTE registration and PDP session management interface.
 */

/**
 * @brief Initialize modem for LTE operation (power, AT session, APN profile).
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_lte_init(void);

/**
 * @brief Register to LTE network and activate PDP context.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_lte_connect(void);

/**
 * @brief Deactivate PDP context if connected.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_lte_disconnect(void);

/**
 * @brief Put modem in low-power idle mode.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_lte_sleep(void);

/**
 * @brief Wake modem from low-power mode.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_lte_wakeup(void);

/**
 * @brief Read current RSSI value and convert to dBm.
 *
 * @return RSSI in dBm, or -1 when unavailable.
 */
int modem_lte_get_rssi(void);

/**
 * @brief Read cached LTE connection flag.
 *
 * @return true when LTE PDP context is active.
 */
bool modem_lte_is_connected(void);
