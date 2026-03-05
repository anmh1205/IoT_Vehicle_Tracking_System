## III.1.2-3 Vi Điều Khiển: ESP32-S3

### Tổng Quan

**ESP32-S3** là vi điều khiển được chọn cho hệ thống tracker, thay thế cho STM32 do có nhiều ưu điểm phù hợp với yêu cầu đồ án.

### So Sánh ESP32-S3 vs STM32L4

| Tiêu Chí | STM32L4 | ESP32-S3 | Đánh Giá |
|----------|---------|-----------|----------|
| **Deep Sleep Current** | ~1–3 μA (STOP2) | ~10–15 μA | ⭐⭐⭐ STM32 thấp hơn 3–5 lần |
| **Wakeup từ GPIO** | ✅ EXTI | ✅ EXT0/EXT1 | ⭐⭐⭐⭐ Tương đương |
| **UART** | 3–8 cổng | 3 cổng | ⭐⭐⭐⭐ Đủ dùng |
| **ADC** | 12-bit | 12-bit, 20 kênh | ⭐⭐⭐⭐ Tương đương |
| **I2C** | ✅ | ✅ 2 cổng | ⭐⭐⭐⭐ Tương đương |
| **RAM** | 64–320 KB | 512 KB SRAM | ⭐⭐⭐ ESP32-S3 nhiều hơn |
| **Flash** | 64 KB–2 MB | 4–16 MB | ⭐⭐⭐ ESP32-S3 linh hoạt hơn |
| **WiFi/Bluetooth** | ❌ Cần module | ✅ Tích hợp BLE 5.0 | ⭐⭐⭐⭐⭐ ESP32-S3 có lợi |
| **Chi phí** | ~150,000–300,000 VNĐ | ~100,000–250,000 VNĐ | ⭐⭐⭐⭐ ESP32-S3 rẻ hơn |
| **Độ phức tạp** | ⚠️ Cao (HAL/CubeMX) | ✅ Thấp (Arduino/ESP-IDF) | ⭐⭐⭐⭐⭐ ESP32-S3 dễ hơn |
| **Cộng đồng** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ESP32-S3 phong phú hơn |
| **Thời gian phát triển** | ⚠️ Lâu | ✅ Nhanh | ⭐⭐⭐⭐⭐ ESP32-S3 nhanh hơn |

### Phân Tích Chi Tiết

#### 1. Tiêu Thụ Năng Lượng

**STM32L4:**
- Deep sleep (STOP2): **1–3 μA**
- Ưu điểm: Tiêu thụ thấp hơn ESP32 3–5 lần
- Nhược điểm: Không có BLE tích hợp

**ESP32-S3:**
- Deep sleep: **10–15 μA**
- Vẫn chấp nhận được: Với pin 5000 mAh, có thể hoạt động 2–3 tháng với heartbeat 10–30 phút
- Ưu điểm: Có BLE 5.0 tích hợp → không cần module ngoài

**Kết luận:** Mặc dù STM32 tiêu thụ thấp hơn, nhưng sự khác biệt (10–15 μA vs 1–3 μA) không đủ để bù đắp các nhược điểm khác.

#### 2. BLE 5.0 Tích Hợp

**ESP32-S3:**
- ✅ BLE 5.0 native → kết nối trực tiếp với OBD2 adapter vgate iCar Pro (BLE 4.0)
- ✅ Không cần module BLE ngoài → giảm chi phí và độ phức tạp
- ✅ Cộng đồng lớn, nhiều ví dụ code

**STM32:**
- ⚠️ STM32WB có BLE nhưng:
  - Giá cao hơn
  - Ít tài liệu và ví dụ hơn
  - Cộng đồng nhỏ hơn

**Kết luận:** ESP32-S3 có lợi thế rõ ràng cho việc kết nối OBD2 qua BLE.

#### 3. Phát Triển và Bảo Trì

