# 05. Xử lý lỗi và tối ưu

## 5.1. Buffer multi-packet

### Vấn đề

Do giới hạn MTU của BLE 4.0 (20 bytes payload), một phản hồi OBD2 có thể bị chia thành **nhiều BLE packet**. Nếu xử lý từng packet riêng lẻ sẽ nhận được dữ liệu không hoàn chỉnh.

### Ví dụ

```
Phản hồi hoàn chỉnh: "41 0C 1F 40\r\n>\r" (18 bytes)

Trường hợp 1 — Vừa trong 1 packet:
  Packet 1: "41 0C 1F 40\r\n>\r"     (18 bytes — OK)

Trường hợp 2 — Chia thành 2 packet:
  Packet 1: "41 0C 1F 40\r\n"        (14 bytes)
  Packet 2: ">\r"                      (2 bytes)

Trường hợp 3 — Phản hồi dài (DTC):
  Packet 1: "43 01 03 01 04 02"      (20 bytes)
  Packet 2: " 07\r\n>\r"             (8 bytes)
```

### Giải pháp: Response Buffer

```c
// Buffer tích lũy dữ liệu từ nhiều packet
static char response_buffer[256];
static size_t response_len = 0;

static void ble_obd_notify_cb(const uint8_t *data, size_t len,
                               uint16_t attr_handle, void *usr_ctx)
{
    ble_obd_ctx_t *obd = (ble_obd_ctx_t *)usr_ctx;

    // 1. Nối data mới vào cuối buffer
    if (response_len + len < sizeof(response_buffer)) {
        memcpy(response_buffer + response_len, data, len);
        response_len += len;
        response_buffer[response_len] = '\0';
    } else {
        // Buffer overflow — reset
        ESP_LOGW(TAG, "Response buffer overflow, resetting");
        response_len = 0;
        return;
    }

    // 2. Kiểm tra phản hồi đã hoàn chỉnh chưa (kết thúc bằng ">\r")
    if (strstr(response_buffer, ">\r") != NULL) {
        // 3. Xử lý phản hồi hoàn chỉnh
        ble_obd_process_complete_response(obd, response_buffer, response_len);

        // 4. Reset buffer cho lệnh tiếp theo
        response_len = 0;
    }
    // Nếu chưa có ">\r" → đợi packet tiếp theo
}
```

### Nguyên tắc

| Quy tắc | Mô tả |
|---------|-------|
| **Ký hiệu kết thúc** | Phản hồi hoàn chỉnh luôn kết thúc bằng `">\r"` (prompt) |
| **Không xử lý sớm** | Chỉ parse dữ liệu khi đã nhận đủ `">\r"` |
| **Kích thước buffer** | 256 bytes đủ cho phần lớn phản hồi OBD2 |
| **Xử lý overflow** | Reset buffer nếu vượt quá kích thước — tránh memory corruption |

---

## 5.2. Tự động kết nối lại (Auto-Reconnect)

### Vấn đề

Kết nối BLE có thể bị mất do nhiều nguyên nhân:
- Xe tắt máy → adapter mất nguồn
- Nhiễu sóng mạnh (gần tháp phát sóng, khu vực đông thiết bị BLE)
- Supervision timeout (thiết bị không phản hồi trong thời gian quy định)
- Adapter tự động sleep sau 30 phút không hoạt động

### Giải pháp: Disconnect Callback + Retry Loop

```c
// Callback khi mất kết nối BLE
static bool ble_obd_dev_disconnected_cb(ble_mgr_ctx_t *mgr_ctx,
                                         void *usr_ctx)
{
    ESP_LOGW(TAG, "Mất kết nối BLE với Vgate. Tự động quét lại...");

    // Return true = tự động restart discovery (scan lại)
    // Return false = dừng, không tự kết nối lại
    return true;
}
```

### Retry loop ở tầng ứng dụng

```c
static void obd_task(void *arg)
{
    ui_t *ui = (ui_t *)arg;
    ble_obd_ctx_t *obd = NULL;

    // Vòng lặp kết nối với backoff
    while (true) {
        obd = ble_obd_connect(obd_response_cb, ui);
        if (obd != NULL) {
            ESP_LOGI(TAG, "Kết nối Vgate thành công!");
            break;
        }
        ESP_LOGW(TAG, "Kết nối thất bại. Thử lại sau 2 giây...");
        vTaskDelay(pdMS_TO_TICKS(2000));
    }

    // Vòng lặp đọc dữ liệu OBD2
    TickType_t last_wake = xTaskGetTickCount();
    while (true) {
        vTaskDelayUntil(&last_wake, pdMS_TO_TICKS(200));

        // Kiểm tra trạng thái kết nối
        if (!ble_obd_is_connected(obd)) {
            // Kết nối đã mất — thông báo UI hiển thị "Disconnected"
            ui_set_value(ui, NULL);
            continue;
            // Disconnect callback sẽ tự động scan lại
        }

        // Đọc dữ liệu OBD2 bình thường
        int status = ble_obd_rxtx(obd, 0x01,
                                   g_current_obd_cfg->pid,
                                   200);
        if (status != 0) {
            ESP_LOGW(TAG, "Timeout đọc PID 0x%02X", g_current_obd_cfg->pid);
        }
    }
}
```

