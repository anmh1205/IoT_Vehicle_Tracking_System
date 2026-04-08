#include "ble_obd.h"

#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"

#include "esp_log.h"
#include "os/os_mbuf.h"

#include "ble_mgr.h"
#include "ble_util.h"
#include "util.h"

/**
 * @file ble_obd.c
 * @brief OBD-over-BLE session layer with ELM327 command/response handling.
 */

#define OBD_MODE_CURRENT_DATA 0x01
#define OBD_TX_CHAR_UUID "0x2af1"
#define OBD_RX_CHAR_UUID "0x2af0"
#define OBD_SERVICE_UUID "0x18f0"
#define BLE_OBD_ELM327_INTER_CMD_DELAY_MS 80
#define BLE_OBD_DIAG_LOG_INTERVAL_MS 10000U

/**
 * @brief BLE OBD runtime context.
 */
struct ble_obd_ctx {
    /* Underlying BLE manager context. */
    ble_mgr_ctx_t *mgr_ctx;
    /* Callback receiving decoded OBD responses. */
    ble_obd_response_cb_t response_cb;
    /* Serializes API send calls to avoid interleaved transactions. */
    SemaphoreHandle_t api_mutex;
    /* Signaled when one response/prompt is received. */
    SemaphoreHandle_t response_sem;
    struct {
        /* Outgoing request frame buffer (`010C\r`, ...). */
        char tx_buf[32];
        /* Last sent OBD mode for response validation. */
        uint8_t mode;
        /* Last sent PID for response validation. */
        uint8_t pid;
        /* True only for OBD mode/PID transaction path. */
        bool expect_obd_response;
    } tx_data;
    struct {
        /* Aggregated notify chunks for current transaction. */
        char buf[BLE_OBD_MAX_DATA_LEN];
        /* Current number of bytes stored in @buf. */
        size_t len;
        /* True if any chunk in current transaction contains '?'. */
        bool has_error;
    } rx_data;
    struct {
        /* Count of OBD requests sent through rxtx path. */
        uint32_t rxtx_total;
        /* Count of transactions ending with valid OBD payload. */
        uint32_t notify_valid;
        /* Count of transactions ending with parse/error payload. */
        uint32_t notify_invalid;
        /* Count of transactions timed out waiting for prompt. */
        uint32_t rxtx_timeout;
        /* Count of chunks dropped due to full RX buffer. */
        uint32_t rx_overflow;
        /* Last tick when diagnostic snapshot was logged. */
        TickType_t last_log_tick;
    } diag;
    /* User context forwarded to response callback. */
    void *usr_ctx;
};

static const char *TAG = "BLE_OBD";

/* Characteristic definition order: TX first, RX second. */
static ble_gatt_char_def_t s_obd_chars[] = {
    {.uuid = OBD_TX_CHAR_UUID, .handle = 0, .notify_cb = NULL},
    {.uuid = OBD_RX_CHAR_UUID, .handle = 0, .notify_cb = NULL},
};

static ble_mgr_svc_def_t s_obd_service = {
    .service_uuid = OBD_SERVICE_UUID,
    .chars = s_obd_chars,
    .num_chars = ARRAY_SIZE(s_obd_chars),
};


/* Optional preferred BLE address configured from persisted config. */
static ble_addr_t s_preferred_addr;
static bool s_has_preferred_addr = false;

static void ble_obd_notify_cb(const uint8_t *data, size_t len, uint16_t attr_handle, void *usr_ctx);
static bool ble_obd_parse_hex_response(const char *response, uint8_t *values, size_t max_values, size_t *out_count);
static bool ble_obd_response_has_prompt(const char *response);
static void ble_obd_response_reset(ble_obd_ctx_t *ctx);
static void ble_obd_diag_log_periodic(ble_obd_ctx_t *ctx, bool force_now);
static bool ble_obd_device_filter_cb(ble_mgr_ctx_t *mgr_ctx, const ble_addr_t *addr, void *usr_ctx);
static bool ble_obd_disconnected_cb(ble_mgr_ctx_t *mgr_ctx, void *usr_ctx);

/* Static discovery profile to avoid dangling stack references in BLE manager. */
static const ble_mgr_disc_cfg_t s_obd_disc_cfg = {
    .svc_def = &s_obd_service,
    .dev_filter_cb = ble_obd_device_filter_cb,
    .disconnected_cb = ble_obd_disconnected_cb,
};


