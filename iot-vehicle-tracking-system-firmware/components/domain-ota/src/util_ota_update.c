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


/**
 * @brief Mutable working state carried through every stage of one OTA apply run.
 *
 * A single instance lives on the stack of util_ota_apply_update() and is threaded
 * through the staged helpers so each stage can fail independently while cleanup
 * still sees the partial progress (open OTA handle, started SHA context, etc.).
 */
typedef struct {
    esp_err_t err;                        /**< Running result; first non-OK stops the stage pipeline. */
    esp_ota_handle_t ota_handle;          /**< Handle returned by esp_ota_begin() for partition writes. */
    bool ota_begun;                       /**< True once esp_ota_begin() succeeded; gates abort on failure. */
    bool http_initialized;                /**< True once AT+HTTPINIT succeeded; gates AT+HTTPTERM cleanup. */
    uint8_t *http_read_response;          /**< Heap buffer holding one raw AT+HTTPREAD response. */
    uint8_t *decode_buffer;               /**< Heap buffer for hex->binary decoded chunk bytes. */
    bool sha_ctx_started;                 /**< True once SHA256 context is initialized; gates its free. */
    mbedtls_sha256_context sha_ctx;       /**< Running SHA256 over the decoded image for integrity check. */
    const char *failure_code;             /**< Canonical error string reported to cloud on failure. */
    const esp_partition_t *update_partition; /**< Inactive OTA slot selected as the install target. */
    bool transfer_mode_known;             /**< True once the wire encoding (binary/hex) has been detected. */
    bool transfer_mode_hex;               /**< True when the modem streams the image as ASCII hex. */
    size_t transfer_wire_len;             /**< Total bytes expected on the wire (2x image size in hex mode). */
    size_t read_offset;                   /**< Wire bytes already requested/consumed via AT+HTTPREAD. */
    uint32_t total_written;               /**< Decoded image bytes written to the OTA partition so far. */
    uint8_t last_emitted_download_progress; /**< Last download % published, used to rate-limit status events. */
} util_ota_update_ctx_t;

/**
 * @brief Fill partition label into output buffer.
 *
 * Falls back to "unknown" for a NULL partition and to "ota" for an unlabeled
 * partition so status payloads always carry a printable label.
 *
 * @param[in] partition Source partition (may be NULL).
 * @param[out] out Output label buffer.
 * @param[in] out_size Capacity of @p out.
 */
void util_fill_partition_label(const esp_partition_t *partition, char *out, size_t out_size) {
    if (partition == NULL) {
        // No partition resolved yet: report a stable placeholder instead of an empty field.
        util_copy_string(out, out_size, "unknown");
        return;
    }

    if (!util_string_empty(partition->label)) {
        // Prefer the real partition table label so cloud sees exactly where the image landed.
        util_copy_string(out, out_size, partition->label);
        return;
    }

    // Unlabeled partition: fall back to the generic "ota" tag.
    util_copy_string(out, out_size, "ota");
}

/**
 * @brief Forward a firmware status snapshot to the caller-supplied callback.
 *
 * Centralizing the null checks here lets every stage emit progress without
 * repeating callback guards.
 *
 * @param[in] status Current firmware status to publish (ignored when NULL).
 * @param[in] status_callback Optional sink installed by the OTA executor.
 * @param[in] status_callback_ctx Opaque context passed back to the callback.
 */
static void util_ota_emit_status(const firmware_status_t *status,
                                 ota_status_callback_t status_callback,
                                 void *status_callback_ctx) {
    if (status == NULL || status_callback == NULL) {
        return; // Nothing to publish, or no sink registered.
    }

    status_callback(status, status_callback_ctx);
}

/**
 * @brief Update the status string + progress on the shared status object and publish it.
 *
 * @param[in,out] status Firmware status object mutated in place.
 * @param[in] next_status New lifecycle status string (e.g. "downloading").
 * @param[in] progress New completion percentage (0..100).
 * @param[in] status_callback Optional progress sink.
 * @param[in] status_callback_ctx Opaque context for the callback.
 */
static void util_ota_set_status(firmware_status_t *status,
                                const char *next_status,
                                uint8_t progress,
                                ota_status_callback_t status_callback,
                                void *status_callback_ctx) {
    if (status == NULL || util_string_empty(next_status)) {
        return; // Defensive: never publish a status with no target object/text.
    }

    util_copy_string(status->status, sizeof(status->status), next_status); // Set lifecycle label.
    status->progress = progress;                                           // Stamp matching progress.
    util_ota_emit_status(status, status_callback, status_callback_ctx);    // Notify the cloud sink.
}

