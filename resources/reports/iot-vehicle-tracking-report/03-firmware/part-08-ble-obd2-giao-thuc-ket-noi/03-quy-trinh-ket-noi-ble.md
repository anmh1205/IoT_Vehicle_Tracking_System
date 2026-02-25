# 03. Quy trình kết nối BLE

## 3.1. Tổng quan quy trình

Quy trình kết nối BLE giữa ESP32-S3 (Central) và Vgate iCar Pro (Peripheral) gồm **6 bước tuần tự**. Mỗi bước phải hoàn thành trước khi chuyển sang bước tiếp theo.

```
┌─────────────┐                                    ┌─────────────────┐
│  ESP32-S3   │                                    │  Vgate iCar Pro │
│  (Central)  │                                    │  (Peripheral)   │
└──────┬──────┘                                    └────────┬────────┘
       │                                                    │
       │  Bước 1: Khởi tạo BLE Stack (NimBLE)              │
       │──────────────────────────►                         │
       │                                                    │
       │  Bước 2: Quét tìm thiết bị (Scan)                 │
       │─────────────────────────────────────────────────►  │
       │                          ◄── Advertisement ─────── │
       │                          (Service UUID: 0x18F0)    │
       │                                                    │
       │  Bước 3: Thiết lập kết nối (Connect)               │
       │─────────────────────────────────────────────────►  │
       │                          ◄── Connection Complete ── │
       │                                                    │
       │  Bước 4: Khám phá dịch vụ (Discover GATT)         │
       │─────────────────────────────────────────────────►  │
       │  ◄── Service 0x18F0, TX 0x2AF1, RX 0x2AF0 ─────── │
       │                                                    │
       │  Bước 5: Bật Notify trên RX (Enable CCCD)          │
       │─────────────────────────────────────────────────►  │
       │                  Ghi CCCD = 0x0100                 │
       │                                                    │
       │  Bước 6: Gửi/Nhận lệnh OBD2                        │
       │── Write TX: "010C\r" ──────────────────────────►   │
       │                       ◄── Notify RX: "41 0C ..." ──│
       │                       ◄── Notify RX: ">\r" ────────│
       │                                                    │
```

---

## 3.2. Bước 1 — Khởi tạo BLE Stack

### Mô tả

Trước khi sử dụng BLE, cần khởi tạo stack NimBLE trên ESP32-S3. NimBLE là thư viện BLE mã nguồn mở của Apache, được Espressif tích hợp vào ESP-IDF. So với Bluedroid (stack BLE mặc định), NimBLE tiết kiệm hơn khoảng 50% RAM.

### Luồng khởi tạo

```
app_main()
    │
    ├── nimble_port_init()              ← Khởi tạo NimBLE controller + host
    │
    ├── Cấu hình callbacks:
    │   ├── ble_hs_cfg.reset_cb         ← Gọi khi stack bị reset
    │   ├── ble_hs_cfg.sync_cb          ← Gọi khi stack sẵn sàng (đồng bộ xong)
    │   └── ble_hs_cfg.store_status_cb  ← Quản lý lưu trữ bonding
    │
    ├── ble_store_config_init()         ← Khởi tạo NVS storage cho BLE
    │
    └── xTaskCreate(ble_task, ...)      ← Tạo FreeRTOS task chạy NimBLE event loop
        └── nimble_port_run()           ← Blocking: xử lý sự kiện BLE liên tục
```

### Code minh họa

```c
// Cấu trúc cấu hình khởi tạo
typedef struct {
    ble_hs_reset_fn *reset_cb;    // Callback khi BLE stack reset
    ble_hs_sync_fn  *sync_cb;     // Callback khi stack đồng bộ xong
} ble_init_config_t;

void ble_init_stack(ble_init_config_t const *config)
{
    // 1. Khởi tạo NimBLE port (controller + host)
    esp_err_t ret = nimble_port_init();
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Khởi tạo NimBLE thất bại: %s", esp_err_to_name(ret));
        return;
    }

    // 2. Cấu hình host stack callbacks
    ble_hs_cfg.reset_cb        = config->reset_cb;
    ble_hs_cfg.sync_cb         = config->sync_cb;
    ble_hs_cfg.store_status_cb = ble_store_util_status_rr;

    // 3. Khởi tạo NVS storage cho bonding info
    ble_store_config_init();

    // 4. Tạo FreeRTOS task riêng cho NimBLE event loop
    xTaskCreate(ble_task, "NimBLE_task", 4096, NULL, 5, NULL);
}

// Task chạy vòng lặp sự kiện NimBLE (blocking)
static void ble_task(void *param)
{
    nimble_port_run();  // Không bao giờ return trong điều kiện bình thường
}
```

