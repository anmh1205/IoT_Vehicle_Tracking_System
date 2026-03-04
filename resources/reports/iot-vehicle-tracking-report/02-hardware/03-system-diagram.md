## III.2 Sơ Đồ Khối Hệ Thống

### Tổng Quan

Sơ đồ khối dưới đây mô tả **kiến trúc phần cứng mục tiêu hiện tại** của tracker sau khi tách riêng LTE và GNSS:

- **LTE:** SIMCom A7670C
- **GNSS:** u-blox NEO-M8N
- **MCU trung tâm:** ESP32-S3

> **Lưu ý:** Báo cáo phần cứng mô tả kiến trúc đích. Firmware hiện tại vẫn còn khoảng cách triển khai và chưa tách hoàn toàn LTE/GNSS trong source code.

### Sơ Đồ Khối Chi Tiết

```text
┌─────────────────────────────────────────────────────────────────────┐
│                          HỆ THỐNG TRACKER                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────┐                   │
│  │ ESP32-S3                                     │                   │
│  │ - Xử lý logic                                │                   │
│  │ - State machine                              │                   │
│  │ - Deep sleep management                      │                   │
│  │ - ADC đo U_batt                              │                   │
│  │ - BLE central cho OBD2                       │                   │
│  └──────────────────────────────────────────────┘                   │
│      │           │             │               │          │         │
│      │ I2C       │ BLE         │ UART1         │ UART2    │ GPIO/ADC│
│      │           │             │               │          │         │
│  ┌───┴───┐   ┌───┴────┐   ┌────┴─────┐   ┌─────┴────┐  ┌──┴──────┐ │
│  │LIS3DH │   │vgate   │   │A7670C    │   │NEO-M8N   │  │Power     │ │
│  │IMU    │   │iCar Pro│   │LTE modem │   │GNSS      │  │Control   │ │
│  └───────┘   └────────┘   └──────────┘   └──────────┘  └─────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ Power Management System                                       │   │
│  │ - Buck 12V/24V → 5V                                           │   │
│  │ - Boost 3.7V → 5V                                              │   │
│  │ - Power MUX                                                    │   │
│  │ - Charger IP2312                                               │   │
│  │ - LDO 3.8V cho A7670C                                          │   │
│  │ - LDO 3.3V cho NEO-M8N                                         │   │
│  └───────────────┬───────────────────────────────┬───────────────┘   │
│                  │                               │                   │
│            Ắc quy xe 12V/24V                Pin backup 21700         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Profile Nguồn 12V/24V

- **Profile 12V**: `Switch_OFF=12.0V`, `Switch_ON=12.2V`, `IGN_ON>=13.0V`, `IGN_OFF<=12.0V`
- **Profile 24V**: `Switch_OFF=24.0V`, `Switch_ON=24.4V`, `IGN_ON>=26.0V`, `IGN_OFF<=24.0V`

ESP32 đọc U_batt qua ADC (divider `100k/10k`) để chọn profile và áp dụng đúng ngưỡng điều khiển nguồn.

### Luồng Dữ Liệu

#### 1. Khi Lái Xe (IGN ON)

```text
OBD2 (BLE) ─┐
            ├─→ ESP32-S3 ─→ Gộp dữ liệu ─→ A7670C (LTE) ─→ Server (MQTT)
NEO-M8N ────┘
     ↑
     └─ Vị trí GNSS qua UART2
```

#### 2. Khi Đỗ Xe (IGN OFF)

```text
LIS3DH ─→ Interrupt ─→ ESP32 wake up
                      ├─→ Bật NEO-M8N nếu cần lấy vị trí
                      └─→ Wake A7670C để gửi heartbeat/cảnh báo
```

#### 3. Quản Lý Nguồn

```text
ADC ─→ Đọc U_batt ─→ Logic nguồn ─→ Power MUX / Charger / LTE EN / GNSS EN
```

### Ý Nghĩa Kiến Trúc Tách Rời

- A7670C chỉ tập trung cho **cellular + MQTT/HTTP**
- NEO-M8N chỉ tập trung cho **GNSS/NMEA**
- Có thể tắt riêng GNSS hoặc LTE theo chế độ hoạt động
- Giảm nhầm lẫn so với kiến trúc modem tích hợp GNSS trước đây

### Kết Nối Vật Lý

Chi tiết pin/GPIO mục tiêu và khoảng cách với firmware hiện tại được mô tả trong:

- [`../03-firmware/part-03-modem-simcom.md`](../03-firmware/part-03-modem-simcom.md)
- [`../03-firmware/part-04-power-management-gpio.md`](../03-firmware/part-04-power-management-gpio.md)
