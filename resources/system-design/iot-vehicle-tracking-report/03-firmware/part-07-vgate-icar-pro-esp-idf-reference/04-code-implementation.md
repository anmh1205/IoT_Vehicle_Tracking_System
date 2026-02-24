## PHẦN V.7.5: CODE IMPLEMENTATION CHI TIẾT

### V.7.5 Code Implementation Chi Tiết

#### V.7.5.1 BLE Stack Initialization

**File:** `main/src/ble_init.c`

```c
void ble_init_stack(ble_init_config_t const *config)
{
    // Initialize NimBLE port
    esp_err_t ret = nimble_port_init();
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to initialize NimBLE stack");
        return;
    }

    // Configure host callbacks
    ble_hs_cfg.reset_cb        = config->reset_cb;
    ble_hs_cfg.sync_cb         = config->sync_cb;
    ble_hs_cfg.store_status_cb = ble_store_util_status_rr;
    ble_store_config_init();

    // Start NimBLE host task
    xTaskCreate(ble_task, "NimBLE_task", 4096, NULL, 5, NULL);
}

static void ble_task(void *param)
{
    nimble_port_run();  // Run NimBLE event loop
}
```

**Key Points:**

- NimBLE stack chạy trong một FreeRTOS task riêng
- `nimble_port_run()` là blocking call, chạy event loop
- Cần callback cho reset và sync events

---

#### V.7.5.2 BLE Manager - Device Discovery

**File:** `main/src/ble_mgr.c`

**Discovery Process:**

```c
ble_mgr_status_t ble_mgr_connect_service(
    ble_mgr_ctx_t *mgr_ctx,
    ble_mgr_disc_cfg_t const *disc_cfg,
    uint32_t timeout_ms,
    void *usr_ctx)
{
    // Start BLE scan
    ble_gap_disc(0, BLE_DISCOVERY_TIMEOUT_MS, &disc_params,
                 ble_mgr_gap_event_cb, mgr_ctx);

    // Wait for connection result
    ble_mgr_status_t status;
    if (!API_QUEUE_WAIT(mgr_ctx, &status, timeout_ms)) {
        return BLE_MGR_E_TIMEOUT;
    }
    return status;
}
```

**Discovery Parameters:**

```c
static const struct ble_gap_disc_params disc_params = {
    .passive           = 1,      // Passive scan (low power)
    .itvl              = 0x0010, // Scan interval
    .window            = 0x0010, // Scan window
    .filter_duplicates = 1,      // Filter duplicate advertisements
};
```

**Connection Parameters:**

```c
static const struct ble_gap_conn_params conn_params = {
    .scan_itvl           = 0x0010,
    .scan_window         = 0x0010,
    .itvl_min            = 0x0010,  // Connection interval min
    .itvl_max            = 0x0020,  // Connection interval max
    .latency             = 0,       // Slave latency
    .supervision_timeout = 0x0100,   // Supervision timeout
    .min_ce_len          = 0x0010,
    .max_ce_len          = 0x0300,
};
```

**Service Discovery:**

```c
static int ble_mgr_gap_event_cb(struct ble_gap_event *event, void *arg)
{
    switch (event->type) {
    case BLE_GAP_EVENT_DISC:
        // Parse advertisement data
        ble_hs_adv_parse_fields(&adv_fields,
                               event->disc.data,
                               event->disc.length_data);

        // Check if service UUID matches
        if (ble_mgr_adv_contains_service(&adv_fields,
                                         disc_cfg->svc_def->service_uuid)) {
            // Connect to device
            ble_gap_connect(BLE_OWN_ADDR_PUBLIC,
                           &event->disc.addr,
                           30000,
                           &conn_params,
                           ble_mgr_gap_event_cb,
                           mgr_ctx);
        }
        break;

    case BLE_GAP_EVENT_CONNECT:
        if (event->connect.status == 0) {
            // Start service discovery
            ble_gattc_disc_all_svcs(conn_handle,
                                    ble_mgr_gatt_svc_discovered_cb,
                                    mgr_ctx);
        }
        break;
    }
}
```

---

#### V.7.5.3 OBD2 Protocol Implementation