/**
 * @brief Seed the firmware status report and pick the target OTA partition.
 *
 * Runs first in the apply pipeline: stamps job/version identity into the status
 * object, resolves the inactive OTA slot to write into, and emits the initial
 * "downloading" status so the backend sees the job has started.
 *
 * @param[in,out] ctx OTA run context (receives the chosen update partition).
 * @param[in] current_version Version currently running on the device.
 * @param[in] cmd Validated OTA command from cloud.
 * @param[out] out_status Status object initialized for this job.
 * @param[in] status_callback Optional progress sink.
 * @param[in] status_callback_ctx Opaque context for the callback.
 * @return ESP_OK on success, ESP_ERR_NOT_FOUND when no OTA slot is available.
 */
static esp_err_t util_ota_prepare_status_report(util_ota_update_ctx_t *ctx,
                                                const char *current_version,
                                                const ota_command_t *cmd,
                                                firmware_status_t *out_status,
                                                ota_status_callback_t status_callback,
                                                void *status_callback_ctx) {
    // Start from a clean status and copy the job identity supplied by the command.
    memset(out_status, 0, sizeof(*out_status));
    util_copy_string(out_status->job_id, sizeof(out_status->job_id), cmd->job_id);
    util_copy_string(out_status->target_version, sizeof(out_status->target_version), cmd->version);
    util_copy_string(out_status->current_version, sizeof(out_status->current_version), current_version);

    // The next-update partition is the slot NOT currently running; required to install.
    ctx->update_partition = esp_ota_get_next_update_partition(NULL);
    if (ctx->update_partition == NULL) {
        return ESP_ERR_NOT_FOUND; // No free OTA slot (e.g. single-app partition table).
    }

    util_fill_partition_label(ctx->update_partition, out_status->partition, sizeof(out_status->partition));
    // Publish the initial downloading milestone so the backend can show progress immediately.
    util_ota_set_status(out_status,
                        TRACKER_OTA_STATUS_DOWNLOADING,
                        TRACKER_OTA_PROGRESS_DOWNLOADING_START,
                        status_callback,
                        status_callback_ctx);
    ctx->last_emitted_download_progress = TRACKER_OTA_PROGRESS_DOWNLOADING_START; // Baseline for rate-limiting.
    return ESP_OK;
}

/**
 * @brief Bring up the modem HTTP service and bind it to the data context.
 *
 * Registers the +HTTPACTION URC handler, then retries AT+HTTPINIT a few times
 * because a stale HTTP session from a previous attempt can leave the modem in a
 * busy state that only clears after an AT+HTTPTERM. Finally pins the request to
 * PDP context CID 1 (the active data bearer).
 *
 * @param[in,out] ctx OTA run context (records http_initialized + failure_code).
 * @return ESP_OK once HTTP is initialized and bound to CID 1, else an error.
 */
static esp_err_t util_ota_http_init_session(util_ota_update_ctx_t *ctx) {
    util_ota_http_register_urc_once(); // Ensure +HTTPACTION async results are captured.
    util_ota_http_action_reset();      // Clear any leftover action state from a prior run.

    ctx->failure_code = TRACKER_OTA_ERROR_HTTP_INIT_FAILED;
    for (int attempt = 0; attempt < 3; ++attempt) {
        // Tear down any lingering session first, then (re)initialize the HTTP stack.
        (void)modem_at_send_expect("AT+HTTPTERM\r", "OK", OTA_HTTP_CMD_TIMEOUT_MS);
        if (modem_at_send_expect("AT+HTTPINIT\r", "OK", OTA_HTTP_CMD_TIMEOUT_MS) == ESP_OK) {
            ctx->http_initialized = true;
            break; // HTTP service is up; stop retrying.
        }
        ESP_LOGW(UTIL_TAG, "HTTPINIT retry attempt=%d", attempt + 1);
        vTaskDelay(pdMS_TO_TICKS(300)); // Brief settle delay before the next attempt.
    }

    if (!ctx->http_initialized) {
        ESP_LOGE(UTIL_TAG, "HTTPINIT failed after retries");
        return ESP_FAIL;
    }

    // Bind the HTTP client to PDP context 1 so requests egress over the live data bearer.
    ctx->failure_code = TRACKER_OTA_ERROR_HTTP_CONFIG_FAILED;
    esp_err_t err = modem_at_send_expect("AT+HTTPPARA=\"CID\",1\r", "OK", OTA_HTTP_CMD_TIMEOUT_MS);
    if (err != ESP_OK) {
        ESP_LOGE(UTIL_TAG, "HTTPPARA CID failed: %s", esp_err_to_name(err));
    }
    return err;
}