### Giải thích

- `nimble_port_init()`: Khởi tạo cả BLE Controller (phần cứng radio) và Host (phần mềm xử lý giao thức)
- `sync_cb`: Callback quan trọng nhất — chỉ khi được gọi mới bắt đầu scan. Nếu bắt đầu scan trước khi sync, sẽ gây lỗi
- `ble_task`: NimBLE cần một FreeRTOS task riêng để chạy event loop. Stack size 4096 bytes đủ cho phần lớn ứng dụng BLE Central

---

## 3.3. Bước 2 — Quét tìm thiết bị (Scan/Discovery)

### Mô tả

Sau khi stack sẵn sàng (sync callback được gọi), ESP32 bắt đầu **quét thụ động** (passive scan) để tìm các thiết bị BLE đang quảng bá (advertise) trong phạm vi.

### Tham số quét

```c
static const struct ble_gap_disc_params disc_params = {
    .passive           = 1,       // Passive scan: chỉ lắng nghe, không gửi SCAN_REQ
    .itvl              = 0x0010,  // Scan interval: 10 ms (0x0010 × 0.625ms)
    .window            = 0x0010,  // Scan window: 10 ms (= interval → scan liên tục)
    .filter_duplicates = 1,       // Lọc advertisement trùng lặp
};
```

### Giải thích tham số

| Tham số | Giá trị | Ý nghĩa |
|---------|---------|---------|
| `passive` | 1 | **Passive scan**: ESP32 chỉ lắng nghe advertisement, không gửi Scan Request. Tiết kiệm năng lượng hơn Active scan |
| `itvl` | 0x0010 | Chu kỳ scan = 0x0010 × 0.625ms = **10 ms**. Khoảng thời gian giữa mỗi lần mở radio |
| `window` | 0x0010 | Thời gian thực sự lắng nghe = **10 ms**. Bằng interval → radio luôn bật → phát hiện nhanh nhất |
| `filter_duplicates` | 1 | Lọc bỏ các advertisement lặp lại từ cùng 1 thiết bị → tiết kiệm CPU |

> **Lưu ý:** Khi `window == interval`, radio BLE luôn ở trạng thái lắng nghe (duty cycle 100%). Điều này giúp phát hiện Vgate nhanh nhất nhưng tiêu thụ pin nhiều. Trong thực tế, ESP32 được cấp nguồn từ xe nên không cần tiết kiệm.

### Xử lý kết quả quét

Mỗi khi nhận được advertisement, NimBLE gọi callback `BLE_GAP_EVENT_DISC`:

```c
case BLE_GAP_EVENT_DISC:
    // 1. Parse advertisement data ra các trường
    struct ble_hs_adv_fields adv_fields;
    ble_hs_adv_parse_fields(&adv_fields,
                            event->disc.data,
                            event->disc.length_data);

    // 2. Kiểm tra advertisement có chứa Service UUID 0x18F0 không
    if (ble_mgr_adv_contains_service(&adv_fields,
                                      disc_cfg->svc_def->service_uuid)) {
        // 3. Tìm thấy Vgate! Dừng scan và kết nối
        ESP_LOGI(TAG, "Tìm thấy Vgate iCar Pro, đang kết nối...");
        ble_gap_disc_cancel();  // Dừng scan
        // Chuyển sang Bước 3
    }
    break;
```

### Chiến lược nhận diện thiết bị

Có 3 cách nhận diện Vgate iCar Pro trong quá trình quét:

| Phương pháp | Ưu điểm | Nhược điểm |
|-------------|---------|-----------|
| **Filter theo Service UUID 0x18F0** | Chính xác, tự động | Cần adapter quảng bá UUID trong advertisement |
| **Filter theo tên BLE** (`IOS-VLINK`) | Đơn giản | Tên có thể trùng với thiết bị khác |
| **Filter theo địa chỉ MAC đã lưu** | Nhanh nhất (skip scan) | Cần kết nối lần đầu thành công |

