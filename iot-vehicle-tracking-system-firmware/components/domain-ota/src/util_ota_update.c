#include "ota_executor_internal.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "esp_ota_ops.h"

#include "mbedtls/sha256.h"

#include "modem_at.h"
#include "telemetry_counters.h"

/**
 * @file util_ota_update.c
 * @brief OTA download, verify, and install flow behind the public util facade.
 *
 * ## OTA Update Flow
 *
 * ### 1. Pre-Update Checks
 *    - Check min battery voltage (ota_min_battery_mv config)
 *    - Validate URL format (http:// or https://)
 *    - Parse optional ?encoding=hex query param
 *    - Select update partition (ota / non-ota)
 *
 * ### 2. HTTP Session Setup
 *    - Initialize HTTP service (AT+HTTPTERM/AT+HTTPSTART)
 *    - Configure SSL context for HTTPS
 *    - Configure HTTP parameter (AT+HTTPPARA)
 *    - Initiate request (AT+HTTPACTION=0 for GET)
 *    - Read response header (AT+HTTPREAD)
 *
 * ### 3. Download and Verify
 *    - Transfer mode: binary (default) or hex-encoded
 *    - Read response in chunks (4KB buffers)
 *    - SHA-256 hash running computation
 *    - Write to OTA partition handle
 *    - Progress callback every 4KB
 *
 * ### 4. Validation
 *    - Verify magic byte (0xEOF = valid ESP image)
 *    - Compute SHA-256 of downloaded image
 *    - Compare against ?hash= query param (if provided)
 *
 * ### 5. Commit or Rollback
 *    - Success: esp_ota_set_boot_partition()
 *    - Failure: trigger rollback, reset
 *
 * ## Transfer Encoding
 *    - Binary: raw HTTP response body
 *    - Hex: ASCII hex string, decode to binary before OTA write
 *
 * ## Error Recovery
 *    - Battery low: reject OTA, log warning
 *    - HTTP timeout: retry with backoff
 *    - Invalid image: rollback, log error
 *    - SHA mismatch: reject, log error
 */

/** OTA update context. */
typedef struct {
    esp_err_t err;
    esp_ota_handle_t ota_handle;
    bool ota_begun;
    bool http_initialized;
    uint8_t *http_read_response;
    uint8_t *decode_buffer;
    bool sha_ctx_started;
    mbedtls_sha256_context sha_ctx;
    const char *failure_code;
    const esp_partition_t *update_partition;
    bool transfer_mode_known;
    bool transfer_mode_hex;
    size_t transfer_wire_len;
    size_t read_offset;
    int total_written;
    uint8_t last_emitted_download_progress;
} util_ota_update_ctx_t;

/**
 * @brief Fill partition label into output buffer.
 *
 * @param partition Source partition.
 * @param out Output buffer.
 * @param out_size Buffer size.
 */