/**
 * @brief Return discovered TX characteristic handle.
 *
 * @return GATT handle.
 */
static uint16_t ble_obd_tx_handle(void) {
    return s_obd_chars[0].handle;
}

/**
 * @brief Return discovered RX characteristic handle.
 *
 * @return GATT handle.
 */
static uint16_t ble_obd_rx_handle(void) {
    return s_obd_chars[1].handle;
}

/**
 * @brief Optional device filter used during BLE scan results.
 *
 * @param mgr_ctx BLE manager context.
 * @param addr Candidate address.
 * @param usr_ctx User context.
 *
 * @return true when device should be connected.
 */
static bool ble_obd_device_filter_cb(ble_mgr_ctx_t *mgr_ctx, const ble_addr_t *addr, void *usr_ctx) {
    (void)mgr_ctx;
    (void)usr_ctx;

    if (s_has_preferred_addr && addr != NULL) {
        if (memcmp(addr->val, s_preferred_addr.val, sizeof(addr->val)) == 0) {
            return true;
        }
        return false;
    }

    return true;
}

/**
 * @brief Disconnect callback from BLE manager.
 *
 * Returning false disables auto-reconnect in manager layer.
 */
static bool ble_obd_disconnected_cb(ble_mgr_ctx_t *mgr_ctx, void *usr_ctx) {
    (void)mgr_ctx;
    (void)usr_ctx;
    return false;
}

/**
 * @brief Parse hexadecimal byte tokens from an ELM327 response chunk.
 *
 * @param response Null-terminated response chunk.
 * @param values Output byte buffer.
 * @param max_values Capacity of @p values.
 * @param out_count Parsed byte count output.
 *
 * @return true if at least one valid byte token was parsed.
 */
static bool ble_obd_parse_hex_response(const char *response, uint8_t *values, size_t max_values, size_t *out_count) {
    if (response == NULL || values == NULL || max_values == 0 || out_count == NULL) {
        return false;
    }

    char parse_buf[BLE_OBD_MAX_DATA_LEN] = {0};
    size_t copy_len = MIN_VALUE(strlen(response), sizeof(parse_buf) - 1);
    memcpy(parse_buf, response, copy_len);

    for (size_t i = 0; i < copy_len; ++i) {
        if (parse_buf[i] == '>') {
            parse_buf[i] = ' ';
        }
    }

    *out_count = 0;
    char *save = NULL;
    char *token = strtok_r(parse_buf, " \r\n\t,;:", &save);
    while (token != NULL && *out_count < max_values) {
        size_t token_len = strlen(token);
        if ((token_len % 2) == 0 && token_len >= 2) {
            for (size_t i = 0; i + 1 < token_len && *out_count < max_values; i += 2) {
                if (!isxdigit((unsigned char)token[i]) || !isxdigit((unsigned char)token[i + 1])) {
                    continue;
                }

                char hex[3] = {token[i], token[i + 1], '\0'};
                char *end_ptr = NULL;
                long value = strtol(hex, &end_ptr, 16);
                if (end_ptr == hex + 2 && value >= 0 && value <= 0xFF) {
                    values[*out_count] = (uint8_t)value;
                    (*out_count)++;
                }
            }
        }
        token = strtok_r(NULL, " \r\n\t,;:", &save);
    }

    return *out_count > 0;
}

/**
 * @brief Check whether response chunk contains ELM prompt marker.
 */
static bool ble_obd_response_has_prompt(const char *response) {
    if (response == NULL) {
        return false;
    }
    return strchr(response, '>') != NULL;
}

/**
 * @brief Clear aggregated response buffer for next transaction.
 */
static void ble_obd_response_reset(ble_obd_ctx_t *ctx) {
    if (ctx == NULL) {
        return;
    }
    memset(ctx->rx_data.buf, 0, sizeof(ctx->rx_data.buf));
    ctx->rx_data.len = 0;
    ctx->rx_data.has_error = false;
}

/**
 * @brief Log rolling diagnostic counters for OBD transaction health.
 */
