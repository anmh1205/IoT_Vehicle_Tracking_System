#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "esp_err.h"

#include "nimble/ble.h"

typedef enum {
    BLE_MGR_E_OK = 0,
    BLE_MGR_E_NULL,
    BLE_MGR_E_TIMEOUT,
    BLE_MGR_E_NOT_CONNECTED,
    BLE_MGR_E_DISCOVERY_FAILED,
    BLE_MGR_E_GATT_SEND_FAILED,
    BLE_MGR_E_API_LOCK_ERROR,
} ble_mgr_status_t;

typedef struct ble_mgr_ctx ble_mgr_ctx_t;
typedef struct ble_mgr_disc_cfg ble_mgr_disc_cfg_t;
typedef struct ble_mgr_svc_def ble_mgr_svc_def_t;

typedef bool (*ble_mgr_dev_filter_cb_t)(ble_mgr_ctx_t *mgr_ctx, const ble_addr_t *addr, void *usr_ctx);
typedef bool (*ble_mgr_disconnected_cb_t)(ble_mgr_ctx_t *mgr_ctx, void *usr_ctx);
typedef void (*ble_mgr_notify_cb_t)(const uint8_t *data, size_t len, uint16_t attr_handle, void *usr_ctx);

typedef struct {
    const char *uuid;
    uint16_t handle;
    ble_mgr_notify_cb_t notify_cb;
} ble_gatt_char_def_t;

struct ble_mgr_svc_def {
    const char *service_uuid;
    ble_gatt_char_def_t *chars;
    size_t num_chars;
};

struct ble_mgr_disc_cfg {
    ble_mgr_svc_def_t *svc_def;
    ble_mgr_dev_filter_cb_t dev_filter_cb;
    ble_mgr_disconnected_cb_t disconnected_cb;
};

const char *ble_mgr_status_to_string(ble_mgr_status_t status);

ble_mgr_ctx_t *ble_mgr_init(uint32_t timeout_ms);
ble_mgr_status_t ble_mgr_connect_service(ble_mgr_ctx_t *mgr_ctx,
                                         const ble_mgr_disc_cfg_t *disc_cfg,
                                         uint32_t timeout_ms,
                                         void *usr_ctx);
ble_mgr_status_t ble_mgr_send(ble_mgr_ctx_t *mgr_ctx, uint16_t chr_handle, const char *data, size_t len);
bool ble_mgr_is_connected(ble_mgr_ctx_t *mgr_ctx);
esp_err_t ble_mgr_disconnect(ble_mgr_ctx_t *mgr_ctx);
