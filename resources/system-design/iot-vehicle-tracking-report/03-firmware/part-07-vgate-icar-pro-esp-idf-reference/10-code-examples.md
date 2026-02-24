## PHẦN V.7.11: CODE EXAMPLES

### V.7.11 Code Examples

#### V.7.11.1 Complete Connection Example

```c
// Initialize BLE stack
ble_init_config_t ble_cfg = {
    .reset_cb = ble_mgr_gap_stack_reset_cb,
    .sync_cb  = ble_mgr_gap_stack_sync_cb,
};
ble_init_stack(&ble_cfg);

// Connect to OBD2 adapter
ble_obd_ctx_t *obd = ble_obd_connect(obd_response_cb, user_context);

if (obd == NULL) {
    ESP_LOGE(TAG, "Failed to connect");
    return;
}

// Read RPM (PID 0x0C)
int status = ble_obd_rxtx(obd, 0x01, 0x0C, 200);
if (status == 0) {
    ESP_LOGI(TAG, "RPM read successful");
} else {
    ESP_LOGW(TAG, "RPM read failed");
}
```

#### V.7.11.2 Periodic Reading Example

```c
void obd_periodic_task(void *arg)
{
    ble_obd_ctx_t *obd = (ble_obd_ctx_t *)arg;
    TickType_t last_wake = xTaskGetTickCount();
    const uint32_t period_ms = 200;

    while (true) {
        vTaskDelayUntil(&last_wake, pdMS_TO_TICKS(period_ms));

        if (!ble_obd_is_connected(obd)) {
            continue;
        }

        // Read multiple PIDs
        ble_obd_rxtx(obd, 0x01, 0x0C, 200);  // RPM
        vTaskDelay(pdMS_TO_TICKS(50));
        ble_obd_rxtx(obd, 0x01, 0x0D, 200);  // Speed
        vTaskDelay(pdMS_TO_TICKS(50));
        ble_obd_rxtx(obd, 0x01, 0x2F, 200);  // Fuel
    }
}
```

---

