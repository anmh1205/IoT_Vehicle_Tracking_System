## III.3 Danh Sách Vật Liệu (BOM)

### Tổng Quan

BOM dưới đây phản ánh **kiến trúc phần cứng hiện tại** của tracker sau khi tách riêng:

- **LTE:** SIMCom A7670C
- **GNSS:** u-blox NEO-M8N

Thiết kế này thay thế cấu trúc cũ dùng modem tích hợp GNSS.

### BOM Chi Tiết

| STT | Thành Phần | Đơn Vị | SL | Giá Ước Tính (VNĐ) | Ghi Chú |
| --- | ---------- | ------ | -- | ------------------ | ------- |
| 1 | ESP32-S3 DevKit | Cái | 1 | 100,000–200,000 | ESP32-S3-DevKitC-1 hoặc DevKitM-1 |
| 2 | LIS3DH | Cái | 1 | 20,000–50,000 | Breakout board hoặc IC riêng |
| 3 | OBD2 BLE (vgate iCar Pro) | Cái | 1 | 150,000–300,000 | BLE 4.0, đọc dữ liệu ECU |
| 4 | LTE modem A7670C | Cái | 1 | 170,000–220,000 | Kèm LTE antenna + SIM |
| 5 | GNSS module NEO-M8N | Cái | 1 | 150,000–300,000 | Kèm antenna GNSS |
| 6 | 21700 Li-ion 5000mAh | Cái | 1 | 100,000–200,000 | Loại có protection board |
| 7 | Module sạc IP2312 (3A) | Cái | 1 | 20,000–40,000 | Charger Type-C |
| 8 | BMS/Protection Board 1S | Cái | 1 | 10,000–20,000 | BMS 1S 3A hoặc DW01+MOSFET |
| 9 | Buck DC-DC (12/24→5V, 3A) | Cái | 1 | 15,000–25,000 | LM2596 module |
| 10 | Boost DC-DC (3.7→5V, 2A) | Cái | 1 | 10,000–15,000 | MT3608 module |
| 11 | Relay module 5V / mạch Power MUX | Cái | 1 | 5,000–15,000 | Chuyển nguồn ắc quy ↔ pin backup |
| 12 | Resistor, capacitor, diode, connector | Gói | 1 | 20,000–40,000 | Mạch phụ trợ nguồn + ADC |
| 13 | PCB (nếu tự thiết kế) | Cái | 1 | 50,000–100,000 | PCB 2 lớp |
| 14 | Vỏ bảo vệ (tùy chọn) | Cái | 1 | 50,000–100,000 | Prototype hoặc lắp thực địa |
| 15 | Dây nối, cáp, linh kiện phụ trợ khác | Gói | 1 | 35,000–60,000 | Fuse, LED, dây điện |

### Tổng Chi Phí Ước Tính

| Hạng Mục | Chi Phí (VNĐ) |
| -------- | ------------- |
| **Thành phần chính** | 690,000–1,270,000 |
| **Power management** | 60,000–115,000 |
| **Linh kiện phụ trợ** | 55,000–100,000 |
| **PCB (nếu tự thiết kế)** | 50,000–100,000 |
| **Vỏ bảo vệ (tùy chọn)** | 50,000–100,000 |
| **Tổng cộng** | **905,000–1,615,000** |

### Lưu Ý

#### 1. Kiến Trúc Tách LTE/GNSS

- A7670C chỉ xử lý **kết nối cellular**
- NEO-M8N chỉ xử lý **định vị GNSS**
- Cần thêm một UART riêng và một đường nguồn riêng cho GNSS
- Đổi lại, có thể bật/tắt độc lập LTE và GNSS theo trạng thái hoạt động

#### 2. So Với Thiết Kế Cũ

- Thiết kế cũ dùng modem 4G/GNSS tích hợp trong một module duy nhất
- Thiết kế mới tăng số module nhưng giảm coupling giữa modem và GNSS
- BOM mới thay 1 dòng tích hợp bằng 2 dòng độc lập: **A7670C + NEO-M8N**

#### 3. Nơi Mua Hàng

**Trên Shopee/Lazada:**
- Tìm theo từ khóa: `A7670C`, `NEO-M8N`, `ESP32-S3`, `LIS3DH`, `IP2312`
- So sánh giá, review, và ảnh thực tế

**Cửa hàng linh kiện:**
- Chipdientu.com.vn
- DKE.vn
- Linhkienfpt.vn
- Nhà cung cấp linh kiện địa phương

### BOM Theo Nhóm

#### Nhóm 1: Vi Điều Khiển và Cảm Biến
- ESP32-S3 DevKit
- LIS3DH

#### Nhóm 2: Giao Tiếp và Định Vị
- OBD2 BLE adapter (vgate iCar Pro)
- LTE modem A7670C
- GNSS module NEO-M8N
- SIM card (data plan)

#### Nhóm 3: Nguồn và Pin
- Pin 21700 5000mAh
- Protection board 1S
- Charger IP2312

#### Nhóm 4: Power Management
- Buck converter LM2596
- Boost converter MT3608
- Power MUX / relay / MOSFET path

### Kết Luận

**Tổng chi phí ước tính: 905,000–1,615,000 VNĐ**

BOM hiện tại đã phản ánh đúng kiến trúc mục tiêu **A7670C (LTE) + NEO-M8N (GNSS)** và loại bỏ mô tả thiết kế hiện tại theo modem GNSS tích hợp.
