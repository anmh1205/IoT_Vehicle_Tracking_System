#include "util.h"

#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "esp_ota_ops.h"
#include "esp_partition.h"
#include "esp_random.h"
#include "esp_system.h"
#include "esp_timer.h"

#include "mbedtls/sha256.h"

#include "modem_at.h"

/**
 * @file util.c
 * @brief Generic utility functions and OTA update/rollback helpers.
 */

#ifndef CONFIG_APP_PROJECT_VER
#define CONFIG_APP_PROJECT_VER "unknown"
#endif

static const char *TAG = "UTIL";
/* Single runtime gate for all sleep features across modules. */
static bool s_sleep_enabled = false;

#define OTA_HTTP_BINARY_CHUNK_SIZE 1024
#define OTA_HTTP_HEX_CHUNK_SIZE (OTA_HTTP_BINARY_CHUNK_SIZE * 2)
#define OTA_HTTP_READ_RESPONSE_MAX_LEN (OTA_HTTP_HEX_CHUNK_SIZE + 1024)
#define OTA_HTTP_ACTION_TIMEOUT_MS 120000U
#define OTA_HTTP_CMD_TIMEOUT_MS 30000U
#define OTA_HTTP_READ_CMD_TIMEOUT_MS 45000U
#define OTA_HTTP_URC_POLL_INTERVAL_MS 100U
#define OTA_HTTP_URC_POLL_BYTES 512U
#define OTA_HTTP_SSL_CTX_INDEX 1

typedef struct {
    bool waiting;
    bool ready;
    int method;
    int status_code;
    int data_len;
} ota_http_action_state_t;

static ota_http_action_state_t s_ota_http_action = {0};
static bool s_ota_http_urc_registered = false;

/**
 * @brief Safe bounded string copy with guaranteed null terminator.
 *
 * @param dst Destination buffer.
 * @param dst_size Destination size.
 * @param src Source string.
 *
 * @return Number of copied bytes (excluding null terminator).
 */
size_t util_copy_string(char *dst, size_t dst_size, const char *src) {
    if (dst == NULL || dst_size == 0) {
        return 0;
    }

    if (src == NULL) {
        dst[0] = '\0';
        return 0;
    }

    size_t src_len = strnlen(src, dst_size - 1);
    memcpy(dst, src, src_len);
    dst[src_len] = '\0';
    return src_len;
}

/**
 * @brief Convert ESP high-resolution timer to milliseconds.
 *
 * @return Uptime milliseconds.
 */
uint64_t util_uptime_ms(void) {
    return (uint64_t)(esp_timer_get_time() / 1000ULL);
}

void util_generate_uuid_v4(char *out, size_t out_size) {
    if (out == NULL || out_size < 37) {
        return;
    }

    uint8_t bytes[16] = {0};
    for (size_t i = 0; i < 16; i += 4) {
        uint32_t r = esp_random();
        bytes[i] = (uint8_t)(r & 0xFFU);
        bytes[i + 1] = (uint8_t)((r >> 8) & 0xFFU);
        bytes[i + 2] = (uint8_t)((r >> 16) & 0xFFU);
        bytes[i + 3] = (uint8_t)((r >> 24) & 0xFFU);
    }

    bytes[6] = (uint8_t)((bytes[6] & 0x0FU) | 0x40U);
    bytes[8] = (uint8_t)((bytes[8] & 0x3FU) | 0x80U);

    (void)snprintf(out,
                   out_size,
                   "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
                   bytes[0],
                   bytes[1],
                   bytes[2],
                   bytes[3],
                   bytes[4],
                   bytes[5],
                   bytes[6],
                   bytes[7],
                   bytes[8],
                   bytes[9],
                   bytes[10],
                   bytes[11],
                   bytes[12],
                   bytes[13],
                   bytes[14],
                   bytes[15]);
}

void util_generate_boot_id(char *out, size_t out_size, uint32_t boot_count) {
    if (out == NULL || out_size == 0) {
        return;
    }

    uint32_t salt = esp_random();
    (void)snprintf(out,
                   out_size,
                   "boot-%lu-%08lx",
                   (unsigned long)boot_count,
                   (unsigned long)salt);
}

void util_set_sleep_enabled(bool enabled) {
    s_sleep_enabled = enabled;
}

bool util_is_sleep_enabled(void) {
    return s_sleep_enabled;
}

/**
 * @brief Clamp float value to inclusive bounds.
 */
float util_clamp_float(float value, float min_value, float max_value) {
    if (value < min_value) {
        return min_value;
    }
    if (value > max_value) {
        return max_value;
    }
    return value;
}

