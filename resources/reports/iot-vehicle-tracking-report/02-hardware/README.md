# Hardware Design - Thiết Kế Phần Cứng

Thư mục này chứa tài liệu thiết kế phần cứng cho hệ thống IoT Vehicle Tracking System.

## Cấu Trúc Thư Mục

```text
02-hardware/
├── README.md                               # File này
│
├── part-01-components/                     # Các thành phần phần cứng chính
│   ├── README.md
│   ├── 01-overview.md                      # Tổng quan kiến trúc phần cứng
│   ├── 02-imu-lis3dh.md                    # Cảm biến IMU LIS3DH
│   ├── 03-mcu-esp32-s3.md                  # Vi điều khiển ESP32-S3
│   ├── 04-obd2-ble-adapter.md              # OBD2 BLE Adapter
│   ├── 05-lte-modem-a7670c.md              # Modem LTE A7670C
│   └── 06-backup-battery-21700.md          # Pin dự phòng
│
├── part-02-power-management/               # Quản lý nguồn
│   ├── README.md
│   ├── 01-overview.md
│   ├── 02-buck-converter.md
│   ├── 03-boost-converter.md
│   ├── 04-power-path-management.md
│   ├── 05-low-voltage-disconnect.md
│   ├── 06-charger-ip2312.md
│   ├── 07-power-modes.md
│   └── 08-power-calculations.md
│
├── 03-system-diagram.md                    # Sơ đồ khối hệ thống
└── 04-bill-of-materials.md                 # Danh sách vật liệu (BOM)
```

## Tổng Quan

Thiết kế hiện tại dùng kiến trúc tách riêng LTE và GNSS:

### Thành Phần Chính

1. **ESP32-S3** - Vi điều khiển chính
   - Xử lý logic, deep sleep, điều phối state machine
   - Giao tiếp BLE với OBD2 adapter
   - Giao tiếp UART riêng với modem LTE và module GNSS
   - Đo điện áp ắc quy qua ADC

2. **LIS3DH** - Cảm biến IMU
   - Phát hiện rung/chuyển động
   - Đánh thức ESP32 từ deep sleep

3. **vgate iCar Pro** - OBD2 BLE Adapter
   - Đọc IGN, RPM, tốc độ và dữ liệu ECU
   - Kết nối BLE với ESP32-S3

4. **SIMCom A7670C** - Modem LTE
   - Kết nối mạng cellular
   - Thực hiện MQTT/HTTP và truyền dữ liệu
   - Không tích hợp GNSS

5. **u-blox NEO-M8N** - Module GNSS
   - Thu tín hiệu vệ tinh GPS/GNSS
   - Cung cấp vị trí qua UART riêng
   - Hoạt động độc lập với modem LTE

6. **Pin 21700 5000mAh** - Pin dự phòng
   - Cấp nguồn khi ắc quy yếu hoặc bị ngắt
   - Được sạc qua mạch IP2312 khi xe hoạt động

### Power Management

1. **Buck Converter** (LM2596) - 12V/24V → 5V
2. **Boost Converter** (MT3608) - 3.7V → 5V
3. **Power Path Management** - Chuyển đổi giữa ắc quy và pin backup
4. **Low Voltage Disconnect** - Bảo vệ ắc quy theo profile 12V/24V
5. **Charger** (IP2312) - Sạc pin 21700

**Profile nguồn mặc định:**

- **12V**: `Switch_OFF=12.0V`, `Switch_ON=12.2V`, `IGN_ON>=13.0V`, `IGN_OFF<=12.0V`
- **24V**: `Switch_OFF=24.0V`, `Switch_ON=24.4V`, `IGN_ON>=26.0V`, `IGN_OFF<=24.0V`

**Đo U_batt ADC:** dùng chia áp `R1=100k`, `R2=10k` (tỷ lệ ~0.0909) cho cả profile 12V/24V.

## Đọc Tài Liệu

### Cho Người Mới Bắt Đầu

1. Đọc [`part-01-components/01-overview.md`](./part-01-components/01-overview.md)
2. Xem [`03-system-diagram.md`](./03-system-diagram.md)
3. Đọc từng file trong [`part-01-components/`](./part-01-components/)
4. Xem [`part-02-power-management/`](./part-02-power-management/)

### Cho Người Thiết Kế PCB

1. Đọc chi tiết từng component trong [`part-01-components/`](./part-01-components/)
2. Xem sơ đồ khối trong [`03-system-diagram.md`](./03-system-diagram.md)
3. Tham khảo BOM trong [`04-bill-of-materials.md`](./04-bill-of-materials.md)

### Cho Người Làm Firmware

1. Chốt phần cứng LTE/GNSS tại [`part-01-components/01-overview.md`](./part-01-components/01-overview.md)
2. Xem sơ đồ khối tại [`03-system-diagram.md`](./03-system-diagram.md)
3. Đọc phần firmware tương ứng tại [`../03-firmware/part-03-modem-simcom.md`](../03-firmware/part-03-modem-simcom.md)

## Khuyến Nghị Cho Đồ Án

### Giải Pháp Đề Xuất

**Power Management:**
- ✅ Buck: LM2596 (12V/24V→5V, 3A)
- ✅ Boost: MT3608 (3.7V→5V, 2A)
- ✅ Power MUX: Relay module 5V hoặc MOSFET tùy PCB
- ✅ LVD: ADC ESP32 + logic firmware
- ✅ Charger: IP2312 (3A, Type-C)

**Lý do:**
- Tách LTE và GNSS giúp thiết kế rõ ràng hơn
- Có thể tắt riêng GNSS hoặc LTE theo chế độ hoạt động
- Dễ kiểm soát tiêu thụ điện khi xe đỗ
- Phù hợp lộ trình refactor firmware về kiến trúc hai module

### Tổng Chi Phí

**Ước tính: 905,000–1,615,000 VNĐ**

Xem chi tiết trong [`04-bill-of-materials.md`](./04-bill-of-materials.md).

## Tài Liệu Liên Quan

- **Firmware**: [`../03-firmware/`](../03-firmware/)
- **Server**: [`../04-server/`](../04-server/)
- **Improvements**: [`../06-improvements/`](../06-improvements/)

## Cập Nhật

- **2026-03**: Chuẩn hóa kiến trúc phần cứng sang A7670C (LTE) + NEO-M8N (GNSS)
- **2026-03**: Đổi tên file modem phần cứng sang `05-lte-modem-a7670c.md`
- **2024-12**: Tách file lớn thành các file nhỏ