/**
 * @brief Configure the modem HTTP client for the OTA download request.
 *
 * Enforces HTTPS-only transport, programs the TLS/SSL context, sets the request
 * URL, asks the server for identity (non-compressed) encoding so byte offsets
 * stay meaningful for ranged reads, and enables redirect following.
 *
 * @param[in,out] ctx OTA run context (records failure_code per stage).
 * @param[in] cmd Validated OTA command carrying the download URL.
 * @return ESP_OK when the request is fully configured, else an error.
 */
static esp_err_t util_ota_http_apply_request_config(util_ota_update_ctx_t *ctx, const ota_command_t *cmd) {
    // Apply OTA http apply request config in one place so this module keeps a single authoritative writer.
    if (strncmp(cmd->url, "https://", strlen("https://")) != 0) {
        // Firmware images must never be fetched over plaintext HTTP.
        ctx->failure_code = TRACKER_OTA_ERROR_HTTP_SSL_CONFIG_FAILED;
        ESP_LOGE(UTIL_TAG, "ota request target must use HTTPS");
        return ESP_FAIL;
    }

    // Program the modem SSL context (version/authmode/CA/SNI) before issuing the request.
    ctx->failure_code = TRACKER_OTA_ERROR_HTTP_SSL_CONFIG_FAILED;
    esp_err_t err = util_ota_configure_https_ssl_context();
    if (err != ESP_OK) {
        ESP_LOGE(UTIL_TAG, "HTTPS SSL context setup failed: %s", esp_err_to_name(err));
        return err;
    }

    ESP_LOGI(UTIL_TAG,
             "OTA HTTPS request configured via URL scheme + SSLCFG ctx=%d",
             OTA_HTTP_SSL_CTX_INDEX);

    // Build the AT+HTTPPARA URL command; guard against truncation of an oversized URL.
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

    // Request identity encoding: compressed responses would break the offset-based HTTPREAD streaming.
    if (modem_at_send_expect("AT+HTTPPARA=\"USERDATA\",\"Accept-Encoding: identity\"\r",
                             "OK",
                             OTA_HTTP_CMD_TIMEOUT_MS) != ESP_OK) {
        ESP_LOGW(UTIL_TAG, "HTTPPARA USERDATA Accept-Encoding not applied");
    }
    // Follow redirects so CDN-style firmware URLs that 30x to a signed object still resolve.
    (void)modem_at_send_expect("AT+HTTPPARA=\"REDIR\",1\r", "OK", OTA_HTTP_CMD_TIMEOUT_MS);
    return ESP_OK;
}

/**
 * @brief Issue the GET request and wait for an acceptable HTTP response.
 *
 * Fires AT+HTTPACTION=0 (GET), waits for the asynchronous +HTTPACTION result,
 * and validates that the server returned 200 with a non-empty body and that the
 * command-declared image size is non-zero. Each failure path bumps the OTA HTTP
 * failure counter and records a specific failure_code for the cloud report.
 *
 * @param[in,out] ctx OTA run context (records failure_code).
 * @param[in] cmd Validated OTA command (provides expected image size).
 * @return ESP_OK when a 200 response with a usable body is confirmed.
 */
static esp_err_t util_ota_http_start_download(util_ota_update_ctx_t *ctx, const ota_command_t *cmd) {
    telemetry_counters_inc_ota_http_start();
    ESP_LOGI(UTIL_TAG, "ota http start job=%s", cmd->job_id);
    s_ota_http_action.waiting = true; // Arm the URC handler to capture the next +HTTPACTION.
    ctx->failure_code = TRACKER_OTA_ERROR_HTTP_ACTION_FAILED;
    esp_err_t err = modem_at_send_expect("AT+HTTPACTION=0\r", "OK", OTA_HTTP_CMD_TIMEOUT_MS);
    if (err != ESP_OK) {
        telemetry_counters_inc_ota_http_fail();
        ESP_LOGE(UTIL_TAG, "ota http failed stage=action err=%s job=%s", esp_err_to_name(err), cmd->job_id);
        return err;
    }

    // The transfer result arrives asynchronously via the +HTTPACTION URC, so block until it lands.
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
        // Only HTTP 200 is acceptable; codes >= 700 are SIM7600 transport errors, not real HTTP statuses.
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
        // A zero-length manifest size means there is nothing to stream/verify.
        telemetry_counters_inc_ota_http_fail();
        ctx->failure_code = TRACKER_OTA_ERROR_HTTP_EMPTY_BODY;
        ESP_LOGE(UTIL_TAG, "ota http failed stage=size reason=empty_body job=%s", cmd->job_id);
        return ESP_FAIL;
    }

    telemetry_counters_inc_ota_http_success();
    ESP_LOGI(UTIL_TAG, "ota http accepted status=200 body_len=%d job=%s", http_body_len, cmd->job_id);
    return ESP_OK;
}

