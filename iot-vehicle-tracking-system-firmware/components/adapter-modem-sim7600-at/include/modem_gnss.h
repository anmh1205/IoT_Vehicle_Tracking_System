#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "esp_err.h"
#include "gnss_model.h"

/**
 * @file modem_gnss.h
 * @brief GNSS control and parsing API via modem AT commands.
 * This header belongs to the SIM7600 AT modem adapter layer and exposes the modem boundary so higher layers do not depend on UART- or AT-private details.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief Power on modem GNSS engine.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_gnss_power_on(void);

/**
 * @brief Power off modem GNSS engine.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_gnss_power_off(void);

/**
 * @brief Check last cached fix validity.
 *
 * @return true when the last parsed GNSS sample had valid fix.
 */
bool modem_gnss_has_fix(void);

/**
 * @brief Check whether GNSS startup warm-up window has elapsed.
 *
 * @return true when location queries can run without an intentional startup delay.
 */
bool modem_gnss_is_query_ready(void);

/**
 * @brief Query modem for current GNSS information and parse result.
 *
 * @param data Output GNSS structure.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_gnss_get_location(gnss_data_t *data);
