#include "util.h"

#include <ctype.h>
#include <string.h>

#include "esp_crt_bundle.h"
#include "esp_http_client.h"
#include "esp_ota_ops.h"
#include "esp_partition.h"
#include "esp_system.h"
#include "esp_timer.h"
#include "esp_tls.h"

#include "mbedtls/sha256.h"

#ifndef CONFIG_APP_PROJECT_VER
#define CONFIG_APP_PROJECT_VER "unknown"
#endif

static const char *TAG = "UTIL";

#define OTA_HTTP_BUFFER_SIZE 1024

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

uint64_t util_uptime_ms(void) {
    return (uint64_t)(esp_timer_get_time() / 1000ULL);
}

float util_clamp_float(float value, float min_value, float max_value) {
    if (value < min_value) {
        return min_value;
    }
    if (value > max_value) {
        return max_value;
    }
    return value;
}

int util_clamp_int(int value, int min_value, int max_value) {
    if (value < min_value) {
        return min_value;
    }
    if (value > max_value) {
        return max_value;
    }
    return value;
}

bool util_string_empty(const char *value) {
    return value == NULL || value[0] == '\0';
}

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

esp_err_t util_ota_apply_update(const config_t *cfg,
                                const char *current_version,
                                const ota_command_t *cmd,
                                firmware_status_t *out_status) {
    ESP_RETURN_ON_NULL(cfg, ESP_ERR_INVALID_ARG, TAG, "cfg is NULL");
    ESP_RETURN_ON_NULL(current_version, ESP_ERR_INVALID_ARG, TAG, "current_version is NULL");
    ESP_RETURN_ON_NULL(cmd, ESP_ERR_INVALID_ARG, TAG, "cmd is NULL");
    ESP_RETURN_ON_NULL(out_status, ESP_ERR_INVALID_ARG, TAG, "out_status is NULL");

    esp_err_t err = ESP_FAIL;
    esp_http_client_handle_t http = NULL;
    esp_ota_handle_t ota_handle = 0;
    bool ota_begun = false;

    memset(out_status, 0, sizeof(*out_status));
    util_copy_string(out_status->job_id, sizeof(out_status->job_id), cmd->job_id);
    util_copy_string(out_status->target_version, sizeof(out_status->target_version), cmd->version);
    util_copy_string(out_status->current_version, sizeof(out_status->current_version), current_version);

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
    ESP_GOTO_ON_FALSE(http != NULL, cleanup, TAG, "esp_http_client_init failed");

    util_copy_string(out_status->status, sizeof(out_status->status), "downloading");
    out_status->progress = 5;

    ESP_GOTO_ON_ERROR(esp_http_client_open(http, 0), cleanup, TAG, "HTTP open failed");
    int status_code = esp_http_client_fetch_headers(http);
    ESP_GOTO_ON_FALSE(status_code >= 0, cleanup, TAG, "HTTP fetch headers failed");
    ESP_GOTO_ON_FALSE(esp_http_client_get_status_code(http) == 200,
                      cleanup,
                      TAG,
                      "OTA URL responded with HTTP %d",
                      esp_http_client_get_status_code(http));

    ESP_GOTO_ON_ERROR(esp_ota_begin(update_partition, OTA_SIZE_UNKNOWN, &ota_handle),
                      cleanup,
                      TAG,
                      "esp_ota_begin failed");
    ota_begun = true;

    mbedtls_sha256_context sha_ctx;
    mbedtls_sha256_init(&sha_ctx);
    ESP_GOTO_ON_ERROR(mbedtls_sha256_starts(&sha_ctx, 0), cleanup, TAG, "sha256 start failed");

    uint8_t buffer[OTA_HTTP_BUFFER_SIZE];
    int total_read = 0;
    while (true) {
        int read_len = esp_http_client_read(http, (char *)buffer, sizeof(buffer));
        if (read_len < 0) {
            mbedtls_sha256_free(&sha_ctx);
            ESP_GOTO_ON_FALSE(false, cleanup, TAG, "HTTP read failed");
        }
        if (read_len == 0) {
            break;
        }

        ESP_GOTO_ON_ERROR(esp_ota_write(ota_handle, buffer, (size_t)read_len), cleanup, TAG, "esp_ota_write failed");
        ESP_GOTO_ON_ERROR(mbedtls_sha256_update(&sha_ctx, buffer, (size_t)read_len),
                          cleanup,
                          TAG,
                          "sha256 update failed");

        total_read += read_len;
        if (cmd->size > 0) {
            int progress = (int)((total_read * 100ULL) / cmd->size);
            out_status->progress = (uint8_t)util_clamp_int(progress, 5, 90);
        }
    }

    uint8_t computed_hash[32] = {0};
    ESP_GOTO_ON_ERROR(mbedtls_sha256_finish(&sha_ctx, computed_hash), cleanup, TAG, "sha256 finish failed");
    mbedtls_sha256_free(&sha_ctx);

    uint8_t expected_hash[32] = {0};
    ESP_GOTO_ON_FALSE(util_hex_to_bytes(cmd->sha256, expected_hash, sizeof(expected_hash)),
                      cleanup,
                      TAG,
                      "Invalid expected sha256 hex");

    util_copy_string(out_status->status, sizeof(out_status->status), "verifying");
    out_status->progress = 92;

    ESP_GOTO_ON_FALSE(memcmp(expected_hash, computed_hash, sizeof(computed_hash)) == 0,
                      cleanup,
                      TAG,
                      "OTA sha256 mismatch");

    ESP_GOTO_ON_ERROR(esp_ota_end(ota_handle), cleanup, TAG, "esp_ota_end failed");
    ota_begun = false;

    util_copy_string(out_status->status, sizeof(out_status->status), "installing");
    out_status->progress = 96;

    ESP_GOTO_ON_ERROR(esp_ota_set_boot_partition(update_partition),
                      cleanup,
                      TAG,
                      "esp_ota_set_boot_partition failed");

    util_copy_string(out_status->status, sizeof(out_status->status), "rebooting");
    out_status->progress = 100;
    err = ESP_OK;

cleanup:
    if (http != NULL) {
        esp_http_client_close(http);
        esp_http_client_cleanup(http);
    }

    if (ota_begun) {
        esp_ota_abort(ota_handle);
    }

    if (err != ESP_OK) {
        util_copy_string(out_status->status, sizeof(out_status->status), "failed");
        util_copy_string(out_status->error, sizeof(out_status->error), esp_err_to_name(err));
        out_status->progress = 0;
    }

    return err;
}

esp_err_t util_ota_trigger_manual_rollback(firmware_status_t *out_status) {
    ESP_RETURN_ON_NULL(out_status, ESP_ERR_INVALID_ARG, TAG, "out_status is NULL");

    memset(out_status, 0, sizeof(*out_status));
    util_copy_string(out_status->status, sizeof(out_status->status), "rolled_back");
    out_status->progress = 100;

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
