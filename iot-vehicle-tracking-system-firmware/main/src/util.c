#include "util.h"

#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "esp_crt_bundle.h"
#include "esp_http_client.h"
#include "esp_ota_ops.h"
#include "esp_partition.h"
#include "esp_system.h"
#include "esp_timer.h"
#include "esp_tls.h"

#include "mbedtls/sha256.h"

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

#define OTA_HTTP_BUFFER_SIZE 1024

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
    esp_http_client_handle_t http = NULL;
    esp_ota_handle_t ota_handle = 0;
    bool ota_begun = false;
    uint8_t *buffer = NULL;
    bool sha_ctx_started = false;
    mbedtls_sha256_context sha_ctx;
    const char *failure_code = "ota_apply_failed";

    /* Prepare output report skeleton. */
    memset(out_status, 0, sizeof(*out_status));
    util_copy_string(out_status->job_id, sizeof(out_status->job_id), cmd->job_id);
    util_copy_string(out_status->target_version, sizeof(out_status->target_version), cmd->version);
    util_copy_string(out_status->current_version, sizeof(out_status->current_version), current_version);

    /* Pick next OTA partition selected by ESP-IDF partition API. */
    const esp_partition_t *update_partition = esp_ota_get_next_update_partition(NULL);
    ESP_RETURN_ON_NULL(update_partition, ESP_ERR_NOT_FOUND, TAG, "No OTA partition available");
    util_fill_partition_label(update_partition, out_status->partition, sizeof(out_status->partition));

    esp_http_client_config_t http_cfg = {
        .url = cmd->url,
        .timeout_ms = 30000,
        .transport_type = HTTP_TRANSPORT_OVER_SSL,
        .crt_bundle_attach = esp_crt_bundle_attach,
        .buffer_size = OTA_HTTP_BUFFER_SIZE,
    };

    http = esp_http_client_init(&http_cfg);
    if (http == NULL) {
        failure_code = "http_open_failed";
        goto cleanup;
    }

    util_ota_set_status(out_status, "downloading", 5, status_callback, status_callback_ctx);
    uint8_t last_emitted_download_progress = 5;

    /* Open HTTP stream and validate response status. */
    failure_code = "http_open_failed";
    ESP_GOTO_ON_ERROR(esp_http_client_open(http, 0), cleanup, TAG, "HTTP open failed");
    int status_code = esp_http_client_fetch_headers(http);
    if (status_code < 0) {
        failure_code = "http_open_failed";
        goto cleanup;
    }

    failure_code = "http_status_not_200";
    ESP_GOTO_ON_FALSE(esp_http_client_get_status_code(http) == 200,
                      cleanup,
                      TAG,
                      "OTA URL responded with HTTP %d",
                      esp_http_client_get_status_code(http));

    /* Start OTA write session to target partition. */
    failure_code = "ota_begin_failed";
    ESP_GOTO_ON_ERROR(esp_ota_begin(update_partition, OTA_SIZE_UNKNOWN, &ota_handle),
                      cleanup,
                      TAG,
                      "esp_ota_begin failed");
    ota_begun = true;

    /* Initialize SHA-256 context to verify full downloaded image integrity. */
    mbedtls_sha256_init(&sha_ctx);
    ESP_GOTO_ON_ERROR(mbedtls_sha256_starts(&sha_ctx, 0), cleanup, TAG, "sha256 start failed");
    sha_ctx_started = true;

    buffer = (uint8_t *)malloc(OTA_HTTP_BUFFER_SIZE);
    ESP_GOTO_ON_FALSE(buffer != NULL, cleanup, TAG, "ota buffer alloc failed");

    int total_read = 0;
    while (true) {
        int read_len = esp_http_client_read(http, (char *)buffer, OTA_HTTP_BUFFER_SIZE);
        if (read_len < 0) {
            failure_code = "http_read_failed";
            ESP_GOTO_ON_FALSE(false, cleanup, TAG, "HTTP read failed");
        }
        if (read_len == 0) {
            break;
        }

        /* Write chunk to OTA partition and update running hash. */
        failure_code = "ota_write_failed";
        ESP_GOTO_ON_ERROR(esp_ota_write(ota_handle, buffer, (size_t)read_len), cleanup, TAG, "esp_ota_write failed");
        ESP_GOTO_ON_ERROR(mbedtls_sha256_update(&sha_ctx, buffer, (size_t)read_len),
                          cleanup,
                          TAG,
                          "sha256 update failed");

        total_read += read_len;
        if (cmd->size > 0) {
            int progress = (int)((total_read * 100ULL) / cmd->size);
            uint8_t bounded_progress = (uint8_t)util_clamp_int(progress, 5, 90);
            out_status->progress = bounded_progress;
            if (bounded_progress >= (uint8_t)(last_emitted_download_progress + 5U) || bounded_progress >= 90U) {
                last_emitted_download_progress = bounded_progress;
                util_ota_emit_status(out_status, status_callback, status_callback_ctx);
            }
        }
    }

    uint8_t computed_hash[32] = {0};
    failure_code = "sha256_mismatch";
    ESP_GOTO_ON_ERROR(mbedtls_sha256_finish(&sha_ctx, computed_hash), cleanup, TAG, "sha256 finish failed");
    mbedtls_sha256_free(&sha_ctx);
    sha_ctx_started = false;

    uint8_t expected_hash[32] = {0};
    failure_code = "sha256_mismatch";
    ESP_GOTO_ON_FALSE(util_hex_to_bytes(cmd->sha256, expected_hash, sizeof(expected_hash)),
                      cleanup,
                      TAG,
                      "Invalid expected sha256 hex");

    util_ota_set_status(out_status, "verifying", 92, status_callback, status_callback_ctx);

    /* Abort update if hash mismatch to avoid booting corrupt image. */
    failure_code = "sha256_mismatch";
    ESP_GOTO_ON_FALSE(memcmp(expected_hash, computed_hash, sizeof(computed_hash)) == 0,
                      cleanup,
                      TAG,
                      "OTA sha256 mismatch");

    failure_code = "ota_end_failed";
    ESP_GOTO_ON_ERROR(esp_ota_end(ota_handle), cleanup, TAG, "esp_ota_end failed");
    ota_begun = false;

    util_ota_set_status(out_status, "installing", 96, status_callback, status_callback_ctx);

    /* Set next boot partition to freshly written image. */
    failure_code = "set_boot_partition_failed";
    ESP_GOTO_ON_ERROR(esp_ota_set_boot_partition(update_partition),
                      cleanup,
                      TAG,
                      "esp_ota_set_boot_partition failed");

    util_ota_set_status(out_status, "rebooting", 100, status_callback, status_callback_ctx);
    err = ESP_OK;

cleanup:
    if (sha_ctx_started) {
        mbedtls_sha256_free(&sha_ctx);
    }

    if (buffer != NULL) {
        free(buffer);
    }

    if (http != NULL) {
        esp_http_client_close(http);
        esp_http_client_cleanup(http);
    }

    if (ota_begun) {
        esp_ota_abort(ota_handle);
    }

    if (err != ESP_OK) {
        util_copy_string(out_status->status, sizeof(out_status->status), "failed");
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
    util_copy_string(out_status->status, sizeof(out_status->status), "rolled_back");
    out_status->progress = 100;

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