static void ble_obd_diag_log_periodic(ble_obd_ctx_t *ctx, bool force_now) {
    if (ctx == NULL) {
        return;
    }

    TickType_t now = xTaskGetTickCount();
    TickType_t interval = pdMS_TO_TICKS(BLE_OBD_DIAG_LOG_INTERVAL_MS);
    bool due = force_now || ctx->diag.last_log_tick == 0 || (now - ctx->diag.last_log_tick) >= interval;
    if (!due) {
        return;
    }

    ESP_LOGD(TAG,
             "OBD diag total=%lu valid=%lu invalid=%lu timeout=%lu overflow=%lu",
             (unsigned long)ctx->diag.rxtx_total,
             (unsigned long)ctx->diag.notify_valid,
             (unsigned long)ctx->diag.notify_invalid,
             (unsigned long)ctx->diag.rxtx_timeout,
             (unsigned long)ctx->diag.rx_overflow);
    ctx->diag.last_log_tick = now;
}

/**
 * @brief Notification handler for OBD RX characteristic.
 *
 * Parses common ELM327 line responses and triggers waiting semaphore.
 *
 * @param data Notification bytes.
 * @param len Notification length.
 * @param attr_handle Attribute handle that produced this notification.
 * @param usr_ctx BLE OBD context pointer.
 */
static void ble_obd_notify_cb(const uint8_t *data, size_t len, uint16_t attr_handle, void *usr_ctx) {
    uint16_t rx_handle = ble_obd_rx_handle();
    if (rx_handle == 0 || attr_handle != rx_handle) {
        return;
    }

    ble_obd_ctx_t *ctx = (ble_obd_ctx_t *)usr_ctx;
    if (ctx == NULL || data == NULL || len == 0) {
        return;
    }

    /* Append chunk to transaction buffer for fragmented notifications. */
    size_t free_space = sizeof(ctx->rx_data.buf) - 1 - ctx->rx_data.len;
    size_t append_len = MIN_VALUE(len, free_space);
    if (append_len > 0) {
        memcpy(ctx->rx_data.buf + ctx->rx_data.len, data, append_len);
        ctx->rx_data.len += append_len;
        ctx->rx_data.buf[ctx->rx_data.len] = '\0';
    }
    if (append_len < len) {
        ctx->diag.rx_overflow++;
    }

    bool chunk_has_prompt = memchr(data, '>', len) != NULL;
    bool has_prompt = chunk_has_prompt || ble_obd_response_has_prompt(ctx->rx_data.buf);
    if (memchr(data, '?', len) != NULL) {
        ctx->rx_data.has_error = true;
    }

    if (!has_prompt) {
        /* Keep buffering until prompt closes the transaction. */
        return;
    }

    uint8_t values[BLE_OBD_MAX_DATA_LEN] = {0};
    size_t value_count = 0;
    bool has_hex = ble_obd_parse_hex_response(ctx->rx_data.buf, values, ARRAY_SIZE(values), &value_count);

    bool has_valid_obd = false;
    size_t payload_offset = 0;
    if (has_hex && value_count >= 2) {
        for (size_t i = 0; i + 1 < value_count; ++i) {
            if (values[i] == (ctx->tx_data.mode + 0x40) && values[i + 1] == ctx->tx_data.pid) {
                has_valid_obd = true;
                payload_offset = i + 2;
                break;
            }
        }
    }

    if (ctx->tx_data.expect_obd_response) {
        if (has_valid_obd) {
            ctx->diag.notify_valid++;
            if (ctx->response_cb != NULL) {
                ctx->response_cb(ctx->tx_data.pid, values + payload_offset, value_count - payload_offset, ctx->usr_ctx);
            }
        } else {
            ctx->diag.notify_invalid++;
            if ((ctx->rx_data.has_error || has_hex) && ctx->response_cb != NULL) {
                ctx->response_cb(-1, NULL, 0, ctx->usr_ctx);
            }
        }
    }

    ble_obd_response_reset(ctx);
    /* Prompt closes transaction. */
    xSemaphoreGive(ctx->response_sem);
}

/**
 * @brief Configure preferred OBD adapter BLE address filter.
 *
 * @param address MAC string or empty string to clear filter.
 *
 * @return ESP_OK on success, otherwise ESP_ERR_INVALID_ARG.
 */
esp_err_t ble_obd_set_preferred_address(const char *address) {
    if (util_string_empty(address)) {
        s_has_preferred_addr = false;
        memset(&s_preferred_addr, 0, sizeof(s_preferred_addr));
        return ESP_OK;
    }

    if (!ble_addr_from_str(address, &s_preferred_addr)) {
        return ESP_ERR_INVALID_ARG;
    }

    s_has_preferred_addr = true;
    return ESP_OK;
}