### Sơ đồ trạng thái reconnect

```
    ┌────────────────┐
    │  CONNECTED     │──── Mất kết nối ────┐
    │  (Đang đọc OBD)│                      │
    └────────┬───────┘                      ▼
             │                     ┌────────────────┐
             │                     │  DISCONNECTED  │
             │                     │  (Callback)    │
             │                     └────────┬───────┘
             │                              │ return true
             │                              ▼
             │                     ┌────────────────┐
             │                     │  SCANNING      │
             │    Kết nối lại      │  (Quét lại)    │
             │◄────────────────────┤  Timeout: 30s  │
             │                     └────────┬───────┘
             │                              │ Không tìm thấy
             │                              ▼
             │                     ┌────────────────┐
             │                     │  RETRY WAIT    │
             │                     │  (Chờ 2 giây)  │──► Quay lại SCANNING
             │                     └────────────────┘
```

---

## 5.3. Cache địa chỉ BLE trong NVS

### Vấn đề

Mỗi lần quét tìm Vgate mất 1-5 giây. Nếu đã biết địa chỉ MAC của adapter từ lần kết nối trước, có thể kết nối trực tiếp mà không cần quét toàn bộ.

### Giải pháp: Lưu MAC vào NVS (Non-Volatile Storage)

```c
// 1. Lưu địa chỉ BLE sau khi kết nối thành công lần đầu
void save_ble_address(const ble_addr_t *addr)
{
    char addr_str[18];  // "XX:XX:XX:XX:XX:XX\0"
    ble_addr_to_str(addr, addr_str);

    nvs_handle_t nvs;
    nvs_open("obd_config", NVS_READWRITE, &nvs);
    nvs_set_str(nvs, "obd_ble_addr", addr_str);
    nvs_commit(nvs);
    nvs_close(nvs);

    ESP_LOGI(TAG, "Đã lưu địa chỉ BLE: %s", addr_str);
}

// 2. Đọc địa chỉ đã lưu khi khởi động
bool load_ble_address(char *addr_str, size_t max_len)
{
    nvs_handle_t nvs;
    if (nvs_open("obd_config", NVS_READONLY, &nvs) != ESP_OK) {
        return false;  // Chưa có dữ liệu NVS
    }

    size_t len = max_len;
    esp_err_t err = nvs_get_str(nvs, "obd_ble_addr", addr_str, &len);
    nvs_close(nvs);

    return (err == ESP_OK);
}

// 3. Filter callback: chỉ kết nối thiết bị đã biết
static bool ble_obd_dev_filter_cb(ble_mgr_ctx_t *mgr_ctx,
                                   const ble_addr_t *addr,
                                   void *ctx)
{
    char addr_str[18];
    ble_addr_to_str(addr, addr_str);

    char saved_addr[18];
    if (load_ble_address(saved_addr, sizeof(saved_addr))) {
        // Có địa chỉ đã lưu — chỉ kết nối đúng thiết bị
        return strcmp(addr_str, saved_addr) == 0;
    }

    // Chưa có → cho phép kết nối bất kỳ (lần đầu)
    return true;
}
```

### Lợi ích

| Tiêu chí | Không có NVS cache | Có NVS cache |
|----------|-------------------|--------------|
| Thời gian kết nối | 2-5 giây (scan) | < 500 ms (direct connect) |
| Tiêu thụ năng lượng | Cao (scan radio bật) | Thấp (connect trực tiếp) |
| Độ tin cậy | Có thể nhầm thiết bị | Luôn đúng thiết bị |

---

## 5.4. Xác thực phản hồi (Response Validation)

### Tầm quan trọng

Dữ liệu BLE có thể bị lỗi do nhiễu, buffer lệch, hoặc adapter gửi phản hồi cho lệnh trước đó. Cần xác thực **mọi phản hồi** trước khi sử dụng.

### Các quy tắc xác thực