**File:** `main/src/ble_obd.c`

**OBD2 Command Format:**

```c
// OBD2 command: Mode + PID (hex string)
// Example: "010C\r" = Mode 0x01 (Current Data), PID 0x0C (RPM)

int ble_obd_rxtx(ble_obd_ctx_t *obd, uint8_t mode, uint8_t pid, uint32_t timeout_ms)
{
    // Format command: "MMPP\r"
    snprintf(obd->tx_data.buf, sizeof(obd->tx_data.buf),
             "%02X%02X\r", mode, pid);

    // Send via GATT write
    ble_mgr_send(obd->mgr_ctx, obd_tx_char->handle,
                 obd->tx_data.buf, strlen(obd->tx_data.buf));

    // Wait for response (semaphore)
    if (xSemaphoreTake(obd->api.response_sem, pdMS_TO_TICKS(timeout_ms)) != pdTRUE) {
        return -1;  // Timeout
    }
    return 0;
}
```

**OBD2 Response Parsing:**

```c
static void ble_obd_process_obd_data(ble_obd_ctx_t *obd, char *data, size_t len)
{
    // Parse hex string: "41 0C 1F 40"
    // 41 = Mode + 0x40 (response indicator)
    // 0C = PID
    // 1F 40 = Data (2 bytes for RPM)

    char *saveptr;
    char *tok = strtok_r(data, " \r", &saveptr);
    uint8_t values[BLE_OBD_MAX_DATA_LEN];
    int count = 0;

    while (tok && count < BLE_OBD_MAX_DATA_LEN) {
        long val = strtol(tok, NULL, 16);  // Convert hex to int
        values[count++] = (uint8_t)val;
        tok = strtok_r(NULL, " \r", &saveptr);
    }

    // Validate response
    if (values[0] == (obd->tx_data.mode + 0x40) &&
        values[1] == obd->tx_data.pid) {
        // Call user callback with data
        obd->response_cb(obd->tx_data.pid,
                        values + 2,      // Skip mode and PID
                        count - 2,        // Data length
                        obd->usr_ctx);
    }
}
```

**Notification Callback:**

```c
static void ble_obd_notify_cb(const uint8_t *data, size_t len,
                              uint16_t attr_handle, void *usr_ctx)
{
    ble_obd_ctx_t *obd = (ble_obd_ctx_t *)usr_ctx;

    // Handle different response types
    if (strncmp(copy, ">\r", sizeof(">\r")) == 0) {
        // Prompt received - ready for next command
        xSemaphoreGive(obd->api.response_sem);
        return;
    }

    if (strncmp(copy, "?\r", sizeof("?\r")) == 0) {
        // Error response
        obd->response_cb(-1, NULL, 0, obd->usr_ctx);
        return;
    }

    // Process OBD data
    ble_obd_process_obd_data(obd, copy, len);
}
```

---

#### V.7.5.4 OBD2 PID Configuration

**File:** `main/main.c`

**PID Definitions:**

```c
static const obd_pid_cfg_t g_obd_pids[] = {
    {0x0C, 2, "RPM", "/min", obd_conv_rpm},         // Engine RPM
    {0x0D, 1, "SPEED", "km/h", NULL},               // Vehicle Speed
    {0x04, 1, "ENGINE", "%", obd_conf_percent},     // Engine Load
    {0x05, 1, "TEMP", "°C", obd_conf_temperature},  // Coolant Temperature
    {0x2F, 1, "FUEL", "%", obd_conf_percent},       // Fuel Level
};
```

**PID Conversion Functions:**

```c
// RPM: (A * 256 + B) / 4
static int obd_conv_rpm(int32_t *value, uint8_t const *data, size_t len)
{
    *value = ((data[0] << 8) | data[1]) / 4;
    return 0;
}

// Percentage: (A * 100) / 255
static int obd_conf_percent(int32_t *value, uint8_t const *data, size_t len)
{
    *value = (data[0] * 100) / 255;
    return 0;
}

// Temperature: A - 40
static int obd_conf_temperature(int32_t *value, uint8_t const *data, size_t len)
{
    *value = data[0] - 40;
    return 0;
}
```

---