**Khuyến nghị:** Sử dụng **kết hợp**: lần đầu filter theo Service UUID, sau khi kết nối thành công thì lưu MAC address vào NVS để lần sau kết nối nhanh hơn.

---

## 3.4. Bước 3 — Thiết lập kết nối (Connect)

### Mô tả

Khi đã xác định đúng thiết bị Vgate, ESP32 gửi yêu cầu kết nối BLE. Quá trình này thiết lập một **connection handle** dùng cho mọi giao tiếp GATT sau này.

### Code kết nối

```c
// Gọi trong BLE_GAP_EVENT_DISC callback khi tìm thấy Vgate
ble_gap_connect(
    BLE_OWN_ADDR_PUBLIC,        // Loại địa chỉ của ESP32
    &event->disc.addr,          // Địa chỉ BLE của Vgate
    30000,                      // Timeout: 30 giây
    &conn_params,               // Tham số kết nối (interval, latency, timeout)
    ble_mgr_gap_event_cb,       // Callback xử lý sự kiện
    mgr_ctx                     // Context truyền vào callback
);
```

### Tham số kết nối

```c
static const struct ble_gap_conn_params conn_params = {
    .scan_itvl           = 0x0010,  // Scan interval khi kết nối
    .scan_window         = 0x0010,  // Scan window khi kết nối
    .itvl_min            = 0x0010,  // Connection interval min: 20 ms
    .itvl_max            = 0x0020,  // Connection interval max: 40 ms
    .latency             = 0,       // Slave latency: 0 (phản hồi mọi event)
    .supervision_timeout = 0x0100,  // Supervision timeout: 3.2 giây
    .min_ce_len          = 0x0010,  // Connection event length min
    .max_ce_len          = 0x0300,  // Connection event length max
};
```

### Xử lý kết quả kết nối

```c
case BLE_GAP_EVENT_CONNECT:
    if (event->connect.status == 0) {
        // Kết nối thành công!
        uint16_t conn_handle = event->connect.conn_handle;
        ESP_LOGI(TAG, "Kết nối BLE thành công, handle: %d", conn_handle);

        // Chuyển sang Bước 4: Discover GATT services
        ble_gattc_disc_all_svcs(conn_handle,
                                 ble_mgr_gatt_svc_discovered_cb,
                                 mgr_ctx);
    } else {
        // Kết nối thất bại — thử lại
        ESP_LOGE(TAG, "Kết nối thất bại, mã lỗi: %d", event->connect.status);
        // Quay lại Bước 2: Scan lại
    }
    break;
```

---

## 3.5. Bước 4 — Khám phá dịch vụ GATT (Service Discovery)

### Mô tả

Sau khi kết nối BLE thành công, ESP32 cần **khám phá** (discover) cấu trúc GATT của Vgate để tìm đúng Service và Characteristics cần thiết. Quá trình này gồm 2 giai đoạn: discover service → discover characteristics.

### Luồng khám phá

```
ESP32                                     Vgate
  │                                          │
  │── Discover All Services ──────────────►  │
  │  (ble_gattc_disc_all_svcs)               │
  │                                          │
  │  ◄── Service: UUID=0x18F0 ──────────────│
  │       Start Handle: 0x0001               │
  │       End Handle: 0x000F                 │
  │                                          │
  │── Discover Characteristics ───────────►  │
  │  (ble_gattc_disc_all_chrs)               │
  │                                          │
  │  ◄── Char 1: UUID=0x2AF1 (TX) ─────────│
  │       Handle: 0x0003                     │
  │       Properties: Write                  │
  │                                          │
  │  ◄── Char 2: UUID=0x2AF0 (RX) ─────────│
  │       Handle: 0x0005                     │
  │       Properties: Notify                 │
  │                                          │
  │── Discover Descriptors ───────────────►  │
  │  (ble_gattc_disc_all_dscs)               │
  │                                          │
  │  ◄── Desc: UUID=0x2902 (CCCD) ─────────│
  │       Handle: 0x0006                     │
  │                                          │
```

### Kết quả cần tìm

Sau khi discover hoàn tất, firmware phải lưu lại **3 handle** quan trọng:

