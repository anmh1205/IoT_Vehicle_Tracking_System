# Kế Hoạch Phát Triển Firmware — IoT Vehicle Tracker

> **Platform:** ESP-IDF v5.4.x | **MCU:** ESP32-S3 | **Ngôn ngữ:** C
> **Canonical firmware path:** `iot-vehicle-tracking-firmware/`
> **Legacy baseline path (chỉ dùng để đối chiếu):** `iot-vehicle-tracking-system/Tracking_Firmware/`

---

## 1. Tổng Quan

Firmware điều khiển thiết bị tracker lắp trên xe với kiến trúc phần cứng mục tiêu đã chuẩn hóa như sau:

| Chức năng | Phần cứng | Giao tiếp |
|-----------|-----------|-----------|
| Đọc OBD2 (IGN, RPM, tốc độ, nhiên liệu, nhiệt độ) | vgate iCar Pro | BLE (NimBLE) |
| Kết nối 4G/LTE | SIMCom A7670C | UART modem AT / PPP |
| Định vị GNSS | u-blox NEO-M8N | UART GNSS riêng (NMEA / UBX) |
| Phát hiện rung/chuyển động | LIS3DH IMU | I2C |
| Quản lý nguồn | Power MUX, IP2312, LVD | GPIO + ADC |
| Gửi telemetry | EMQX broker | MQTT over PPP |

**State machine mục tiêu:** `INIT → CHECK_IGN → DRIVING / PARKED / ALARM / HEARTBEAT → SLEEP`

---

## 2. Canonicalization & Path Migration Status

### 2.1 Kết quả đối chiếu hai cây firmware

Đã đối chiếu:
- `iot-vehicle-tracking-system/Tracking_Firmware/`
- `iot-vehicle-tracking-firmware/`

**Kết luận hiện tại:** snapshot file-level đang **parity** ở mức thư mục chính (không thấy khác biệt qua so sánh trực tiếp tại thời điểm rà soát).

### 2.2 Merge decision

- **Canonical target:** `iot-vehicle-tracking-firmware/`
- **Legacy path:** giữ vai trò tham chiếu/baseline cho giai đoạn chuyển tiếp
- **Docs/plans mới:** dùng `iot-vehicle-tracking-firmware/` làm đường dẫn chính
- **Legacy path chỉ giữ lại** khi cần mô tả `current gap vs target`

### 2.3 Parity checklist trước khi deprecate path cũ

- [x] Có cùng các file gốc cấp cao: `CMakeLists.txt`, `sdkconfig.defaults`, `partitions.csv`, `main/`, `plans/`
- [x] Không phát hiện chênh lệch file-level ngay thời điểm rà soát
- [ ] Khi refactor source thực tế, chỉ cập nhật trên path canonical
- [ ] Chỉ xóa/deprecate path cũ sau khi có xác nhận riêng cho thao tác destructive

---

## 3. Target Architecture vs Current Gap

### 3.1 Target architecture (mục tiêu docs/plan)

Firmware sẽ tách rõ 2 đường phần cứng độc lập:

1. **LTE path — A7670C**
   - Khởi tạo modem
   - Đăng ký mạng
   - Thiết lập PDP / PPP
   - MQTT / HTTP / TLS
   - Sleep / PSM cho modem

2. **GNSS path — NEO-M8N**
   - Bật nguồn GNSS độc lập
   - Đọc NMEA / UBX qua UART riêng
   - Parse lat/lon/speed/course/satellites
   - Quản lý warm start / hot start / timeout

3. **State machine**
   - Điều phối LTE và GNSS theo state
   - Không giả định GNSS là một tính năng nằm trong modem LTE

### 3.2 Current gap (baseline code hiện tại)

Các file source hiện tại cho thấy firmware chưa refactor xong sang kiến trúc hai module:

