#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "esp_err.h"
#include "esp_partition.h"

#include "ota_executor.h"
#include "util.h"

/**
 * @file ota_executor_internal.h
 * @brief Internal OTA transport/runtime state shared across OTA implementation files.
 * This header belongs to the OTA domain layer and defines the OTA policy boundary that adapters and app-core use without duplicating upgrade rules.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/** Log tag shared by all OTA util translation units. */
#define UTIL_TAG "UTIL"
/** Max binary bytes requested per AT+HTTPREAD chunk in binary transfer mode. */
#define OTA_HTTP_BINARY_CHUNK_SIZE 1024
/** Hex transport doubles the wire size, so its chunk ceiling is twice the binary one. */
#define OTA_HTTP_HEX_CHUNK_SIZE (OTA_HTTP_BINARY_CHUNK_SIZE * 2)
/** Response buffer holds one max chunk plus headroom for the +HTTPREAD framing/headers. */
#define OTA_HTTP_READ_RESPONSE_MAX_LEN (OTA_HTTP_HEX_CHUNK_SIZE + 1024)
/** Upper bound to wait for the asynchronous +HTTPACTION result (server fetch). */
#define OTA_HTTP_ACTION_TIMEOUT_MS 120000U
/** Timeout for short AT+HTTP* configuration commands. */
#define OTA_HTTP_CMD_TIMEOUT_MS 30000U
/** Timeout for one ranged AT+HTTPREAD payload read. */
#define OTA_HTTP_READ_CMD_TIMEOUT_MS 45000U
/** Poll cadence while draining URCs waiting for +HTTPACTION. */
#define OTA_HTTP_URC_POLL_INTERVAL_MS 100U
/** Bytes pulled from the modem RX buffer per URC poll iteration. */
#define OTA_HTTP_URC_POLL_BYTES 512U
/** Modem SSL context slot dedicated to OTA HTTPS transfers. */
#define OTA_HTTP_SSL_CTX_INDEX 1

/**
 * @brief Snapshot of the most recent +HTTPACTION URC result.
 *
 * The URC arrives asynchronously after AT+HTTPACTION, so the request path arms
 * @c waiting and then polls @c ready until the modem reports the outcome.
 */
typedef struct {
    bool waiting;     /**< True while a request is in flight and a URC is expected. */
    bool ready;       /**< Set by the URC handler once a result line was parsed. */
    int method;       /**< HTTP method echoed by the modem (0 == GET). */
    int status_code;  /**< HTTP status, or a 7xx SIM7600 transport error code. */
    int data_len;     /**< Response body length reported by the modem. */
} ota_http_action_state_t;

/** Shared in-flight HTTP action state populated by the +HTTPACTION URC handler. */
extern ota_http_action_state_t s_ota_http_action;
/** Guards one-time registration of the +HTTPACTION URC callback. */
extern bool s_ota_http_urc_registered;

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