| Tên | UUID | Handle (ví dụ) | Mục đích |
|-----|------|----------------|----------|
| TX Characteristic | 0x2AF1 | 0x0003 | Gửi lệnh OBD2 (Write) |
| RX Characteristic | 0x2AF0 | 0x0005 | Nhận phản hồi (Notify) |
| CCCD Descriptor | 0x2902 | 0x0006 | Bật/tắt Notify cho RX |

> **Lưu ý:** Handle là số nguyên 16-bit do GATT Server gán, có thể khác nhau giữa các lần kết nối. Không được hardcode handle — phải discover mỗi lần.

---

## 3.6. Bước 5 — Bật Notify (Enable CCCD)

### Mô tả

Đây là bước **quan trọng nhất** và hay bị bỏ sót. Mặc dù RX Characteristic có thuộc tính Notify, nó **không tự động gửi data** cho đến khi client (ESP32) ghi giá trị `0x0100` vào CCCD Descriptor.

### Code bật Notify

```c
// Giá trị CCCD: 0x0100 = bật Notify, 0x0000 = tắt
static const uint8_t cccd_enable[] = {0x01, 0x00};  // Little-endian: 0x0100

int rc = ble_gattc_write_flat(
    conn_handle,           // Handle kết nối
    cccd_handle,           // Handle của CCCD descriptor (0x0006)
    cccd_enable,           // Dữ liệu ghi: [0x01, 0x00]
    sizeof(cccd_enable),   // Kích thước: 2 bytes
    ble_mgr_gatt_write_cb, // Callback kết quả
    mgr_ctx                // Context
);
```

### Giải thích CCCD

| Giá trị CCCD | Ý nghĩa |
|-------------|---------|
| `0x0000` | Tắt cả Notify và Indicate |
| `0x0100` | Bật Notify (không cần xác nhận từ client) |
| `0x0200` | Bật Indicate (có xác nhận — chậm hơn) |
| `0x0300` | Bật cả Notify và Indicate |

> **Tại sao phải bật CCCD?** Theo đặc tả Bluetooth, GATT Server không được phép gửi Notify/Indicate cho đến khi client ghi giá trị tương ứng vào CCCD. Đây là cơ chế bảo vệ để client kiểm soát luồng dữ liệu nhận được.

### Đăng ký Notify callback

Sau khi bật CCCD, cần đăng ký hàm callback để xử lý dữ liệu nhận được:

```c
// Callback được gọi mỗi khi Vgate gửi Notify trên RX Characteristic
static void ble_obd_notify_cb(const uint8_t *data,    // Dữ liệu nhận
                               size_t len,              // Kích thước
                               uint16_t attr_handle,    // Handle characteristic
                               void *usr_ctx)           // Context
{
    // Xử lý dữ liệu OBD2 nhận được
    // Xem chi tiết tại Bước 6
}
```

---

## 3.7. Bước 6 — Gửi/Nhận lệnh OBD2

### Mô tả

Sau 5 bước chuẩn bị, kênh giao tiếp BLE đã sẵn sàng. ESP32 gửi lệnh OBD2 bằng cách **write vào TX Characteristic** và nhận phản hồi qua **Notify callback trên RX Characteristic**.

### Luồng gửi/nhận một lệnh

```
ESP32                                          Vgate → ECU
  │                                               │
  │  1. Write TX (0x2AF1): "010C\r"               │
  │─────────────────────────────────────────────►  │
  │                                               │
  │     [Vgate gửi lệnh CAN đến ECU xe]          │
  │                                    ◄──────────│
  │     [ECU trả lời qua CAN bus]     ──────────► │
  │                                               │
  │  2. Notify RX (0x2AF0): "41 0C 1F 40\r\n"    │
  │  ◄─────────────────────────────────────────── │
  │                                               │
  │  3. Notify RX (0x2AF0): ">\r"                 │
  │  ◄─────────────────────────────────────────── │
  │     (Prompt = sẵn sàng nhận lệnh tiếp)       │
  │                                               │
```

### Code gửi lệnh