**STM32:**
- Yêu cầu kiến thức sâu về HAL, CubeMX
- Phức tạp hơn cho đồ án sinh viên
- Thời gian phát triển lâu hơn

**ESP32-S3:**
- ✅ Hỗ trợ Arduino IDE → dễ học
- ✅ ESP-IDF framework mạnh mẽ
- ✅ Cộng đồng lớn, nhiều ví dụ
- ✅ Thời gian phát triển nhanh hơn

**Kết luận:** ESP32-S3 phù hợp hơn cho đồ án do dễ phát triển.

#### 4. Chi Phí

- **STM32L4**: ~150,000–300,000 VNĐ
- **ESP32-S3**: ~100,000–250,000 VNĐ
- **Tiết kiệm**: 30–50% so với STM32

### Đặc Tính Kỹ Thuật ESP32-S3

#### Thông Số Cơ Bản

| Thông Số | Giá Trị |
|----------|---------|
| **CPU** | Dual-core Xtensa LX7 @ 240 MHz (32-bit) |
| **RAM** | 512 KB SRAM |
| **Flash** | 4–16 MB (on-board, tùy variant) |
| **WiFi** | 802.11 b/g/n (không sử dụng trong tracker) |
| **Bluetooth** | BLE 5.0 (sử dụng cho OBD2) |
| **GPIO** | 45 chân |
| **UART** | 3 cổng |
| **I2C** | 2 cổng |
| **SPI** | 3 cổng |
| **ADC** | 12-bit, 20 kênh |
| **Deep Sleep** | ~10–15 μA (với external wakeup) |
| **Active (BLE)** | ~20–40 mA |
| **Active (WiFi)** | ~80–240 mA |

#### Mã Cụ Thể

- **Module**: ESP32-S3-WROOM-1 (4–16MB Flash)
- **Board**: ESP32-S3-DevKitC-1 hoặc ESP32-S3-DevKitM-1
- **Giá**: ~100,000–200,000 VNĐ

### Lý Do Chọn ESP32-S3

#### 1. Hỗ Trợ BLE 5.0
- Kết nối trực tiếp với OBD2 adapter vgate iCar Pro (BLE 4.0 compatible)
- Đọc dữ liệu xe chính xác: IGN status, RPM, tốc độ, nhiên liệu, mã lỗi
- Không cần module BLE ngoài → giảm chi phí

#### 2. Đủ Mạnh
- Dual-core 240 MHz, 512 KB RAM
- Xử lý đồng thời: OBD2 + modem + IMU
- Đủ cho xử lý AT commands, MQTT, OBD2

#### 3. Nhiều UART
- 3 cổng UART → đủ cho modem tích hợp **SIM7600CE-T** và các thiết bị khác
- Hỗ trợ tốc độ cao: lên đến 5 Mbps

#### 4. Hỗ Trợ External Wakeup
- EXT0/EXT1 từ GPIO → đánh thức từ deep sleep bằng IMU interrupt
- RTC GPIO → có thể wake up từ nhiều nguồn

#### 5. ADC 12-bit
- Đo chính xác điện áp ắc quy
- 20 kênh ADC → đủ cho nhiều cảm biến

#### 6. Thư Viện Phong Phú
- Arduino BLE library
- ESP-IDF BLE stack
- Cộng đồng lớn, nhiều ví dụ

#### 7. Chi Phí Thấp
- Rẻ hơn STM32 30–50%
- Phù hợp với ngân sách đồ án

#### 8. Dễ Phát Triển
- Arduino IDE → dễ học cho sinh viên
- ESP-IDF → framework mạnh mẽ cho production
- Nhiều ví dụ và tài liệu

#### 9. Tiêu Thụ Chấp Nhận Được
- Deep sleep 10–15 μA → đủ cho pin 5000 mAh hoạt động 2–3 tháng
- Với heartbeat 10–30 phút, tiêu thụ trung bình rất thấp

#### 10. BLE 5.0 Tốt Hơn
- Hỗ trợ BLE tốt hơn ESP32 classic
- Tương thích ngược với BLE 4.0
- Range tốt hơn, tốc độ cao hơn

