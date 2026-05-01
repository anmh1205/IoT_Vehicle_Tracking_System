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
 *
 * ## AT Command Transport Flow
 *
 * ### 1. Initialization (modem_at_init)
 *    - Install UART driver with RTS/CTS flow control
 *    - Create mutex for thread-safe access
 *    - Create URC callback registry
 *    - Register default URC handlers (+CMSE: +CGEV for network events)
 *
 * ### 2. Send Command (modem_at_send)
 *    - Take mutex lock
 *    - Clear response buffer
 *    - Send AT command via UART
 *    - Wait for response (configurable timeout)
 *    - Copy response to caller's buffer
 *    - Release mutex
 *
 * ### 3. Send with Expect (modem_at_send_expect)
 *    - Wraps modem_at_send()
 *    - Checks for expected token in response
 *    - Returns ESP_OK if found, ESP_FAIL if not
 *
 * ### 4. URC (Unsolicited Result Code) Handling
 *    - URCs are async messages from modem
 *    - Registered callbacks invoked when prefix matches
 *    - Examples: +CMT (SMS), +CGEV (PDP), +CMQTTCONNLOST (MQTT)
 *    - Polled in FSM loop via modem_at_poll_urc()
 *
 * ## Thread Safety
 *    - Single mutex protects UART send/receive
 *    - URC callbacks execute in ISR context (must be fast)
 *    - Response buffer not protected (single consumer assumed)
 *
 * ## UART Configuration
 *    - Default: 115200 baud, 8N1
 *    - Flow control: RTS/CTS (hardware)
 *    - Buffer sizes: 2KB RX, 2KB TX
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

    return strstr(buffer, "\r\nOK\r\n") != NULL || strstr(buffer, "\r\nERROR\r\n") != NULL ||
           strstr(buffer, "+CME ERROR") != NULL || ends_with_ok || ends_with_error;
}

/**
 * @brief Check if response buffer indicates modem is waiting for input prompt.
 *
 * The SIM7600 modem sends ">" prompt when it expects additional input data
 * after certain AT commands (e.g., AT+CMGS for SMS, AT+HTTPPARA for HTTP POST data).
 * This function detects various prompt formats that the modem may send.
 *
 * @param buffer Response buffer containing modem output.
 * @return true if prompt detected, false otherwise.
 */
static bool modem_at_response_has_prompt(const char *buffer) {
    if (buffer == NULL) {
        return false;
    }

    size_t len = strlen(buffer);
    while (len > 0) {
        char c = buffer[len - 1];
        if (c != '\r' && c != '\n' && c != ' ' && c != '\t') {
            break;
        }
        len -= 1;
    }

    return strstr(buffer, "\r\n>\r\n") != NULL || strstr(buffer, "\n>\n") != NULL ||
           strstr(buffer, "\r\n>") != NULL || strstr(buffer, "\n>") != NULL ||
           (len >= 1U && buffer[len - 1] == '>');
}

static void modem_at_append_response_probe(char *probe,
                                           size_t *probe_len,
                                           const char *chunk,
                                           size_t chunk_len);

/**
 * @brief Collect modem response until completion marker or timeout.
 *
 * Reads from UART continuously until:
 * - OK/ERROR marker detected in response
 * - Prompt ">" detected (when stop_on_prompt=true)
 * - Timeout expires
 *
 * This function handles both single-line responses and multi-line modem outputs.
 * It also dispatches URC (Unsolicited Result Code) lines to registered callbacks.
 *
 * @param response Output buffer for response text (can be NULL to discard).
 * @param resp_len Size of response buffer.
 * @param timeout_ms Maximum time to wait for response completion.
 * @param stop_on_prompt If true, stop collection when prompt ">" is detected.
 * @return ESP_OK on success, ESP_FAIL on error, ESP_ERR_TIMEOUT on timeout.
 */