/**
 * @brief Open the OTA partition, start the running SHA-256, and allocate buffers.
 *
 * Prepares everything needed to stream the image: an esp_ota write handle, a
 * fresh SHA-256 context for end-to-end integrity, a decode buffer for hex
 * transport, and an HTTPREAD response buffer. Streaming offsets/counters are
 * reset so a retry never reuses stale progress.
 *
 * @param[in,out] ctx OTA run context to populate.
 * @return ESP_OK when partition write state is ready, else an error.
 */
static esp_err_t util_ota_begin_partition_write(util_ota_update_ctx_t *ctx) {
    ctx->failure_code = TRACKER_OTA_ERROR_OTA_BEGIN_FAILED;
    // OTA_SIZE_UNKNOWN lets the flash driver erase lazily as bytes arrive.
    esp_err_t err = esp_ota_begin(ctx->update_partition, OTA_SIZE_UNKNOWN, &ctx->ota_handle);
    if (err != ESP_OK) {
        ESP_LOGE(UTIL_TAG, "esp_ota_begin failed: %s", esp_err_to_name(err));
        return err;
    }
    ctx->ota_begun = true; // Mark so cleanup can abort the partial write on failure.

    // Start a running SHA-256 so the digest is computed incrementally as chunks are written.
    mbedtls_sha256_init(&ctx->sha_ctx);
    int sha_err = mbedtls_sha256_starts(&ctx->sha_ctx, 0); // 0 selects SHA-256 (not SHA-224).
    if (sha_err != 0) {
        ctx->failure_code = TRACKER_OTA_ERROR_OTA_BEGIN_FAILED;
        ESP_LOGE(UTIL_TAG, "sha256 start failed: %d", sha_err);
        return (esp_err_t)sha_err;
    }
    ctx->sha_ctx_started = true;

    // Scratch buffer that holds decoded binary bytes when the transport is hex-encoded.
    ctx->decode_buffer = (uint8_t *)malloc(OTA_HTTP_BINARY_CHUNK_SIZE);
    if (ctx->decode_buffer == NULL) {
        ESP_LOGE(UTIL_TAG, "ota decode buffer alloc failed");
        return ESP_ERR_NO_MEM;
    }

    // Buffer that receives the raw +HTTPREAD response (header + payload framing).
    ctx->http_read_response = (uint8_t *)malloc(OTA_HTTP_READ_RESPONSE_MAX_LEN);
    if (ctx->http_read_response == NULL) {
        ESP_LOGE(UTIL_TAG, "ota read response buffer alloc failed");
        return ESP_ERR_NO_MEM;
    }

    // Reset all streaming bookkeeping so a fresh download starts from offset 0.
    ctx->transfer_mode_known = false;
    ctx->transfer_mode_hex = false;
    ctx->transfer_wire_len = 0U;
    ctx->read_offset = 0U;
    ctx->total_written = 0U;
    return ESP_OK;
}

/**
 * @brief Compute how many wire bytes to request in the next HTTPREAD.
 *
 * Caps the request at the per-mode chunk size (binary vs hex) and, in hex mode,
 * forces an even length so a request never splits a hex byte-pair across reads.
 *
 * @param[in] ctx OTA run context (offsets + transfer mode).
 * @return Number of wire bytes to request for the next chunk.
 */
static size_t util_ota_next_request_len(const util_ota_update_ctx_t *ctx) {
    // Remaining wire bytes from the current offset to the end of the transfer.
    size_t request_len = ctx->transfer_wire_len - ctx->read_offset;
    // Hex doubles the wire size, so it uses a larger ceiling than raw binary.
    size_t request_max_len = (ctx->transfer_mode_known && ctx->transfer_mode_hex)
                                 ? OTA_HTTP_HEX_CHUNK_SIZE
                                 : OTA_HTTP_BINARY_CHUNK_SIZE;
    if (request_len > request_max_len) {
        request_len = request_max_len;
    }
    if (ctx->transfer_mode_known && ctx->transfer_mode_hex && (request_len % 2U) != 0U) {
        // Keep hex requests aligned to whole bytes (2 hex chars == 1 byte).
        request_len -= 1U;
    }
    return request_len;
}

