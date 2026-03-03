#include "modem_at.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"

#include "driver/uart.h"
#include "esp_log.h"
#include "esp_timer.h"

#include "pin_map.h"
#include "util.h"

#define MODEM_RX_BUFFER_SIZE 1024
#define MODEM_MAX_URC_CALLBACKS 4

typedef struct {
    char prefix[24];
    modem_urc_cb_t callback;
} modem_urc_entry_t;

static const char *TAG = "MODEM_AT";
static SemaphoreHandle_t s_at_lock = NULL;
static modem_urc_entry_t s_urc_entries[MODEM_MAX_URC_CALLBACKS];
static bool s_uart_ready = false;

static void modem_at_dispatch_line(const char *line) {
    if (line == NULL || line[0] == '\0') {
        return;
    }

    for (size_t i = 0; i < ARRAY_SIZE(s_urc_entries); ++i) {
        if (s_urc_entries[i].callback == NULL) {
            continue;
        }
        if (strncmp(line, s_urc_entries[i].prefix, strlen(s_urc_entries[i].prefix)) == 0) {
            s_urc_entries[i].callback(line);
        }
    }
}

static bool modem_at_response_done(const char *buffer) {
    return strstr(buffer, "\r\nOK\r\n") != NULL || strstr(buffer, "\r\nERROR\r\n") != NULL ||
           strstr(buffer, "+CME ERROR") != NULL;
}

esp_err_t modem_at_init(void) {
    if (s_uart_ready) {
        return ESP_OK;
    }

    const uart_config_t uart_cfg = {
        .baud_rate = MODEM_UART_BAUD,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_DEFAULT,
    };

    ESP_ERROR_CHECK(uart_driver_install(MODEM_UART_NUM, MODEM_RX_BUFFER_SIZE, 0, 0, NULL, 0));
    ESP_ERROR_CHECK(uart_param_config(MODEM_UART_NUM, &uart_cfg));
    ESP_ERROR_CHECK(uart_set_pin(MODEM_UART_NUM, PIN_MODEM_TX, PIN_MODEM_RX, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE));
    ESP_ERROR_CHECK(uart_flush(MODEM_UART_NUM));

    s_at_lock = xSemaphoreCreateMutex();
    ESP_RETURN_ON_NULL(s_at_lock, ESP_ERR_NO_MEM, TAG, "Failed to create AT mutex");

    memset(s_urc_entries, 0, sizeof(s_urc_entries));
    s_uart_ready = true;
    return ESP_OK;
}

void modem_at_deinit(void) {
    if (s_at_lock != NULL) {
        vSemaphoreDelete(s_at_lock);
        s_at_lock = NULL;
    }

    if (s_uart_ready) {
        uart_driver_delete(MODEM_UART_NUM);
        s_uart_ready = false;
    }
}

esp_err_t modem_at_send(const char *cmd, char *response, size_t resp_len, uint32_t timeout_ms) {
    ESP_RETURN_ON_FALSE(s_uart_ready, ESP_ERR_INVALID_STATE, TAG, "AT UART not initialized");
    ESP_RETURN_ON_NULL(cmd, ESP_ERR_INVALID_ARG, TAG, "cmd is NULL");

    if (xSemaphoreTake(s_at_lock, pdMS_TO_TICKS(timeout_ms)) != pdTRUE) {
        return ESP_ERR_TIMEOUT;
    }

    if (response != NULL && resp_len > 0) {
        response[0] = '\0';
    }

    uart_flush_input(MODEM_UART_NUM);
    int written = uart_write_bytes(MODEM_UART_NUM, cmd, strlen(cmd));
    if (written < 0) {
        xSemaphoreGive(s_at_lock);
        return ESP_FAIL;
    }

    size_t used = 0;
    uint64_t deadline = esp_timer_get_time() + ((uint64_t)timeout_ms * 1000ULL);
    char chunk[128];

    while (esp_timer_get_time() < deadline) {
        int read = uart_read_bytes(MODEM_UART_NUM, (uint8_t *)chunk, sizeof(chunk) - 1, pdMS_TO_TICKS(100));
        if (read <= 0) {
            continue;
        }

        chunk[read] = '\0';
        if (response != NULL && resp_len > 1) {
            size_t copy_len = MIN_VALUE((size_t)read, resp_len - used - 1);
            memcpy(response + used, chunk, copy_len);
            used += copy_len;
            response[used] = '\0';
        }

        char local_copy[128];
        memcpy(local_copy, chunk, (size_t)read + 1);
        char *save_ptr = NULL;
        char *line = strtok_r(local_copy, "\r\n", &save_ptr);
        while (line != NULL) {
            modem_at_dispatch_line(line);
            line = strtok_r(NULL, "\r\n", &save_ptr);
        }

        if (response != NULL && modem_at_response_done(response)) {
            xSemaphoreGive(s_at_lock);
            return strstr(response, "ERROR") != NULL ? ESP_FAIL : ESP_OK;
        }
    }

    xSemaphoreGive(s_at_lock);
    return ESP_ERR_TIMEOUT;
}

esp_err_t modem_at_send_expect(const char *cmd, const char *expect, uint32_t timeout_ms) {
    char response[MODEM_RX_BUFFER_SIZE] = {0};
    esp_err_t err = modem_at_send(cmd, response, sizeof(response), timeout_ms);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "AT send failed");
    ESP_RETURN_ON_FALSE(expect == NULL || strstr(response, expect) != NULL,
                        ESP_FAIL,
                        TAG,
                        "Expected response not found");
    return ESP_OK;
}

void modem_at_register_urc(const char *prefix, modem_urc_cb_t cb) {
    if (prefix == NULL || cb == NULL) {
        return;
    }

    for (size_t i = 0; i < ARRAY_SIZE(s_urc_entries); ++i) {
        if (s_urc_entries[i].callback == NULL) {
            util_copy_string(s_urc_entries[i].prefix, sizeof(s_urc_entries[i].prefix), prefix);
            s_urc_entries[i].callback = cb;
            return;
        }
    }
}
