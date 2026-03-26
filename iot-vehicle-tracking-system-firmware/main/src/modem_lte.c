#include "modem_lte.h"

#include <stdio.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "sdkconfig.h"

#include "esp_log.h"

#include "modem_at.h"
#include "power_mgr.h"
#include "util.h"

/**
 * @file modem_lte.c
 * @brief LTE modem initialization, network registration, and PDP data session flow.
 */

#ifndef CONFIG_TRACKER_MODEM_APN
#define CONFIG_TRACKER_MODEM_APN "internet"
#endif

static const char *TAG = "MODEM_LTE";
/* True after static modem setup is complete. */
static bool s_lte_initialized = false;
/* True when PDP context is active. */
static bool s_lte_connected = false;

#define MODEM_LTE_CEREG_MAX_RETRY 20
#define MODEM_LTE_CEREG_POLL_INTERVAL_MS 1000

/**
 * @brief Send AT command and check expected token.
 *
 * @param cmd AT command.
 * @param expect Expected response token.
 * @param timeout_ms Timeout in milliseconds.
 *
 * @return ESP_OK on success, otherwise error code.
 */
static esp_err_t modem_lte_send_simple(const char *cmd, const char *expect, uint32_t timeout_ms) {
    return modem_at_send_expect(cmd, expect, timeout_ms);
}

/**
 * @brief Parse `+CEREG` response and determine registration state.
 *
 * @param response Full modem response text.
 *
 * @return true when modem is registered (home or roaming).
 */
static bool modem_lte_cereg_registered(const char *response) {
    char *marker = strstr(response, "+CEREG:");
    if (marker == NULL) {
        return false;
    }

    int n = 0;
    int stat = 0;
    if (sscanf(marker, "+CEREG: %d,%d", &n, &stat) == 2) {
        /* 1 = home network, 5 = roaming network. */
        return stat == 1 || stat == 5;
    }

    return false;
}

/**
 * @brief Poll registration state until attached or timeout.
 *
 * @return ESP_OK when registered, ESP_ERR_TIMEOUT otherwise.
 */
static esp_err_t modem_lte_wait_cereg_registered(void) {
    char response[256] = {0};

    for (int attempt = 0; attempt < MODEM_LTE_CEREG_MAX_RETRY; ++attempt) {
        if (modem_at_send("AT+CEREG?\r", response, sizeof(response), 5000) == ESP_OK &&
            modem_lte_cereg_registered(response)) {
            return ESP_OK;
        }
        vTaskDelay(pdMS_TO_TICKS(MODEM_LTE_CEREG_POLL_INTERVAL_MS));
    }

    return ESP_ERR_TIMEOUT;
}

/**
 * @brief Initialize modem power and LTE base profile.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_lte_init(void) {
    if (s_lte_initialized) {
        return ESP_OK;
    }

    /* Power up modem hardware and initialize AT transport first. */
    ESP_RETURN_ON_FALSE(modem_power_on() == ESP_OK, ESP_FAIL, TAG, "Modem power on failed");
    ESP_RETURN_ON_FALSE(modem_at_init() == ESP_OK, ESP_FAIL, TAG, "AT init failed");

    /* Basic sanity and modem setup sequence. */
    ESP_RETURN_ON_FALSE(modem_lte_send_simple("AT\r", "OK", 5000) == ESP_OK, ESP_FAIL, TAG, "AT failed");
    ESP_RETURN_ON_FALSE(modem_lte_send_simple("ATE0\r", "OK", 5000) == ESP_OK, ESP_FAIL, TAG, "ATE0 failed");
    ESP_RETURN_ON_FALSE(modem_lte_send_simple("AT+CPIN?\r", "+CPIN: READY", 5000) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "SIM not ready");
    ESP_RETURN_ON_FALSE(modem_lte_send_simple("AT+CNMP=2\r", "OK", 5000) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "Auto network mode set failed");

    /* Configure PDP profile with APN from Kconfig. */
    char pdp_cmd[96] = {0};
    snprintf(pdp_cmd, sizeof(pdp_cmd), "AT+CGDCONT=1,\"IP\",\"%s\"\r", CONFIG_TRACKER_MODEM_APN);
    ESP_RETURN_ON_FALSE(modem_lte_send_simple(pdp_cmd, "OK", 5000) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "PDP config failed");

    s_lte_initialized = true;
    return ESP_OK;
}

/**
 * @brief Connect LTE data path by registration + PDP activation.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t modem_lte_connect(void) {
    ESP_RETURN_ON_FALSE(modem_lte_init() == ESP_OK, ESP_FAIL, TAG, "LTE init failed");
    if (s_lte_connected) {
        return ESP_OK;
    }

    /* Wait for network registration before data activation. */
    ESP_RETURN_ON_FALSE(modem_lte_wait_cereg_registered() == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "LTE domain registration timeout");

    /* Activate PDP context and confirm IP assignment. */
    ESP_RETURN_ON_FALSE(modem_lte_send_simple("AT+CGACT=1,1\r", "OK", 15000) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "PDP activation failed");
    ESP_RETURN_ON_FALSE(modem_lte_send_simple("AT+CGPADDR=1\r", "+CGPADDR:", 5000) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "IP query failed");

    s_lte_connected = true;
    return ESP_OK;
}

/**
 * @brief Deactivate LTE PDP context.
 *
 * @return ESP_OK on success, otherwise modem command error.
 */
esp_err_t modem_lte_disconnect(void) {
    if (!s_lte_connected) {
        return ESP_OK;
    }

    esp_err_t err = modem_lte_send_simple("AT+CGACT=0,1\r", "OK", 10000);
    if (err == ESP_OK) {
        s_lte_connected = false;
    }
    return err;
}

/**
 * @brief Enable modem clock-stop low power mode.
 *
 * @return ESP_OK on success, otherwise modem command error.
 */
esp_err_t modem_lte_sleep(void) {
    return modem_lte_send_simple("AT+CSCLK=1\r", "OK", 5000);
}

/**
 * @brief Wake modem from low power mode with basic `AT` probe.
 *
 * @return ESP_OK on success, otherwise modem command error.
 */
esp_err_t modem_lte_wakeup(void) {
    return modem_lte_send_simple("AT\r", "OK", 5000);
}

/**
 * @brief Read RSSI value and convert CSQ index to dBm.
 *
 * @return RSSI in dBm, or -1 if unavailable/invalid.
 */
int modem_lte_get_rssi(void) {
    char response[256] = {0};
    if (modem_at_send("AT+CSQ\r", response, sizeof(response), 5000) != ESP_OK) {
        return -1;
    }

    char *marker = strstr(response, "+CSQ:");
    if (marker == NULL) {
        return -1;
    }

    int rssi = 99;
    if (sscanf(marker, "+CSQ: %d", &rssi) != 1 || rssi == 99) {
        return -1;
    }

    /* 3GPP mapping: dBm = -113 + 2 * CSQ. */
    return -113 + (2 * rssi);
}

/**
 * @brief Read cached LTE connection flag.
 *
 * @return true when PDP context is active.
 */
bool modem_lte_is_connected(void) {
    return s_lte_connected;
}
