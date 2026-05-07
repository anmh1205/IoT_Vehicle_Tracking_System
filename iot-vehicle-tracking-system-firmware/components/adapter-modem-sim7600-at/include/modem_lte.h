#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "esp_err.h"

/**
 * @file modem_lte.h
 * @brief LTE registration and PDP session management interface.
 * This header belongs to the SIM7600 AT modem adapter layer and exposes the modem boundary so higher layers do not depend on UART- or AT-private details.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


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
 * @brief Trigger non-blocking LTE connect workflow.
 */
void modem_lte_request_connect(void);

/**
 * @brief Override PDP APN used in `AT+CGDCONT`.
 *
 * @param apn APN string. Empty/NULL keeps previous value.
 */
void modem_lte_set_apn(const char *apn);

/**
 * @brief Advance LTE connect workflow one bounded step.
 *
 * @param now_ms Current uptime in milliseconds.
 *
 * @return ESP_OK when connected, ESP_ERR_NOT_FINISHED while progressing,
 *         or error code on hard failure.
 */
esp_err_t modem_lte_tick(uint64_t now_ms);

/**
 * @brief Read LTE initialization flag.
 *
 * @return true when base modem init sequence is completed.
 */
bool modem_lte_is_initialized(void);

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