void util_fill_partition_label(const esp_partition_t *partition, char *out, size_t out_size) {
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

static esp_err_t util_ota_prepare_status_report(util_ota_update_ctx_t *ctx,
                                                const char *current_version,
                                                const ota_command_t *cmd,
                                                firmware_status_t *out_status,
                                                ota_status_callback_t status_callback,
                                                void *status_callback_ctx) {
    memset(out_status, 0, sizeof(*out_status));
    util_copy_string(out_status->job_id, sizeof(out_status->job_id), cmd->job_id);
    util_copy_string(out_status->target_version, sizeof(out_status->target_version), cmd->version);
    util_copy_string(out_status->current_version, sizeof(out_status->current_version), current_version);

    ctx->update_partition = esp_ota_get_next_update_partition(NULL);
    if (ctx->update_partition == NULL) {
        return ESP_ERR_NOT_FOUND;
    }

    util_fill_partition_label(ctx->update_partition, out_status->partition, sizeof(out_status->partition));
    util_ota_set_status(out_status,
                        TRACKER_OTA_STATUS_DOWNLOADING,
                        TRACKER_OTA_PROGRESS_DOWNLOADING_START,
                        status_callback,
                        status_callback_ctx);
    ctx->last_emitted_download_progress = TRACKER_OTA_PROGRESS_DOWNLOADING_START;
    return ESP_OK;
}

static esp_err_t util_ota_http_init_session(util_ota_update_ctx_t *ctx) {
    util_ota_http_register_urc_once();
    util_ota_http_action_reset();

    ctx->failure_code = TRACKER_OTA_ERROR_HTTP_INIT_FAILED;
    for (int attempt = 0; attempt < 3; ++attempt) {
        (void)modem_at_send_expect("AT+HTTPTERM\r", "OK", OTA_HTTP_CMD_TIMEOUT_MS);
        if (modem_at_send_expect("AT+HTTPINIT\r", "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK) {
            ctx->http_initialized = true;
            break;
        }
        ESP_LOGW(UTIL_TAG, "HTTPINIT retry attempt=%d", attempt + 1);
        vTaskDelay(pdMS_TO_TICKS(300));
    }

    if (!ctx->http_initialized) {
        ESP_LOGE(UTIL_TAG, "HTTPINIT failed after retries");
        return ESP_FAIL;
    }

    ctx->failure_code = TRACKER_OTA_ERROR_HTTP_CONFIG_FAILED;
    esp_err_t err = modem_at_send_expect("AT+HTTPPARA=\"CID\",1\r", "OK", OTA_HTTP_CMD_TIMEOUT_MS);
    if (err != ESP_OK) {
        ESP_LOGE(UTIL_TAG, "HTTPPARA CID failed: %s", esp_err_to_name(err));
    }
    return err;
}

static esp_err_t util_ota_http_apply_request_config(util_ota_update_ctx_t *ctx, const ota_command_t *cmd) {
    if (strncmp(cmd->url, "https://", strlen("https://")) != 0) {
        ctx->failure_code = TRACKER_OTA_ERROR_HTTP_SSL_CONFIG_FAILED;
        ESP_LOGE(UTIL_TAG, "ota request target must use HTTPS");
        return ESP_FAIL;
    }

    ctx->failure_code = TRACKER_OTA_ERROR_HTTP_SSL_CONFIG_FAILED;
    esp_err_t err = util_ota_configure_https_ssl_context();
    if (err != ESP_OK) {
        ESP_LOGE(UTIL_TAG, "HTTPS SSL context setup failed: %s", esp_err_to_name(err));
        return err;
    }

    ESP_LOGI(UTIL_TAG,
             "OTA HTTPS request configured via URL scheme + SSLCFG ctx=%d",
             OTA_HTTP_SSL_CTX_INDEX);

    char http_url_cmd[TRACKER_OTA_URL_MAX_LEN + 80] = {0};
    int http_url_cmd_len = snprintf(http_url_cmd,
                                    sizeof(http_url_cmd),
                                    "AT+HTTPPARA=\"URL\",\"%s\"\r",
                                    cmd->url);
    if (http_url_cmd_len <= 0 || (size_t)http_url_cmd_len >= sizeof(http_url_cmd)) {
        ctx->failure_code = TRACKER_OTA_ERROR_HTTP_CONFIG_FAILED;
        ESP_LOGE(UTIL_TAG, "HTTPPARA request command too long");
        return ESP_FAIL;
    }

    ctx->failure_code = TRACKER_OTA_ERROR_HTTP_CONFIG_FAILED;
    err = modem_at_send_expect(http_url_cmd, "OK", OTA_HTTP_CMD_TIMEOUT_MS);
    if (err != ESP_OK) {
        ESP_LOGE(UTIL_TAG, "HTTPPARA request failed: %s", esp_err_to_name(err));
        return err;
    }

    if (modem_at_send_expect("AT+HTTPPARA=\"USERDATA\",\"Accept-Encoding: identity\"\r",
                             "OK",
                             OTA_HTTP_CMD_TIMEOUT_MS) != ESP_OK) {
        ESP_LOGW(UTIL_TAG, "HTTPPARA USERDATA Accept-Encoding not applied");
    }
    (void)modem_at_send_expect("AT+HTTPPARA=\"REDIR\",1\r", "OK", OTA_HTTP_CMD_TIMEOUT_MS);
    return ESP_OK;
}

static esp_err_t util_ota_http_start_download(util_ota_update_ctx_t *ctx, const ota_command_t *cmd) {
    telemetry_counters_inc_ota_http_start();
    ESP_LOGI(UTIL_TAG, "ota http start job=%s", cmd->job_id);
    s_ota_http_action.waiting = true;
    ctx->failure_code = TRACKER_OTA_ERROR_HTTP_ACTION_FAILED;
    esp_err_t err = modem_at_send_expect("AT+HTTPACTION=0\r", "OK", OTA_HTTP_CMD_TIMEOUT_MS);
    if (err != ESP_OK) {
        telemetry_counters_inc_ota_http_fail();
        ESP_LOGE(UTIL_TAG, "ota http failed stage=action err=%s job=%s", esp_err_to_name(err), cmd->job_id);
        return err;
    }

    int http_status_code = -1;
    int http_body_len = -1;
    ctx->failure_code = TRACKER_OTA_ERROR_HTTP_ACTION_TIMEOUT;
    err = util_ota_wait_http_action(&http_status_code, &http_body_len, OTA_HTTP_ACTION_TIMEOUT_MS);
    if (err != ESP_OK) {
        telemetry_counters_inc_ota_http_fail();
        ESP_LOGE(UTIL_TAG, "ota http failed stage=wait err=%s job=%s", esp_err_to_name(err), cmd->job_id);
        return err;
    }

    if (http_status_code != 200) {
        telemetry_counters_inc_ota_http_fail();
        ctx->failure_code = TRACKER_OTA_ERROR_HTTP_STATUS_NOT_200;
        if (http_status_code >= 700) {
            ESP_LOGE(UTIL_TAG,
                     "ota http failed stage=status status=%d reason=%s body_len=%d job=%s",
                     http_status_code,
                     util_ota_http_status_name(http_status_code),
                     http_body_len,
                     cmd->job_id);
        } else {
            ESP_LOGE(UTIL_TAG,
                     "ota http failed stage=status status=%d body_len=%d job=%s",
                     http_status_code,
                     http_body_len,
                     cmd->job_id);
        }
        return ESP_FAIL;
    }

    if (cmd->size == 0U) {
        telemetry_counters_inc_ota_http_fail();
        ctx->failure_code = TRACKER_OTA_ERROR_HTTP_EMPTY_BODY;
        ESP_LOGE(UTIL_TAG, "ota http failed stage=size reason=empty_body job=%s", cmd->job_id);
        return ESP_FAIL;
    }

    telemetry_counters_inc_ota_http_success();
    ESP_LOGI(UTIL_TAG, "ota http accepted status=200 body_len=%d job=%s", http_body_len, cmd->job_id);
    return ESP_OK;
}

static esp_err_t util_ota_begin_partition_write(util_ota_update_ctx_t *ctx) {
    ctx->failure_code = TRACKER_OTA_ERROR_OTA_BEGIN_FAILED;
    esp_err_t err = esp_ota_begin(ctx->update_partition, OTA_SIZE_UNKNOWN, &ctx->ota_handle);
    if (err != ESP_OK) {
        ESP_LOGE(UTIL_TAG, "esp_ota_begin failed: %s", esp_err_to_name(err));
        return err;
    }
    ctx->ota_begun = true;

    mbedtls_sha256_init(&ctx->sha_ctx);
    int sha_err = mbedtls_sha256_starts(&ctx->sha_ctx, 0);
    if (sha_err != 0) {
        ctx->failure_code = TRACKER_OTA_ERROR_OTA_BEGIN_FAILED;
        ESP_LOGE(UTIL_TAG, "sha256 start failed: %d", sha_err);
        return (esp_err_t)sha_err;
    }
    ctx->sha_ctx_started = true;

    ctx->decode_buffer = (uint8_t *)malloc(OTA_HTTP_BINARY_CHUNK_SIZE);
    if (ctx->decode_buffer == NULL) {
        ESP_LOGE(UTIL_TAG, "ota decode buffer alloc failed");
        return ESP_ERR_NO_MEM;
    }

    ctx->http_read_response = (uint8_t *)malloc(OTA_HTTP_READ_RESPONSE_MAX_LEN);
    if (ctx->http_read_response == NULL) {
        ESP_LOGE(UTIL_TAG, "ota read response buffer alloc failed");
        return ESP_ERR_NO_MEM;
    }

    ctx->transfer_mode_known = false;
    ctx->transfer_mode_hex = false;
    ctx->transfer_wire_len = 0U;
    ctx->read_offset = 0U;
    ctx->total_written = 0;
    return ESP_OK;
}

static size_t util_ota_next_request_len(const util_ota_update_ctx_t *ctx) {
    size_t request_len = ctx->transfer_wire_len - ctx->read_offset;
    size_t request_max_len = (ctx->transfer_mode_known && ctx->transfer_mode_hex)
                                 ? OTA_HTTP_HEX_CHUNK_SIZE
                                 : OTA_HTTP_BINARY_CHUNK_SIZE;
    if (request_len > request_max_len) {
        request_len = request_max_len;
    }
    if (ctx->transfer_mode_known && ctx->transfer_mode_hex && (request_len % 2U) != 0U) {
        request_len -= 1U;
    }
    return request_len;
}

static esp_err_t util_ota_request_chunk(util_ota_update_ctx_t *ctx,
                                        size_t request_len,
                                        const uint8_t **wire_payload,
                                        size_t *wire_payload_len) {
    char http_read_cmd[72] = {0};
    int read_cmd_len = snprintf(http_read_cmd,
                                sizeof(http_read_cmd),
                                "AT+HTTPREAD=%u,%u\r",
                                (unsigned)ctx->read_offset,
                                (unsigned)request_len);
    if (read_cmd_len <= 0 || (size_t)read_cmd_len >= sizeof(http_read_cmd)) {
        ctx->failure_code = TRACKER_OTA_ERROR_HTTP_READ_FAILED;
        ESP_LOGE(UTIL_TAG, "HTTPREAD command too long");
        return ESP_FAIL;
    }

    memset(ctx->http_read_response, 0, OTA_HTTP_READ_RESPONSE_MAX_LEN);
    size_t http_read_len = 0U;
    ctx->failure_code = TRACKER_OTA_ERROR_HTTP_READ_FAILED;
    esp_err_t err = modem_at_send_collect(http_read_cmd,
                                          ctx->http_read_response,
                                          OTA_HTTP_READ_RESPONSE_MAX_LEN,
                                          &http_read_len,
                                          OTA_HTTP_READ_CMD_TIMEOUT_MS,
                                          250U);
    if (err != ESP_OK) {
        ESP_LOGE(UTIL_TAG,
                 "HTTPREAD failed offset=%u len=%u: %s",
                 (unsigned)ctx->read_offset,
                 (unsigned)request_len,
                 esp_err_to_name(err));
        return err;
    }

    ctx->failure_code = TRACKER_OTA_ERROR_HTTP_READ_PARSE_FAILED;
    if (!util_ota_parse_httpread_payload(ctx->http_read_response,
                                         http_read_len,
                                         wire_payload,
                                         wire_payload_len)) {
        util_log_hex_preview("HTTPREAD raw preview", ctx->http_read_response, http_read_len);
        ESP_LOGE(UTIL_TAG, "HTTPREAD parse failed len=%u", (unsigned)http_read_len);
        return ESP_FAIL;
    }
    if (*wire_payload_len == 0U) {
        ESP_LOGE(UTIL_TAG, "HTTPREAD returned empty chunk");
        return ESP_FAIL;
    }

    return ESP_OK;
}

static void util_ota_resolve_transfer_mode(util_ota_update_ctx_t *ctx,
                                           const ota_command_t *cmd,
                                           const uint8_t *wire_payload,
                                           size_t wire_payload_len) {
    if (ctx->transfer_mode_known) {
        return;
    }

    ctx->transfer_mode_hex = util_is_hex_ascii_bytes(wire_payload, wire_payload_len);
    ctx->transfer_mode_known = true;
    ctx->transfer_wire_len = ctx->transfer_mode_hex ? ((size_t)cmd->size * 2U) : (size_t)cmd->size;
    ESP_LOGI(UTIL_TAG,
             "HTTPREAD transfer mode=%s wire_len=%u",
             ctx->transfer_mode_hex ? "hex" : "binary",
             (unsigned)ctx->transfer_wire_len);
}

static esp_err_t util_ota_write_wire_payload(util_ota_update_ctx_t *ctx,
                                             const ota_command_t *cmd,
                                             const uint8_t *wire_payload,
                                             size_t wire_payload_len) {
    size_t written_len = 0U;
    if (ctx->read_offset == 0U) {
        uint8_t first_byte = 0U;
        if (ctx->transfer_mode_hex) {
            if (wire_payload_len < 2U) {
                ctx->failure_code = TRACKER_OTA_ERROR_HTTP_INVALID_IMAGE;
                ESP_LOGE(UTIL_TAG, "HTTPREAD first OTA chunk too short for image header");
                return ESP_FAIL;
            }
            if (!util_hex_to_bytes_span((const char *)wire_payload,
                                        2U,
                                        &first_byte,
                                        1U,
                                        &written_len) || written_len != 1U) {
                ctx->failure_code = TRACKER_OTA_ERROR_HTTP_INVALID_IMAGE;
                ESP_LOGE(UTIL_TAG, "HTTPREAD first OTA byte decode failed");
                return ESP_FAIL;
            }
        } else {
            first_byte = wire_payload[0];
        }
        if (first_byte != 0xE9U) {
            ctx->failure_code = TRACKER_OTA_ERROR_HTTP_INVALID_IMAGE;
            ESP_LOGE(UTIL_TAG, "HTTPREAD first OTA byte invalid: 0x%02X", first_byte);
            return ESP_FAIL;
        }
    }
    written_len = 0U;
    if (ctx->transfer_mode_hex) {
        if ((wire_payload_len % 2U) != 0U) {
            ctx->failure_code = TRACKER_OTA_ERROR_HTTP_HEX_DECODE_FAILED;
            ESP_LOGE(UTIL_TAG, "HTTPREAD returned odd hex len=%u", (unsigned)wire_payload_len);
            return ESP_FAIL;
        }

        ctx->failure_code = TRACKER_OTA_ERROR_HTTP_HEX_DECODE_FAILED;
        if (!util_hex_to_bytes_span((const char *)wire_payload,
                                    wire_payload_len,
                                    ctx->decode_buffer,
                                    OTA_HTTP_BINARY_CHUNK_SIZE,
                                    &written_len)) {
            ESP_LOGE(UTIL_TAG, "HTTPREAD hex decode failed");
            return ESP_FAIL;
        }
    } else {
        written_len = wire_payload_len;
    }

    ctx->failure_code = TRACKER_OTA_ERROR_OTA_WRITE_FAILED;
    const void *payload = ctx->transfer_mode_hex ? (const void *)ctx->decode_buffer : (const void *)wire_payload;
    esp_err_t err = esp_ota_write(ctx->ota_handle, payload, written_len);
    if (err != ESP_OK) {
        ESP_LOGE(UTIL_TAG, "esp_ota_write failed: %s", esp_err_to_name(err));
        return err;
    }

    int sha_err = mbedtls_sha256_update(&ctx->sha_ctx, payload, written_len);
    if (sha_err != 0) {
        ESP_LOGE(UTIL_TAG, "sha256 update failed: %d", sha_err);
        return (esp_err_t)sha_err;
    }

    ctx->read_offset += wire_payload_len;
    ctx->total_written += (int)written_len;
    if (ctx->total_written > (int)cmd->size) {
        ctx->failure_code = TRACKER_OTA_ERROR_HTTP_SIZE_MISMATCH;
        ESP_LOGE(UTIL_TAG, "decoded size overflow expected=%u actual=%d", (unsigned)cmd->size, ctx->total_written);
        return ESP_FAIL;
    }

    return ESP_OK;
}

static void util_ota_emit_download_progress(util_ota_update_ctx_t *ctx,
                                            const ota_command_t *cmd,
                                            firmware_status_t *out_status,
                                            ota_status_callback_t status_callback,
                                            void *status_callback_ctx) {
    if (cmd->size == 0) {
        return;
    }

    int progress = (int)(((uint64_t)ctx->total_written * 100ULL) / cmd->size);
    uint8_t bounded_progress = (uint8_t)util_clamp_int(progress,
                                                       TRACKER_OTA_PROGRESS_DOWNLOADING_START,
                                                       TRACKER_OTA_PROGRESS_DOWNLOADING_MAX);
    out_status->progress = bounded_progress;

    int progress_delta = (int)bounded_progress - (int)ctx->last_emitted_download_progress;
    bool progress_advanced = progress_delta > 0;
    bool reached_next_step = progress_delta >= 5;
    bool reached_download_ceiling = bounded_progress >= TRACKER_OTA_PROGRESS_DOWNLOADING_MAX;
    if (progress_advanced && (reached_next_step || reached_download_ceiling)) {
        ctx->last_emitted_download_progress = bounded_progress;
        util_ota_emit_status(out_status, status_callback, status_callback_ctx);
    }
}

static esp_err_t util_ota_stream_payload(util_ota_update_ctx_t *ctx,
                                         const ota_command_t *cmd,
                                         firmware_status_t *out_status,
                                         ota_status_callback_t status_callback,
                                         void *status_callback_ctx) {
    ctx->transfer_wire_len = (size_t)cmd->size;
    while (ctx->read_offset < ctx->transfer_wire_len) {
        size_t request_len = util_ota_next_request_len(ctx);
        if (request_len == 0U) {
            ctx->failure_code = TRACKER_OTA_ERROR_HTTP_READ_FAILED;
            ESP_LOGE(UTIL_TAG, "invalid HTTPREAD request len");
            return ESP_FAIL;
        }

        const uint8_t *wire_payload = NULL;
        size_t wire_payload_len = 0U;
        esp_err_t err = util_ota_request_chunk(ctx, request_len, &wire_payload, &wire_payload_len);
        if (err != ESP_OK) {
            return err;
        }

        util_ota_resolve_transfer_mode(ctx, cmd, wire_payload, wire_payload_len);
        err = util_ota_write_wire_payload(ctx, cmd, wire_payload, wire_payload_len);
        if (err != ESP_OK) {
            return err;
        }

        util_ota_emit_download_progress(ctx, cmd, out_status, status_callback, status_callback_ctx);
    }

    return ESP_OK;
}

static esp_err_t util_ota_finalize_image(util_ota_update_ctx_t *ctx,
                                         const ota_command_t *cmd,
                                         firmware_status_t *out_status,
                                         ota_status_callback_t status_callback,
                                         void *status_callback_ctx) {
    if (ctx->transfer_mode_known && ctx->transfer_mode_hex &&
        ctx->read_offset != ((size_t)cmd->size * 2U)) {
        ctx->failure_code = TRACKER_OTA_ERROR_HTTP_SIZE_MISMATCH;
        ESP_LOGE(UTIL_TAG,
                 "wire size mismatch expected_hex=%u actual=%u",
                 (unsigned)((size_t)cmd->size * 2U),
                 (unsigned)ctx->read_offset);
        return ESP_FAIL;
    }

    if (ctx->total_written != (int)cmd->size) {
        ctx->failure_code = TRACKER_OTA_ERROR_HTTP_SIZE_MISMATCH;
        ESP_LOGE(UTIL_TAG,
                 "decoded size mismatch expected=%u actual=%d",
                 (unsigned)cmd->size,
                 ctx->total_written);
        return ESP_FAIL;
    }

    uint8_t computed_hash[32] = {0};
    ctx->failure_code = TRACKER_OTA_ERROR_SHA256_MISMATCH;
    int sha_finish_err = mbedtls_sha256_finish(&ctx->sha_ctx, computed_hash);
    if (sha_finish_err != 0) {
        ESP_LOGE(UTIL_TAG, "sha256 finish failed: %d", sha_finish_err);
        return (esp_err_t)sha_finish_err;
    }
    mbedtls_sha256_free(&ctx->sha_ctx);
    ctx->sha_ctx_started = false;

    uint8_t expected_hash[32] = {0};
    if (!util_hex_to_bytes(cmd->sha256, expected_hash, sizeof(expected_hash))) {
        ESP_LOGE(UTIL_TAG, "Invalid expected sha256 hex");
        return ESP_FAIL;
    }

    util_ota_set_status(out_status,
                        TRACKER_OTA_STATUS_VERIFYING,
                        TRACKER_OTA_PROGRESS_VERIFYING,
                        status_callback,
                        status_callback_ctx);
    if (memcmp(expected_hash, computed_hash, sizeof(computed_hash)) != 0) {
        ESP_LOGE(UTIL_TAG, "OTA sha256 mismatch");
        return ESP_FAIL;
    }

    ctx->failure_code = TRACKER_OTA_ERROR_OTA_END_FAILED;
    esp_err_t err = esp_ota_end(ctx->ota_handle);
    if (err != ESP_OK) {
        ESP_LOGE(UTIL_TAG, "esp_ota_end failed: %s", esp_err_to_name(err));
        return err;
    }
    ctx->ota_begun = false;

    util_ota_set_status(out_status,
                        TRACKER_OTA_STATUS_INSTALLING,
                        TRACKER_OTA_PROGRESS_INSTALLING,
                        status_callback,
                        status_callback_ctx);

    ctx->failure_code = TRACKER_OTA_ERROR_SET_BOOT_PARTITION_FAILED;
    err = esp_ota_set_boot_partition(ctx->update_partition);
    if (err != ESP_OK) {
        ESP_LOGE(UTIL_TAG, "esp_ota_set_boot_partition failed: %s", esp_err_to_name(err));
        return err;
    }

    util_ota_set_status(out_status,
                        TRACKER_OTA_STATUS_REBOOTING,
                        TRACKER_OTA_PROGRESS_DONE,
                        status_callback,
                        status_callback_ctx);
    return ESP_OK;
}

static void util_ota_cleanup_update(util_ota_update_ctx_t *ctx,
                                    firmware_status_t *out_status,
                                    ota_status_callback_t status_callback,
                                    void *status_callback_ctx) {
    if (ctx->sha_ctx_started) {
        mbedtls_sha256_free(&ctx->sha_ctx);
    }
    if (ctx->decode_buffer != NULL) {
        free(ctx->decode_buffer);
    }
    if (ctx->http_read_response != NULL) {
        free(ctx->http_read_response);
    }
    if (ctx->http_initialized) {
        (void)modem_at_send_expect("AT+HTTPTERM\r", "OK", OTA_HTTP_CMD_TIMEOUT_MS);
    }
    if (ctx->ota_begun) {
        esp_ota_abort(ctx->ota_handle);
    }
    if (ctx->err != ESP_OK) {
        util_copy_string(out_status->status, sizeof(out_status->status), TRACKER_OTA_STATUS_FAILED);
        util_copy_string(out_status->error, sizeof(out_status->error), ctx->failure_code);
        out_status->progress = 0;
        util_ota_emit_status(out_status, status_callback, status_callback_ctx);
    }
}

/**
 * @brief Apply OTA update.
 *
 * @param cfg Configuration.
 * @param current_version Current firmware version.
 * @param cmd OTA command.
 * @param out_status Output status.
 * @param status_callback Status callback.
 * @param status_callback_ctx Callback context.
 * @return ESP_OK on success.
 */
esp_err_t util_ota_apply_update(const config_t *cfg,
                                const char *current_version,
                                const ota_command_t *cmd,
                                firmware_status_t *out_status,
                                ota_status_callback_t status_callback,
                                void *status_callback_ctx) {
    ESP_RETURN_ON_NULL(cfg, ESP_ERR_INVALID_ARG, UTIL_TAG, "cfg is NULL");
    ESP_RETURN_ON_NULL(current_version, ESP_ERR_INVALID_ARG, UTIL_TAG, "current_version is NULL");
    ESP_RETURN_ON_NULL(cmd, ESP_ERR_INVALID_ARG, UTIL_TAG, "cmd is NULL");
    ESP_RETURN_ON_NULL(out_status, ESP_ERR_INVALID_ARG, UTIL_TAG, "out_status is NULL");

    util_ota_update_ctx_t ctx = {
        .err = ESP_FAIL,
        .failure_code = TRACKER_OTA_ERROR_APPLY_FAILED,
    };

    ctx.err = util_ota_prepare_status_report(&ctx,
                                             current_version,
                                             cmd,
                                             out_status,
                                             status_callback,
                                             status_callback_ctx);
    if (ctx.err == ESP_OK) {
        ctx.err = util_ota_http_init_session(&ctx);
    }
    if (ctx.err == ESP_OK) {
        ctx.err = util_ota_http_apply_request_config(&ctx, cmd);
    }
    if (ctx.err == ESP_OK) {
        ctx.err = util_ota_http_start_download(&ctx, cmd);
    }
    if (ctx.err == ESP_OK) {
        ctx.err = util_ota_begin_partition_write(&ctx);
    }
    if (ctx.err == ESP_OK) {
        ctx.err = util_ota_stream_payload(&ctx,
                                          cmd,
                                          out_status,
                                          status_callback,
                                          status_callback_ctx);
    }
    if (ctx.err == ESP_OK) {
        ctx.err = util_ota_finalize_image(&ctx,
                                          cmd,
                                          out_status,
                                          status_callback,
                                          status_callback_ctx);
    }

    util_ota_cleanup_update(&ctx, out_status, status_callback, status_callback_ctx);
    return ctx.err;
}
