#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "esp_err.h"

#define BLE_OBD_MAX_DATA_LEN 256

typedef struct ble_obd_ctx ble_obd_ctx_t;

typedef struct {
    uint8_t mode;
    uint8_t pid;
    uint8_t data[BLE_OBD_MAX_DATA_LEN];
    size_t data_len;
} obd_response_t;

typedef void (*ble_obd_response_cb_t)(int pid, const uint8_t *data, size_t len, void *usr_ctx);

esp_err_t ble_obd_set_preferred_address(const char *address);
ble_obd_ctx_t *ble_obd_connect(ble_obd_response_cb_t response_cb, void *usr_ctx);
esp_err_t ble_obd_disconnect(ble_obd_ctx_t *ctx);
bool ble_obd_is_connected(ble_obd_ctx_t *ctx);
int ble_obd_rxtx(ble_obd_ctx_t *ctx, uint8_t mode, uint8_t pid, uint32_t timeout_ms);
esp_err_t ble_obd_send_raw(ble_obd_ctx_t *ctx, const char *command, uint32_t timeout_ms);
esp_err_t ble_obd_elm327_init(ble_obd_ctx_t *ctx);
