## PHẦN III: LỰA CHỌN GIẢI PHÁP PHẦN CỨNG

> **Lưu ý:** Tài liệu này tóm tắt kiến trúc phần cứng hiện tại ở mức hệ thống. Các file con mô tả chi tiết từng thành phần.

### Tổng Quan

Tracker hiện nhắm vào kiến trúc một module duy nhất: **SIMCom SIM7600CE-T** cung cấp cả **LTE Cat-4** và **GNSS tích hợp** (GPS + GLONASS + BeiDou). Mạch phần cứng vẫn giữ ESP32-S3, BLE OBD2, IMU LIS3DH và nguồn pin backup, nhưng luồng GNSS/4G chỉ đi qua SIM7600CE-T nên firmware chỉ cần một driver AT command.

- **LTE + GNSS:** SIMCom SIM7600CE-T (Auto mode LTE/UMTS/GSM, APN mặc định `internet`)
- **MCU trung tâm:** ESP32-S3
- **OBD2:** vgate iCar Pro qua BLE
- **IMU:** LIS3DH cho motion detection và wake
- **Nguồn dự phòng:** pin 21700 + mạch Buck/Boost/LVD/MUX/IP2312

**Lưu ý nguồn 12V/24V:** firmware dùng 2 profile nguồn để điều khiển LVD/Power Path/Charger:

- **12V**: `Switch_OFF=12.0V`, `Switch_ON=12.2V`, `IGN_ON>=13.0V`, `IGN_OFF<=12.0V`
- **24V**: `Switch_OFF=24.0V`, `Switch_ON=24.4V`, `IGN_ON>=26.0V`, `IGN_OFF<=24.0V`

Đo U_batt dùng ADC với chia áp `R1=100k`, `R2=10k` cho cả profile 12V và 24V.

### Các File Chi Tiết

#### Components (Thành Phần)

- [`02-imu-lis3dh.md`](./02-imu-lis3dh.md) - Cảm biến IMU LIS3DH
- [`03-mcu-esp32-s3.md`](./03-mcu-esp32-s3.md) - MCU ESP32-S3
- [`04-obd2-ble-adapter.md`](./04-obd2-ble-adapter.md) - OBD2 BLE Adapter vgate iCar Pro
- [`05-lte-modem-a7670c.md`](./05-lte-modem-a7670c.md) - Modem LTE + GNSS SIMCom SIM7600CE-T
- [`06-backup-battery-21700.md`](./06-backup-battery-21700.md) - Pin backup 21700

> **Ghi chú:** GNSS đã tích hợp trực tiếp trong SIM7600CE-T. Tài liệu runtime hiện tại không dùng module GNSS rời.

#### Power Management (Quản Lý Năng Lượng)

- [`../part-02-power-management/01-overview.md`](../part-02-power-management/01-overview.md)
- [`../part-02-power-management/02-buck-converter.md`](../part-02-power-management/02-buck-converter.md)
- [`../part-02-power-management/03-boost-converter.md`](../part-02-power-management/03-boost-converter.md)
- [`../part-02-power-management/04-power-path-management.md`](../part-02-power-management/04-power-path-management.md)
- [`../part-02-power-management/05-low-voltage-disconnect.md`](../part-02-power-management/05-low-voltage-disconnect.md)
- [`../part-02-power-management/06-charger-ip2312.md`](../part-02-power-management/06-charger-ip2312.md)

#### System Design

- [`../03-system-diagram.md`](../03-system-diagram.md) - Sơ đồ khối hệ thống
- [`../04-bill-of-materials.md`](../04-bill-of-materials.md) - Danh sách vật liệu (BOM)

---

### Tóm Tắt Lựa Chọn

#### III.1.1 Cảm Biến IMU: **LIS3DH**

> **Chi tiết:** Xem [`02-imu-lis3dh.md`](./02-imu-lis3dh.md)

**Lý do chọn:**
- Motion detection tiêu thụ thấp
- Có interrupt để đánh thức ESP32 từ deep sleep
- Phổ biến, giá hợp lý, dễ tích hợp I2C

#### III.1.2 MCU: **ESP32-S3**

> **Chi tiết:** Xem [`03-mcu-esp32-s3.md`](./03-mcu-esp32-s3.md)

**Lý do chọn:**
- Hỗ trợ BLE 5.0 cho OBD2 adapter
- Có đủ tài nguyên để tách BLE, LTE, GNSS và power management
- Dễ phát triển với ESP-IDF, phù hợp đồ án

#### III.1.3 OBD2 BLE Adapter: **vgate iCar Pro**

> **Chi tiết:** Xem [`04-obd2-ble-adapter.md`](./04-obd2-ble-adapter.md)

**Lý do chọn:**
- BLE ổn định, phổ biến trên thị trường
- Đọc IGN, RPM, tốc độ, nhiên liệu từ ECU
- Phù hợp mô hình tracker không cần dây OBD2 trực tiếp vào ESP32

#### III.1.4 Modem LTE + GNSS: **SIMCom SIM7600CE-T**

> **Chi tiết:** Xem [`05-lte-modem-a7670c.md`](./05-lte-modem-a7670c.md)

**Lý do chọn:**
- Hỗ trợ LTE Cat-4, fallback 3G/2G và GNSS tích hợp giúp giảm phần cứng vận hành
- Chỉ cần một driver AT command trên UART1 cho cả LTE và GNSS
- Auto mode `AT+CNMP=2`, APN mặc định `internet` và `AT+CEREG?` trước `AT+CGACT=1,1` đảm bảo attach ổn định

#### III.1.5 Pin Backup: **21700 Li-ion 5000mAh**

> **Chi tiết:** Xem [`06-backup-battery-21700.md`](./06-backup-battery-21700.md)

**Lý do chọn:**
- Dung lượng đủ lớn cho chế độ backup
- Kích thước hợp lý cho prototype
- Dễ kết hợp với mạch sạc IP2312

---

### Sơ Đồ Khối Hệ Thống

> **Chi tiết:** Xem [`../03-system-diagram.md`](../03-system-diagram.md)

**Tóm tắt kiến trúc:**

```text
LIS3DH (I2C) ─┐
vgate iCar ───┼─→ ESP32-S3 ─→ SIMCom SIM7600CE-T ─→ Cellular & GNSS
               └──────────────────────┘
```

Kiến trúc runtime hiện tại chỉ dùng SIM7600CE-T (LTE Cat-4 + GNSS tích hợp); các tham chiếu đến A7670C + NEO-M8N chỉ giữ lại trong phần lịch sử baseline để minh họa sự chuyển đổi.

---

### Danh Sách Vật Liệu (BOM)

> **Chi tiết:** Xem [`../04-bill-of-materials.md`](../04-bill-of-materials.md)

**Tóm tắt:**

| STT | Thành Phần | Đơn Vị | SL | Ghi Chú |
| --- | ---------- | ------ | -- | ------- |
| 1 | ESP32-S3 DevKit | Cái | 1 | MCU chính |
| 2 | LIS3DH | Cái | 1 | IMU |
| 3 | OBD2 BLE (vgate iCar Pro) | Cái | 1 | Đọc dữ liệu ECU |
| 4 | LTE + GNSS module SIMCom SIM7600CE-T | Cái | 1 | Kèm LTE/GNSS antenna + SIM |
| 6 | 21700 Li-ion 5000mAh | Cái | 1 | Pin backup |
| 7 | Mạch nguồn + linh kiện phụ | Assorted | - | Buck/Boost/LVD/charger |

**Tổng chi phí ước tính: 905,000–1,615,000 VNĐ**