/**
 * @brief Read one payload chunk from the modem via AT+HTTPREAD.
 *
 * Builds a ranged HTTPREAD command (offset,length), collects the modem
 * response, and extracts the payload span out of the +HTTPREAD framing. Empty
 * or unparseable responses are treated as failures so the stream does not
 * silently stall.
 *
 * @param[in,out] ctx OTA run context (records failure_code, owns read buffer).
 * @param[in] request_len Wire bytes to request at the current offset.
 * @param[out] wire_payload Receives a pointer into the response buffer.
 * @param[out] wire_payload_len Receives the payload length in bytes.
 * @return ESP_OK on a non-empty parsed chunk, else an error.
 */
static esp_err_t util_ota_request_chunk(util_ota_update_ctx_t *ctx,
                                        size_t request_len,
                                        const uint8_t **wire_payload,
                                        size_t *wire_payload_len) {
    // Ranged read: "AT+HTTPREAD=<byte offset>,<length>".
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

    // Collect the modem response, which interleaves the +HTTPREAD header with raw bytes.
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

    // Strip the +HTTPREAD framing to obtain the exact payload span the modem returned.
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
        // A zero-length chunk would loop forever without advancing the offset.
        ESP_LOGE(UTIL_TAG, "HTTPREAD returned empty chunk");
        return ESP_FAIL;
    }

    return ESP_OK;
}

/**
 * @brief Detect binary vs hex transport from the first received chunk.
 *
 * The SIM7600 sometimes returns the body as ASCII hex. The mode is decided once
 * from the first chunk and then fixes the expected total wire length (hex is
 * twice the binary image size).
 *
 * @param[in,out] ctx OTA run context to record the resolved mode.
 * @param[in] cmd OTA command providing the binary image size.
 * @param[in] wire_payload First chunk bytes used for the hex/binary probe.
 * @param[in] wire_payload_len Length of @p wire_payload.
 */
static void util_ota_resolve_transfer_mode(util_ota_update_ctx_t *ctx,
                                           const ota_command_t *cmd,
                                           const uint8_t *wire_payload,
                                           size_t wire_payload_len) {
    if (ctx->transfer_mode_known) {
        return; // Mode is decided once and then stays fixed for the whole transfer.
    }

    // If every byte of the first chunk is a hex ASCII digit, treat the transport as hex-encoded.
    ctx->transfer_mode_hex = util_is_hex_ascii_bytes(wire_payload, wire_payload_len);
    ctx->transfer_mode_known = true;
    // Hex doubles the on-wire length; binary matches the manifest size exactly.
    ctx->transfer_wire_len = ctx->transfer_mode_hex ? ((size_t)cmd->size * 2U) : (size_t)cmd->size;
    ESP_LOGI(UTIL_TAG,
             "HTTPREAD transfer mode=%s wire_len=%u",
             ctx->transfer_mode_hex ? "hex" : "binary",
             (unsigned)ctx->transfer_wire_len);
}

/**
 * @brief Validate, decode, persist, and hash one streamed chunk.
 *
 * On the very first chunk it checks the ESP image magic byte (0xE9) so a server
 * error page can never be flashed. In hex mode it decodes ASCII hex into binary
 * before writing. Every written span is folded into the running SHA-256 and the
 * cumulative size is checked against the manifest to reject oversized images.
 *
 * @param[in,out] ctx OTA run context (offsets, counters, failure_code).
 * @param[in] cmd OTA command providing the authoritative image size.
 * @param[in] wire_payload Chunk bytes as received on the wire.
 * @param[in] wire_payload_len Length of @p wire_payload in wire bytes.
 * @return ESP_OK when the chunk is written and hashed, else an error.
 */
