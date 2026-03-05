## III.2 Sơ Đồ Khối Hệ Thống

### Tổng Quan

Sơ đồ khối này phản ánh **kiến trúc phần cứng mục tiêu** hiện tại của tracker, xoay quanh một mô-đun duy nhất: **SIMCom SIM7600CE-T** đảm nhiệm LTE + GNSS tích hợp, kết nối trực tiếp với **ESP32-S3**. Pin mapping giữa ESP32-S3 và modem (UART, RESET, PWRKEY, EN, RI) giữ nguyên như mục tiêu trước đó, nên firmware chỉ cần cập nhật driver modem thay vì bổ sung UART mới.

> **Lưu ý:** Module SIM7600CE-T chạy ở chế độ mạng `Auto mode` (`AT+CNMP=2`) và APN mặc định là `internet`. Tài liệu chỉ mô tả runtime cho SIM7600CE-T; A7670C + NEO-M8N chỉ còn được đề cập trong phần lịch sử baseline.

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
│      │ I2C       │ BLE         │ UART1         │ GPIO/ADC │         │
│      │           │             │               │          │         │
│  ┌───┴───┐   ┌───┴────┐   ┌────┴─────┐        ┌──────────┐        │
│  │LIS3DH │   │vgate   │   │SIM7600CE-T│        │Power     │        │
│  │IMU    │   │iCar Pro│   │(LTE + GNSS)│        │Control   │        │
│  └───────┘   └────────┘   └──────────┘        └──────────┘        │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ Power Management System                                       │   │
│  │ - Buck 12V/24V → 5V                                           │   │
│  │ - Boost 3.7V → 5V                                             │   │
│  │ - Power MUX                                                   │   │
│  │ - Charger IP2312                                              │   │
│  │ - LDO 3.8V cho SIM7600CE-T                                    │   │
│  └───────────────┬───────────────────────────────┬───────────────┘   │
│                  │                               │                   │
│            Ắc quy xe 12V/24V                Pin backup 21700         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Profile Nguồn 12V/24V

- **Profile 12V**: `Switch_OFF=12.0V`, `Switch_ON=12.2V`, `IGN_ON>=13.0V`, `IGN_OFF<=12.0V`
- **Profile 24V**: `Switch_OFF=24.0V`, `Switch_ON=24.4V`, `IGN_ON>=26.0V`, `IGN_OFF<=24.0V`

ESP32 đọc U_batt qua ADC (divider `100k/10k`) để chọn profile và điều khiển Power MUX.

### Luồng Dữ Liệu

#### 1. Khi Lái Xe (IGN ON)

```text
OBD2 (BLE) ─┐
            ├─→ ESP32-S3 ─→ Gộp dữ liệu ─→ SIM7600CE-T (LTE + GNSS) ─→ MQTT broker
                                                  ↑
                                                  └─ GNSS NMEA qua AT+CGNSTST
```

#### 2. Khi Đỗ Xe (IGN OFF)

```text
LIS3DH ─→ Interrupt ─→ ESP32 wake up
                      ├─→ Wake SIM7600CE-T, bật LTE + GNSS nếu cần
                      └─→ Gửi heartbeat rồi đưa SIM7600CE-T về chế độ sleep/PSM
```

#### 3. Quản Lý Nguồn

```text
ADC ─→ Đọc U_batt ─→ Logic nguồn ─→ Power MUX / Charger / LTE EN
```

### Ý Nghĩa Kiến Trúc Một Module

- SIM7600CE-T xử lý cả **cellular** và **GNSS** nên không cần UART GNSS phụ
- Có thể đặt module vào **Auto mode** để mạng tự chuyển giữa LTE/UMTS/GSM
- APN mặc định `internet`, nếu cần điều chỉnh chỉ thay đổi `AT+CGDCONT`
- Firmware tập trung vào một driver duy nhất, giảm độ phức tạp pin/GPIO

### Kết Nối Vật Lý

Chi tiết pin/GPIO mô tả trong:

- [`../03-firmware/part-03-modem-simcom.md`](../03-firmware/part-03-modem-simcom.md)
- [`../03-firmware/part-04-power-management-gpio.md`](../03-firmware/part-04-power-management-gpio.md)

### Lịch Sử Baseline

Các tài liệu cũ mô tả **A7670C + NEO-M8N** để minh họa kiến trúc trước đây. Trong báo cáo hiện tại, những tên tuổi đó chỉ tồn tại ở phần lịch sử và không có nhánh runtime riêng.
