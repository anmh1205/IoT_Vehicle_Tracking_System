## PHẦN V.7.9: BEST PRACTICES VÀ TIPS

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