static esp_err_t util_ota_write_wire_payload(util_ota_update_ctx_t *ctx,
                                             const ota_command_t *cmd,
                                             const uint8_t *wire_payload,
                                             size_t wire_payload_len) {
    size_t written_len = 0U;
    if (ctx->read_offset == 0U) {
        // Validate the magic byte before writing anything so we fail fast on HTML/error pages masquerading as firmware.
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
        // Hex transport must decode into whole bytes because esp_ota_write only accepts binary payload spans.
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
    // Persist the chunk first, then fold the exact written bytes into the running SHA256 state.
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
    ctx->total_written += (uint32_t)written_len;
    if (ctx->total_written > cmd->size) {
        // Reject oversized downloads even if the modem kept streaming, because the signed manifest is authoritative.
        ctx->failure_code = TRACKER_OTA_ERROR_HTTP_SIZE_MISMATCH;
        ESP_LOGE(UTIL_TAG, "decoded size overflow expected=%u actual=%u", (unsigned)cmd->size, (unsigned)ctx->total_written);
        return ESP_FAIL;
    }

    return ESP_OK;
}

/**
 * @brief Publish download progress, rate-limited to ~5% steps.
 *
 * Progress is derived from decoded bytes vs the manifest size and clamped into
 * the download band [START..MAX] so it never overlaps the verify/install range.
 * A status event is emitted only when progress advanced by at least 5% or hit
 * the download ceiling, which keeps MQTT traffic light during the transfer.
 *
 * @param[in,out] ctx OTA run context (tracks last emitted progress).
 * @param[in] cmd OTA command providing total image size.
 * @param[in,out] out_status Status object whose progress is updated.
 * @param[in] status_callback Optional progress sink.
 * @param[in] status_callback_ctx Opaque context for the callback.
 */
static void util_ota_emit_download_progress(util_ota_update_ctx_t *ctx,
                                            const ota_command_t *cmd,
                                            firmware_status_t *out_status,
                                            ota_status_callback_t status_callback,
                                            void *status_callback_ctx) {
    if (cmd->size == 0) {
        return; // Cannot compute a percentage without a known total size.
    }

    // Integer percent of decoded bytes against the manifest size (64-bit math avoids overflow).
    int progress = (int)(((uint64_t)ctx->total_written * 100ULL) / (uint64_t)cmd->size);
    // Keep the value inside the download band so it never collides with verify/install milestones.
    uint8_t bounded_progress = (uint8_t)util_clamp_int(progress,
                                                       TRACKER_OTA_PROGRESS_DOWNLOADING_START,
                                                       TRACKER_OTA_PROGRESS_DOWNLOADING_MAX);
    out_status->progress = bounded_progress;

    // Only publish when progress meaningfully moved (>=5%) or reached the download ceiling.
    int progress_delta = (int)bounded_progress - (int)ctx->last_emitted_download_progress;
    bool progress_advanced = progress_delta > 0;
    bool reached_next_step = progress_delta >= 5;
    bool reached_download_ceiling = bounded_progress >= TRACKER_OTA_PROGRESS_DOWNLOADING_MAX;
    if (progress_advanced && (reached_next_step || reached_download_ceiling)) {
        ctx->last_emitted_download_progress = bounded_progress;
        util_ota_emit_status(out_status, status_callback, status_callback_ctx);
    }
}

/**
 * @brief Drive the full download loop until the whole image is streamed.
 *
 * Seeds the expected wire length with the binary size; the first chunk may
 * upgrade it to the hex length inside util_ota_resolve_transfer_mode. Each
 * iteration requests, parses, writes/hashes one chunk and reports progress
 * until the read offset reaches the end of the transfer.
 *
 * @param[in,out] ctx OTA run context driving the stream.
 * @param[in] cmd OTA command providing the image size.
 * @param[in,out] out_status Status object updated with download progress.
 * @param[in] status_callback Optional progress sink.
 * @param[in] status_callback_ctx Opaque context for the callback.
 * @return ESP_OK when the entire image has been streamed, else an error.
 */
static esp_err_t util_ota_stream_payload(util_ota_update_ctx_t *ctx,
                                         const ota_command_t *cmd,
                                         firmware_status_t *out_status,
                                         ota_status_callback_t status_callback,
                                         void *status_callback_ctx) {
    // Assume binary length initially; the first chunk can promote this to the hex wire length.
    ctx->transfer_wire_len = (size_t)cmd->size;
    while (ctx->read_offset < ctx->transfer_wire_len) {
        size_t request_len = util_ota_next_request_len(ctx);
        if (request_len == 0U) {
            // A zero request length would spin without consuming bytes.
            ctx->failure_code = TRACKER_OTA_ERROR_HTTP_READ_FAILED;
            ESP_LOGE(UTIL_TAG, "invalid HTTPREAD request len");
            return ESP_FAIL;
        }

        // Pull the next chunk from the modem.
        const uint8_t *wire_payload = NULL;
        size_t wire_payload_len = 0U;
        esp_err_t err = util_ota_request_chunk(ctx, request_len, &wire_payload, &wire_payload_len);
        if (err != ESP_OK) {
            return err;
        }

        // Decide hex vs binary once, then validate/write/hash the chunk.
        util_ota_resolve_transfer_mode(ctx, cmd, wire_payload, wire_payload_len);
        err = util_ota_write_wire_payload(ctx, cmd, wire_payload, wire_payload_len);
        if (err != ESP_OK) {
            return err;
        }

        util_ota_emit_download_progress(ctx, cmd, out_status, status_callback, status_callback_ctx);
    }

    return ESP_OK;
}

/**
 * @brief Verify integrity and promote the downloaded image for next boot.
 *
 * Final gate of the OTA flow: confirms the streamed size matches the manifest,
 * finishes the running SHA-256 and compares it against the expected digest,
 * closes the OTA write with esp_ota_end, and sets the new boot partition. Status
 * advances verifying -> installing -> rebooting as each step succeeds. Any
 * mismatch fails the update before the boot partition is ever switched.
 *
 * @param[in,out] ctx OTA run context (clears ota_begun/sha state on success).
 * @param[in] cmd OTA command carrying the expected size + SHA-256 hex.
 * @param[in,out] out_status Status object advanced through the final stages.
 * @param[in] status_callback Optional progress sink.
 * @param[in] status_callback_ctx Opaque context for the callback.
 * @return ESP_OK when the image is verified and marked bootable, else an error.
 */
static esp_err_t util_ota_finalize_image(util_ota_update_ctx_t *ctx,
                                         const ota_command_t *cmd,
                                         firmware_status_t *out_status,
                                         ota_status_callback_t status_callback,
                                         void *status_callback_ctx,
                                         ota_preboot_commit_callback_t preboot_commit_callback,
                                         void *preboot_commit_ctx) {
    if (ctx->transfer_mode_known && ctx->transfer_mode_hex &&
        ctx->read_offset != ((size_t)cmd->size * 2U)) {
        // In hex mode the modem reports wire bytes, so the final offset must be exactly twice the binary image length.
        ctx->failure_code = TRACKER_OTA_ERROR_HTTP_SIZE_MISMATCH;
        ESP_LOGE(UTIL_TAG,
                 "wire size mismatch expected_hex=%u actual=%u",
                 (unsigned)((size_t)cmd->size * 2U),
                 (unsigned)ctx->read_offset);
        return ESP_FAIL;
    }

    if (ctx->total_written != cmd->size) {
        // Final decoded byte count must still match the manifest even when the transport framing looked correct.
        ctx->failure_code = TRACKER_OTA_ERROR_HTTP_SIZE_MISMATCH;
        ESP_LOGE(UTIL_TAG,
                 "decoded size mismatch expected=%u actual=%u",
                 (unsigned)cmd->size,
                 (unsigned)ctx->total_written);
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

    // Status moves to VERIFYING only after every byte is written and the module is about to compare the final digest.
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

    // From here on the image is fully received; the remaining steps only promote it for the next boot.
    util_ota_set_status(out_status,
                        TRACKER_OTA_STATUS_INSTALLING,
                        TRACKER_OTA_PROGRESS_INSTALLING,
                        status_callback,
                        status_callback_ctx);

    /*
     * Persist the complete post-boot confirmation contract before making the
     * new image bootable. If this gate fails, the currently running partition
     * remains the boot target and a reset cannot enter an uncorrelated image.
     */
    if (preboot_commit_callback != NULL) {
        ctx->failure_code = TRACKER_OTA_ERROR_CONTEXT_PERSIST_FAILED;
        err = preboot_commit_callback(cmd, out_status, preboot_commit_ctx);
        if (err != ESP_OK) {
            ESP_LOGE(UTIL_TAG,
                     "OTA preboot context commit failed: %s",
                     esp_err_to_name(err));
            return err;
        }
    }

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

/**
 * @brief Release all OTA resources and emit a terminal failure status if needed.
 *
 * Always-run teardown for the apply pipeline: frees the SHA context, decode and
 * read buffers, terminates the modem HTTP session, and aborts any partially
 * written OTA image so a failed attempt cannot leave a bootable half-image. When
 * the run ended in error it publishes a final "failed" status with the captured
 * failure_code.
 *
 * @param[in,out] ctx OTA run context to clean up.
 * @param[in,out] out_status Status object used for the terminal failure report.
 * @param[in] status_callback Optional progress sink.
 * @param[in] status_callback_ctx Opaque context for the callback.
 */
static void util_ota_cleanup_update(util_ota_update_ctx_t *ctx,
                                    firmware_status_t *out_status,
                                    ota_status_callback_t status_callback,
                                    void *status_callback_ctx) {
    if (ctx->sha_ctx_started) {
        mbedtls_sha256_free(&ctx->sha_ctx); // Release the running hash context.
    }
    if (ctx->decode_buffer != NULL) {
        free(ctx->decode_buffer);           // Free the hex-decode scratch buffer.
        ctx->decode_buffer = NULL;
    }
    if (ctx->http_read_response != NULL) {
        free(ctx->http_read_response);      // Free the HTTPREAD response buffer.
        ctx->http_read_response = NULL;
    }
    if (ctx->http_initialized) {
        // Close the modem HTTP session so the next attempt starts from a clean state.
        (void)modem_at_send_expect("AT+HTTPTERM\r", "OK", OTA_HTTP_CMD_TIMEOUT_MS);
    }
    if (ctx->ota_begun) {
        // Abort the partial write so a failed download never leaves a bootable half-image.
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
 * @brief Public entry point that downloads, verifies, and installs an OTA image.
 *
 * Orchestrates the staged pipeline as a short-circuit chain: each stage runs
 * only while the previous one succeeded, so the first failure stops the flow and
 * records a specific failure_code. Stage order is intentional:
 *   1. prepare_status_report   - pick target partition, emit "downloading".
 *   2. http_init_session        - bring up modem HTTP on the data bearer.
 *   3. http_apply_request_config- enforce HTTPS + TLS and set the URL.
 *   4. http_start_download       - GET and confirm a usable 200 response.
 *   5. begin_partition_write     - open the OTA slot + running SHA-256.
 *   6. stream_payload            - read/decode/write/hash every chunk.
 *   7. finalize_image            - verify size+digest, set boot partition.
 * cleanup_update always runs to free resources and report a terminal failure.
 *
 * @param[in] cfg Runtime configuration.
 * @param[in] current_version Version currently running on the device.
 * @param[in] cmd Validated OTA command from cloud.
 * @param[out] out_status Firmware status object driven through the flow.
 * @param[in] status_callback Optional progress sink.
 * @param[in] status_callback_ctx Opaque context for the callback.
 * @return ESP_OK when the image is installed and marked bootable, else an error.
 */
esp_err_t util_ota_apply_update(const config_t *cfg,
                                const char *current_version,
                                const ota_command_t *cmd,
                                firmware_status_t *out_status,
                                ota_status_callback_t status_callback,
                                void *status_callback_ctx,
                                ota_preboot_commit_callback_t preboot_commit_callback,
                                void *preboot_commit_ctx) {
    // Apply OTA apply update in one place so this module keeps a single authoritative writer.
    ESP_RETURN_ON_NULL(cfg, ESP_ERR_INVALID_ARG, UTIL_TAG, "cfg is NULL");
    ESP_RETURN_ON_NULL(current_version, ESP_ERR_INVALID_ARG, UTIL_TAG, "current_version is NULL");
    ESP_RETURN_ON_NULL(cmd, ESP_ERR_INVALID_ARG, UTIL_TAG, "cmd is NULL");
    ESP_RETURN_ON_NULL(out_status, ESP_ERR_INVALID_ARG, UTIL_TAG, "out_status is NULL");

    // Seed the context: default to failure so an unexpected early return is never mistaken for success.
    util_ota_update_ctx_t ctx = {
        .err = ESP_FAIL,
        .failure_code = TRACKER_OTA_ERROR_APPLY_FAILED,
    };

    // Stage 1: stamp identity, choose the inactive OTA slot, emit the first status.
    ctx.err = util_ota_prepare_status_report(&ctx,
                                             current_version,
                                             cmd,
                                             out_status,
                                             status_callback,
                                             status_callback_ctx);
    if (ctx.err == ESP_OK) {
        // Stage 2: initialize the modem HTTP service and bind it to the data bearer.
        ctx.err = util_ota_http_init_session(&ctx);
    }
    if (ctx.err == ESP_OK) {
        // Stage 3: enforce HTTPS, program the TLS context, and set the request URL.
        ctx.err = util_ota_http_apply_request_config(&ctx, cmd);
    }
    if (ctx.err == ESP_OK) {
        // Stage 4: issue the GET and confirm a 200 response with a usable body.
        ctx.err = util_ota_http_start_download(&ctx, cmd);
    }
    if (ctx.err == ESP_OK) {
        // Stage 5: open the OTA partition and start the running integrity hash.
        ctx.err = util_ota_begin_partition_write(&ctx);
    }
    if (ctx.err == ESP_OK) {
        // Stage 6: stream the whole image chunk by chunk into flash.
        ctx.err = util_ota_stream_payload(&ctx,
                                          cmd,
                                          out_status,
                                          status_callback,
                                          status_callback_ctx);
    }
    if (ctx.err == ESP_OK) {
        // Stage 7: verify size + SHA-256, then promote the image for the next boot.
        ctx.err = util_ota_finalize_image(&ctx,
                                          cmd,
                                          out_status,
                                          status_callback,
                                          status_callback_ctx,
                                          preboot_commit_callback,
                                          preboot_commit_ctx);
    }

    // Always tear down resources; emits a terminal "failed" status when ctx.err != ESP_OK.
    util_ota_cleanup_update(&ctx, out_status, status_callback, status_callback_ctx);
    return ctx.err;
}
