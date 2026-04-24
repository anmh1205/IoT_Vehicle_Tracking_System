#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "esp_err.h"
#include "esp_partition.h"

#include "util.h"

/**
 * @file util_internal.h
 * @brief Shared utility runtime state and OTA helper declarations for split util modules.
 */

#define UTIL_TAG "UTIL"
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

extern bool s_sleep_enabled;
extern ota_http_action_state_t s_ota_http_action;
extern bool s_ota_http_urc_registered;

bool util_hex_to_bytes(const char *hex, uint8_t *out, size_t out_len);
bool util_hex_to_bytes_span(const char *hex,
                            size_t hex_len,
                            uint8_t *out,
                            size_t out_cap,
                            size_t *out_written);
void util_log_hex_preview(const char *label, const uint8_t *data, size_t len);

void util_ota_http_action_reset(void);
void util_ota_http_register_urc_once(void);
esp_err_t util_ota_wait_http_action(int *out_status_code, int *out_data_len, uint32_t timeout_ms);
bool util_ota_parse_httpread_payload(const uint8_t *response,
                                     size_t response_len,
                                     const uint8_t **out_data,
                                     size_t *out_len);
bool util_is_hex_ascii_bytes(const uint8_t *data, size_t len);
esp_err_t util_ota_configure_https_ssl_context(void);
const char *util_ota_http_status_name(int status_code);

void util_fill_partition_label(const esp_partition_t *partition, char *out, size_t out_size);
esp_err_t util_ota_apply_update_internal(const config_t *cfg,
                                         const char *current_version,
                                         const ota_command_t *cmd,
                                         firmware_status_t *out_status,
                                         ota_status_callback_t status_callback,
                                         void *status_callback_ctx);
esp_err_t util_ota_trigger_manual_rollback_internal(firmware_status_t *out_status);