/**
 * @brief Clamp integer value to inclusive bounds.
 */
int util_clamp_int(int value, int min_value, int max_value) {
    if (value < min_value) {
        return min_value;
    }
    if (value > max_value) {
        return max_value;
    }
    return value;
}

/**
 * @brief Check whether string is NULL or empty.
 */
bool util_string_empty(const char *value) {
    return value == NULL || value[0] == '\0';
}

/**
 * @brief Convert lowercase/uppercase hex string to byte array.
 *
 * @param hex Input hex string (2 chars per output byte).
 * @param out Output byte array.
 * @param out_len Output array length in bytes.
 *
 * @return true on successful parse.
 */
static bool util_hex_to_bytes(const char *hex, uint8_t *out, size_t out_len) {
    if (hex == NULL || out == NULL) {
        return false;
    }

    for (size_t i = 0; i < out_len; ++i) {
        const char hi = (char)tolower((unsigned char)hex[i * 2]);
        const char lo = (char)tolower((unsigned char)hex[i * 2 + 1]);
        if (!isxdigit((unsigned char)hi) || !isxdigit((unsigned char)lo)) {
            return false;
        }

        uint8_t high = (uint8_t)(isdigit((unsigned char)hi) ? (hi - '0') : (hi - 'a' + 10));
        uint8_t low = (uint8_t)(isdigit((unsigned char)lo) ? (lo - '0') : (lo - 'a' + 10));
        out[i] = (uint8_t)((high << 4) | low);
    }

    return true;
}

static bool util_hex_to_bytes_span(const char *hex,
                                   size_t hex_len,
                                   uint8_t *out,
                                   size_t out_cap,
                                   size_t *out_written) {
    if (hex == NULL || out == NULL || out_written == NULL || (hex_len % 2U) != 0U) {
        return false;
    }

    size_t byte_len = hex_len / 2U;
    if (byte_len > out_cap) {
        return false;
    }

    for (size_t i = 0; i < byte_len; ++i) {
        const char hi = (char)tolower((unsigned char)hex[i * 2U]);
        const char lo = (char)tolower((unsigned char)hex[i * 2U + 1U]);
        if (!isxdigit((unsigned char)hi) || !isxdigit((unsigned char)lo)) {
            return false;
        }

        uint8_t high = (uint8_t)(isdigit((unsigned char)hi) ? (hi - '0') : (hi - 'a' + 10));
        uint8_t low = (uint8_t)(isdigit((unsigned char)lo) ? (lo - '0') : (lo - 'a' + 10));
        out[i] = (uint8_t)((high << 4) | low);
    }

    *out_written = byte_len;
    return true;
}

static void util_log_hex_preview(const char *label, const uint8_t *data, size_t len) {
    if (data == NULL || len == 0U) {
        return;
    }

    size_t preview_len = len;
    if (preview_len > 24U) {
        preview_len = 24U;
    }

    char preview[(24U * 3U) + 1U] = {0};
    size_t cursor = 0U;
    for (size_t i = 0; i < preview_len && (cursor + 3U) < sizeof(preview); ++i) {
        int written = snprintf(&preview[cursor], sizeof(preview) - cursor, "%02X ", data[i]);
        if (written <= 0) {
            break;
        }
        cursor += (size_t)written;
    }

    ESP_LOGW(TAG, "%s (%u bytes): %s", label, (unsigned)preview_len, preview);
}

static void util_ota_http_action_reset(void) {
    s_ota_http_action.waiting = false;
    s_ota_http_action.ready = false;
    s_ota_http_action.method = -1;
    s_ota_http_action.status_code = -1;
    s_ota_http_action.data_len = -1;
}

static bool util_ota_parse_httpaction_urc_line(const char *line,
                                               int *out_method,
                                               int *out_status_code,
                                               int *out_data_len) {
    if (line == NULL || out_method == NULL || out_status_code == NULL || out_data_len == NULL) {
        return false;
    }

    int method = -1;
    int status_code = -1;
    int data_len = -1;
    int parsed = sscanf(line, "+HTTPACTION: %d,%d,%d", &method, &status_code, &data_len);
    if (parsed != 3) {
        parsed = sscanf(line, "+HTTPACTION:%d,%d,%d", &method, &status_code, &data_len);
    }
    if (parsed != 3) {
        return false;
    }

    *out_method = method;
    *out_status_code = status_code;
    *out_data_len = data_len;
    return true;
}

static void util_ota_httpaction_urc_cb(const char *line) {
    if (!s_ota_http_action.waiting || line == NULL) {
        return;
    }

    int method = -1;
    int status_code = -1;
    int data_len = -1;
    if (!util_ota_parse_httpaction_urc_line(line, &method, &status_code, &data_len)) {
        return;
    }

    s_ota_http_action.method = method;
    s_ota_http_action.status_code = status_code;
    s_ota_http_action.data_len = data_len;
    s_ota_http_action.ready = true;
}