static esp_err_t modem_at_collect_response_until(char *response,
                                                  size_t resp_len,
                                                  uint32_t timeout_ms,
                                                  bool stop_on_prompt) {
    size_t used = 0U;
    uint64_t deadline = esp_timer_get_time() + ((uint64_t)timeout_ms * 1000ULL);
    char chunk[128];
    char response_probe[MODEM_RESPONSE_PROBE_SIZE] = {0};
    size_t response_probe_len = 0U;

    if (response != NULL && resp_len > 0U) {
        response[0] = '\0';
    }

    while (esp_timer_get_time() < deadline) {
        modem_at_drain_uart_events();
        int read = uart_read_bytes(MODEM_UART_NUM, (uint8_t *)chunk, sizeof(chunk) - 1, pdMS_TO_TICKS(100));
        if (read <= 0) {
            continue;
        }

        chunk[read] = '\0';
        if (response != NULL && resp_len > 1U && used < resp_len - 1U) {
            size_t copy_len = MIN_VALUE((size_t)read, resp_len - used - 1U);
            memcpy(response + used, chunk, copy_len);
            used += copy_len;
            response[used] = '\0';
        }
        modem_at_append_response_probe(response_probe, &response_probe_len, chunk, (size_t)read);
        modem_at_dispatch_chunk_lines(chunk, (size_t)read);

        bool response_done = false;
        if (response != NULL) {
            response_done = modem_at_response_done(response) || (stop_on_prompt && modem_at_response_has_prompt(response));
        }
        if (!response_done) {
            response_done = modem_at_response_done(response_probe) ||
                            (stop_on_prompt && modem_at_response_has_prompt(response_probe));
        }

        if (response_done) {
            bool has_error = strstr(response_probe, "ERROR") != NULL || strstr(response_probe, "+CME ERROR") != NULL;
            if (!has_error && response != NULL) {
                has_error = strstr(response, "ERROR") != NULL;
            }
            return has_error ? ESP_FAIL : ESP_OK;
        }
    }

    modem_at_drain_uart_events();
    return ESP_ERR_TIMEOUT;
}

/**
 * @brief Write raw data bytes to UART TX FIFO.
 *
 * Writes data in a loop to ensure all bytes are transmitted.
 * Waits for TX FIFO to drain completely before returning.
 *
 * @param data Pointer to data bytes to write.
 * @param data_len Number of bytes to write.
 * @return ESP_OK on success, ESP_FAIL on write failure.
 */
static esp_err_t modem_at_write_all_bytes(const uint8_t *data, size_t data_len) {
    ESP_RETURN_ON_FALSE(data != NULL, ESP_ERR_INVALID_ARG, TAG, "data null");
    ESP_RETURN_ON_FALSE(data_len > 0U, ESP_ERR_INVALID_ARG, TAG, "data_len invalid");

    size_t written_total = 0U;
    while (written_total < data_len) {
        int written = uart_write_bytes(MODEM_UART_NUM,
                                       (const char *)data + written_total,
                                       data_len - written_total);
        if (written <= 0) {
            return ESP_FAIL;
        }
        written_total += (size_t)written;
    }

    return uart_wait_tx_done(MODEM_UART_NUM, pdMS_TO_TICKS(1000));
}

/**
 * @brief Clear pending UART data after command failure.
 *
 * When an AT command fails, the modem may have leftover data in its UART buffers.
 * This function drains both the event queue and pending input to prepare
 * for the next command attempt.
 */
static void modem_at_clear_pending_after_failure(void) {
    modem_at_drain_uart_events();
    modem_at_drain_pending_input(MODEM_RX_BUFFER_SIZE);
}

/**
 * @brief Append new chunk to response probe buffer with sliding window.
 *
 * Maintains a fixed-size sliding window of the most recent response data.
 * When new data exceeds buffer size, older data is discarded.
 * This probe is used for quick completion detection without
 * scanning the full potentially-large response buffer.
 *
 * @param probe Probe buffer to append to.
 * @param probe_len In/out pointer to current probe length.
 * @param chunk New data chunk to append.
 * @param chunk_len Length of new chunk.
 */
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

    modem_at_drain_uart_events();
    modem_at_drain_pending_input(MODEM_RX_BUFFER_SIZE);
    int written = uart_write_bytes(MODEM_UART_NUM, cmd, strlen(cmd));
    if (written < 0) {
        xSemaphoreGive(s_at_lock);
        return ESP_FAIL;
    }

    esp_err_t err = modem_at_collect_response_until(response, resp_len, timeout_ms, false);
    if (err != ESP_OK) {
        modem_at_clear_pending_after_failure();
    }
    xSemaphoreGive(s_at_lock);
    return err;
}

