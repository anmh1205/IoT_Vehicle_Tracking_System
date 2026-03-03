# Firmware Architecture — IoT Vehicle Tracker

> **Platform:** ESP-IDF v5.4.x | **MCU:** ESP32-S3 | **Language:** C
> **Canonical firmware path:** `iot-vehicle-tracking-firmware/`
> **Legacy baseline path:** `iot-vehicle-tracking-system/Tracking_Firmware/` (reference only)

---

## 1. Overview

Firmware cho thiết bị tracker GPS/OBD2 lắp trên xe, giao tiếp với cloud qua MQTT over 4G/LTE.

Kiến trúc mục tiêu hiện tại dùng **hai module tách rời**:

| Function | Hardware | Interface |
|----------|----------|-----------|
| OBD2 (IGN, RPM, Speed, Fuel, Temp) | vgate iCar Pro | BLE (NimBLE) |
| LTE connectivity | SIMCom A7670C | UART modem AT / PPP |
| GNSS positioning | u-blox NEO-M8N | UART GNSS riêng (NMEA / UBX) |
| Motion detection | LIS3DH IMU | I2C |
| Power management | Power MUX, IP2312, LVD | GPIO + ADC |
| Telemetry | EMQX broker | MQTT over PPP |

**State machine:** `INIT -> CHECK_IGN -> DRIVING / PARKED / ALARM / HEARTBEAT -> SLEEP`

---

## 2. Layered Architecture

```text
+---------------------------------------------------+
|  Layer 4 - Communication                          |
|  mqtt_client . data_formatter . command_handler   |
+---------------------------------------------------+
|  Layer 3 - Application                            |
|  state_machine . alert_engine . data_aggregator   |
+---------------------------------------------------+
|  Layer 2 - Power Management                       |
|  power_mgr . sleep_manager                        |
+---------------------------------------------------+
|  Layer 1 - Hardware Abstraction (Drivers)         |
|  ble_obd . modem_at . modem_lte . gnss_device     |
|  gnss_parser . imu_lis3dh . adc . gpio            |
+---------------------------------------------------+
```

### Layer Responsibilities

| Layer | Responsibility | FreeRTOS Tasks |
|-------|---------------|----------------|
| **L1 - Drivers** | Raw hardware I/O, UART/I2C/GPIO, parser interfaces | ISR handlers + driver tasks |
| **L2 - Power** | Battery monitor, charger control, LTE/GNSS power gating | `power_task` |
| **L3 - Application** | State transitions, aggregation, alert logic | `state_task` |
| **L4 - Communication** | MQTT, payload formatting, command parsing | `mqtt_task`, `cmd_task` |

### Inter-Layer Rules

- **L1 -> L2:** drivers expose APIs, power layer controls rails and sleep policies
- **L2 -> L3:** power events via queue / event group
- **L3 -> L4:** telemetry pushed to communication layer
- **L4 -> L3:** remote commands dispatched back to state machine
- **No hidden LTE/GNSS coupling** inside a single modem-GNSS abstraction

---

## 3. Project Structure (Canonical)

```text
iot-vehicle-tracking-firmware/
|-- CMakeLists.txt
|-- sdkconfig.defaults
|-- partitions.csv
|
|-- main/
|   |-- CMakeLists.txt
|   |-- Kconfig.projbuild
|   |-- main.c
|   |
|   |-- inc/
|   |   |-- app_config.h
|   |   |-- app_state.h
|   |   |-- pin_map.h
|   |   |-- util.h
|   |   |-- ble_init.h
|   |   |-- ble_mgr.h
|   |   |-- ble_obd.h
|   |   |-- ble_util.h
|   |   |-- obd.h
|   |   |-- modem_at.h
|   |   |-- modem_lte.h
|   |   |-- gnss_device.h
|   |   |-- gnss_parser.h
|   |   |-- imu_lis3dh.h
|   |   |-- power_mgr.h
|   |   |-- adc_reader.h
|   |   |-- mqtt_client.h
|   |   |-- data_formatter.h
|   |   |-- command_handler.h
|   |   +-- nvs_config.h
|   |
|   +-- src/
|       |-- ble_init.c
|       |-- ble_mgr.c
|       |-- ble_obd.c
|       |-- ble_util.c
|       |-- modem_at.c
|       |-- modem_lte.c
|       |-- gnss_device.c
|       |-- gnss_parser.c
|       |-- imu_lis3dh.c
|       |-- power_mgr.c
|       |-- adc_reader.c
|       |-- mqtt_client.c
|       |-- data_formatter.c
|       |-- command_handler.c
|       |-- state_machine.c
|       |-- nvs_config.c
|       +-- util.c
|
+-- plans/
```

> `iot-vehicle-tracking-system/Tracking_Firmware/` chỉ còn là path baseline để đối chiếu current implementation gap.

---

## 4. GPIO / Signal Map (Logical Target)

> Không chốt cứng mọi GPIO trong plan này. Mục tiêu ở đây là **tách tín hiệu logic** cho LTE và GNSS để tránh lặp lại kiến trúc modem tích hợp GNSS.

| Signal Group | Logical Signal | Purpose |
|--------------|----------------|---------|
| LTE | `MODEM_UART_TX`, `MODEM_UART_RX` | UART cho A7670C |
| LTE | `MODEM_PWRKEY`, `MODEM_RESET`, `MODEM_EN` | Power/reset/control |
| LTE | `MODEM_STATUS`, `MODEM_RI` | Status / wake |
| GNSS | `GNSS_UART_TX`, `GNSS_UART_RX` | UART riêng cho NEO-M8N |
| GNSS | `GNSS_EN` | Nguồn GNSS riêng |
| GNSS | `GNSS_PPS` | PPS optional |
| POWER | `U_BATT_ADC`, `CHARGER_EN`, `POWER_MUX_SEL`, `LVD_STATUS` | Battery + charger |
| SENSOR | `IGN_IN`, `LIS3DH_INT`, `LIS3DH_SDA`, `LIS3DH_SCL` | IGN + IMU |