/**
 * @brief Connect to OBD BLE service and prepare context.
 *
 * @param response_cb Callback for parsed responses.
 * @param usr_ctx User context forwarded to callback.
 *
 * @return BLE OBD context on success, otherwise NULL.
 */
ble_obd_ctx_t *ble_obd_connect(ble_obd_response_cb_t response_cb, void *usr_ctx) {
    ble_mgr_ctx_t *mgr_ctx = ble_mgr_init(1000);
    ESP_RETURN_ON_NULL(mgr_ctx, NULL, TAG, "Failed to init BLE manager");

    ble_obd_ctx_t *ctx = calloc(1, sizeof(ble_obd_ctx_t));
    ESP_RETURN_ON_NULL(ctx, NULL, TAG, "Failed to allocate BLE OBD context");

    ctx->mgr_ctx = mgr_ctx;
    ctx->response_cb = response_cb;
    ctx->usr_ctx = usr_ctx;
    ctx->api_mutex = xSemaphoreCreateMutex();
    ctx->response_sem = xSemaphoreCreateBinary();

    if (ctx->api_mutex == NULL || ctx->response_sem == NULL) {
        ble_obd_disconnect(ctx);
        return NULL;
    }

    /* Attach notification callback to RX characteristic definition. */
    s_obd_chars[1].notify_cb = ble_obd_notify_cb;

    ble_mgr_status_t status = ble_mgr_connect_service(mgr_ctx, &s_obd_disc_cfg, 15000, ctx);
    if (status != BLE_MGR_E_OK) {
        ESP_LOGW(TAG, "BLE connect failed: %s", ble_mgr_status_to_string(status));
        ble_obd_disconnect(ctx);
        return NULL;
    }

    return ctx;
}

/**
 * @brief Disconnect and free BLE OBD context.
 *
 * @param ctx Context pointer.
 *
 * @return ESP_OK always.
 */
esp_err_t ble_obd_disconnect(ble_obd_ctx_t *ctx) {
    if (ctx == NULL) {
        return ESP_OK;
    }

    ble_obd_diag_log_periodic(ctx, true);

    if (ctx->mgr_ctx != NULL) {
        ble_mgr_disconnect(ctx->mgr_ctx);
    }

    if (ctx->api_mutex != NULL) {
        vSemaphoreDelete(ctx->api_mutex);
    }
    if (ctx->response_sem != NULL) {
        vSemaphoreDelete(ctx->response_sem);
    }

    free(ctx);
    return ESP_OK;
}

/**
 * @brief Check whether BLE OBD session is currently connected.
 *
 * @param ctx BLE OBD context.
 *
 * @return true when connected.
 */
bool ble_obd_is_connected(ble_obd_ctx_t *ctx) {
    if (ctx == NULL || ctx->mgr_ctx == NULL) {
        return false;
    }
    return ble_mgr_is_connected(ctx->mgr_ctx);
}

/**
 * @brief Send raw adapter command and wait for response completion.
 *
 * @param ctx BLE OBD context.
 * @param command Raw command string (must include `\r`).
 * @param timeout_ms Timeout in milliseconds.
 *
 * @return ESP_OK on success, otherwise timeout/state/send error.
 */
esp_err_t ble_obd_send_raw(ble_obd_ctx_t *ctx, const char *command, uint32_t timeout_ms) {
    ESP_RETURN_ON_NULL(ctx, ESP_ERR_INVALID_ARG, TAG, "ctx is NULL");
    ESP_RETURN_ON_NULL(command, ESP_ERR_INVALID_ARG, TAG, "command is NULL");

    if (xSemaphoreTake(ctx->api_mutex, pdMS_TO_TICKS(timeout_ms)) != pdTRUE) {
        return ESP_ERR_TIMEOUT;
    }

    ctx->tx_data.expect_obd_response = false;

    /* Drain stale semaphore tokens from prior operations. */
    while (xSemaphoreTake(ctx->response_sem, 0) == pdTRUE) {
    }
    ble_obd_response_reset(ctx);

    uint16_t tx_handle = ble_obd_tx_handle();
    if (tx_handle == 0) {
        xSemaphoreGive(ctx->api_mutex);
        return ESP_ERR_INVALID_STATE;
    }

    ble_mgr_status_t status = ble_mgr_send(ctx->mgr_ctx, tx_handle, command, strlen(command));
    if (status != BLE_MGR_E_OK) {
        xSemaphoreGive(ctx->api_mutex);
        return ESP_FAIL;
    }

    BaseType_t has_response = xSemaphoreTake(ctx->response_sem, pdMS_TO_TICKS(timeout_ms));
    xSemaphoreGive(ctx->api_mutex);
    return has_response == pdTRUE ? ESP_OK : ESP_ERR_TIMEOUT;
}

