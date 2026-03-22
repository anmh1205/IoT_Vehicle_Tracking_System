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
│   ├── 05-lte-modem-a7670c.md              # LTE + GNSS SIM7600CE-T (tên file legacy)
│   └── 06-backup-battery-21700.md          # Pin dự phòng 18650 1S (tên file legacy)
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
├── 04-bill-of-materials.md                 # Danh sách vật liệu (BOM)
└── 05-pinout-connection-matrix.md          # Ma trận kết nối chân (pinout)
```

## Tổng Quan

Thiết kế hiện tại xoay quanh **SIMCom SIM7600CE-T** (LTE + GNSS tích hợp) kết nối trực tiếp với ESP32-S3 qua UART1. Toàn bộ dữ liệu GNSS và LTE được xử lý bởi một module duy nhất, nên firmware và PCB chỉ cần tập trung vào SIM7600CE-T thay vì kết hợp riêng LTE và GNSS.

### Thành Phần Chính

1. **ESP32-S3** - Vi điều khiển chính
   - Xử lý logic, deep sleep, điều phối state machine
   - Giao tiếp BLE với OBD2 adapter
   - Giao tiếp UART1 với SIM7600CE-T (AT command; GNSS runtime qua `AT+CGNSINF`)
   - Đo điện áp ắc quy qua ADC

2. **LIS3DH** - Cảm biến IMU
   - Phát hiện rung/chuyển động
   - Đánh thức ESP32 từ deep sleep

3. **vgate iCar Pro** - OBD2 BLE Adapter
   - Đọc IGN, RPM, tốc độ và dữ liệu ECU
   - Kết nối BLE với ESP32-S3

4. **SIMCom SIM7600CE-T** - Modem LTE + GNSS
   - Kết nối mạng cellular LTE/3G/2G Auto mode (`AT+CNMP=2`)
   - Runtime hiện tại lấy vị trí GNSS qua `AT+CGNSPWR` / `AT+CGNSINF` (`AT+CGNSTST` chỉ dùng cho debug nếu bật)
   - Thực hiện MQTT/HTTP, SSL/TLS, OTA (nếu cần)

5. **Pin 18650 Li-ion 1S** - Pin dự phòng
   - Cấp nguồn khi ắc quy yếu hoặc bị ngắt
   - Sạc bằng TP4056 1S khi IGN ON và U_batt cao hơn ngưỡng profile

6. **Power path + charger** - MP2482/SX1308/Diode OR/TP4056/LM393
   - MP2482 tạo 5V bus chính, SX1308 boost pin 1S, diode OR hợp hai nguồn, LM393 xác định low-voltage và firmware cắt EN
   - TP4056 chỉ sạc pin 18650 1S khi xe chạy và `CHARGER_EN=1`

### Power Management

1. **Buck Converter** (MP2482) - 12V/24V → 5V @ 5A để tạo 5V bus chính cho ESP32, SIM7600CE-T và TP4056.
2. **Downconverters**: XL1509 hạ 5V xuống 3.3V cho ESP32-S3, TPS54231 hạ 5V xuống ~4V cho SIM7600CE-T logic/bus 4V.
3. **Boost Converter** (SX1308) - Nâng điện áp từ pin 18650 1S (3.0–4.2V) lên 5V khi xe bị ngắt, kết hợp diode OR để đồng bộ với 5V bus.
4. **Power Routing** - Diode OR (2×Schottky) nối MP2482 và SX1308, GPIO18 chỉ điều khiển EN MP2482 để tránh sử dụng relay/MOSFET.
5. **Low Voltage Disconnect** - Comparator LM393 + firmware (GPIO19) phát hiện HIGH = low-voltage, ngắt EN đường 12/24V để không rút cạn ắc quy.
6. **Charger** (TP4056) - Sạc pin 18650 1S khi `CHARGER_EN=1`, IGN ON và U_batt vượt ngưỡng profile.


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
4. Đối chiếu pinout tại [`05-pinout-connection-matrix.md`](./05-pinout-connection-matrix.md)

### Cho Người Làm Firmware

1. Chốt phần cứng LTE/GNSS tại [`part-01-components/01-overview.md`](./part-01-components/01-overview.md)
2. Xem sơ đồ khối tại [`03-system-diagram.md`](./03-system-diagram.md)
3. Đọc phần firmware tương ứng tại [`../03-firmware/part-03-modem-simcom.md`](../03-firmware/part-03-modem-simcom.md)

## Khuyến Nghị Cho Đồ Án

### Giải Pháp Đề Xuất

**Power Management:**
- ✅ Buck: MP2482 (12V/24V→5V @ 5A) cùng EN pin được điều khiển bởi GPIO18 và LM393 để ưu tiên nguồn xe hoặc pin backup
- ✅ Boost: SX1308 (1S → 5V) + diode OR để nâng pin 18650 1S lên bus 5V khi EN MP2482 bị tắt
- ✅ Power Routing: Diode OR đôi (Schottky) thay relay/MOSFET, kích hoạt qua EN/CHARGER GPIO và comparator LM393
- ✅ Low Voltage Disconnect: LM393 + firmware `power_is_low_voltage()` (GPIO19 HIGH = low-voltage) cắt EN MP2482 và giữ pin backup
- ✅ Charger: TP4056 module (GPIO5) sạc pin 18650 1S khi IGN ON + U_batt đạt ngưỡng profile
- ✅ Downconverters: XL1509 (5V → 3.3V) cho ESP32-S3, TPS54231 (5V → ~4V) cho SIM7600CE-T logic/bus 4V

**Lý do:**
- MP2482 + SX1308 + diode OR là path runtime đã chứng minh trên firmware và schematic
- GPIO18/CHARGER_EN/LM393 phối hợp đảm bảo không rút cạn ắc quy khi hiển thị low-voltage
- TP4056 là module sạc 1S phổ biến; dòng sạc phụ thuộc cấu hình PROG và điều kiện nhiệt, tự ngắt khi pin đầy
- XL1509/TPS54231 giữ rail logic ổn định cho MCU và modem sau khi tạo bus 5V

> **Ghi chú legacy:** Tài liệu cũ đề cập LM2596, MT3608, IP2312, relay/MOSFET hoặc pin 21700/2S chỉ để so sánh lịch sử; không phải kiến trúc runtime hiện tại.

### Tổng Chi Phí

**Ước tính: 935,000–1,625,000 VNĐ**

Xem chi tiết trong [`04-bill-of-materials.md`](./04-bill-of-materials.md).

## Tài Liệu Liên Quan

- **Firmware**: [`../03-firmware/`](../03-firmware/)
- **Server**: [`../04-server/`](../04-server/)
- **Improvements**: [`../06-improvements/`](../06-improvements/)

## Cập Nhật

- **2026-03**: Chuẩn hóa kiến trúc phần cứng sang SIMCom SIM7600CE-T (LTE + GNSS tích hợp); A7670C + NEO-M8N chỉ còn là baseline lịch sử để so sánh
- **2026-03**: Đổi tên file modem phần cứng sang `05-lte-modem-a7670c.md`
- **2024-12**: Tách file lớn thành các file nhỏ
