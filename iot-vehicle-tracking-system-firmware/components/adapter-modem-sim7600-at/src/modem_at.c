#include "modem_at.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/semphr.h"

#include "driver/uart.h"
#include "esp_log.h"
#include "esp_timer.h"

#include "pin_map.h"
#include "util.h"

/**
 * @file modem_at.c
 * @brief Thread-safe AT command transport over UART with URC dispatch support.
 */

#define MODEM_RX_BUFFER_SIZE 1024
#define MODEM_MAX_URC_CALLBACKS 8
#define MODEM_URC_LINE_BUFFER_SIZE 2048
#define MODEM_RESPONSE_PROBE_SIZE 256

/**
 * @brief One URC callback registration entry.
 */
typedef struct {
    char prefix[24];
    modem_urc_cb_t callback;
} modem_urc_entry_t;

static const char *TAG = "MODEM_AT";
/* Mutex serializing AT command transactions. */
static SemaphoreHandle_t s_at_lock = NULL;
/* Fixed-size callback slots for URC prefix match. */
static modem_urc_entry_t s_urc_entries[MODEM_MAX_URC_CALLBACKS];
/* Tracks whether UART driver was initialized successfully. */
static bool s_uart_ready = false;
/* Active UART baudrate for modem transport. */
static uint32_t s_uart_baud = MODEM_UART_BAUD;
/* Active UART pin mapping for modem transport. */
static gpio_num_t s_uart_tx_pin = PIN_MODEM_TX;
static gpio_num_t s_uart_rx_pin = PIN_MODEM_RX;
/* Active UART line inversion mask. */
static uint32_t s_uart_inverse_mask = 0;
/* Active UART frame format. */
static uart_word_length_t s_uart_data_bits = UART_DATA_8_BITS;
static uart_parity_t s_uart_parity = UART_PARITY_DISABLE;
static uart_stop_bits_t s_uart_stop_bits = UART_STOP_BITS_1;
/* Active UART source clock. */
static uart_sclk_t s_uart_source_clk = UART_SCLK_DEFAULT;
/* UART event queue for frame/parity/overflow diagnostics. */
static QueueHandle_t s_uart_event_queue = NULL;
/* Aggregated UART diagnostics since last reset. */
static modem_at_uart_diag_t s_uart_diag = {0};
/* Incremental line-assembly buffer for URC/response dispatch across UART chunks. */
static char s_dispatch_line_buf[MODEM_URC_LINE_BUFFER_SIZE] = {0};
static size_t s_dispatch_line_len = 0;
static bool s_dispatch_line_overflow = false;

/**
 * @brief Drain UART event queue and aggregate error counters.
 */
static void modem_at_drain_uart_events(void) {
    if (s_uart_event_queue == NULL) {
        return;
    }

    uart_event_t event = {0};
    while (xQueueReceive(s_uart_event_queue, &event, 0) == pdTRUE) {
        switch (event.type) {
            case UART_FIFO_OVF:
                s_uart_diag.fifo_overflow_count += 1U;
                uart_flush_input(MODEM_UART_NUM);
                break;
            case UART_BUFFER_FULL:
                s_uart_diag.buffer_full_count += 1U;
                uart_flush_input(MODEM_UART_NUM);
                break;
            case UART_PARITY_ERR:
                s_uart_diag.parity_err_count += 1U;
                break;
            case UART_FRAME_ERR:
                s_uart_diag.frame_err_count += 1U;
                break;
            case UART_BREAK:
                s_uart_diag.break_count += 1U;
                break;
            default:
                break;
        }
    }
}

/**
 * @brief Dispatch one response/URC line to registered callbacks.
 *
 * @param line Null-terminated modem line.
 */
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

static void modem_at_dispatch_chunk_lines(const char *chunk, size_t chunk_len) {
    if (chunk == NULL || chunk_len == 0U) {
        return;
    }

    for (size_t i = 0; i < chunk_len; ++i) {
        char ch = chunk[i];
        if (ch == '\r' || ch == '\n') {
            if (!s_dispatch_line_overflow && s_dispatch_line_len > 0U) {
                s_dispatch_line_buf[s_dispatch_line_len] = '\0';
                modem_at_dispatch_line(s_dispatch_line_buf);
            }
            s_dispatch_line_len = 0U;
            s_dispatch_line_overflow = false;
            continue;
        }

        if (s_dispatch_line_overflow) {
            continue;
        }

        if (s_dispatch_line_len + 1U >= sizeof(s_dispatch_line_buf)) {
            s_dispatch_line_len = 0U;
            s_dispatch_line_overflow = true;
            ESP_LOGW(TAG, "AT line overflow (>=%u bytes), drop current line", (unsigned)sizeof(s_dispatch_line_buf));
            continue;
        }

        s_dispatch_line_buf[s_dispatch_line_len++] = ch;
    }
}