/**
 * @brief Send OBD mode/PID request and wait for parsed response.
 *
 * @param ctx BLE OBD context.
 * @param mode OBD mode.
 * @param pid OBD PID.
 * @param timeout_ms Timeout in milliseconds.
 *
 * @return 0 on success, -1 on failure.
 */
int ble_obd_rxtx(ble_obd_ctx_t *ctx, uint8_t mode, uint8_t pid, uint32_t timeout_ms) {
    ESP_RETURN_ON_NULL(ctx, -1, TAG, "ctx is NULL");

    if (xSemaphoreTake(ctx->api_mutex, pdMS_TO_TICKS(timeout_ms)) != pdTRUE) {
        return -1;
    }

    ctx->diag.rxtx_total++;
    ctx->tx_data.expect_obd_response = true;

    /* Store request metadata for response validation in notify callback. */
    ctx->tx_data.mode = mode;
    ctx->tx_data.pid = pid;
    snprintf(ctx->tx_data.tx_buf, sizeof(ctx->tx_data.tx_buf), "%02X%02X\r", mode, pid);

    while (xSemaphoreTake(ctx->response_sem, 0) == pdTRUE) {
    }
    ble_obd_response_reset(ctx);

    uint16_t tx_handle = ble_obd_tx_handle();
    if (tx_handle == 0) {
        ctx->tx_data.expect_obd_response = false;
        xSemaphoreGive(ctx->api_mutex);
        return -1;
    }

    ble_mgr_status_t status = ble_mgr_send(ctx->mgr_ctx, tx_handle, ctx->tx_data.tx_buf, strlen(ctx->tx_data.tx_buf));
    if (status != BLE_MGR_E_OK) {
        ctx->tx_data.expect_obd_response = false;
        xSemaphoreGive(ctx->api_mutex);
        return -1;
    }

    BaseType_t has_response = xSemaphoreTake(ctx->response_sem, pdMS_TO_TICKS(timeout_ms));
    if (has_response != pdTRUE) {
        ctx->diag.rxtx_timeout++;
    }

    ctx->tx_data.expect_obd_response = false;
    ble_obd_diag_log_periodic(ctx, false);
    xSemaphoreGive(ctx->api_mutex);
    return has_response == pdTRUE ? 0 : -1;
}

/**
 * @brief Run baseline ELM327 startup sequence.
 *
 * @param ctx BLE OBD context.
 *
 * @return ESP_OK on success, otherwise first failing command error.
 */
esp_err_t ble_obd_elm327_init(ble_obd_ctx_t *ctx) {
    ESP_RETURN_ON_NULL(ctx, ESP_ERR_INVALID_ARG, TAG, "ctx is NULL");

    const char *commands[] = {
        "ATZ\r",
        "ATE0\r",
        "ATL0\r",
        "ATS0\r",
        "ATSP0\r",
    };

    static const uint32_t command_timeouts_ms[] = {
        5000,
        2000,
        2000,
        2000,
        2000,
    };

    for (size_t i = 0; i < ARRAY_SIZE(commands); ++i) {
        uint32_t timeout_ms = command_timeouts_ms[i];
        esp_err_t err = ble_obd_send_raw(ctx, commands[i], timeout_ms);
        if (err != ESP_OK) {
            ESP_LOGW(TAG, "ELM327 init failed at step %u (timeout=%lums)", (unsigned)i, (unsigned long)timeout_ms);
            return err;
        }

        if (i + 1 < ARRAY_SIZE(commands)) {
            vTaskDelay(pdMS_TO_TICKS(BLE_OBD_ELM327_INTER_CMD_DELAY_MS));
        }
    }

    (void)OBD_MODE_CURRENT_DATA;
    return ESP_OK;
}