/**
 * @brief Send AT command that requires data input after prompt.
 *
 * Two-phase send for commands that need additional data after receiving
 * the modem prompt (">"). Example: AT+CMGS (SMS send), AT+HTTPPOST.
 *
 * Phase 1: Send prepare_cmd, wait for ">" prompt.
 * Phase 2: Send data payload, wait for final response.
 *
 * @param prepare_cmd Initial AT command (e.g., "AT+CMGS=number\r").
 * @param data Data payload to send after prompt.
 * @param data_len Length of data payload.
 * @param response Output response buffer (optional).
 * @param resp_len Response buffer size.
 * @param timeout_ms Timeout for each phase.
 * @return ESP_OK on success, ESP_FAIL/ESP_ERR_TIMEOUT on failure.
 */
esp_err_t modem_at_send_prompt_data(const char *prepare_cmd,
                                    const uint8_t *data,
                                    size_t data_len,
                                    char *response,
                                    size_t resp_len,
                                    uint32_t timeout_ms) {
    ESP_RETURN_ON_FALSE(s_uart_ready, ESP_ERR_INVALID_STATE, TAG, "AT UART not initialized");
    ESP_RETURN_ON_NULL(prepare_cmd, ESP_ERR_INVALID_ARG, TAG, "prepare_cmd null");
    ESP_RETURN_ON_FALSE(data != NULL && data_len > 0U, ESP_ERR_INVALID_ARG, TAG, "prompt data invalid");

    if (xSemaphoreTake(s_at_lock, pdMS_TO_TICKS(timeout_ms)) != pdTRUE) {
        return ESP_ERR_TIMEOUT;
    }

    modem_at_drain_uart_events();
    modem_at_drain_pending_input(MODEM_RX_BUFFER_SIZE);
    int written = uart_write_bytes(MODEM_UART_NUM, prepare_cmd, strlen(prepare_cmd));
    if (written < 0) {
        xSemaphoreGive(s_at_lock);
        return ESP_FAIL;
    }

    esp_err_t err = modem_at_collect_response_until(response, resp_len, timeout_ms, true);
    if (err != ESP_OK || !modem_at_response_has_prompt(response)) {
        if (err == ESP_OK) {
            err = ESP_FAIL;
        }
        modem_at_clear_pending_after_failure();
        xSemaphoreGive(s_at_lock);
        return err;
    }

    err = modem_at_write_all_bytes(data, data_len);
    if (err != ESP_OK) {
        modem_at_clear_pending_after_failure();
        xSemaphoreGive(s_at_lock);
        return err;
    }

    err = modem_at_collect_response_until(response, resp_len, timeout_ms, false);
    if (err != ESP_OK) {
        modem_at_clear_pending_after_failure();
    }
    xSemaphoreGive(s_at_lock);
    return err;
}

/**
 * @brief Send AT command and collect response with idle timeout.
 *
 * Variant of modem_at_send that allows specifying idle timeout.
 * Stops collection early if no more data arrives after idle_timeout_ms.
 * Useful for commands that return variable-length responses.
 *
 * @param cmd AT command to send.
 * @param response Output buffer for response data.
 * @param resp_len Response buffer size.
 * @param out_len Actual bytes written to response buffer.
 * @param timeout_ms Maximum time to wait for first data.
 * @param idle_timeout_ms Maximum idle time after first data arrives.
 * @return ESP_OK on success, ESP_ERR_TIMEOUT if no data received.
 */
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
 * @brief Send AT command and verify expected token in response.
 *
 * Convenience wrapper that sends a command and checks if the expected
 * token string appears in the response. Useful for simple
 * "verify X succeeded" checks.
 *
 * @param cmd AT command to send.
 * @param expect Expected token in response (can be NULL to skip check).
 * @param timeout_ms Timeout in milliseconds.
 * @return ESP_OK if response contains expect token, ESP_FAIL otherwise.
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

/**
 * @brief Change UART baudrate at runtime.
 *
 * Dynamically changes the UART baudrate for the modem transport.
 * Used for high-speed data transfers that support higher
 * baud rates than the default.
 *
 * @param baud New baudrate value.
 * @return ESP_OK on success, ESP_ERR_INVALID_ARG on invalid baud,
 *         ESP_ERR_TIMEOUT on mutex timeout.
 */
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

/**
 * @brief Get current UART baudrate.
 *
 * @return Current baudrate value.
 */