/**
 * @brief Drain pending UART bytes and dispatch complete URC lines.
 *
 * Must be called while `s_at_lock` is already held to avoid lock inversion
 * with `modem_at_poll_urc`.
 */
static void modem_at_drain_pending_input(uint32_t max_read_bytes) {
    if (!s_uart_ready || max_read_bytes == 0U) {
        return;
    }

    uint32_t remaining = max_read_bytes;
    char chunk[128];
    while (remaining > 0U) {
        modem_at_drain_uart_events();
        size_t read_cap = (size_t)MIN_VALUE((uint32_t)(sizeof(chunk) - 1U), remaining);
        int read = uart_read_bytes(MODEM_UART_NUM, (uint8_t *)chunk, read_cap, 0);
        if (read <= 0) {
            break;
        }

        remaining -= (uint32_t)read;
        chunk[read] = '\0';
        modem_at_dispatch_chunk_lines(chunk, (size_t)read);
    }
}

/**
 * @brief Detect AT command completion markers in response buffer.
 *
 * @param buffer Full response buffer.
 *
 * @return true when response has terminal marker.
 */
static bool modem_at_response_done(const char *buffer) {
    size_t len = strlen(buffer);
    while (len > 0) {
        char c = buffer[len - 1];
        if (c != '\r' && c != '\n' && c != ' ' && c != '\t') {
            break;
        }
        len -= 1;
    }

    bool ends_with_ok = len >= 2 && strncmp(buffer + (len - 2), "OK", 2) == 0;
    bool ends_with_error = len >= 5 && strncmp(buffer + (len - 5), "ERROR", 5) == 0;
    bool ends_with_prompt = len >= 1 && buffer[len - 1] == '>';

    return strstr(buffer, "\r\nOK\r\n") != NULL || strstr(buffer, "\r\nERROR\r\n") != NULL ||
           strstr(buffer, "+CME ERROR") != NULL || ends_with_ok || ends_with_error || ends_with_prompt;
}

static void modem_at_append_response_probe(char *probe,
                                           size_t *probe_len,
                                           const char *chunk,
                                           size_t chunk_len) {
    if (probe == NULL || probe_len == NULL || chunk == NULL || chunk_len == 0U) {
        return;
    }

    size_t max_probe_len = MODEM_RESPONSE_PROBE_SIZE - 1U;
    if (chunk_len >= max_probe_len) {
        memcpy(probe, chunk + (chunk_len - max_probe_len), max_probe_len);
        *probe_len = max_probe_len;
        probe[*probe_len] = '\0';
        return;
    }

    if (*probe_len + chunk_len > max_probe_len) {
        size_t drop_len = (*probe_len + chunk_len) - max_probe_len;
        memmove(probe, probe + drop_len, *probe_len - drop_len);
        *probe_len -= drop_len;
    }

    memcpy(probe + *probe_len, chunk, chunk_len);
    *probe_len += chunk_len;
    probe[*probe_len] = '\0';
}

