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

#ifndef CONFIG_TRACKER_MODEM_APN
#define CONFIG_TRACKER_MODEM_APN "internet"
#endif

static const char *TAG = "MODEM_LTE";
static bool s_lte_initialized = false;
static bool s_lte_connected = false;

#define MODEM_LTE_CEREG_MAX_RETRY 20
#define MODEM_LTE_CEREG_POLL_INTERVAL_MS 1000

static esp_err_t modem_lte_send_simple(const char *cmd, const char *expect, uint32_t timeout_ms) {
    return modem_at_send_expect(cmd, expect, timeout_ms);
}

static bool modem_lte_cereg_registered(const char *response) {
    char *marker = strstr(response, "+CEREG:");
    if (marker == NULL) {
        return false;
    }

    int n = 0;
    int stat = 0;
    if (sscanf(marker, "+CEREG: %d,%d", &n, &stat) == 2) {
        return stat == 1 || stat == 5;
    }

    return false;
}

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

esp_err_t modem_lte_init(void) {
    if (s_lte_initialized) {
        return ESP_OK;
    }

    ESP_RETURN_ON_FALSE(modem_power_on() == ESP_OK, ESP_FAIL, TAG, "Modem power on failed");
    ESP_RETURN_ON_FALSE(modem_at_init() == ESP_OK, ESP_FAIL, TAG, "AT init failed");

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

    char pdp_cmd[96] = {0};
    snprintf(pdp_cmd, sizeof(pdp_cmd), "AT+CGDCONT=1,\"IP\",\"%s\"\r", CONFIG_TRACKER_MODEM_APN);
    ESP_RETURN_ON_FALSE(modem_lte_send_simple(pdp_cmd, "OK", 5000) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "PDP config failed");

    s_lte_initialized = true;
    return ESP_OK;
}

esp_err_t modem_lte_connect(void) {
    ESP_RETURN_ON_FALSE(modem_lte_init() == ESP_OK, ESP_FAIL, TAG, "LTE init failed");
    if (s_lte_connected) {
        return ESP_OK;
    }

    ESP_RETURN_ON_FALSE(modem_lte_wait_cereg_registered() == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "LTE domain registration timeout");
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

esp_err_t modem_lte_sleep(void) {
    return modem_lte_send_simple("AT+CSCLK=1\r", "OK", 5000);
}

esp_err_t modem_lte_wakeup(void) {
    return modem_lte_send_simple("AT\r", "OK", 5000);
}

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

    return -113 + (2 * rssi);
}

bool modem_lte_is_connected(void) {
    return s_lte_connected;
}
