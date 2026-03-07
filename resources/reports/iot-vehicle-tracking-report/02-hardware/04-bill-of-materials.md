## III.3 Danh Sách Vật Liệu (BOM)

### Tổng Quan

BOM dưới đây phản ánh **kiến trúc phần cứng mục tiêu** hiện đang triển khai: **SIMCom SIM7600CE-T** (LTE Cat-4 + GNSS tích hợp). Một module duy nhất chịu trách nhiệm cả đường truyền cellular và định vị, giúp giảm đường dẫn tín hiệu, bo mạch và chi phí cáp anten. Theo runtime hiện tại, các tín hiệu bắt buộc là UART1 + PWRKEY; các net RESET/EN/RI vẫn giữ trong sơ đồ phần cứng để tham chiếu thiết kế.

### BOM Chi Tiết

| STT | Thành Phần | Đơn Vị | SL | Giá Ước Tính (VNĐ) | Ghi Chú |
| --- | ---------- | ------ | -- | ------------------ | ------- |
| 1 | ESP32-S3 DevKit | Cái | 1 | 100,000–200,000 | ESP32-S3-DevKitC-1 hoặc DevKitM-1 |
| 2 | LIS3DH | Cái | 1 | 20,000–50,000 | Breakout board hoặc IC riêng |
| 3 | OBD2 BLE (vgate iCar Pro) | Cái | 1 | 150,000–300,000 | BLE 4.0, đọc dữ liệu ECU |
| 4 | LTE + GNSS module SIMCom SIM7600CE-T | Cái | 1 | 170,000–220,000 | Kèm LTE/GNSS antenna + SIM |
| 5 | 18650 Li-ion 1S (dung lượng theo cell chọn) | Cái | 1 | 60,000–180,000 | Cell 18650 + protection board 1S |
| 6 | Module sạc IP2312 (3A) | Cái | 1 | 20,000–40,000 | Charger Type-C |
| 7 | BMS/Protection Board 1S | Cái | 1 | 10,000–20,000 | BMS 1S 3A hoặc DW01+MOSFET |
| 8 | Buck DC-DC (12/24→5V, 3A) | Cái | 1 | 15,000–25,000 | LM2596 module |
| 9 | Boost DC-DC (3.7→5V, 2A) | Cái | 1 | 10,000–15,000 | MT3608 module |
| 10 | Relay module 5V / mạch Power MUX | Cái | 1 | 5,000–15,000 | Chuyển nguồn ắc quy ↔ pin backup |
| 11 | Resistor, capacitor, diode, connector | Gói | 1 | 20,000–40,000 | Mạch phụ trợ nguồn + ADC |
| 12 | PCB (nếu tự thiết kế) | Cái | 1 | 50,000–100,000 | PCB 2 lớp |
| 13 | Vỏ bảo vệ (tùy chọn) | Cái | 1 | 50,000–100,000 | Prototype hoặc lắp thực địa |
| 14 | Dây nối, cáp, linh kiện phụ trợ khác | Gói | 1 | 35,000–60,000 | Fuse, LED, dây điện |

### Tổng Chi Phí Ước Tính

| Hạng Mục | Chi Phí (VNĐ) |
| -------- | ------------- |
| **Thành phần chính** | 720,000–1,310,000 |
| **Power management** | 60,000–115,000 |
| **Linh kiện phụ trợ** | 55,000–100,000 |
| **PCB (nếu tự thiết kế)** | 50,000–100,000 |
| **Vỏ bảo vệ (tùy chọn)** | 50,000–100,000 |
| **Tổng cộng** | **935,000–1,625,000** |

### Lưu Ý

#### 1. Kiến Trúc hiện tại (SIM7600CE-T)

- Module SIM7600CE-T đóng vai trò cả **cellular** và **GNSS**, giúp loại bỏ cần UART GNSS riêng và rail 3.3V cho NEO-M8N. Chỉ cần rail 3.8V + logic hiện có.
- Module chạy ở chế độ **Auto mode** (`AT+CNMP=2`), APN mặc định là `internet`, nên firmware không cần xử lý nhiều cấu hình carrier.
- Pin map phần cứng vẫn giữ các net UART1/PWRKEY/RESET/EN/RI, nhưng runtime hiện tại chốt UART1 + PWRKEY là bắt buộc.

#### 2. So sánh với thiết kế cũ (baseline)

- Trước đây BOM gồm hai dòng riêng biệt: **SIMCom A7670C** (LTE) và **u-blox NEO-M8N** (GNSS). Kiến trúc đó vẫn được đề cập khi mô tả lịch sử hoặc bối cảnh baseline.
- Việc chuyển sang SIM7600CE-T giảm đường dây UART, LDO, và độ phức tạp layout; runtime lấy fix GNSS qua `AT+CGNSINF`, còn `AT+CGNSTST` giữ vai trò debug NMEA khi cần.
- Nếu cần so sánh chi phí: A7670C + NEO-M8N ≈ 320,000–520,000 VNĐ, trong khi SIM7600CE-T đơn lẻ khoảng 170,000–220,000 VNĐ.

#### 3. Nơi Mua Hàng

**Trên Shopee/Lazada:**
- Tìm theo từ khóa: `SIM7600CE-T`, `ESP32-S3`, `LIS3DH`, `IP2312`
- So sánh giá, review, ảnh thực tế

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
- SIMCom SIM7600CE-T
- SIM card (data plan)

#### Nhóm 3: Nguồn và Pin
- Pin 18650 Li-ion 1S
- Protection board 1S
- Charger IP2312

#### Nhóm 4: Power Management
- Buck converter LM2596
- Boost converter MT3608
- Power MUX / relay / MOSFET path

### Kết Luận

**Tổng chi phí ước tính: 935,000–1,625,000 VNĐ**.

Kiến trúc hiện tại tập trung vào module SIM7600CE-T (LTE + GNSS) duy nhất. Các tham chiếu đến **A7670C (LTE)** và **NEO-M8N (GNSS)** chỉ còn xuất hiện khi so sánh lịch sử và mô tả baseline cũ.