### Recommended split

- **UART1** -> A7670C
- **UART2** -> NEO-M8N
- BLE giữ độc lập với modem/GNSS path

---

## 5. Current Gap vs Target

### Current baseline code reality

Các file source hiện tại ở legacy baseline path cho thấy firmware vẫn đang ở mô hình cũ:

| Baseline file | Current state | Gap |
|---------------|---------------|-----|
| `iot-vehicle-tracking-system/Tracking_Firmware/main/src/modem_gnss.c` | Dùng `AT+CGNSPWR`, `AT+CGNSINF` | GNSS vẫn bị giả định là tính năng của modem |
| `iot-vehicle-tracking-system/Tracking_Firmware/main/inc/pin_map.h` | Chưa có UART GNSS riêng | Chưa phản ánh kiến trúc NEO-M8N |
| `iot-vehicle-tracking-system/Tracking_Firmware/main/src/state_machine.c` | LTE connect/disconnect gắn với lifecycle GNSS | Chưa tách state control hai module |

### Target direction

- Bỏ flow GNSS qua AT modem tích hợp
- Chuyển sang `gnss_device` + `gnss_parser`
- LTE và GNSS có thể bật/tắt độc lập theo state
- State machine điều phối hai module như hai dependency riêng

---

## 6. State Machine Intent

```text
INIT
  -> CHECK_IGN
      -> DRIVING    (BLE + LTE + GNSS active)
      -> PARKED     (BLE off, LTE low-power, GNSS policy-based)
      -> ALARM      (wake LTE + GNSS if needed)
      -> HEARTBEAT  (wake LTE, optionally wake GNSS for fresh fix)
      -> SLEEP
```

### State expectations

| State | Active Peripherals | Notes |
|-------|-------------------|-------|
| `INIT` | core drivers | bring-up |
| `CHECK_IGN` | BLE or ADC | detect vehicle state |
| `DRIVING` | BLE + LTE + GNSS | full telemetry |
| `PARKED` | IMU + minimal power | LTE/GNSS reduced independently |
| `ALARM` | LTE + optional GNSS | alert first, refine position if needed |
| `HEARTBEAT` | LTE + optional GNSS | wake on timer |
| `SLEEP` | wake sources only | deep sleep |

---

## 7. Data Source Mapping

| Field | Source | Notes |
|-------|--------|-------|
| `device_id` | NVS config | |
| `auth_token` | NVS config | |
| `timestamp` | GNSS time or boot time | Unix ms |
| `uptime` | `esp_timer_get_time()` | ms from boot |
| `vibration` | IMU LIS3DH | |
| `battery_top` | ADC | vehicle battery |
| `battery_bot` | ADC/GPIO | backup battery |
| `latitude/longitude` | NEO-M8N parser output | target path, not modem AT |
| `speed` | GNSS priority or OBD2 speed | |
| `course` | GNSS parser | |
| `satellites` | GNSS parser | |
| `ignition` | OBD2 RPM or U_batt threshold | |
| `error_code` | app logic | |

---

## 8. ESP-IDF Dependencies

| Component | Source | Purpose |
|-----------|--------|---------|
| `bt` (NimBLE) | ESP-IDF | BLE client |
| `esp_modem` | ESP-IDF component | PPP over UART for LTE |
| `mqtt` | ESP-IDF | MQTT client |
| `nvs_flash` | ESP-IDF | Config storage |
| `cJSON` | ESP-IDF | JSON formatting |
| `driver` | ESP-IDF | GPIO, UART, I2C, ADC |
| `esp_adc` | ESP-IDF | ADC oneshot + calibration |

---

## 9. Risk Matrix

| Risk | Probability | Mitigation |
|------|-------------|------------|
| Legacy assumptions leak into new code | High | Keep `current gap vs target` explicit |
| GNSS parser complexity rises | Medium | Start with limited NMEA set |
| LTE/GNSS power control becomes inconsistent | Medium | Define ownership in power layer |
| Path divergence between legacy and canonical firmware roots | Medium | Continue active work only in canonical path |
| Deep sleep current too high | Medium | Audit rail control and peripheral shutdown |

---

## 10. Execution Phases

| Phase | Sub-Phase | Description | Dependencies |
|-------|-----------|-------------|--------------|
| Phase 1A | Foundation | project skeleton, config, logical signal map | None |
| Phase 2A | BLE OBD2 | BLE init, manager, OBD2 protocol | 1A |
| Phase 2B | Hardware Drivers | ADC, IMU, power manager | 1A |
| Phase 2C | LTE + GNSS split | modem AT/LTE + GNSS UART/parser | 1A |
| Phase 3A | Communication | MQTT client, data formatter, command handler | 2B, 2C |
| Phase 4A | Integration | state machine, full-cycle behavior | 2A, 3A |

> Phase 2A, 2B, 2C vẫn có thể chạy song song, nhưng 2C phải bám kiến trúc A7670C + NEO-M8N.

---

## 11. Final Notes

- Tài liệu này đã chuẩn hóa kiến trúc và project path theo `iot-vehicle-tracking-firmware/`
- `Tracking_Firmware/` chỉ còn được nhắc đến như baseline gap reference
- Chưa có thay đổi source firmware trong scope hiện tại
