## PHẦN III: LỰA CHỌN GIẢI PHÁP PHẦN CỨNG

> **Lưu ý:** Tài liệu này đã được tách thành các file chi tiết. Xem các file con để biết thêm chi tiết.

### Tổng Quan

Hệ thống tracker sử dụng các thành phần chính.

**Lưu ý nguồn 12V/24V:** Firmware triển khai 2 profile nguồn độc lập để điều khiển LVD/Power Path/Charger:

- **12V**: `LVD_cut=11.5V`, `Switch_OFF=12.0V`, `Switch_ON=12.2V`, `IGN_ON>=13.0V`, `IGN_OFF<=12.0V`
- **24V**: `LVD_cut=23.0V`, `Switch_OFF=24.0V`, `Switch_ON=24.4V`, `IGN_ON>=26.0V`, `IGN_OFF<=24.0V`

Đo U_batt sử dụng ADC với chia áp chung `R1=100k`, `R2=10k` cho cả 12V và 24V.

Hệ thống tracker sử dụng các thành phần chính:

- **IMU (LIS3DH)**: Phát hiện chuyển động, đánh thức ESP32 từ deep sleep
- **MCU (ESP32-S3)**: Vi điều khiển chính, xử lý logic, quản lý năng lượng
- **OBD2 BLE Adapter (vgate iCar Pro)**: Đọc dữ liệu xe qua BLE
- **Modem 4G + GNSS (SIMCom A7600CE-T)**: Truyền dữ liệu và định vị GPS
- **Pin Backup (21700 5000mAh)**: Nguồn dự phòng khi ắc quy yếu
- **Power Management**: Buck/Boost converters, Power Path Management, Charger

### Các File Chi Tiết

#### Components (Thành Phần)

- [`02-imu-lis3dh.md`](./02-imu-lis3dh.md) - Cảm biến IMU LIS3DH
- [`03-mcu-esp32-s3.md`](./03-mcu-esp32-s3.md) - MCU ESP32-S3
- [`04-obd2-ble-adapter.md`](./04-obd2-ble-adapter.md) - OBD2 BLE Adapter (vgate iCar Pro)
- [`05-modem-a7600ce-t.md`](./05-modem-a7600ce-t.md) - Modem 4G + GNSS (SIMCom A7600CE-T)
- [`06-backup-battery-21700.md`](./06-backup-battery-21700.md) - Pin Backup 21700

#### Power Management (Quản Lý Năng Lượng)

- [`../part-02-power-management/01-overview.md`](../part-02-power-management/01-overview.md) - Tổng quan quản lý năng lượng
- [`../part-02-power-management/02-buck-converter.md`](../part-02-power-management/02-buck-converter.md) - Buck Converter (12V/24V→5V)
- [`../part-02-power-management/03-boost-converter.md`](../part-02-power-management/03-boost-converter.md) - Boost Converter (3.7V→5V)
- [`../part-02-power-management/04-power-path-management.md`](../part-02-power-management/04-power-path-management.md) - Power Path Management
- [`../part-02-power-management/05-low-voltage-disconnect.md`](../part-02-power-management/05-low-voltage-disconnect.md) - Low Voltage Disconnect (LVD)
- [`../part-02-power-management/06-charger-ip2312.md`](../part-02-power-management/06-charger-ip2312.md) - Charger IP2312

#### System Design

- [`../03-system-diagram.md`](../03-system-diagram.md) - Sơ đồ khối hệ thống
- [`../04-bill-of-materials.md`](../04-bill-of-materials.md) - Danh sách vật liệu (BOM)

---

### Tóm Tắt Lựa Chọn

#### III.1.1 Cảm Biến IMU: **LIS3DH**

> **Chi tiết:** Xem [`02-imu-lis3dh.md`](./02-imu-lis3dh.md)

**Lý Do Chọn:**

- Hỗ trợ motion detection sẵn (không cần ESP32 canh liên tục)
- Tiêu thụ cực thấp (μA), phù hợp cho hệ thống battery-powered
- Phổ biến, giá thành hợp lý, nhiều thư viện hỗ trợ