/**
 * @brief Initialize UART and synchronization resources.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
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

    esp_err_t err = uart_driver_install(MODEM_UART_NUM,
                                        MODEM_RX_BUFFER_SIZE,
                                        0,
                                        32,
                                        &s_uart_event_queue,
                                        0);
    bool driver_installed = err == ESP_OK;
    if (err == ESP_OK) {
        err = uart_param_config(MODEM_UART_NUM, &uart_cfg);
    }
    if (err == ESP_OK) {
        err = uart_set_pin(MODEM_UART_NUM, PIN_MODEM_TX, PIN_MODEM_RX, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE);
    }
    if (err == ESP_OK) {
        err = uart_set_line_inverse(MODEM_UART_NUM, MODEM_UART_LINE_INVERSE_MASK);
    }
    if (err == ESP_OK) {
        err = uart_flush(MODEM_UART_NUM);
    }
    if (err != ESP_OK) {
        if (driver_installed) {
            uart_driver_delete(MODEM_UART_NUM);
        }
        s_uart_event_queue = NULL;
        ESP_LOGE(TAG, "UART init failed: %s", esp_err_to_name(err));
        return err;
    }

    s_at_lock = xSemaphoreCreateMutex();
    if (s_at_lock == NULL) {
        uart_driver_delete(MODEM_UART_NUM);
        s_uart_event_queue = NULL;
        ESP_LOGE(TAG, "Failed to create AT mutex");
        return ESP_ERR_NO_MEM;
    }

    s_dispatch_line_len = 0;
    s_dispatch_line_buf[0] = '\0';
    s_dispatch_line_overflow = false;
    s_uart_baud = MODEM_UART_BAUD;
    s_uart_tx_pin = PIN_MODEM_TX;
    s_uart_rx_pin = PIN_MODEM_RX;
    s_uart_inverse_mask = MODEM_UART_LINE_INVERSE_MASK;
    s_uart_data_bits = UART_DATA_8_BITS;
    s_uart_parity = UART_PARITY_DISABLE;
    s_uart_stop_bits = UART_STOP_BITS_1;
    s_uart_source_clk = UART_SCLK_DEFAULT;
    memset(&s_uart_diag, 0, sizeof(s_uart_diag));
    modem_at_drain_uart_events();
    s_uart_ready = true;
    return ESP_OK;
}

/**
 * @brief Release AT transport resources.
 */
void modem_at_deinit(void) {
    if (s_at_lock != NULL) {
        vSemaphoreDelete(s_at_lock);
        s_at_lock = NULL;
    }

    if (s_uart_ready) {
        uart_driver_delete(MODEM_UART_NUM);
        s_uart_ready = false;
    }

    s_uart_event_queue = NULL;
    memset(s_urc_entries, 0, sizeof(s_urc_entries));
    s_dispatch_line_len = 0;
    s_dispatch_line_buf[0] = '\0';
    s_dispatch_line_overflow = false;
    memset(&s_uart_diag, 0, sizeof(s_uart_diag));
}

/**
 * @brief Send command and wait for response completion.
 *
 * @param cmd AT command string.
 * @param response Output response buffer (optional).
 * @param resp_len Response buffer size.
 * @param timeout_ms Timeout in milliseconds.
 *
 * @return ESP_OK, ESP_FAIL, ESP_ERR_TIMEOUT, or state errors.
 */
esp_err_t modem_at_send(const char *cmd, char *response, size_t resp_len, uint32_t timeout_ms) {
    ESP_RETURN_ON_FALSE(s_uart_ready, ESP_ERR_INVALID_STATE, TAG, "AT UART not initialized");
    ESP_RETURN_ON_NULL(cmd, ESP_ERR_INVALID_ARG, TAG, "cmd is NULL");

    if (xSemaphoreTake(s_at_lock, pdMS_TO_TICKS(timeout_ms)) != pdTRUE) {
        return ESP_ERR_TIMEOUT;
    }

    if (response != NULL && resp_len > 0) {
        response[0] = '\0';
    }

    /*
     * Preserve asynchronous URCs (especially MQTT RX commands) instead of
     * dropping them with a raw UART flush before each AT command.
     */
    modem_at_drain_uart_events();
    modem_at_drain_pending_input(MODEM_RX_BUFFER_SIZE);
    int written = uart_write_bytes(MODEM_UART_NUM, cmd, strlen(cmd));
    if (written < 0) {
        xSemaphoreGive(s_at_lock);
        return ESP_FAIL;
    }

    size_t used = 0;
    uint64_t deadline = esp_timer_get_time() + ((uint64_t)timeout_ms * 1000ULL);
    char chunk[128];
    char response_probe[MODEM_RESPONSE_PROBE_SIZE] = {0};
    size_t response_probe_len = 0U;

    while (esp_timer_get_time() < deadline) {
        modem_at_drain_uart_events();
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
        modem_at_append_response_probe(response_probe, &response_probe_len, chunk, (size_t)read);

        modem_at_dispatch_chunk_lines(chunk, (size_t)read);

        bool response_done = false;
        if (response != NULL) {
            response_done = modem_at_response_done(response);
        }
        if (!response_done) {
            response_done = modem_at_response_done(response_probe);
        }

        if (response_done) {
            xSemaphoreGive(s_at_lock);
            bool has_error = strstr(response_probe, "ERROR") != NULL || strstr(response_probe, "+CME ERROR") != NULL;
            if (!has_error && response != NULL) {
                has_error = strstr(response, "ERROR") != NULL;
            }
            return has_error ? ESP_FAIL : ESP_OK;
        }
    }

    modem_at_drain_uart_events();
    xSemaphoreGive(s_at_lock);
    return ESP_ERR_TIMEOUT;
}

