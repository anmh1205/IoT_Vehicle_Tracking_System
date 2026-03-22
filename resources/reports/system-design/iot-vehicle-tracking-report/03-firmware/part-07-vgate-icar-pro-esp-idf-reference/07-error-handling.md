## PHẦN V.7.8: ERROR HANDLING VÀ RETRY LOGIC

### V.7.8 Error Handling và Retry Logic

#### V.7.8.1 Connection Retry

```c
ble_obd_ctx_t *ble_obd_connect(ble_obd_response_cb_t response_cb, void *usr_ctx)
{
    ble_obd_ctx_t *obd = malloc(sizeof(ble_obd_ctx_t));
    memset(obd, 0, sizeof(ble_obd_ctx_t));

    // Initialize BLE manager
    obd->mgr_ctx = ble_mgr_init(1000U);  // 1 second timeout

    // Setup discovery config
    static const ble_mgr_disc_cfg_t disc_cfg = {
        .svc_def         = obd_svc_def,
        .dev_filter_cb   = ble_obd_dev_filter_cb,
        .disconnected_cb = ble_obd_dev_disconnected_cb_t,
    };

    // Connect to service (10 second timeout)
    ble_mgr_status_t status = ble_mgr_connect_service(obd->mgr_ctx,
                                                      &disc_cfg,
                                                      10000U,
                                                      obd);

    if (status != BLE_MGR_E_OK) {
        ESP_LOGE(TAG, "Failed to connect: %s", BLE_MGR_STATUS_STR(status));
        free(obd);
        return NULL;
    }

    return obd;
}
```

#### V.7.8.2 Disconnection Handling

```c
static bool ble_obd_dev_disconnected_cb_t(ble_mgr_ctx_t *mgr_ctx, void *usr_ctx)
{
    ESP_LOGW(TAG, "Disconnected from device. Restarting discovery.");
    return true;  // Return true to restart discovery
}
```

#### V.7.8.3 Timeout Handling

```c
int ble_obd_rxtx(ble_obd_ctx_t *obd, uint8_t mode, uint8_t pid, uint32_t timeout_ms)
{
    // Send command
    ble_mgr_send(obd->mgr_ctx, obd_tx_char->handle,
                 obd->tx_data.buf, strlen(obd->tx_data.buf));

    // Wait for response with timeout
    if (xSemaphoreTake(obd->api.response_sem, pdMS_TO_TICKS(timeout_ms)) != pdTRUE) {
        ESP_LOGW(TAG, "OBD response timeout");
        return -1;
    }

    return 0;
}
```

---