#### III.1.2 MCU: **ESP32-S3**

> **Chi tiết:** Xem [`03-mcu-esp32-s3.md`](./03-mcu-esp32-s3.md)

**Lý Do Chọn:**

- Hỗ trợ BLE 5.0: Kết nối trực tiếp với OBD2 adapter vgate iCar Pro
- Dễ phát triển: Arduino/ESP-IDF, cộng đồng lớn → phù hợp đồ án
- Chi phí thấp: Rẻ hơn 30–50% so với STM32L4
- Tiêu thụ chấp nhận được: 10–15 μA deep sleep → đủ cho 2–3 tháng với pin backup

#### III.1.3 OBD2 BLE Adapter: **vgate iCar Pro**

> **Chi tiết:** Xem [`04-obd2-ble-adapter.md`](./04-obd2-ble-adapter.md)

**Lý Do Chọn:**

- BLE 4.0, tương thích với ESP32-S3 BLE 5.0
- Đọc dữ liệu OBD2 chính xác (IGN, RPM, tốc độ, nhiên liệu)
- Giá thành hợp lý, phổ biến trên thị trường

#### III.1.4 Modem 4G + GNSS: **SIMCom A7600CE-T**

> **Chi tiết:** Xem [`05-modem-a7600ce-t.md`](./05-modem-a7600ce-t.md)

**Lý Do Chọn:**

- Tích hợp 4G/LTE + GNSS trong một module
- Hỗ trợ UART, dễ tích hợp với ESP32-S3
- Giá thành hợp lý, phù hợp cho đồ án

#### III.1.5 Pin Backup: **21700 Li-ion 5000mAh**

> **Chi tiết:** Xem [`06-backup-battery-21700.md`](./06-backup-battery-21700.md)

**Lý Do Chọn:**

- Dung lượng lớn (5000mAh), đủ cho 2–3 tháng hoạt động
- Kích thước hợp lý, dễ lắp đặt
- Có protection board, an toàn

---

### Sơ Đồ Khối Hệ Thống

> **Chi tiết:** Xem [`../03-system-diagram.md`](../03-system-diagram.md)

**Tóm tắt:**

```
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
│                                                             │
│  ┌──────────────────────────────────────┐                │
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

---

### Danh Sách Vật Liệu (BOM)

> **Chi tiết:** Xem [`../04-bill-of-materials.md`](../04-bill-of-materials.md)

**Tóm tắt:**

| STT | Thành Phần                  | Đơn Vị   | SL  | Ghi Chú                              |
| --- | --------------------------- | -------- | --- | ------------------------------------ |
| 1   | ESP32-S3 DevKit             | Cái      | 1   | ESP32-S3-DevKitC-1 hoặc DevKitM-1    |
| 2   | LIS3DH                      | Cái      | 1   | Breakout board hoặc IC riêng         |
| 3   | OBD2 BLE (vgate iCar Pro)   | Cái      | 1   | BLE 4.0, tương thích với ESP32-S3    |
| 4   | Modem 4G + GNSS (A7600CE‑T) | Cái      | 1   | Kèm LTE antenna + GNSS antenna + SIM |
| 5   | 21700 Li-ion 5000mAh        | Cái      | 1   | Loại có protection board             |
| 6   | Module sạc IP2312 (3A)      | Cái      | 1   | IP2312 charger module Type-C, 3A     |
| 7   | BMS/Protection Board 1S     | Cái      | 1   | BMS 1S 3A hoặc DW01+MOSFET           |
| 8   | Buck DC-DC (12→5V, 3A)      | Cái      | 1   | LM2596 module (khuyến nghị)          |
| 9   | Boost DC-DC (3.7→5V, 2A)    | Cái      | 1   | MT3608 module (khuyến nghị)          |
| 10  | Relay Module 5V             | Cái      | 1   | Power MUX (khuyến nghị)              |
| 11  | R, C, diode, connector, PCB | Assorted | -   | Mạch phụ trợ                         |

**Tổng chi phí ước tính: 870,000–1,630,000 VNĐ**