static void util_ota_http_register_urc_once(void) {
    if (s_ota_http_urc_registered) {
        return;
    }

    modem_at_register_urc("+HTTPACTION:", util_ota_httpaction_urc_cb);
    s_ota_http_urc_registered = true;
}

static esp_err_t util_ota_wait_http_action(int *out_status_code, int *out_data_len, uint32_t timeout_ms) {
    ESP_RETURN_ON_NULL(out_status_code, ESP_ERR_INVALID_ARG, TAG, "out_status_code is NULL");
    ESP_RETURN_ON_NULL(out_data_len, ESP_ERR_INVALID_ARG, TAG, "out_data_len is NULL");

    uint64_t deadline_ms = util_uptime_ms() + (uint64_t)timeout_ms;
    while (util_uptime_ms() < deadline_ms) {
        if (s_ota_http_action.ready) {
            *out_status_code = s_ota_http_action.status_code;
            *out_data_len = s_ota_http_action.data_len;
            s_ota_http_action.waiting = false;
            return ESP_OK;
        }

        (void)modem_at_poll_urc(OTA_HTTP_URC_POLL_BYTES);
        vTaskDelay(pdMS_TO_TICKS(OTA_HTTP_URC_POLL_INTERVAL_MS));
    }

    s_ota_http_action.waiting = false;
    return ESP_ERR_TIMEOUT;
}

static bool util_ota_parse_httpread_payload(const uint8_t *response,
                                            size_t response_len,
                                            const uint8_t **out_data,
                                            size_t *out_len) {
    if (response == NULL || response_len == 0U || out_data == NULL || out_len == NULL) {
        return false;
    }

    const char *prefix = "+HTTPREAD:";
    size_t prefix_len = strlen(prefix);
    size_t header_pos = SIZE_MAX;
    for (size_t i = 0U; i + prefix_len <= response_len; ++i) {
        if (memcmp(response + i, prefix, prefix_len) == 0) {
            header_pos = i;
            break;
        }
    }
    if (header_pos == SIZE_MAX) {
        return false;
    }

    size_t cursor = header_pos + prefix_len;
    while (cursor < response_len && (response[cursor] == ' ' || response[cursor] == '\t')) {
        ++cursor;
    }
    if (cursor + strlen("DATA,") <= response_len &&
        memcmp(response + cursor, "DATA,", strlen("DATA,")) == 0) {
        cursor += strlen("DATA,");
    }
    if (cursor >= response_len || !isdigit((unsigned char)response[cursor])) {
        return false;
    }

    size_t declared_len = 0U;
    while (cursor < response_len && isdigit((unsigned char)response[cursor])) {
        declared_len = (declared_len * 10U) + (size_t)(response[cursor] - '0');
        ++cursor;
    }
    if (declared_len == 0U) {
        return false;
    }

    while (cursor < response_len && response[cursor] != '\n') {
        ++cursor;
    }
    if (cursor >= response_len) {
        return false;
    }

    size_t data_offset = cursor + 1U;
    if (data_offset + declared_len > response_len) {
        return false;
    }

    *out_data = response + data_offset;
    *out_len = declared_len;
    return true;
}

static bool util_is_hex_ascii_bytes(const uint8_t *data, size_t len) {
    if (data == NULL || len == 0U || (len % 2U) != 0U) {
        return false;
    }

    for (size_t i = 0; i < len; ++i) {
        if (!isxdigit((unsigned char)data[i])) {
            return false;
        }
    }

    return true;
}