| File baseline | Hiện trạng | Gap với target |
|---------------|-----------|----------------|
| `iot-vehicle-tracking-system/Tracking_Firmware/main/src/modem_gnss.c` | Dùng `AT+CGNSPWR`, `AT+CGNSINF` | Vẫn giả định GNSS tích hợp modem |
| `iot-vehicle-tracking-system/Tracking_Firmware/main/inc/pin_map.h` | Chưa có UART riêng cho GNSS | Chưa tách interface vật lý cho NEO-M8N |
| `iot-vehicle-tracking-system/Tracking_Firmware/main/src/state_machine.c` | LTE connect + GNSS lifecycle còn coupling | Chưa tách control path cho LTE và GNSS |

> **Ghi chú:** Đợt hiện tại chỉ cập nhật **docs + plans**. Source firmware chưa chỉnh trong scope này.

---

## 4. Cấu Trúc Project Mục Tiêu

```text
iot-vehicle-tracking-firmware/
├── CMakeLists.txt
├── sdkconfig.defaults
├── partitions.csv
├── main/
│   ├── CMakeLists.txt
│   ├── Kconfig.projbuild
│   ├── main.c
│   ├── inc/
│   │   ├── app_config.h
│   │   ├── app_state.h
│   │   ├── pin_map.h
│   │   ├── util.h
│   │   ├── ble_init.h
│   │   ├── ble_mgr.h
│   │   ├── ble_obd.h
│   │   ├── ble_util.h
│   │   ├── obd.h
│   │   ├── modem_at.h
│   │   ├── modem_lte.h
│   │   ├── gnss_parser.h
│   │   ├── gnss_device.h
│   │   ├── imu_lis3dh.h
│   │   ├── power_mgr.h
│   │   ├── adc_reader.h
│   │   ├── mqtt_client.h
│   │   ├── data_formatter.h
│   │   ├── command_handler.h
│   │   └── nvs_config.h
│   └── src/
│       ├── modem_at.c
│       ├── modem_lte.c
│       ├── gnss_parser.c
│       ├── gnss_device.c
│       ├── state_machine.c
│       └── ...
└── plans/
```

---

## 5. Logical Interface Matrix

> **Lưu ý:** Bảng dưới đây mô tả **logical signals**. Số GPIO cuối cùng sẽ được chốt khi refactor source/PCB, không giả định rằng pin map hiện tại đã đúng.

| Nhóm | Tín hiệu logic | Mục đích |
|------|----------------|----------|
| LTE | `MODEM_UART_TX`, `MODEM_UART_RX` | UART cho A7670C |
| LTE | `MODEM_PWRKEY`, `MODEM_RESET`, `MODEM_EN` | Bật/tắt/reset modem |
| LTE | `MODEM_STATUS`, `MODEM_RI` | Wake / status |
| GNSS | `GNSS_UART_TX`, `GNSS_UART_RX` | UART riêng cho NEO-M8N |
| GNSS | `GNSS_EN` | Cấp nguồn độc lập cho GNSS |
| GNSS | `GNSS_PPS` | Pulse-per-second (optional) |
| Power | `U_BATT_ADC`, `CHARGER_EN`, `POWER_MUX_SEL`, `LVD_STATUS` | Quản lý nguồn |
| Sensors | `IGN_IN`, `LIS3DH_INT`, `LIS3DH_SDA`, `LIS3DH_SCL` | IGN + IMU |

---

## 6. Giai Đoạn Phát Triển (Target)

### Phase 0 — Foundation
- Khởi tạo project trên path canonical
- Chuẩn hóa config, utility, pin map logical
- Chốt tài liệu kiến trúc + current gap

### Phase 1 — Hardware Drivers
- ADC reader
- IMU LIS3DH
- Power manager
- Chuẩn bị nguồn độc lập cho modem và GNSS

### Phase 2 — BLE OBD2
- Adapt từ `esp32-obd2-meter`
- Tách BLE init/manager/OBD2 protocol
- Ưu tiên đọc IGN qua OBD2, fallback U_batt

### Phase 3 — LTE + GNSS Refactor

#### 3.1 A7670C LTE path
- `modem_at.c`: AT command engine
- `modem_lte.c`: init, register, PDP, sleep, wakeup
- `esp_modem` cho PPP khi cần TCP/IP stack