esp_err_t modem_at_send_collect(const char *cmd,
                                uint8_t *response,
                                size_t resp_len,
                                size_t *out_len,
                                uint32_t timeout_ms,
                                uint32_t idle_timeout_ms) {
    ESP_RETURN_ON_FALSE(s_uart_ready, ESP_ERR_INVALID_STATE, TAG, "AT UART not initialized");
    ESP_RETURN_ON_NULL(cmd, ESP_ERR_INVALID_ARG, TAG, "cmd is NULL");
    ESP_RETURN_ON_FALSE(response != NULL && resp_len > 0U, ESP_ERR_INVALID_ARG, TAG, "response buffer invalid");

    if (xSemaphoreTake(s_at_lock, pdMS_TO_TICKS(timeout_ms)) != pdTRUE) {
        return ESP_ERR_TIMEOUT;
    }

    memset(response, 0, resp_len);
    if (out_len != NULL) {
        *out_len = 0U;
    }

    modem_at_drain_uart_events();
    modem_at_drain_pending_input(MODEM_RX_BUFFER_SIZE);

    int written = uart_write_bytes(MODEM_UART_NUM, cmd, strlen(cmd));
    if (written < 0) {
        xSemaphoreGive(s_at_lock);
        return ESP_FAIL;
    }

    size_t used = 0U;
    bool received_any = false;
    uint64_t deadline = esp_timer_get_time() + ((uint64_t)timeout_ms * 1000ULL);
    uint64_t idle_deadline = 0ULL;
    char chunk[128] = {0};

    while (esp_timer_get_time() < deadline) {
        modem_at_drain_uart_events();
        int read = uart_read_bytes(MODEM_UART_NUM, (uint8_t *)chunk, sizeof(chunk), pdMS_TO_TICKS(50));
        if (read > 0) {
            received_any = true;
            idle_deadline = esp_timer_get_time() + ((uint64_t)idle_timeout_ms * 1000ULL);

            size_t copy_len = MIN_VALUE((size_t)read, resp_len - used);
            if (copy_len > 0U) {
                memcpy(response + used, chunk, copy_len);
                used += copy_len;
            }

            if (used >= resp_len) {
                break;
            }
            continue;
        }

        if (received_any && idle_timeout_ms > 0U && esp_timer_get_time() >= idle_deadline) {
            break;
        }
    }

    modem_at_drain_uart_events();
    xSemaphoreGive(s_at_lock);

    if (out_len != NULL) {
        *out_len = used;
    }

    if (!received_any) {
        return ESP_ERR_TIMEOUT;
    }

    return ESP_OK;
}

/**
 * @brief Send AT command and assert expected marker in response.
 *
 * @param cmd AT command.
 * @param expect Expected substring or NULL.
 * @param timeout_ms Timeout in milliseconds.
 *
 * @return ESP_OK on success, otherwise an error code.
 */
esp_err_t modem_at_send_expect(const char *cmd, const char *expect, uint32_t timeout_ms) {
    char response[MODEM_RX_BUFFER_SIZE] = {0};
    esp_err_t err = modem_at_send(cmd, response, sizeof(response), timeout_ms);
    if (err != ESP_OK) {
        return err;
    }

    if (expect != NULL && strstr(response, expect) == NULL) {
        return ESP_FAIL;
    }

    return ESP_OK;
}

esp_err_t modem_at_set_baud(uint32_t baud) {
    ESP_RETURN_ON_FALSE(s_uart_ready, ESP_ERR_INVALID_STATE, TAG, "AT UART not initialized");
    ESP_RETURN_ON_FALSE(baud > 0, ESP_ERR_INVALID_ARG, TAG, "Invalid baud");

    if (xSemaphoreTake(s_at_lock, portMAX_DELAY) != pdTRUE) {
        return ESP_ERR_TIMEOUT;
    }

    if (baud == s_uart_baud) {
        xSemaphoreGive(s_at_lock);
        return ESP_OK;
    }

    esp_err_t err = uart_set_baudrate(MODEM_UART_NUM, baud);
    if (err == ESP_OK) {
        s_uart_baud = baud;
        uart_flush_input(MODEM_UART_NUM);
    }

    xSemaphoreGive(s_at_lock);
    return err;
}

