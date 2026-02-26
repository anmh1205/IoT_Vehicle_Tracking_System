## III.2 Sơ Đồ Khối Hệ Thống

### Tổng Quan

Sơ đồ khối mô tả kiến trúc tổng thể của hệ thống tracker, bao gồm các thành phần chính và kết nối giữa chúng.

### Sơ Đồ Khối Chi Tiết

```text
┌─────────────────────────────────────────────────────────┐
│                    HỆ THỐNG TRACKER                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────┐                │
│  │  ESP32-S3 (Vi Điều Khiển)            │                │
│  │  - Xử lý logic                       │                │
│  │  - Deep sleep management            │                │
│  │  - ADC (đo U_batt)                   │                │
│  │  - BLE 5.0 (OBD2)                    │                │
│  └──────────────────────────────────────┘                │
│     │      │        │          │          │               │
│     I2C    BLE      UART       GPIO       ADC             │
│     │      │        │          │          │               │
│  ┌──┴──┐ ┌─┴──┐ ┌───┴──────────┐  ┌──┴──────┐          │
│  │LIS3DH│ │OBD2│ │A7600CE‑T     │  │LVD      │          │
│  │(IMU) │ │BLE │ │(4G + GNSS)   │  │Control  │          │
│  └──────┘ │vgate│ └───────┘  └─────────┘                 │
│           │iCar│                                            │
│           │Pro │                                            │
│           └────┘                                            │
│           │                       │                      │
│           └───────────┬───────────┘                      │
│                       │                                  │
│  ┌────────────────────┴─────────────────┐                │
│  │    Power Management System            │                │
│  │    - Buck (12V/24V→5V)                │                │
│  │    - Boost (3.7V→5V)                  │                │
│  │    - Power MUX                        │                │
│  │    - Charger (IP2312)                 │                │
│  └───────┬──────────────────────┬───────┘                │
│          │                      │                        │
│    Sạc Pin               Logic Power                      │
│          │                      │                        │
│  ┌───────┴────────┐      ┌──────┴──────┐                 │
│  │  BMS + Pin     │      │  Logic Reg  │                 │
│  │  1×21700 5Ah   │      │  (3.3V)     │                 │
│  └────────────────┘      └─────────────┘                 │
│                                                         │
└──────────┼───────────────────────────────────────────────┘
           │
    ┌──────┴──────┐
    │  Power MUX  │
    │  (Relay/    │
    │  MOSFET)    │
    └──────┬──────┘
           │
    ┌──────┴──────────┐
    │                   │
  ┌─┴──┐          ┌───┴──┐
  │Ắc quy│        │Pin   │
  │Accu│          │Backup│
  └────┘          └──────┘
```

### Profile Nguồn 12V/24V

- **Profile 12V**: `LVD_cut=11.5V`, `Switch_OFF=12.0V`, `Switch_ON=12.2V`, `IGN_ON>=13.0V`, `IGN_OFF<=12.0V`
- **Profile 24V**: `LVD_cut=23.0V`, `Switch_OFF=24.0V`, `Switch_ON=24.4V`, `IGN_ON>=26.0V`, `IGN_OFF<=24.0V`

ESP32 đọc U_batt qua ADC (divider 100k/10k), chọn profile và áp dụng đúng bộ ngưỡng tương ứng.

### Luồng Dữ Liệu

#### 1. Khi Lái Xe (IGN ON)

```
OBD2 (BLE) ──→ ESP32-S3 ──→ Xử lý ──→ Modem (UART) ──→ Server (MQTT)
     ↑              │
     │              └──→ IMU (I2C) ──→ Motion detection
     │
     └─── Đọc IGN, RPM, tốc độ
```

#### 2. Khi Đỗ Xe (IGN OFF)

```
IMU (I2C) ──→ Motion detected? ──→ ESP32 wake up ──→ Modem ──→ Alert
     │
     └─── Deep sleep (chờ interrupt)
```

#### 3. Quản Lý Nguồn

```
ADC ──→ Đọc U_batt ──→ Logic ──→ Power MUX ──→ Chọn nguồn (Ắc quy/Pin)
  │
  └──→ Charger EN ──→ Sạc pin (nếu IGN ON)
```

### Kết Nối Vật Lý

Xem chi tiết GPIO mapping trong file: [`../03-firmware/part-04-power-management-gpio.md`](../03-firmware/part-04-power-management-gpio.md)