```c
static bool validate_obd_response(uint8_t *values, int count,
                                   uint8_t expected_mode, uint8_t expected_pid)
{
    // 1. Kiểm tra độ dài tối thiểu (mode + pid + ít nhất 1 byte data)
    if (count < 3) {
        ESP_LOGW(TAG, "Phản hồi quá ngắn: %d bytes", count);
        return false;
    }

    // 2. Kiểm tra mode phản hồi = mode yêu cầu + 0x40
    if (values[0] != (expected_mode + 0x40)) {
        ESP_LOGW(TAG, "Mode không khớp: nhận 0x%02X, kỳ vọng 0x%02X",
                 values[0], expected_mode + 0x40);
        return false;
    }

    // 3. Kiểm tra PID phản hồi = PID yêu cầu
    if (values[1] != expected_pid) {
        ESP_LOGW(TAG, "PID không khớp: nhận 0x%02X, kỳ vọng 0x%02X",
                 values[1], expected_pid);
        return false;
    }

    // 4. Kiểm tra số byte dữ liệu phù hợp với PID
    // (tùy PID, có thể kiểm tra thêm)

    return true;
}
```

### Bảng kiểm tra

| # | Kiểm tra | Ví dụ lỗi | Hậu quả nếu bỏ qua |
|---|---------|-----------|---------------------|
| 1 | Độ dài ≥ 3 bytes | `"41\r"` (chỉ có mode, thiếu data) | Truy cập vùng nhớ ngoài mảng |
| 2 | Mode = Request + 0x40 | Nhận `42` thay vì `41` | Sai loại dữ liệu |
| 3 | PID khớp | Nhận PID `0D` khi hỏi `0C` | Hiển thị tốc độ xe thay vì RPM |
| 4 | Data trong phạm vi | RPM > 16000 | Giá trị vô lý trên dashboard |

---

## 5.5. Tối ưu kết nối BLE

### Tham số connection interval

Connection interval quyết định tần suất ESP32 và Vgate trao đổi dữ liệu:

| Interval | Tốc độ | Năng lượng | Phù hợp cho |
|----------|--------|-----------|-------------|
| 7.5 ms (min BLE) | Nhanh nhất | Cao nhất | Demo, cần < 10ms latency |
| 20-40 ms (khuyến nghị) | Tốt | Trung bình | Vehicle tracking thông thường |
| 100-200 ms | Chậm | Thấp | Tiết kiệm pin tối đa |

```c
// Cấu hình khuyến nghị cho Vehicle Tracking
static const struct ble_gap_conn_params optimized_params = {
    .itvl_min            = 0x0010,  // 20 ms — cân bằng tốc độ/năng lượng
    .itvl_max            = 0x0020,  // 40 ms
    .latency             = 0,       // Không bỏ qua event nào
    .supervision_timeout = 0x0100,  // 3.2 giây — đủ để phát hiện disconnect
};
```

### Supervision timeout

| Giá trị | Thời gian | Đặc điểm |
|---------|-----------|----------|
| 0x0064 (1 giây) | Quá ngắn | Dễ bị disconnect giả do nhiễu tạm thời |
| 0x00C8 (2 giây) | Vừa phải | Phát hiện nhanh, ít false positive |
| 0x0100 (3.2 giây) | **Khuyến nghị** | Cân bằng phát hiện nhanh và ổn định |
| 0x0C80 (32 giây) | Quá dài | Chậm phát hiện mất kết nối thực sự |

---

## 5.6. Bảng xử lý lỗi tổng hợp (Troubleshooting)

### Lỗi kết nối BLE

| # | Triệu chứng | Nguyên nhân có thể | Giải pháp |
|---|-------------|-------------------|-----------|
| 1 | Không tìm thấy thiết bị khi scan | Adapter chưa cắm hoặc mất nguồn | Kiểm tra đèn LED trên Vgate; kiểm tra cầu chì OBD2 xe |
| 2 | Scan thấy nhưng không kết nối được | Thiết bị đang connected với app khác | Tắt app OBD2 trên điện thoại; reset adapter (rút/cắm lại) |
| 3 | Kết nối rồi mất ngay | Connection interval quá ngắn | Tăng `itvl_min` lên 0x0010 (20ms) |
| 4 | Mất kết nối sau vài phút | Supervision timeout quá ngắn | Tăng lên 0x0100 (3.2 giây) |
| 5 | Discover service không tìm thấy UUID | Sai bộ UUID (16-bit vs 128-bit) | Thử cả bộ `0x18F0` và `E7810A71...` |

### Lỗi giao tiếp OBD2

| # | Triệu chứng | Nguyên nhân có thể | Giải pháp |
|---|-------------|-------------------|-----------|
| 6 | Không nhận phản hồi sau khi gửi lệnh | Chưa bật Notify (CCCD) | Ghi 0x0100 vào CCCD descriptor |
| 7 | Phản hồi `"?\r"` | Lệnh sai format hoặc PID không hỗ trợ | Kiểm tra format `"MMPP\r"`; kiểm tra PID supported |
| 8 | Phản hồi `"NO DATA"` | ECU xe không trả lời PID | Xe có thể chưa khởi động; PID không hỗ trợ |
| 9 | Phản hồi `"UNABLE TO CONNECT"` | Adapter không giao tiếp được với ECU | Gửi `"ATSP0\r"` để auto-detect protocol |
| 10 | Phản hồi bị cắt (incomplete) | Multi-packet BLE | Implement buffer cho đến khi có `">\r"` |
| 11 | Lệnh thiếu `\r` cuối | Adapter không nhận ra lệnh | Đảm bảo mọi lệnh kết thúc bằng `\r` (0x0D) |
| 12 | Dữ liệu OBD2 sai giá trị | Parse lỗi hoặc phản hồi cho PID khác | Validate mode+0x40 và PID match trước khi dùng |

