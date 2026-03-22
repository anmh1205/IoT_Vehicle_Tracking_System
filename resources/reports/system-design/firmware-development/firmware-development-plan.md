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
| Kết nối 4G/LTE + GNSS | SIMCom SIM7600CE-T | UART AT (LTE + GNSS via AT commands) |
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

Firmware runtime nhắm **một module SIM7600CE-T duy nhất** cho cả LTE và GNSS:

1. **SIM7600CE-T LTE + GNSS path**
   - Khởi tạo module thông qua AT command
   - Đặt Auto mode (`AT+CNMP=2`)
   - Thiết lập APN mặc định `internet` qua `AT+CGDCONT=1,"IP","internet"`
   - Poll `AT+CEREG?` (bounded retry) trước khi gọi `AT+CGACT=1,1`
   - Thiết lập PDP context và MQTT/HTTP/TLS
   - Sleep / PSM và GNSS power control (`+CPSMS`, `+CGNSPWR`)
   - Stream GNSS data qua `AT+CGNSTST`

2. **State machine**
   - Điều phối lifecycle LTE + GNSS theo state
   - Giữ pin mapping hiện tại, không thêm UART GNSS riêng

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
| LTE | `MODEM_UART_TX`, `MODEM_UART_RX` | UART cho SIM7600CE-T (LTE + GNSS tích hợp) |
| LTE | `MODEM_PWRKEY`, `MODEM_RESET`, `MODEM_EN` | Bật/tắt/reset module |
| LTE | `MODEM_STATUS`, `MODEM_RI` | Wake / trạng thái mạng |
| GNSS | `SIM7600_AT_CGNSPWR`, `SIM7600_AT_CGNSINF`, `SIM7600_AT_CGNSTST` | Kiểm soát GNSS tích hợp qua AT command |
| GNSS | `SIM7600_AT_CSCLK`, `SIM7600_AT_CPSMS` | GNSS/PSM power save vừa LTE vừa vị trí |
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

#### 3.1 SIM7600CE-T LTE + GNSS driver
- `modem_at.c`: unified AT command engine targeting SIM7600CE-T
- `modem_lte.c`: init, register, PDP, sleep/wakeup; GNSS power control nằm ở `modem_gnss.c` qua `AT+CGNSPWR`
- `esp_modem` chỉ dùng khi cần fallback PPP hoặc diagnostic tasks
- `gnss_parser.c`: reuses `AT+CGNSTST` stream for GGA/RMC

#### 3.2 Baseline reference — A7670C + NEO-M8N (historical)
- Document the previous split path for comparison and migration notes
- UART GNSS module replaced by integrated stream in SIM7600CE-T
- Legacy state lifecycle separated LTE vs GNSS, kept here only for context

#### 3.3 Decoupling state lifecycle
- Target: single module handles LTE + GNSS via SIM7600CE-T
- DRIVING: SIM7600CE-T active (LTE + GNSS stream)
- PARKED: SIM7600CE-T sleep/PSM with GNSS off until heartbeat
- HEARTBEAT/ALARM: wake SIM7600CE-T for short bursts, GNSS on-demand

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
| `latitude/longitude` | GNSS parser từ SIMCom SIM7600CE-T (`AT+CGNSINF`; `AT+CGNSTST` khi cần stream NMEA) | Khớp runtime hiện tại |
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
- [x] Luồng GNSS target dùng `AT+CGNSPWR` / `AT+CGNSINF` (và `AT+CGNSTST` khi cần stream NMEA)
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

- **Runtime target:** SIMCom SIM7600CE-T (LTE + GNSS tích hợp), trong khi **A7670C + NEO-M8N** chỉ được giữ lại như baseline lịch sử để so sánh
- **`iot-vehicle-tracking-firmware/`** là firmware path canonical
- Tài liệu phản ánh đúng **target architecture**, đồng thời giữ rõ **baseline gap** so với source hiện tại
