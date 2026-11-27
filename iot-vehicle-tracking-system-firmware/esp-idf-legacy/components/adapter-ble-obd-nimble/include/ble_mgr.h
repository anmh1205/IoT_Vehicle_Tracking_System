#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "esp_err.h"

#include "nimble/ble.h"

struct ble_hs_adv_fields;

/**
 * @file ble_mgr.h
 * @brief BLE central manager for discovery, connect, GATT discovery, and notifications.
 * This header belongs to the BLE OBD NimBLE adapter layer and exposes the adapter boundary so higher layers do not depend on hardware- or transport-private details.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/**
 * @brief BLE manager operation status codes.
 */
typedef enum {
    /** Operation success. */
    BLE_MGR_E_OK = 0,
    /** Invalid null argument. */
    BLE_MGR_E_NULL,
    /** Operation timed out. */
    BLE_MGR_E_TIMEOUT,
    /** Connection not established. */
    BLE_MGR_E_NOT_CONNECTED,
    /** Service/characteristic discovery failed. */
    BLE_MGR_E_DISCOVERY_FAILED,
    /** GATT write operation failed. */
    BLE_MGR_E_GATT_SEND_FAILED,
    /** Internal API lock/mutex acquisition failed. */
    BLE_MGR_E_API_LOCK_ERROR,
} ble_mgr_status_t;

/** @brief Opaque BLE manager context. */
typedef struct ble_mgr_ctx ble_mgr_ctx_t;
/** @brief Discovery configuration model. */
typedef struct ble_mgr_disc_cfg ble_mgr_disc_cfg_t;
/** @brief Service definition model. */
typedef struct ble_mgr_svc_def ble_mgr_svc_def_t;

/**
 * @brief Device filter callback executed on discovery results.
 *
 * @param mgr_ctx BLE manager context.
 * @param addr Discovered device address.
 * @param adv_fields Parsed advertising fields for this discovery result.
 * @param service_match True when the expected service UUID was advertised.
 * @param usr_ctx User context pointer.
 *
 * @return true to attempt connection, false to skip this device.
 */
typedef bool (*ble_mgr_dev_filter_cb_t)(ble_mgr_ctx_t *mgr_ctx,
                                        const ble_addr_t *addr,
                                        const struct ble_hs_adv_fields *adv_fields,
                                        bool service_match,
                                        void *usr_ctx);

/**
 * @brief Disconnect callback executed after link termination.
 *
 * @param mgr_ctx BLE manager context.
 * @param usr_ctx User context pointer.
 *
 * @return true to restart scanning automatically, false to stay idle.
 */
typedef bool (*ble_mgr_disconnected_cb_t)(ble_mgr_ctx_t *mgr_ctx, void *usr_ctx);

/**
 * @brief Notification callback for subscribed characteristics.
 *
 * @param data Notification payload pointer.
 * @param len Payload length.
 * @param attr_handle Characteristic attribute handle.
 * @param usr_ctx User context pointer.
 */
typedef void (*ble_mgr_notify_cb_t)(const uint8_t *data, size_t len, uint16_t attr_handle, void *usr_ctx);

/**
 * @brief Characteristic definition used during discovery.
 */
typedef struct {
    /** UUID string to match. */
    const char *uuid;
    /** Filled by discovery when found. */
    uint16_t handle;
    /** Optional callback for notifications/indications. */
    ble_mgr_notify_cb_t notify_cb;
} ble_gatt_char_def_t;

/**
 * @brief Service definition and expected characteristic list.
 */
struct ble_mgr_svc_def {
    /** Service UUID string to discover. */
    const char *service_uuid;
    /** Characteristic definitions belonging to service. */
    ble_gatt_char_def_t *chars;
    /** Number of entries in `chars`. */
    size_t num_chars;
};

/**
 * @brief Discovery behavior configuration for one connect attempt.
 */
struct ble_mgr_disc_cfg {
    /** Required service/characteristic definition. */
    ble_mgr_svc_def_t *svc_def;
    /** Optional device filter callback. */
    ble_mgr_dev_filter_cb_t dev_filter_cb;
    /** Optional disconnect callback. */
    ble_mgr_disconnected_cb_t disconnected_cb;
};

/**
 * @brief Convert BLE manager status enum to string.
 *
 * @param status Status value.
 *
 * @return Constant string for logging/debug.
 */
const char *ble_mgr_status_to_string(ble_mgr_status_t status);

/**
 * @brief Initialize BLE manager singleton and synchronize NimBLE stack.
 *
 * @param timeout_ms Timeout waiting for stack sync event.
 *
 * @return BLE manager context on success, otherwise NULL.
 */
ble_mgr_ctx_t *ble_mgr_init(uint32_t timeout_ms);

/**
 * @brief Discover target service and connect to first matching peripheral.
 *
 * @param mgr_ctx BLE manager context.
 * @param disc_cfg Discovery configuration.
 * @param timeout_ms Timeout waiting for connect/discovery completion.
 * @param usr_ctx User context passed to callbacks.
 *
 * @return BLE manager operation status.
 */
ble_mgr_status_t ble_mgr_connect_service(ble_mgr_ctx_t *mgr_ctx,
                                         const ble_mgr_disc_cfg_t *disc_cfg,
                                         uint32_t timeout_ms,
                                         void *usr_ctx);

/**
 * @brief Write characteristic value over GATT.
 *
 * @param mgr_ctx BLE manager context.
 * @param chr_handle Characteristic value handle.
 * @param data Data buffer pointer.
 * @param len Number of bytes to send.
 *
 * @return BLE manager operation status.
 */
ble_mgr_status_t ble_mgr_send(ble_mgr_ctx_t *mgr_ctx, uint16_t chr_handle, const char *data, size_t len);

/**
 * @brief Check current connection flag.
 *
 * @param mgr_ctx BLE manager context.
 *
 * @return true when connected.
 */
bool ble_mgr_is_connected(ble_mgr_ctx_t *mgr_ctx);

/**
 * @brief Copy the currently connected peer address into caller storage.
 *
 * @param mgr_ctx BLE manager context.
 * @param out_addr Destination BLE address.
 *
 * @return true when a peer address is available.
 */
bool ble_mgr_get_peer_address(ble_mgr_ctx_t *mgr_ctx, ble_addr_t *out_addr);

/**
 * @brief Terminate active BLE connection.
 *
 * @param mgr_ctx BLE manager context.
 *
 * @return ESP_OK on success, otherwise an ESP-IDF error code.
 */
esp_err_t ble_mgr_disconnect(ble_mgr_ctx_t *mgr_ctx);