uint32_t modem_at_get_baud(void) {
    return s_uart_baud;
}

esp_err_t modem_at_set_pins(gpio_num_t tx_pin, gpio_num_t rx_pin) {
    ESP_RETURN_ON_FALSE(s_uart_ready, ESP_ERR_INVALID_STATE, TAG, "AT UART not initialized");

    if (xSemaphoreTake(s_at_lock, portMAX_DELAY) != pdTRUE) {
        return ESP_ERR_TIMEOUT;
    }

    esp_err_t err = uart_set_pin(MODEM_UART_NUM, tx_pin, rx_pin, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE);
    if (err == ESP_OK) {
        s_uart_tx_pin = tx_pin;
        s_uart_rx_pin = rx_pin;
        uart_flush_input(MODEM_UART_NUM);
    }

    xSemaphoreGive(s_at_lock);
    return err;
}

void modem_at_get_pins(gpio_num_t *out_tx_pin, gpio_num_t *out_rx_pin) {
    if (out_tx_pin != NULL) {
        *out_tx_pin = s_uart_tx_pin;
    }
    if (out_rx_pin != NULL) {
        *out_rx_pin = s_uart_rx_pin;
    }
}

esp_err_t modem_at_set_line_inverse(uint32_t inverse_mask) {
    ESP_RETURN_ON_FALSE(s_uart_ready, ESP_ERR_INVALID_STATE, TAG, "AT UART not initialized");

    if (xSemaphoreTake(s_at_lock, portMAX_DELAY) != pdTRUE) {
        return ESP_ERR_TIMEOUT;
    }

    if (inverse_mask == s_uart_inverse_mask) {
        xSemaphoreGive(s_at_lock);
        return ESP_OK;
    }

    esp_err_t err = uart_set_line_inverse(MODEM_UART_NUM, inverse_mask);
    if (err == ESP_OK) {
        s_uart_inverse_mask = inverse_mask;
        uart_flush_input(MODEM_UART_NUM);
    }

    xSemaphoreGive(s_at_lock);
    return err;
}

uint32_t modem_at_get_line_inverse(void) {
    return s_uart_inverse_mask;
}

esp_err_t modem_at_set_frame_format(uart_word_length_t data_bits,
                                    uart_parity_t parity,
                                    uart_stop_bits_t stop_bits) {
    ESP_RETURN_ON_FALSE(s_uart_ready, ESP_ERR_INVALID_STATE, TAG, "AT UART not initialized");

    if (xSemaphoreTake(s_at_lock, portMAX_DELAY) != pdTRUE) {
        return ESP_ERR_TIMEOUT;
    }

    if (data_bits == s_uart_data_bits && parity == s_uart_parity && stop_bits == s_uart_stop_bits) {
        xSemaphoreGive(s_at_lock);
        return ESP_OK;
    }

    esp_err_t err = uart_set_word_length(MODEM_UART_NUM, data_bits);
    if (err == ESP_OK) {
        err = uart_set_parity(MODEM_UART_NUM, parity);
    }
    if (err == ESP_OK) {
        err = uart_set_stop_bits(MODEM_UART_NUM, stop_bits);
    }

    if (err == ESP_OK) {
        s_uart_data_bits = data_bits;
        s_uart_parity = parity;
        s_uart_stop_bits = stop_bits;
        uart_flush_input(MODEM_UART_NUM);
    }

    xSemaphoreGive(s_at_lock);
    return err;
}

void modem_at_get_frame_format(uart_word_length_t *out_data_bits,
                               uart_parity_t *out_parity,
                               uart_stop_bits_t *out_stop_bits) {
    if (out_data_bits != NULL) {
        *out_data_bits = s_uart_data_bits;
    }
    if (out_parity != NULL) {
        *out_parity = s_uart_parity;
    }
    if (out_stop_bits != NULL) {
        *out_stop_bits = s_uart_stop_bits;
    }
}