```c
int ble_obd_rxtx(ble_obd_ctx_t *obd, uint8_t mode, uint8_t pid,
                 uint32_t timeout_ms)
{
    // 1. Format lệnh OBD2: "010C\r"
    snprintf(obd->tx_data.buf, sizeof(obd->tx_data.buf),
             "%02X%02X\r", mode, pid);

    // 2. Ghi vào TX Characteristic (0x2AF1) qua BLE
    ble_mgr_send(obd->mgr_ctx,
                 obd_tx_char->handle,           // Handle của TX char
                 obd->tx_data.buf,
                 strlen(obd->tx_data.buf));

    // 3. Chờ phản hồi qua Notify (blocking bằng semaphore)
    if (xSemaphoreTake(obd->api.response_sem,
                       pdMS_TO_TICKS(timeout_ms)) != pdTRUE) {
        return -1;  // Timeout — không nhận được phản hồi
    }

    return 0;  // Thành công
}
```

### Cơ chế đồng bộ bằng Semaphore

Giao tiếp BLE là **bất đồng bộ** (asynchronous): gửi lệnh tại một thời điểm, nhận phản hồi tại thời điểm khác qua callback. Để tạo giao diện **đồng bộ** (synchronous) cho tầng ứng dụng, firmware sử dụng **FreeRTOS Binary Semaphore**:

```
OBD Task                    Notify Callback
    │                              │
    │── Gửi "010C\r" ──►          │
    │                              │
    │── SemaphoreTake() ──►        │  (Block, chờ phản hồi)
    │   ┊                          │
    │   ┊  ◄── Nhận "41 0C ..."   │
    │   ┊                          │
    │   ┊  ◄── Nhận ">\r"         │
    │   ┊      SemaphoreGive() ───►│  (Giải phóng)
    │   ┊                          │
    │◄──┘ (Tiếp tục xử lý)        │
```

### Ví dụ hoàn chỉnh: Đọc RPM

```c
// Từ OBD task, đọc tốc độ động cơ
int status = ble_obd_rxtx(obd,
                           0x01,    // Mode 01: Current Data
                           0x0C,    // PID 0C: Engine RPM
                           200);    // Timeout: 200 ms

if (status == 0) {
    // Phản hồi đã được xử lý trong notify callback
    // Giá trị RPM đã được chuyển đổi và cập nhật
} else {
    ESP_LOGW(TAG, "Timeout đọc RPM");
}
```

---

## 3.8. Sơ đồ trạng thái tổng thể (State Machine)

```
                    ┌──────────────┐
                    │  UNINIT      │
                    │  (Chưa init) │
                    └──────┬───────┘
                           │ ble_init_stack()
                           ▼
                    ┌──────────────┐
                    │  IDLE        │
                    │  (Chờ sync)  │
                    └──────┬───────┘
                           │ sync_cb()
                           ▼
                    ┌──────────────┐
         ┌─────────│  SCANNING    │◄──────────────────┐
         │ timeout │  (Đang quét) │                    │
         │         └──────┬───────┘                    │
         │                │ Tìm thấy UUID 0x18F0       │
         ▼                ▼                            │
  ┌──────────┐    ┌──────────────┐                     │
  │  ERROR   │◄───│  CONNECTING  │                     │
  │          │fail│  (Đang nối)  │                     │
  └──────────┘    └──────┬───────┘                     │
                         │ success                     │
                         ▼                             │
                  ┌──────────────┐                     │
                  │  DISCOVERING │                     │
                  │  (Khám phá)  │                     │
                  └──────┬───────┘                     │
                         │ Tìm đủ TX + RX + CCCD       │
                         ▼                             │
                  ┌──────────────┐                     │
                  │  SUBSCRIBING │                     │
                  │  (Bật Notify)│                     │
                  └──────┬───────┘                     │
                         │ CCCD = 0x0100               │
                         ▼                             │
                  ┌──────────────┐     disconnect      │
                  │  CONNECTED   │─────────────────────┘
                  │  (Sẵn sàng)  │  (auto-reconnect)
                  └──────┬───────┘
                         │
                    Gửi/Nhận OBD2
                    (Bước 6 lặp lại)
```

---

## Tài liệu tham khảo

1. Apache NimBLE, "NimBLE Host API Reference", mynewt.apache.org/nimble
2. Espressif, "ESP-IDF BLE Central Example", github.com/espressif/esp-idf
3. Project esp32-obd2-meter, `main/src/ble_mgr.c`, `main/src/ble_init.c`