uint32_t modem_at_get_baud(void) {
    return s_uart_baud;
}

/**
 * @brief Change UART TX/RX pins at runtime.
 *
 * Reconfigures the GPIO pins used for UART communication.
 * Requires UART driver to be initialized first.
 *
 * @param tx_pin New TX GPIO pin number.
 * @param rx_pin New RX GPIO pin number.
 * @return ESP_OK on success, ESP_ERR_TIMEOUT on mutex timeout.
 */
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

/**
 * @brief Get current UART pin configuration.
 *
 * Retrieves the current TX and RX GPIO pin numbers
 * used for UART communication.
 *
 * @param out_tx_pin Output pointer for TX pin (can be NULL).
 * @param out_rx_pin Output pointer for RX pin (can be NULL).
 */
void modem_at_get_pins(gpio_num_t *out_tx_pin, gpio_num_t *out_rx_pin) {
    if (out_tx_pin != NULL) {
        *out_tx_pin = s_uart_tx_pin;
    }
    if (out_rx_pin != NULL) {
        *out_rx_pin = s_uart_rx_pin;
    }
}

/**
 * @brief Set UART line inverse mask for signal level reversal.
 *
 * Some modem designs use inverted signal levels.
 * This function configures which signals are inverted.
 *
 * @param inverse_mask Bitmask of signals to invert.
 * @return ESP_OK on success, ESP_ERR_TIMEOUT on mutex timeout.
 */
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

/**
 * @brief Get current UART line inverse mask.
 *
 * @return Current inverse mask value.
 */
uint32_t modem_at_get_line_inverse(void) {
    return s_uart_inverse_mask;
}

/**
 * @brief Set UART frame format (data bits, parity, stop bits).
 *
 * Configures the serial frame parameters for UART communication.
 * Default is 8N1 (8 data bits, no parity, 1 stop bit).
 *
 * @param data_bits Number of data bits (5-8).
 * @param parity Parity mode (UART_PARITY_DISABLE, EVEN, ODD).
 * @param stop_bits Number of stop bits (1, 1.5, 2).
 * @return ESP_OK on success, ESP_ERR_INVALID_ARG on invalid params,
 *         ESP_ERR_TIMEOUT on mutex timeout.
 */
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

/**
 * @brief Get current UART frame format configuration.
 *
 * @param out_data_bits Output pointer for data bits (can be NULL).
 * @param out_parity Output pointer for parity mode (can be NULL).
 * @param out_stop_bits Output pointer for stop bits (can be NULL).
 */
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

/**
 * @brief Set UART source clock.
 *
 * Configures the clock source for UART operation.
 * Default is APB clock. Changing may be needed for
 * specific power or accuracy requirements.
 *
 * @param source_clk Clock source (UART_SCLK_APB, UART_SCLK_RTOS, etc.).
 * @return ESP_OK on success, ESP_ERR_TIMEOUT on mutex timeout.
 */
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

/**
 * @brief Get current UART source clock.
 *
 * @return Current source clock setting.
 */
uart_sclk_t modem_at_get_source_clk(void) {
    return s_uart_source_clk;
}

/**
 * @brief Get aggregated UART diagnostics.
 *
 * Returns cumulative error and event counters since last reset.
 * Includes FIFO overflow, buffer full, parity errors, etc.
 *
 * @param out_diag Output structure for diagnostics (cannot be NULL).
 */
void modem_at_get_uart_diag(modem_at_uart_diag_t *out_diag) {
    if (out_diag == NULL) {
        return;
    }

    modem_at_drain_uart_events();
    *out_diag = s_uart_diag;
}

/**
 * @brief Reset UART diagnostics counters to zero.
 *
 * Clears all cumulative error and event counters.
 * Should be called after clearing a fault condition
 * to start fresh diagnostics accumulation.
 */
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

/**
 * @brief Poll for URC (Unsolicited Result Code) data.
 *
 * Non-blocking poll that reads up to max_read_bytes from UART
 * and dispatches complete lines to registered URC handlers.
 * Must be called regularly to process async modem events.
 *
 * @param max_read_bytes Maximum bytes to read in this call.
 * @return ESP_OK on success, ESP_ERR_INVALID_STATE if not initialized,
 *         ESP_ERR_TIMEOUT if lock could not be acquired immediately.
 */
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
