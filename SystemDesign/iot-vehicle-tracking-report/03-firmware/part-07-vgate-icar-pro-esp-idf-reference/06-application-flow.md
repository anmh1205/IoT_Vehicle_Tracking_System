## PHẦN V.7.7: APPLICATION FLOW

### V.7.7 Application Flow

#### V.7.7.1 Main Application Flow

**File:** `main/main.c`

```c
void app_main(void)
{
    // 1. Initialize configuration
    init_config();

    // 2. Initialize BSP (LCD, touch)
    bsp_init();
    bsp_display_start();
    bsp_lvgl_init();
    bsp_touch_init();

    // 3. Initialize UI
    ui_t *ui = ui_init(g_current_obd_cfg, ui_interval_ms, ui_touch_callback);

    // 4. Start OBD task
    init_obd_task(ui);

    // 5. Main loop (UI refresh)
    while (true) {
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}
```

#### V.7.7.2 OBD Task Flow

```c
static void obd_task(void *arg)
{
    ui_t *ui = (ui_t *)arg;

    // 1. Connect to BLE OBD2 adapter
    ble_obd_ctx_t *obd = NULL;
    while (true) {
        obd = ble_obd_connect(obd_response_cb, ui);
        if (obd != NULL) {
            break;
        }
        ESP_LOGW(TAG, "Failed to connect. Retrying...");
        vTaskDelay(pdMS_TO_TICKS(2000));
    }

    // 2. Periodic OBD2 reading
    TickType_t last_wake = xTaskGetTickCount();
    const uint32_t period_ms = 200;  // 5 Hz

    while (true) {
        vTaskDelayUntil(&last_wake, pdMS_TO_TICKS(period_ms));

        if (!ble_obd_is_connected(obd)) {
            ui_set_value(ui, NULL);  // Clear display
            continue;
        }

        // Send OBD2 request
        const uint8_t obd_mode = 0x01;  // Current Data
        int status = ble_obd_rxtx(obd, obd_mode,
                                  g_current_obd_cfg->pid,
                                  200);  // timeout 200ms

        if (status != 0) {
            ESP_LOGW(TAG, "Failed to send request: %d", status);
        }
    }
}
```

#### V.7.7.3 Response Callback

```c
static void obd_response_cb(int pid, uint8_t const *data, size_t len, void *usr_ctx)
{
    ui_t *ui = (ui_t *)usr_ctx;

    // Validate PID
    if (pid != g_current_obd_cfg->pid) {
        return;
    }

    // Convert data
    int32_t value = 0;
    if (g_current_obd_cfg->conversion != NULL) {
        g_current_obd_cfg->conversion(&value, data, len);
    } else if (len == 1) {
        value = data[0];
    }

    // Update UI
    ui_set_value(ui, &value);
}
```

---