#### 3.2 NEO-M8N GNSS path
- UART GNSS riêng
- Đọc NMEA stream (`GGA`, `RMC`, `VTG`, ...)
- Có thể thêm UBX config để tăng baud / tối ưu output
- Parse `latitude`, `longitude`, `speed`, `course`, `satellites`

#### 3.3 Decoupling state lifecycle
- Không còn `modem_gnss` kiểu modem tích hợp
- DRIVING: LTE active + GNSS active
- PARKED: LTE sleep/off, GNSS off hoặc wake theo policy
- HEARTBEAT/ALARM: bật lại từng module theo nhu cầu

### Phase 4 — MQTT & Communication
- MQTT client
- JSON formatter
- Command handler
- Payload phải khớp `Tracking_MqttBridge`

### Phase 5 — State Machine & Integration
- Tách lifecycle BLE / LTE / GNSS rõ ràng
- Lưu context qua RTC memory
- Tối ưu deep sleep

### Phase 6 — Validation & Optimization
- Kiểm tra LTE attach / PPP / MQTT
- Kiểm tra GNSS fix / timeout / warm start
- Đo dòng khi DRIVING / PARKED / SLEEP

---

## 7. Field Mapping (Target Data Sources)

| Field | Nguồn target | Ghi chú |
|-------|--------------|---------|
| `device_id` | NVS config | |
| `auth_token` | NVS config | |
| `timestamp` | GNSS time hoặc boot time | Unix ms |
| `uptime` | `esp_timer_get_time()` | ms từ boot |
| `vibration` | IMU LIS3DH | |
| `battery_top` | ADC | Ắc quy xe |
| `battery_bot` | ADC/GPIO | Pin backup |
| `latitude/longitude` | GNSS parser từ NEO-M8N | Không dùng `AT+CGNSINF` ở target |
| `speed` | GNSS (ưu tiên) hoặc OBD2 0x0D | |
| `course` | GNSS parser | |
| `satellites` | GNSS parser | |
| `ignition` | OBD2 RPM>0 hoặc U_batt threshold | |
| `error_code` | App logic | |

---

## 8. Verification Checklist

### 8.1 Path migration verification
- [x] Chốt `iot-vehicle-tracking-firmware/` là path canonical trong plan này
- [x] Legacy path chỉ giữ lại trong mục baseline gap
- [x] Hai cây firmware đang parity ở snapshot hiện tại

### 8.2 Content consistency (target)
- [ ] Không dùng A7600CE-T như kiến trúc hiện tại trong core plans/docs
- [ ] Không dùng `AT+CGNSPWR` / `AT+CGNSINF` như luồng GNSS target
- [ ] Không dùng path cũ cho workflow active mới

### 8.3 Reality check
- [x] Có ghi rõ `current gap vs target`
- [x] Không mô tả rằng refactor source đã hoàn tất

---

## 9. Rủi Ro & Giải Pháp

| Rủi ro | Xác suất | Giải pháp |
|--------|----------|-----------|
| Firmware docs nói vượt trạng thái code thật | Trung bình | Luôn ghi rõ `current gap vs target` |
| Refactor LTE/GNSS làm lệch pin map | Trung bình | Dùng logical mapping trước, chốt GPIO sau |
| GNSS cold start chậm | Cao | Cho phép timeout + fallback gửi data không fix |
| LTE/GNSS lifecycle chưa tách sạch trong state machine | Cao | Ưu tiên phase decoupling riêng trước khi tối ưu |
| Path cũ và path mới diverge sau này | Trung bình | Chỉ phát triển tiếp trên path canonical |

---

## 10. Kết Luận

Plan này đã chuẩn hóa firmware development theo hướng:

- **A7670C (LTE)** tách khỏi **NEO-M8N (GNSS)**
- **`iot-vehicle-tracking-firmware/`** là firmware path canonical
- Tài liệu phản ánh đúng **target architecture**, đồng thời giữ rõ **baseline gap** so với source hiện tại