### Lỗi hiệu năng

| # | Triệu chứng | Nguyên nhân có thể | Giải pháp |
|---|-------------|-------------------|-----------|
| 13 | Tốc độ polling chậm (< 1 Hz) | Echo ON, space ON, header ON | Gửi `ATE0`, `ATS0`, `ATH0` khi khởi tạo |
| 14 | Delay lớn giữa request/response | Connection interval quá lớn | Giảm `itvl_max` xuống 0x0020 (40ms) |
| 15 | CPU ESP32 tải cao khi parse | Phản hồi có quá nhiều space/header | Dùng `ATS0` + `ATH0` để phản hồi ngắn gọn |

---

## 5.7. Tổng kết best practices

### Checklist triển khai

1. **Khởi tạo:** Sử dụng NimBLE thay vì Bluedroid (tiết kiệm ~50% RAM)
2. **Scan:** Filter theo Service UUID `0x18F0` trong advertisement data
3. **Kết nối:** Lưu MAC address vào NVS sau lần đầu thành công
4. **CCCD:** Luôn ghi `0x0100` vào CCCD descriptor trước khi gửi lệnh
5. **AT init:** Gửi `ATZ → ATE0 → ATL0 → ATS0 → ATH0 → ATSP0` sau khi kết nối
6. **Buffer:** Tích lũy packet cho đến khi nhận `">\r"` mới xử lý
7. **Validate:** Kiểm tra mode+0x40, PID match, và data length trước khi sử dụng
8. **Reconnect:** Implement disconnect callback trả về `true` để auto-reconnect
9. **Timeout:** Sử dụng semaphore với timeout 200ms cho mỗi lệnh OBD2
10. **PID check:** Gửi `0100\r` khi khởi động để kiểm tra PID nào được hỗ trợ

### Sơ đồ luồng hoàn chỉnh

```
┌──────────────────────────────────────────────────────────────────┐
│                    KHỞI ĐỘNG HỆ THỐNG                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. nimble_port_init() + xTaskCreate(ble_task)                   │
│                          │                                       │
│  2. Chờ sync_cb()        │                                       │
│                          ▼                                       │
│  3. Load NVS addr ─── Có? ─── ble_gap_connect(saved_addr)       │
│                    │                          │                   │
│                   Không                    Thành công?            │
│                    │                    ┌─────┴─────┐            │
│                    ▼                    │           Không         │
│  4. ble_gap_disc_start()               │            │            │
│     Filter: UUID 0x18F0                │            ▼            │
│                    │                   │     Quay lại bước 4     │
│              Tìm thấy?                 │                         │
│                    │                   │                         │
│                    ▼                   ▼                         │
│  5. ble_gap_connect()                                            │
│                    │                                             │
│                    ▼                                             │
│  6. Discover Service 0x18F0 + Chars TX/RX                        │
│                    │                                             │
│                    ▼                                             │
│  7. Enable CCCD (0x0100) trên RX char                            │
│                    │                                             │
│                    ▼                                             │
│  8. Save MAC to NVS (nếu lần đầu)                               │
│                    │                                             │
│                    ▼                                             │
│  9. AT init: ATZ → ATE0 → ATL0 → ATS0 → ATH0 → ATSP0           │
│                    │                                             │
│                    ▼                                             │
│  10. Gửi 0100\r → kiểm tra PID supported                        │
│                    │                                             │
│                    ▼                                             │
│  11. Polling loop: đọc PID ở tần suất 2-5 Hz                    │
│      ┌─── RPM ─── Speed ─── Temp ─── Fuel ───┐                 │
│      │                                         │                 │
│      └──── Gửi qua MQTT → Cloud Server ────────┘                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Tài liệu tham khảo

1. Espressif, "NVS Flash API Guide", docs.espressif.com/projects/esp-idf
2. Apache NimBLE, "BLE Host Gap API", mynewt.apache.org/nimble
3. Project esp32-obd2-meter, gitlab.com/janoskut/esp32-obd2-meter
4. ELM Electronics, "ELM327 Datasheet v2.3", elmelectronics.com
5. Bluetooth SIG, "Bluetooth Core Specification v4.0", bluetooth.com
