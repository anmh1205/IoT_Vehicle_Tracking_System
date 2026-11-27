#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "esp_err.h"

#include "ble_util.h"

/**
 * @file ble_obd.h
 * @brief OBD-over-BLE high-level API built on top of BLE manager.
 * This header belongs to the BLE OBD NimBLE adapter layer and exposes the adapter boundary so higher layers do not depend on hardware- or transport-private details.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/** @brief Maximum decoded OBD payload bytes. */
#define BLE_OBD_MAX_DATA_LEN 256

/** @brief Opaque context for BLE OBD session. */
typedef struct ble_obd_ctx ble_obd_ctx_t;

/**
 * @brief Return the latest ECU/session state derived from OBD responses.
 *
 * Typical values are `live`, `stopped`, `no_data`, `searching`, `error`,
 * `unknown`, or `disconnected`.
 *
 * @param ctx BLE OBD context.
 *
 * @return Stable lowercase label for the latest observed OBD response state.
 */
const char *ble_obd_get_last_ecu_state_label(ble_obd_ctx_t *ctx);

/**
 * @brief Copy the connected adapter MAC into a printable buffer.
 *
 * @param ctx BLE OBD context.
 * @param out Destination string buffer sized `BLE_ADDR_STR_LEN`.
 *
 * @return true when a connected peer address is available.
 */
bool ble_obd_get_peer_address_string(ble_obd_ctx_t *ctx, char out[BLE_ADDR_STR_LEN]);

/**
 * @brief Decoded OBD response payload.
 */
typedef struct {
    /** OBD mode from response header. */
    uint8_t mode;
    /** OBD PID from response header. */
    uint8_t pid;
    /** Raw payload bytes. */
    uint8_t data[BLE_OBD_MAX_DATA_LEN];
    /** Number of valid payload bytes. */
    size_t data_len;
} obd_response_t;

/**
 * @brief Callback for asynchronous OBD response notifications.
 *
 * @param mode Requested OBD mode.
 * @param pid Requested PID, or -1 for non-PID modes such as `03`, `07`, `0A`.
 * @param data Response payload bytes (without mode/pid header).
 * @param len Payload length.
 * @param usr_ctx User context provided at connect time.
 */
typedef void (*ble_obd_response_cb_t)(uint8_t mode, int pid, const uint8_t *data, size_t len, void *usr_ctx);

/**
 * @brief Set preferred BLE address for OBD adapter filtering.
 *
 * @param address MAC address string (`AA:BB:CC:DD:EE:FF`) or empty string to clear.
 *
 * @return ESP_OK on success, otherwise ESP_ERR_INVALID_ARG.
 */
esp_err_t ble_obd_set_preferred_address(const char *address);

/**
 * @brief Connect to BLE OBD adapter and discover required service/characteristics.
 *
 * @param response_cb Callback for decoded OBD responses.
 * @param usr_ctx User context forwarded to callback.
 * @param connect_timeout_ms Discovery/connect timeout in milliseconds.
 *
 * @return Opaque context pointer on success, otherwise NULL.
 */
ble_obd_ctx_t *ble_obd_connect(ble_obd_response_cb_t response_cb, void *usr_ctx, uint32_t connect_timeout_ms);

/**
 * @brief Disconnect and release BLE OBD context.
 *
 * @param ctx Context returned by `ble_obd_connect`.
 *
 * @return ESP_OK on success.
 */
esp_err_t ble_obd_disconnect(ble_obd_ctx_t *ctx);

/**
 * @brief Check if BLE OBD session is currently connected.
 *
 * @param ctx BLE OBD context.
 *
 * @return true when connected.
 */
bool ble_obd_is_connected(ble_obd_ctx_t *ctx);

/**
 * @brief Send OBD mode/PID request and wait for a valid decoded payload.
 *
 * @param ctx BLE OBD context.
 * @param mode OBD mode byte.
 * @param pid OBD PID byte.
 * @param timeout_ms Wait timeout in milliseconds.
 *
 * @return 0 on success, -1 when no valid payload, send failure, or timeout occurs.
 */
int ble_obd_rxtx(ble_obd_ctx_t *ctx, uint8_t mode, uint8_t pid, uint32_t timeout_ms);

/**
 * @brief Send an OBD mode request without PID and wait for a valid decoded payload.
 *
 * @param ctx BLE OBD context.
 * @param mode OBD mode byte (`03`, `07`, `0A`, ...).
 * @param timeout_ms Wait timeout in milliseconds.
 *
 * @return 0 on success, -1 when no valid payload, send failure, or timeout occurs.
 */
int ble_obd_request_mode(ble_obd_ctx_t *ctx, uint8_t mode, uint32_t timeout_ms);

/**
 * @brief Send raw ELM327 command string and wait for prompt/response completion.
 *
 * @param ctx BLE OBD context.
 * @param command Raw command string.
 * @param timeout_ms Wait timeout in milliseconds.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t ble_obd_send_raw(ble_obd_ctx_t *ctx, const char *command, uint32_t timeout_ms);

/**
 * @brief Run basic ELM327 startup command sequence.
 *
 * @param ctx BLE OBD context.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t ble_obd_elm327_init(ble_obd_ctx_t *ctx);
