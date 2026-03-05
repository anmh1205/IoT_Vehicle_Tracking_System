# Components - Các Thành Phần Phần Cứng

Thư mục này mô tả các thành phần phần cứng chính của tracker theo kiến trúc mục tiêu: **SIMCom SIM7600CE-T** (LTE + GNSS tích hợp). Runtime chỉ nhắm vào module này; tham chiếu đến **A7670C + NEO-M8N** chỉ để giải thích lịch sử baseline. Refer to [`../03-system-diagram.md`](../03-system-diagram.md) for overall system flow.

## Danh Sách File

1. **[01-overview.md](./01-overview.md)** - Tổng quan phần cứng
   - Kiến trúc phần cứng hiện tại
   - Tóm tắt lựa chọn linh kiện
   - Sơ đồ khối và BOM rút gọn

2. **[02-imu-lis3dh.md](./02-imu-lis3dh.md)** - Cảm biến IMU LIS3DH
   - Motion detection
   - Wake-up từ deep sleep
   - Kết nối I2C với ESP32-S3

3. **[03-mcu-esp32-s3.md](./03-mcu-esp32-s3.md)** - Vi điều khiển ESP32-S3
   - Điều phối BLE, LTE, GNSS, power management
   - Tài nguyên GPIO/UART/I2C
   - Lý do chọn cho tracker

4. **[04-obd2-ble-adapter.md](./04-obd2-ble-adapter.md)** - OBD2 BLE Adapter vgate iCar Pro
   - Kết nối BLE OBD2
   - Chiến lược polling dữ liệu ECU
   - Xử lý lỗi kết nối

5. **[05-lte-modem-a7670c.md](./05-lte-modem-a7670c.md)** - LTE + GNSS SIMCom SIM7600CE-T (tên file legacy)
   - Runtime dùng SIM7600CE-T tích hợp LTE + GNSS
   - Kết nối AT command qua UART1, không có UART GNSS riêng
   - Luồng attach dùng CEREG trước CGACT, APN mặc định `internet`

6. **[06-backup-battery-21700.md](./06-backup-battery-21700.md)** - Pin dự phòng 21700
   - Dung lượng và thời gian hoạt động
   - Mạch bảo vệ pin
   - Chiến lược sạc/xả

## Ghi Chú Kiến Trúc

- **LTE + GNSS**: SIMCom SIM7600CE-T qua UART1 (Auto mode + APN `internet`)
- **Lịch sử baseline**: A7670C + NEO-M8N vẫn tồn tại trong tài liệu cũ để minh hoạ kiến trúc hai module
  - [`01-overview.md`](./01-overview.md)
  - [`../03-system-diagram.md`](../03-system-diagram.md)
  - [`../04-bill-of-materials.md`](../04-bill-of-materials.md)
  - [`../../03-firmware/part-03-modem-simcom.md`](../../03-firmware/part-03-modem-simcom.md)

## Cấu Trúc

```text
part-01-components/
├── 01-overview.md
├── 02-imu-lis3dh.md
├── 03-mcu-esp32-s3.md
├── 04-obd2-ble-adapter.md
├── 05-lte-modem-a7670c.md
├── 06-backup-battery-21700.md
└── README.md
```