esp_err_t modem_at_set_source_clk(uart_sclk_t source_clk) {
    ESP_RETURN_ON_FALSE(s_uart_ready, ESP_ERR_INVALID_STATE, TAG, "AT UART not initialized");

    if (xSemaphoreTake(s_at_lock, portMAX_DELAY) != pdTRUE) {
        return ESP_ERR_TIMEOUT;
    }

    if (source_clk == s_uart_source_clk) {
        xSemaphoreGive(s_at_lock);
        return ESP_OK;
    }

    const uart_config_t uart_cfg = {
        .baud_rate = (int)s_uart_baud,
        .data_bits = s_uart_data_bits,
        .parity = s_uart_parity,
        .stop_bits = s_uart_stop_bits,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = source_clk,
    };
    esp_err_t err = uart_param_config(MODEM_UART_NUM, &uart_cfg);
    if (err == ESP_OK) {
        s_uart_source_clk = source_clk;
        uart_flush_input(MODEM_UART_NUM);
    }

    xSemaphoreGive(s_at_lock);
    return err;
}

uart_sclk_t modem_at_get_source_clk(void) {
    return s_uart_source_clk;
}

void modem_at_get_uart_diag(modem_at_uart_diag_t *out_diag) {
    if (out_diag == NULL) {
        return;
    }

    modem_at_drain_uart_events();
    *out_diag = s_uart_diag;
}

void modem_at_reset_uart_diag(void) {
    modem_at_drain_uart_events();
    memset(&s_uart_diag, 0, sizeof(s_uart_diag));
}

/**
 * @brief Register URC prefix callback.
 *
 * @param prefix URC prefix.
 * @param cb Callback function.
 */
void modem_at_register_urc(const char *prefix, modem_urc_cb_t cb) {
    if (prefix == NULL || cb == NULL) {
        return;
    }

    size_t prefix_len = strlen(prefix);
    for (size_t i = 0; i < ARRAY_SIZE(s_urc_entries); ++i) {
        if (s_urc_entries[i].callback == NULL) {
            continue;
        }

        if (s_urc_entries[i].callback == cb || strcmp(s_urc_entries[i].prefix, prefix) == 0) {
            size_t copied = util_copy_string(s_urc_entries[i].prefix, sizeof(s_urc_entries[i].prefix), prefix);
            s_urc_entries[i].callback = cb;
            if (copied < prefix_len) {
                ESP_LOGW(TAG,
                         "URC prefix truncated on update idx=%u src_len=%u dst_len=%u",
                         (unsigned)i,
                         (unsigned)prefix_len,
                         (unsigned)sizeof(s_urc_entries[i].prefix));
            }
            return;
        }
    }

    for (size_t i = 0; i < ARRAY_SIZE(s_urc_entries); ++i) {
        if (s_urc_entries[i].callback == NULL) {
            size_t copied = util_copy_string(s_urc_entries[i].prefix, sizeof(s_urc_entries[i].prefix), prefix);
            s_urc_entries[i].callback = cb;
            if (copied < prefix_len) {
                ESP_LOGW(TAG,
                         "URC prefix truncated idx=%u src_len=%u dst_len=%u",
                         (unsigned)i,
                         (unsigned)prefix_len,
                         (unsigned)sizeof(s_urc_entries[i].prefix));
            }
            return;
        }
    }

    ESP_LOGE(TAG,
             "URC register failed (table full=%u) prefix=%s",
             (unsigned)ARRAY_SIZE(s_urc_entries),
             prefix);
}

esp_err_t modem_at_poll_urc(uint32_t max_read_bytes) {
    ESP_RETURN_ON_FALSE(s_uart_ready, ESP_ERR_INVALID_STATE, TAG, "AT UART not initialized");

    if (max_read_bytes == 0U) {
        return ESP_OK;
    }

    if (xSemaphoreTake(s_at_lock, 0) != pdTRUE) {
        return ESP_ERR_TIMEOUT;
    }

    uint32_t remaining = max_read_bytes;
    char chunk[128];
    while (remaining > 0U) {
        modem_at_drain_uart_events();
        size_t read_cap = (size_t)MIN_VALUE((uint32_t)(sizeof(chunk) - 1U), remaining);
        int read = uart_read_bytes(MODEM_UART_NUM,
                                   (uint8_t *)chunk,
                                   read_cap,
                                   0);
        if (read <= 0) {
            break;
        }

        remaining -= (uint32_t)read;
        chunk[read] = '\0';
        modem_at_dispatch_chunk_lines(chunk, (size_t)read);
    }

    xSemaphoreGive(s_at_lock);
    return ESP_OK;
}