### Chức Năng Trong Hệ Thống

#### 1. Xử Lý Logic Chính
- Quản lý 3 chế độ: lái xe, đỗ, cảnh báo
- State machine để chuyển đổi giữa các chế độ

#### 2. Giao Tiếp I2C với LIS3DH
- Đọc dữ liệu IMU (nếu cần)
- Cấu hình motion detection
- Xử lý interrupt từ IMU

#### 3. Kết Nối BLE với OBD2
- Kết nối với vgate iCar Pro (BLE 4.0)
- Đọc dữ liệu OBD2: IGN, RPM, tốc độ, nhiên liệu
- Xử lý lỗi kết nối và reconnect

#### 4. Điều Khiển UART với Modem
- Gửi/nhận AT commands với SIM7600CE-T
- Quản lý kết nối 4G/LTE và GNSS tích hợp
- Nhận dữ liệu GNSS qua `AT+CGNSTST`

#### 5. Đo Điện Áp Ắc Quy
- ADC đọc điện áp ắc quy
- Quyết định chuyển nguồn (ắc quy ↔ pin)

#### 6. Điều Khiển Mạch LVD
- GPIO điều khiển relay/MOSFET
- Chuyển nguồn tự động
- Điều khiển charger (IP2312)

#### 7. Quản Lý Deep Sleep
- Deep sleep khi đỗ xe
- Wake up từ timer hoặc interrupt
- Lưu trạng thái vào RTC memory

### GPIO Mapping

Xem chi tiết trong file: [`part-04-power-management-gpio.md`](../../03-firmware/part-04-power-management-gpio.md)

### Lưu Ý Khi Chọn Board

#### 1. USB-C
- Chọn board có USB-C (dễ cắm, ESP32-S3 thường dùng USB-C)
- Tránh board chỉ có micro-USB (khó cắm)

#### 2. USB-to-UART Chip
- Kiểm tra có CP2102 hoặc CH340 USB-to-UART chip
- Hoặc ESP32-S3 có native USB support (không cần USB-to-UART)

#### 3. Pin Header
- Nên chọn board có pin header sẵn (dễ breadboard và debug)
- Tránh board không có pin header (khó kết nối)

#### 4. Flash Size
- Chọn ít nhất 4MB Flash (đủ cho firmware và OTA)
- 8MB hoặc 16MB nếu cần nhiều không gian

### Nơi Mua Hàng

#### Trên Shopee/Lazada VN:
- Tìm: "ESP32-S3 DevKit", "ESP32-S3 development board"
- Giá: ~100,000–200,000 VNĐ
- Lưu ý: Chọn board chính hãng (Espressif) hoặc clone chất lượng tốt

#### Cửa Hàng Linh Kiện:
- Chipdientu.com.vn
- DKE.vn
- Linhkienfpt.vn

### Tài Liệu Tham Khảo

- **Datasheet**: ESP32-S3 Technical Reference Manual
- **Getting Started**: ESP-IDF Programming Guide
- **Arduino Core**: ESP32 Arduino Core
- **Examples**: esp-idf/examples

### Kết Luận

**ESP32-S3 được chọn** vì:
- ✅ BLE 5.0 tích hợp → kết nối OBD2 dễ dàng
- ✅ Dễ phát triển → phù hợp đồ án
- ✅ Chi phí thấp → rẻ hơn STM32 30–50%
- ✅ Bộ nhớ lớn → đủ cho xử lý phức tạp
- ✅ Tiêu thụ chấp nhận được → đủ cho pin 5000 mAh
- ✅ Thời gian phát triển ngắn → quan trọng cho đồ án

**STM32L4 phù hợp hơn nếu:**
- Yêu cầu tiêu thụ cực thấp là ưu tiên số 1
- Ứng dụng công nghiệp yêu cầu độ tin cậy cao
- Team có kinh nghiệm với STM32