static esp_err_t util_ota_configure_https_ssl_context(void) {
    char cmd[96] = {0};

    (void)snprintf(cmd, sizeof(cmd), "AT+CSSLCFG=\"sslversion\",%d,4\r", OTA_HTTP_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "HTTP CSSLCFG sslversion failed");

    (void)snprintf(cmd, sizeof(cmd), "AT+CSSLCFG=\"authmode\",%d,0\r", OTA_HTTP_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "HTTP CSSLCFG authmode failed");

    (void)snprintf(cmd, sizeof(cmd), "AT+CSSLCFG=\"ignorelocaltime\",%d,1\r", OTA_HTTP_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "HTTP CSSLCFG ignorelocaltime failed");

    (void)snprintf(cmd, sizeof(cmd), "AT+CSSLCFG=\"negotiatetime\",%d,300\r", OTA_HTTP_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "HTTP CSSLCFG negotiatetime failed");

    (void)snprintf(cmd, sizeof(cmd), "AT+CSSLCFG=\"enableSNI\",%d,1\r", OTA_HTTP_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "HTTP CSSLCFG enableSNI failed");

    (void)snprintf(cmd, sizeof(cmd), "AT+HTTPPARA=\"SSLCFG\",%d\r", OTA_HTTP_SSL_CTX_INDEX);
    ESP_RETURN_ON_FALSE(modem_at_send_expect(cmd, "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "HTTPPARA SSLCFG failed");

    return ESP_OK;
}

/**
 * @brief Fill human-readable partition label into output buffer.
 *
 * @param partition Partition pointer.
 * @param out Output string buffer.
 * @param out_size Output buffer size.
 */
static void util_fill_partition_label(const esp_partition_t *partition, char *out, size_t out_size) {
    if (partition == NULL) {
        util_copy_string(out, out_size, "unknown");
        return;
    }

    if (!util_string_empty(partition->label)) {
        util_copy_string(out, out_size, partition->label);
        return;
    }

    util_copy_string(out, out_size, "ota");
}

static void util_ota_emit_status(const firmware_status_t *status,
                                 ota_status_callback_t status_callback,
                                 void *status_callback_ctx) {
    if (status == NULL || status_callback == NULL) {
        return;
    }

    status_callback(status, status_callback_ctx);
}

static void util_ota_set_status(firmware_status_t *status,
                                const char *next_status,
                                uint8_t progress,
                                ota_status_callback_t status_callback,
                                void *status_callback_ctx) {
    if (status == NULL || util_string_empty(next_status)) {
        return;
    }

    util_copy_string(status->status, sizeof(status->status), next_status);
    status->progress = progress;
    util_ota_emit_status(status, status_callback, status_callback_ctx);
}

/**
 * @brief Download, verify, and install OTA image.
 *
 * @param cfg Runtime configuration.
 * @param current_version Current running version string.
 * @param cmd OTA command payload.
 * @param out_status Output firmware status report.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t util_ota_apply_update(const config_t *cfg,
                                const char *current_version,
                                const ota_command_t *cmd,
                                firmware_status_t *out_status,
                                ota_status_callback_t status_callback,
                                void *status_callback_ctx) {
    ESP_RETURN_ON_NULL(cfg, ESP_ERR_INVALID_ARG, TAG, "cfg is NULL");
    ESP_RETURN_ON_NULL(current_version, ESP_ERR_INVALID_ARG, TAG, "current_version is NULL");
    ESP_RETURN_ON_NULL(cmd, ESP_ERR_INVALID_ARG, TAG, "cmd is NULL");
    ESP_RETURN_ON_NULL(out_status, ESP_ERR_INVALID_ARG, TAG, "out_status is NULL");

    esp_err_t err = ESP_FAIL;
    esp_ota_handle_t ota_handle = 0;
    bool ota_begun = false;
    bool http_initialized = false;
    uint8_t *http_read_response = NULL;
    uint8_t *decode_buffer = NULL;
    bool sha_ctx_started = false;
    mbedtls_sha256_context sha_ctx;
    const char *failure_code = TRACKER_OTA_ERROR_APPLY_FAILED;

    /* Prepare output report skeleton. */
    memset(out_status, 0, sizeof(*out_status));
    util_copy_string(out_status->job_id, sizeof(out_status->job_id), cmd->job_id);
    util_copy_string(out_status->target_version, sizeof(out_status->target_version), cmd->version);
    util_copy_string(out_status->current_version, sizeof(out_status->current_version), current_version);

    /* Pick next OTA partition selected by ESP-IDF partition API. */
    const esp_partition_t *update_partition = esp_ota_get_next_update_partition(NULL);
    ESP_RETURN_ON_NULL(update_partition, ESP_ERR_NOT_FOUND, TAG, "No OTA partition available");
    util_fill_partition_label(update_partition, out_status->partition, sizeof(out_status->partition));

    util_ota_set_status(out_status,
                        TRACKER_OTA_STATUS_DOWNLOADING,
                        TRACKER_OTA_PROGRESS_DOWNLOADING_START,
                        status_callback,
                        status_callback_ctx);
    uint8_t last_emitted_download_progress = TRACKER_OTA_PROGRESS_DOWNLOADING_START;

    /* SIM7600 HTTP sequence over AT commands (hex payload transport). */
    util_ota_http_register_urc_once();
    util_ota_http_action_reset();

    /* Best-effort cleanup from previous sessions. */
    for (int attempt = 0; attempt < 3; ++attempt) {
        (void)modem_at_send_expect("AT+HTTPTERM\r", "OK", OTA_HTTP_CMD_TIMEOUT_MS);
        if (modem_at_send_expect("AT+HTTPINIT\r", "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK) {
            http_initialized = true;
            break;
        }
        ESP_LOGW(TAG, "HTTPINIT retry attempt=%d", attempt + 1);
        vTaskDelay(pdMS_TO_TICKS(300));
    }
    failure_code = TRACKER_OTA_ERROR_HTTP_INIT_FAILED;
    ESP_GOTO_ON_FALSE(http_initialized, cleanup, TAG, "HTTPINIT failed after retries");

    failure_code = TRACKER_OTA_ERROR_HTTP_CONFIG_FAILED;
    ESP_GOTO_ON_ERROR(modem_at_send_expect("AT+HTTPPARA=\"CID\",1\r", "OK", OTA_HTTP_CMD_TIMEOUT_MS),
                      cleanup,
                      TAG,
                      "HTTPPARA CID failed");

    ESP_GOTO_ON_FALSE(strncmp(cmd->url, "https://", strlen("https://")) == 0,
                      cleanup,
                      TAG,
                      "OTA URL must use HTTPS");
    failure_code = TRACKER_OTA_ERROR_HTTP_SSL_CONFIG_FAILED;
    ESP_GOTO_ON_ERROR(util_ota_configure_https_ssl_context(),
                      cleanup,
                      TAG,
                      "HTTPS SSL context setup failed");

    char http_ssl_response[256] = {0};
    esp_err_t http_ssl_err = modem_at_send("AT+HTTPSSL=1\r",
                                           http_ssl_response,
                                           sizeof(http_ssl_response),
                                           OTA_HTTP_CMD_TIMEOUT_MS);
    if (http_ssl_err != ESP_OK || strstr(http_ssl_response, "OK") == NULL) {
        ESP_LOGW(TAG,
                 "HTTPSSL enable rejected err=%s resp=%s (continue with HTTPS URL)",
                 esp_err_to_name(http_ssl_err),
                 http_ssl_response);
    }

    char http_url_cmd[TRACKER_OTA_URL_MAX_LEN + 80] = {0};
    int http_url_cmd_len = snprintf(http_url_cmd,
                                    sizeof(http_url_cmd),
                                    "AT+HTTPPARA=\"URL\",\"%s\"\r",
                                    cmd->url);
    ESP_GOTO_ON_FALSE(http_url_cmd_len > 0 && (size_t)http_url_cmd_len < sizeof(http_url_cmd),
                      cleanup,
                      TAG,
                      "HTTPPARA URL command too long");
    ESP_GOTO_ON_ERROR(modem_at_send_expect(http_url_cmd, "OK", OTA_HTTP_CMD_TIMEOUT_MS),
                      cleanup,
                      TAG,
                      "HTTPPARA URL failed");

    if (modem_at_send_expect("AT+HTTPPARA=\"USERDATA\",\"Accept-Encoding: identity\"\r",
                             "OK",
                             OTA_HTTP_CMD_TIMEOUT_MS) != ESP_OK) {
        ESP_LOGW(TAG, "HTTPPARA USERDATA Accept-Encoding not applied");
    }
    (void)modem_at_send_expect("AT+HTTPPARA=\"REDIR\",1\r", "OK", OTA_HTTP_CMD_TIMEOUT_MS);

    s_ota_http_action.waiting = true;
    failure_code = TRACKER_OTA_ERROR_HTTP_ACTION_FAILED;
    ESP_GOTO_ON_ERROR(modem_at_send_expect("AT+HTTPACTION=0\r", "OK", OTA_HTTP_CMD_TIMEOUT_MS),
                      cleanup,
                      TAG,
                      "HTTPACTION failed");

    int http_status_code = -1;
    int http_body_len = -1;
    failure_code = TRACKER_OTA_ERROR_HTTP_ACTION_TIMEOUT;
    ESP_GOTO_ON_ERROR(util_ota_wait_http_action(&http_status_code, &http_body_len, OTA_HTTP_ACTION_TIMEOUT_MS),
                      cleanup,
                      TAG,
                      "HTTPACTION wait timeout");

    failure_code = TRACKER_OTA_ERROR_HTTP_STATUS_NOT_200;
    ESP_GOTO_ON_FALSE(http_status_code == 200,
                      cleanup,
                      TAG,
                      "HTTP status=%d body_len=%d",
                      http_status_code,
                      http_body_len);

    failure_code = TRACKER_OTA_ERROR_HTTP_EMPTY_BODY;
    ESP_GOTO_ON_FALSE(cmd->size > 0U, cleanup, TAG, "OTA command size invalid");

    /* Start OTA write session to target partition. */
    failure_code = TRACKER_OTA_ERROR_OTA_BEGIN_FAILED;
    ESP_GOTO_ON_ERROR(esp_ota_begin(update_partition, OTA_SIZE_UNKNOWN, &ota_handle),
                      cleanup,
                      TAG,
                      "esp_ota_begin failed");
    ota_begun = true;

    /* Initialize SHA-256 context to verify full downloaded image integrity. */
    mbedtls_sha256_init(&sha_ctx);
    ESP_GOTO_ON_ERROR(mbedtls_sha256_starts(&sha_ctx, 0), cleanup, TAG, "sha256 start failed");
    sha_ctx_started = true;

    decode_buffer = (uint8_t *)malloc(OTA_HTTP_BINARY_CHUNK_SIZE);
    ESP_GOTO_ON_FALSE(decode_buffer != NULL, cleanup, TAG, "ota decode buffer alloc failed");

    http_read_response = (uint8_t *)malloc(OTA_HTTP_READ_RESPONSE_MAX_LEN);
    ESP_GOTO_ON_FALSE(http_read_response != NULL, cleanup, TAG, "ota read response buffer alloc failed");

    bool transfer_mode_known = false;
    bool transfer_mode_hex = false;
    size_t transfer_wire_len = (size_t)cmd->size;
    size_t read_offset = 0U;
    int total_written = 0;
    while (read_offset < transfer_wire_len) {
        size_t request_len = transfer_wire_len - read_offset;
        size_t request_max_len = (transfer_mode_known && transfer_mode_hex)
                                     ? OTA_HTTP_HEX_CHUNK_SIZE
                                     : OTA_HTTP_BINARY_CHUNK_SIZE;
        if (request_len > request_max_len) {
            request_len = request_max_len;
        }
        if (transfer_mode_known && transfer_mode_hex && (request_len % 2U) != 0U) {
            request_len -= 1U;
        }
        ESP_GOTO_ON_FALSE(request_len > 0U, cleanup, TAG, "invalid HTTPREAD request len");

        char http_read_cmd[72] = {0};
        int read_cmd_len = snprintf(http_read_cmd,
                                    sizeof(http_read_cmd),
                                    "AT+HTTPREAD=%u,%u\r",
                                    (unsigned)read_offset,
                                    (unsigned)request_len);
        ESP_GOTO_ON_FALSE(read_cmd_len > 0 && (size_t)read_cmd_len < sizeof(http_read_cmd),
                          cleanup,
                          TAG,
                          "HTTPREAD command too long");

        memset(http_read_response, 0, OTA_HTTP_READ_RESPONSE_MAX_LEN);
        size_t http_read_len = 0U;
        failure_code = TRACKER_OTA_ERROR_HTTP_READ_FAILED;
        ESP_GOTO_ON_ERROR(modem_at_send_collect(http_read_cmd,
                                                http_read_response,
                                                OTA_HTTP_READ_RESPONSE_MAX_LEN,
                                                &http_read_len,
                                                OTA_HTTP_READ_CMD_TIMEOUT_MS,
                                                250U),
                          cleanup,
                          TAG,
                          "HTTPREAD failed offset=%u len=%u",
                          (unsigned)read_offset,
                          (unsigned)request_len);

        const uint8_t *wire_payload = NULL;
        size_t wire_payload_len = 0U;
        failure_code = TRACKER_OTA_ERROR_HTTP_READ_PARSE_FAILED;
        if (!util_ota_parse_httpread_payload(http_read_response,
                                             http_read_len,
                                             &wire_payload,
                                             &wire_payload_len)) {
            util_log_hex_preview("HTTPREAD raw preview", http_read_response, OTA_HTTP_READ_RESPONSE_MAX_LEN);
            ESP_LOGE(TAG, "HTTPREAD parse failed raw=%s", (const char *)http_read_response);
            goto cleanup;
        }
        ESP_GOTO_ON_FALSE(wire_payload_len > 0U, cleanup, TAG, "HTTPREAD returned empty chunk");

        if (!transfer_mode_known) {
            transfer_mode_hex = util_is_hex_ascii_bytes(wire_payload, wire_payload_len);
            transfer_mode_known = true;
            transfer_wire_len = transfer_mode_hex ? ((size_t)cmd->size * 2U) : (size_t)cmd->size;
            ESP_LOGI(TAG,
                     "HTTPREAD transfer mode=%s wire_len=%u",
                     transfer_mode_hex ? "hex" : "binary",
                     (unsigned)transfer_wire_len);
        }

        size_t written_len = 0U;
        if (transfer_mode_hex) {
            ESP_GOTO_ON_FALSE((wire_payload_len % 2U) == 0U,
                              cleanup,
                              TAG,
                              "HTTPREAD returned odd hex len=%u",
                              (unsigned)wire_payload_len);

            failure_code = TRACKER_OTA_ERROR_HTTP_HEX_DECODE_FAILED;
            ESP_GOTO_ON_FALSE(util_hex_to_bytes_span((const char *)wire_payload,
                                                     wire_payload_len,
                                                     decode_buffer,
                                                     OTA_HTTP_BINARY_CHUNK_SIZE,
                                                     &written_len),
                              cleanup,
                              TAG,
                              "HTTPREAD hex decode failed");
        } else {
            written_len = wire_payload_len;
        }

        failure_code = TRACKER_OTA_ERROR_OTA_WRITE_FAILED;
        if (transfer_mode_hex) {
            ESP_GOTO_ON_ERROR(esp_ota_write(ota_handle, decode_buffer, written_len),
                              cleanup,
                              TAG,
                              "esp_ota_write failed");
            ESP_GOTO_ON_ERROR(mbedtls_sha256_update(&sha_ctx, decode_buffer, written_len),
                              cleanup,
                              TAG,
                              "sha256 update failed");
        } else {
            ESP_GOTO_ON_ERROR(esp_ota_write(ota_handle, wire_payload, written_len),
                              cleanup,
                              TAG,
                              "esp_ota_write failed");
            ESP_GOTO_ON_ERROR(mbedtls_sha256_update(&sha_ctx, wire_payload, written_len),
                              cleanup,
                              TAG,
                              "sha256 update failed");
        }

        read_offset += wire_payload_len;
        total_written += (int)written_len;
        if (total_written > (int)cmd->size) {
            failure_code = TRACKER_OTA_ERROR_HTTP_SIZE_MISMATCH;
            ESP_LOGE(TAG, "decoded size overflow expected=%u actual=%d", (unsigned)cmd->size, total_written);
            goto cleanup;
        }

        if (cmd->size > 0) {
            int progress = (int)(((uint64_t)total_written * 100ULL) / cmd->size);
            uint8_t bounded_progress = (uint8_t)util_clamp_int(progress,
                                                                TRACKER_OTA_PROGRESS_DOWNLOADING_START,
                                                                TRACKER_OTA_PROGRESS_DOWNLOADING_MAX);
            out_status->progress = bounded_progress;

            int progress_delta = (int)bounded_progress - (int)last_emitted_download_progress;
            bool progress_advanced = progress_delta > 0;
            bool reached_next_step = progress_delta >= 5;
            bool reached_download_ceiling = bounded_progress >= TRACKER_OTA_PROGRESS_DOWNLOADING_MAX;
            if (progress_advanced && (reached_next_step || reached_download_ceiling)) {
                last_emitted_download_progress = bounded_progress;
                util_ota_emit_status(out_status, status_callback, status_callback_ctx);
            }
        }
    }

    if (transfer_mode_known && transfer_mode_hex) {
        failure_code = TRACKER_OTA_ERROR_HTTP_SIZE_MISMATCH;
        ESP_GOTO_ON_FALSE(read_offset == ((size_t)cmd->size * 2U),
                          cleanup,
                          TAG,
                          "wire size mismatch expected_hex=%u actual=%u",
                          (unsigned)((size_t)cmd->size * 2U),
                          (unsigned)read_offset);
    }

    failure_code = TRACKER_OTA_ERROR_HTTP_SIZE_MISMATCH;
    ESP_GOTO_ON_FALSE(total_written == (int)cmd->size,
                      cleanup,
                      TAG,
                      "decoded size mismatch expected=%u actual=%d",
                      (unsigned)cmd->size,
                      total_written);

    uint8_t computed_hash[32] = {0};
    failure_code = TRACKER_OTA_ERROR_SHA256_MISMATCH;
    ESP_GOTO_ON_ERROR(mbedtls_sha256_finish(&sha_ctx, computed_hash), cleanup, TAG, "sha256 finish failed");
    mbedtls_sha256_free(&sha_ctx);
    sha_ctx_started = false;

    uint8_t expected_hash[32] = {0};
    failure_code = TRACKER_OTA_ERROR_SHA256_MISMATCH;
    ESP_GOTO_ON_FALSE(util_hex_to_bytes(cmd->sha256, expected_hash, sizeof(expected_hash)),
                      cleanup,
                      TAG,
                      "Invalid expected sha256 hex");

    util_ota_set_status(out_status,
                        TRACKER_OTA_STATUS_VERIFYING,
                        TRACKER_OTA_PROGRESS_VERIFYING,
                        status_callback,
                        status_callback_ctx);

    /* Abort update if hash mismatch to avoid booting corrupt image. */
    failure_code = TRACKER_OTA_ERROR_SHA256_MISMATCH;
    ESP_GOTO_ON_FALSE(memcmp(expected_hash, computed_hash, sizeof(computed_hash)) == 0,
                      cleanup,
                      TAG,
                      "OTA sha256 mismatch");

    failure_code = TRACKER_OTA_ERROR_OTA_END_FAILED;
    ESP_GOTO_ON_ERROR(esp_ota_end(ota_handle), cleanup, TAG, "esp_ota_end failed");
    ota_begun = false;

    util_ota_set_status(out_status,
                        TRACKER_OTA_STATUS_INSTALLING,
                        TRACKER_OTA_PROGRESS_INSTALLING,
                        status_callback,
                        status_callback_ctx);

    /* Set next boot partition to freshly written image. */
    failure_code = TRACKER_OTA_ERROR_SET_BOOT_PARTITION_FAILED;
    ESP_GOTO_ON_ERROR(esp_ota_set_boot_partition(update_partition),
                      cleanup,
                      TAG,
                      "esp_ota_set_boot_partition failed");

    util_ota_set_status(out_status,
                        TRACKER_OTA_STATUS_REBOOTING,
                        TRACKER_OTA_PROGRESS_DONE,
                        status_callback,
                        status_callback_ctx);
    err = ESP_OK;

cleanup:
    if (sha_ctx_started) {
        mbedtls_sha256_free(&sha_ctx);
    }

    if (decode_buffer != NULL) {
        free(decode_buffer);
    }
    if (http_read_response != NULL) {
        free(http_read_response);
    }
    if (http_initialized) {
        (void)modem_at_send_expect("AT+HTTPTERM\r", "OK", OTA_HTTP_CMD_TIMEOUT_MS);
    }

    if (ota_begun) {
        esp_ota_abort(ota_handle);
    }

    if (err != ESP_OK) {
        util_copy_string(out_status->status, sizeof(out_status->status), TRACKER_OTA_STATUS_FAILED);
        util_copy_string(out_status->error, sizeof(out_status->error), failure_code);
        out_status->progress = 0;
        util_ota_emit_status(out_status, status_callback, status_callback_ctx);
    }

    return err;
}

/**
 * @brief Trigger manual rollback by selecting fallback partition.
 *
 * @param out_status Output firmware status report.
 *
 * @return ESP_OK on success, otherwise ESP_ERR_NOT_FOUND or OTA error code.
 */
esp_err_t util_ota_trigger_manual_rollback(firmware_status_t *out_status) {
    ESP_RETURN_ON_NULL(out_status, ESP_ERR_INVALID_ARG, TAG, "out_status is NULL");

    memset(out_status, 0, sizeof(*out_status));
    util_copy_string(out_status->status, sizeof(out_status->status), TRACKER_OTA_STATUS_ROLLED_BACK);
    out_status->progress = TRACKER_OTA_PROGRESS_DONE;

    /**
     * Rollback strategy:
     * 1. If currently on ota_0, try ota_1 first.
     * 2. Else try factory image.
     * 3. Else try ota_0 as last fallback.
     */
    const esp_partition_t *running = esp_ota_get_running_partition();
    if (running != NULL && !util_string_empty(running->label) && strcmp(running->label, "ota_0") == 0) {
        const esp_partition_t *rollback = esp_partition_find_first(
            ESP_PARTITION_TYPE_APP,
            ESP_PARTITION_SUBTYPE_APP_OTA_1,
            NULL);
        if (rollback != NULL) {
            util_fill_partition_label(rollback, out_status->partition, sizeof(out_status->partition));
            return esp_ota_set_boot_partition(rollback);
        }
    }

    const esp_partition_t *factory = esp_partition_find_first(
        ESP_PARTITION_TYPE_APP,
        ESP_PARTITION_SUBTYPE_APP_FACTORY,
        NULL);
    if (factory != NULL) {
        util_fill_partition_label(factory, out_status->partition, sizeof(out_status->partition));
        return esp_ota_set_boot_partition(factory);
    }

    const esp_partition_t *ota0 = esp_partition_find_first(
        ESP_PARTITION_TYPE_APP,
        ESP_PARTITION_SUBTYPE_APP_OTA_0,
        NULL);
    if (ota0 != NULL) {
        util_fill_partition_label(ota0, out_status->partition, sizeof(out_status->partition));
        return esp_ota_set_boot_partition(ota0);
    }

    return ESP_ERR_NOT_FOUND;
}
