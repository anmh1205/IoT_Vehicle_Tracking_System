## PHẦN V.7: THAM KHẢO FIRMWARE ESP-IDF CHO VGATE ICAR PRO

**File này đã được tách thành các file chi tiết trong folder `part-07-vgate-icar-pro-esp-idf-reference/`:**

Xem [`part-07-vgate-icar-pro-esp-idf-reference/README.md`](./part-07-vgate-icar-pro-esp-idf-reference/README.md) để xem danh sách đầy đủ các file.

---

### V.7.1 Tổng Quan Project

**Nguồn:** [esp32-obd2-meter](https://gitlab.com/janoskut/esp32-obd2-meter)

**Mô Tả:**

- Firmware cho ESP32-S3 kết nối với OBD2 BLE adapter (vgate iCar Pro)
- Sử dụng ESP-IDF framework với NimBLE stack
- Hiển thị dữ liệu OBD2 real-time trên LCD (LVGL)

**Tech Stack:**

- **ESP-IDF**: v5.4.1
- **NimBLE**: BLE stack của Espressif
- **LVGL**: GUI framework (cho display)
- **FreeRTOS**: RTOS cho multitasking

---

### V.7.2 Cấu Trúc Project

```
esp32-obd2-meter/
├── main/
│   ├── main.c              # Entry point, OBD task, UI callbacks
│   ├── inc/
│   │   ├── ble_init.h      # BLE stack initialization
│   │   ├── ble_mgr.h       # BLE manager (discovery, connection, GATT)
│   │   ├── ble_obd.h       # OBD2 over BLE interface
│   │   ├── ble_util.h      # BLE utilities (address conversion)
│   │   ├── obd.h           # OBD2 PID definitions
│   │   ├── config.h        # Configuration management
│   │   └── ui.h            # UI interface
│   └── src/
│       ├── ble_init.c      # BLE stack init implementation
│       ├── ble_mgr.c       # BLE manager implementation
│       ├── ble_obd.c       # OBD2 over BLE implementation
│       ├── ble_util.c      # BLE utilities
│       ├── config.c        # NVS configuration
│       └── ui.c            # UI implementation
└── bsp/                     # Board support package (LCD, touch)
```

---

### V.7.3 Kiến Trúc BLE OBD2

#### V.7.3.1 Layer Architecture

```
┌─────────────────────────────────────────┐
│         Application Layer               │
│  (main.c - OBD task, UI callbacks)      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         OBD Layer                       │
│  (ble_obd.c - OBD2 protocol handling)  │
│  - Parse OBD responses                  │
│  - Convert PID data                     │
│  - Handle OBD commands                  │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         BLE Manager Layer               │
│  (ble_mgr.c - GATT operations)         │
│  - Device discovery                     │
│  - Service/Characteristic discovery     │
│  - GATT read/write/notify               │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         BLE Stack Layer                 │
│  (ble_init.c - NimBLE initialization)  │
│  - NimBLE stack init                    │
│  - Host task                            │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Hardware Layer                  │
│  (ESP32-S3 BLE Controller)             │
└─────────────────────────────────────────┘
```

---

### V.7.4 VGATE ICAR PRO BLE SPECIFICATIONS

#### V.7.4.1 Service và Characteristics UUIDs

**Service UUID:**

- **0x18F0** - OBD2 Service (16-bit UUID)

**Characteristics:**

- **TX Characteristic**: `0x2AF1` - Gửi OBD2 commands
- **RX Characteristic**: `0x2AF0` - Nhận OBD2 responses (notify)

**Code Definition:**

```c
// main/src/ble_obd.c
static ble_gatt_char_def_t obd_svc_chars1[] = {
    /* TX */ {.uuid = "0x2af1", .notify_cb = NULL},
    /* RX */ {.uuid = "0x2af0", .notify_cb = ble_obd_notify_cb},
};

static const ble_mgr_svc_def_t obd_svc_def1 = {
    .service_uuid = "0x18f0",
    .chars        = obd_svc_chars1,
    .num_chars    = ARRAY_SIZE(obd_svc_chars1),
};
```

#### V.7.4.2 GATT Communication Flow

```
ESP32-S3 (Central)                    vgate iCar Pro (Peripheral)
     │                                         │
     │  ──────── Scan & Discover ────────>  │
     │                                         │
     │  <─────── Advertisement ─────────────  │
     │  (Service UUID: 0x18F0)                │
     │                                         │
     │  ──────── Connect ──────────────────>  │
     │                                         │
     │  ──────── Discover Services ─────────>  │
     │  <─────── Service: 0x18F0 ───────────  │
     │                                         │
     │  ──────── Discover Characteristics ─>  │
     │  <─────── TX: 0x2AF1, RX: 0x2AF0 ────  │
     │                                         │
     │  ──────── Enable Notify (RX) ────────>  │
     │  (Write CCCD: 0x0100)                   │
     │                                         │
     │  ──────── Write TX: "010C\r" ────────>  │
     │  (Request RPM - PID 0x0C)              │
     │                                         │
     │  <─────── Notify RX: "41 0C 1F 40" ───  │
     │  (Response: mode 0x41, PID 0x0C, data) │
     │                                         │
     │  <─────── Notify RX: ">\r" ───────────  │
     │  (Prompt - ready for next command)     │
```

---

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

### V.7.6 OBD2 Commands và Responses

#### V.7.6.1 Command Format

**Standard OBD2 Command:**

```
Format: "MMPP\r"
- MM: Mode (2 hex digits)
- PP: PID (2 hex digits)
- \r: Carriage return (required)

Examples:
- "010C\r" - Mode 0x01 (Current Data), PID 0x0C (RPM)
- "010D\r" - Mode 0x01, PID 0x0D (Speed)
- "0104\r" - Mode 0x01, PID 0x04 (Engine Load)
```

**ELM327 AT Commands (nếu hỗ trợ):**

```
- "ATZ\r"     - Reset adapter
- "ATE0\r"    - Echo off
- "ATL0\r"    - Linefeeds off
- "ATS0\r"    - Spaces off
- "ATH0\r"    - Headers off
- "ATSP0\r"   - Set protocol to Auto
```

#### V.7.6.2 Response Format

**Standard OBD2 Response:**

```
Format: "MM PP DD DD ...\r"
- MM: Mode + 0x40 (response indicator)
- PP: PID (echo of request)
- DD: Data bytes (hex, space-separated)
- \r: Carriage return

Example:
Request:  "010C\r"
Response: "41 0C 1F 40\r"
          └─┬─┘ └──┬──┘
            │      └─ Data: 0x1F40 = 8000 (RPM = 8000/4 = 2000)
            └─ Mode 0x41 (0x01 + 0x40), PID 0x0C
```

**Error Response:**

```
"?\r" - Error (invalid command, no data, etc.)
```

**Prompt:**

```
">\r" - Ready for next command
```

#### V.7.6.3 Common OBD2 PIDs

| PID  | Description             | Data Length | Formula               | Unit |
| ---- | ----------------------- | ----------- | --------------------- | ---- |
| 0x0C | Engine RPM              | 2 bytes     | (A \* 256 + B) / 4    | RPM  |
| 0x0D | Vehicle Speed           | 1 byte      | A                     | km/h |
| 0x04 | Engine Load             | 1 byte      | (A \* 100) / 255      | %    |
| 0x05 | Coolant Temperature     | 1 byte      | A - 40                | °C   |
| 0x0F | Intake Air Temperature  | 1 byte      | A - 40                | °C   |
| 0x11 | Throttle Position       | 1 byte      | (A \* 100) / 255      | %    |
| 0x2F | Fuel Level              | 1 byte      | (A \* 100) / 255      | %    |
| 0x42 | Control Module Voltage  | 2 bytes     | (A \* 256 + B) / 1000 | V    |
| 0x46 | Ambient Air Temperature | 1 byte      | A - 40                | °C   |
| 0x5C | Engine Oil Temperature  | 1 byte      | A - 40                | °C   |

---

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

### V.7.9 Best Practices và Tips

#### V.7.9.1 Connection Management

**1. Lưu BLE Address:**

```c
// Lưu BLE address vào NVS để reconnect nhanh hơn
char saved_ble_addr[18];
nvs_get_str(nvs_handle, "obd_ble_addr", saved_ble_addr, &len);

// Sử dụng saved address trong dev_filter_cb
static bool ble_obd_dev_filter_cb(ble_mgr_ctx_t *mgr_ctx,
                                 const ble_addr_t *addr,
                                 void *ctx)
{
    char addr_str[BLE_ADDR_STR_LEN];
    ble_addr_to_str(addr, addr_str);

    if (strcmp(addr_str, saved_ble_addr) == 0) {
        return true;  // Connect to this device
    }
    return false;  // Continue scanning
}
```

**2. Connection State Management:**

```c
// Check connection before sending
if (!ble_obd_is_connected(obd)) {
    // Reconnect logic
    obd = ble_obd_connect(obd_response_cb, ui);
}
```

#### V.7.9.2 Data Parsing

**1. Handle Multiple Response Packets:**

```c
// vgate iCar Pro có thể gửi response trong nhiều packets
// Cần buffer và concatenate

static char response_buffer[256];
static size_t response_len = 0;

static void ble_obd_notify_cb(const uint8_t *data, size_t len, ...)
{
    // Append to buffer
    if (response_len + len < sizeof(response_buffer)) {
        memcpy(response_buffer + response_len, data, len);
        response_len += len;
    }

    // Check for complete response (ends with ">\r")
    if (strstr(response_buffer, ">\r") != NULL) {
        // Process complete response
        ble_obd_process_obd_data(obd, response_buffer, response_len);
        response_len = 0;  // Reset buffer
    }
}
```

**2. Validate Response:**

```c
// Always validate response format
if (count < 2) {
    ESP_LOGW(TAG, "Invalid response length");
    return;
}

if (values[0] != (mode + 0x40) || values[1] != pid) {
    ESP_LOGW(TAG, "Response mismatch");
    return;
}
```

#### V.7.9.3 Performance Optimization

**1. Batch Reading:**

```c
// Đọc nhiều PID cùng lúc (nếu adapter hỗ trợ)
// Mode 0x01 với multiple PIDs: "010C0D04\r"
// Response: "41 0C 0D 04 [data]"
```

**2. Adjust Reading Frequency:**

```c
// Tùy theo PID, điều chỉnh tần suất đọc
const uint32_t period_ms = 200;  // 5 Hz cho RPM
// const uint32_t period_ms = 1000;  // 1 Hz cho Fuel Level
```

**3. Connection Interval:**

```c
// Tối ưu connection interval cho low latency
static const struct ble_gap_conn_params conn_params = {
    .itvl_min = 0x0006,  // 7.5ms (faster)
    .itvl_max = 0x0006,  // 7.5ms
    .latency  = 0,
    .supervision_timeout = 0x00C8,  // 2 seconds
};
```

---

### V.7.10 Troubleshooting

#### V.7.10.1 Common Issues

**1. Connection Timeout:**

```
Problem: Không kết nối được sau 10 giây
Solutions:
- Kiểm tra vgate iCar Pro đã bật chưa
- Kiểm tra BLE address có đúng không
- Tăng timeout: ble_mgr_connect_service(..., 30000U, ...)
- Kiểm tra service UUID: 0x18F0
```

**2. No Response:**

```
Problem: Gửi command nhưng không nhận response
Solutions:
- Kiểm tra đã enable notify chưa (CCCD)
- Kiểm tra command format: "MMPP\r" (có \r)
- Kiểm tra timeout: tăng timeout_ms
- Kiểm tra connection state: ble_obd_is_connected()
```

**3. Invalid Response:**

```
Problem: Response không đúng format
Solutions:
- Kiểm tra parsing logic
- Log raw response để debug
- Kiểm tra response có đầy đủ không (multiple packets)
- Validate response: mode + 0x40, PID match
```

**4. Disconnection:**

```
Problem: Bị disconnect giữa chừng
Solutions:
- Implement reconnection logic
- Kiểm tra connection parameters (supervision timeout)
- Kiểm tra power management (không deep sleep khi connected)
- Handle disconnect callback
```

---

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

### V.7.12 Tài Liệu Tham Khảo

**Project Source:**

- GitLab: https://gitlab.com/janoskut/esp32-obd2-meter
- License: Check LICENSE file

**ESP-IDF Documentation:**

- [NimBLE User Guide](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/bluetooth/nimble/index.html)
- [BLE GATT Client](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/bluetooth/nimble/gatt_client.html)

**OBD2 Protocol:**

- [OBD-II PIDs](https://en.wikipedia.org/wiki/OBD-II_PIDs)
- [ELM327 Commands](https://www.elmelectronics.com/wp-content/uploads/2017/01/ELM327DS.pdf)

**vgate iCar Pro:**

- BLE 4.0 compatible
- Service UUID: 0x18F0
- TX Characteristic: 0x2AF1
- RX Characteristic: 0x2AF0

---

**Lưu ý:** Tài liệu này dựa trên phân tích code từ project `esp32-obd2-meter`. Có thể cần điều chỉnh cho project cụ thể của bạn.
