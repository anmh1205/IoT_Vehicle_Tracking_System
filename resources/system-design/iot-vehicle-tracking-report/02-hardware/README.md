# Hardware Design - Thiết Kế Phần Cứng

Thư mục này chứa tất cả các tài liệu về thiết kế phần cứng cho hệ thống IoT Vehicle Tracking System.

## Cấu Trúc Thư Mục

```
02-hardware/
├── README.md                          # File này
│
├── part-01-components/                     # Các thành phần phần cứng
│   ├── README.md
│   ├── 01-overview.md                # Tổng quan phần cứng
│   ├── 02-imu-lis3dh.md              # Cảm biến IMU LIS3DH
│   ├── 03-mcu-esp32-s3.md           # Vi điều khiển ESP32-S3
│   ├── 04-obd2-ble-adapter.md       # OBD2 BLE Adapter
│   ├── 05-modem-a7600ce-t.md        # Modem 4G/GNSS
│   └── 06-backup-battery-21700.md   # Pin dự phòng
│
├── part-02-power-management/              # Quản lý nguồn
│   ├── README.md
│   ├── 01-overview.md                # Tổng quan quản lý nguồn
│   ├── 02-buck-converter.md          # Buck 12V→5V
│   ├── 03-boost-converter.md         # Boost 3.7V→5V
│   ├── 04-power-path-management.md   # Power Path Management
│   ├── 05-low-voltage-disconnect.md  # Low Voltage Disconnect
│   ├── 06-charger-ip2312.md          # Charger IP2312
│   ├── 07-power-modes.md             # Chiến lược quản lý năng lượng
│   └── 08-power-calculations.md      # Tính toán năng lượng
│
├── 03-system-diagram.md              # Sơ đồ khối hệ thống
└── 04-bill-of-materials.md           # Danh sách vật liệu (BOM)
```

## Tổng Quan

Hệ thống tracker sử dụng các thành phần phần cứng sau:

### Thành Phần Chính

1. **ESP32-S3** - Vi điều khiển chính
   - Xử lý logic, quản lý deep sleep
   - Giao tiếp BLE với OBD2 adapter
   - Giao tiếp UART với modem 4G/GNSS
   - Đo điện áp ắc quy qua ADC

2. **LIS3DH** - Cảm biến IMU
   - Phát hiện chuyển động khi đỗ xe
   - Wake-up ESP32 từ deep sleep

3. **vgate iCar Pro** - OBD2 BLE Adapter
   - Đọc dữ liệu từ ECU (IGN, RPM, tốc độ, etc.)
   - Kết nối qua BLE 4.0

4. **SIMCom A7600CE-T** - Modem 4G/GNSS
   - Kết nối mạng cellular
   - Lấy vị trí GPS/GNSS
   - Gửi dữ liệu lên server

5. **Pin 21700 5000mAh** - Pin dự phòng
   - Cung cấp nguồn khi ắc quy yếu
   - Được sạc khi xe chạy

### Power Management

1. **Buck Converter** (LM2596) - 12V → 5V
2. **Boost Converter** (MT3608) - 3.7V → 5V
3. **Power Path Management** - Chuyển đổi giữa ắc quy và pin
4. **Low Voltage Disconnect** - Bảo vệ ắc quy
5. **Charger** (IP2312) - Sạc pin 21700

## Đọc Tài Liệu

### Cho Người Mới Bắt Đầu

1. Đọc [`part-01-components/01-overview.md`](./part-01-components/01-overview.md) để có cái nhìn tổng quan
2. Xem [`03-system-diagram.md`](./03-system-diagram.md) để hiểu kiến trúc
3. Đọc từng file trong [`part-01-components/`](./part-01-components/) để hiểu chi tiết từng thành phần
4. Xem [`part-02-power-management/`](./part-02-power-management/) để hiểu quản lý nguồn

### Cho Người Thiết Kế PCB

1. Đọc chi tiết từng component trong [`part-01-components/`](./part-01-components/)
2. Xem sơ đồ mạch trong [`part-02-power-management/`](./part-02-power-management/)
3. Tham khảo BOM trong [`04-bill-of-materials.md`](./04-bill-of-materials.md)

### Cho Người Mua Hàng

1. Xem [`04-bill-of-materials.md`](./04-bill-of-materials.md) để biết cần mua gì
2. Đọc phần "Nơi Mua Hàng" trong từng file component
3. So sánh giá và chọn seller uy tín

## Khuyến Nghị cho Đồ Án

### Giải Pháp Đề Xuất

**Power Management:**
- ✅ Buck: Module LM2596 (12V→5V, 3A)
- ✅ Boost: Module MT3608 (3.7V→5V, 2A)
- ✅ Power MUX: Relay Module 5V (đơn giản hơn MOSFET)
- ✅ LVD: ADC ESP32 (software-based, không cần hardware)
- ✅ Charger: Module IP2312 (3A, Type-C)

**Lý do:**
- Đơn giản, dễ mua module trên Shopee/Lazada
- Dễ test và debug
- Giá hợp lý (~50,000–70,000 VNĐ tổng)
- Phù hợp với phạm vi đồ án

### Tổng Chi Phí

**Ước tính: 870,000–1,630,000 VNĐ**

Xem chi tiết trong [`04-bill-of-materials.md`](./04-bill-of-materials.md)

## Tài Liệu Liên Quan

- **Firmware**: Xem [`../03-firmware/`](../03-firmware/) để biết cách điều khiển phần cứng
- **Server**: Xem [`../04-server/`](../04-server/) để biết backend architecture
- **Improvements**: Xem [`../06-improvements/`](../06-improvements/) để biết các cải tiến có thể

## Lưu Ý

- Tất cả giá cả là ước tính dựa trên thị trường Việt Nam
- Nên mua từ nhiều nguồn để so sánh giá
- Kiểm tra tương thích giữa các thành phần trước khi mua
- Test từng module trước khi lắp ráp

## Cập Nhật

- **2024-12**: Tách file lớn thành các file nhỏ, chi tiết hơn
- **2024-12**: Thêm khuyến nghị sử dụng module cho đồ án
- **2024-12**: Thêm giải pháp software-based LVD
