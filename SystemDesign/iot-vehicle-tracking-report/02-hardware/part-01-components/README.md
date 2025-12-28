# Components - Các Thành Phần Phần Cứng

Thư mục này chứa các file chi tiết về từng thành phần phần cứng của hệ thống tracker.

## Danh Sách File

1. **[01-overview.md](./01-overview.md)** - Tổng quan phần cứng
   - Tổng quan các thành phần
   - Tóm tắt lựa chọn
   - Sơ đồ khối hệ thống
   - Danh sách vật liệu (BOM)

2. **[02-imu-lis3dh.md](./02-imu-lis3dh.md)** - Cảm biến IMU LIS3DH
   - Đặc tính kỹ thuật
   - Lý do chọn
   - Kết nối với ESP32-S3
   - Cấu hình motion detection

3. **[03-mcu-esp32-s3.md](./03-mcu-esp32-s3.md)** - Vi điều khiển ESP32-S3
   - So sánh với STM32L4
   - Đặc tính kỹ thuật
   - GPIO mapping
   - Lý do chọn

4. **[04-obd2-ble-adapter.md](./04-obd2-ble-adapter.md)** - OBD2 BLE Adapter vgate iCar Pro
   - Đặc tính kỹ thuật
   - Chiến lược kết nối
   - Xử lý lỗi
   - Tối ưu hóa

5. **[05-modem-a7600ce-t.md](./05-modem-a7600ce-t.md)** - Modem 4G/GNSS SIMCom A7600CE-T
   - So sánh UART vs USB
   - AT commands cơ bản
   - Chiến lược điều khiển
   - Xử lý lỗi

6. **[06-backup-battery-21700.md](./06-backup-battery-21700.md)** - Pin dự phòng 21700
   - Đặc tính kỹ thuật
   - Tính toán thời gian hoạt động
   - Mạch bảo vệ pin
   - Sạc pin

## Cấu Trúc

```
part-01-components/
├── 01-overview.md
├── 02-imu-lis3dh.md
├── 03-mcu-esp32-s3.md
├── 04-obd2-ble-adapter.md
├── 05-modem-a7600ce-t.md
├── 06-backup-battery-21700.md
└── README.md
```


