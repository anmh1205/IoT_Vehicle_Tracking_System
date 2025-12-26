## PHẦN III: LỰA CHỌN GIẢI PHÁP PHẦN CỨNG

### III.1 Thành Phần Chính và Tiêu Chí Chọn

#### III.1.1 Cảm Biến IMU: **LIS3DH**

**Đặc Tính:**

- Cảm biến gia tốc 3 trục, low-power
- Điện áp hoạt động: 1.8–3.6 V
- Giao tiếp: I2C hoặc SPI
- Có chế độ **wake-up interrupt** với ngưỡng điều chỉnh
- Tiêu thụ ở chế độ low-power: μA (siêu thấp)

**Lý Do Chọn:**

- Hỗ trợ motion detection sẵn (không cần ESP32 canh liên tục)
- Cho phép cấu hình ngưỡng gia tốc (0.1–0.2 g) để tránh báo giả
- Rất tiết kiệm năng lượng, phù hợp cho hệ thống battery-powered
- Phổ biến, giá thành hợp lý, nhiều thư viện hỗ trợ

**Chức Năng:**

- Phát hiện chuyển động khi xe bị rung, kéo, cẩu
- Phát tín hiệu interrupt qua chân INT → GPIO ESP32
- Đánh thức ESP32 từ deep sleep mà không cần ESP32 chạy liên tục

#### III.1.2 So Sánh MCU: STM32 vs ESP32-S3

Để lựa chọn vi điều khiển phù hợp cho hệ thống tracker, cần đánh giá dựa trên các tiêu chí cụ thể của ứng dụng:

| Tiêu Chí                   | STM32 (STM32L4)            | ESP32-S3                  | Đánh Giá                                           |
| -------------------------- | -------------------------- | ------------------------- | -------------------------------------------------- |
| **Deep Sleep Current**     | ~1–3 μA (STOP2 mode)       | ~10–15 μA (deep sleep)    | ⭐⭐⭐⭐⭐ STM32 thấp hơn 3–5 lần                  |
| **Wakeup từ GPIO**         | ✅ Hỗ trợ (EXTI)           | ✅ Hỗ trợ (EXT0/EXT1)     | ⭐⭐⭐⭐ Cả hai đều đáp ứng                        |
| **UART/AT Commands**       | ✅ Nhiều UART (3–8)        | ✅ Nhiều UART (3)         | ⭐⭐⭐⭐ Đủ cho modem A7600                        |
| **ADC (đo U_batt)**        | ✅ 12-bit ADC              | ✅ 12-bit ADC             | ⭐⭐⭐⭐ Tương đương                               |
| **I2C (LIS3DH)**           | ✅ I2C                     | ✅ I2C                    | ⭐⭐⭐⭐ Tương đương                               |
| **Bộ nhớ RAM**             | 64–320 KB (tùy dòng)       | 512 KB SRAM               | ⭐⭐⭐ ESP32-S3 nhiều hơn                          |
| **Flash**                  | 64 KB–2 MB (on-chip)       | 4–16 MB (external)        | ⭐⭐⭐ ESP32-S3 linh hoạt hơn                      |
| **WiFi/Bluetooth**         | ❌ Cần module ngoài        | ✅ Tích hợp sẵn           | ⭐⭐⭐⭐⭐ ESP32-S3 có lợi (BLE 5.0)              |
| **BLE Support**            | ⚠️ STM32WB (riêng)         | ✅ BLE 5.0 native         | ⭐⭐⭐⭐⭐ ESP32-S3 tốt hơn                        |
| **Chi phí**                | ~150,000–300,000 VNĐ       | ~100,000–250,000 VNĐ      | ⭐⭐⭐⭐ ESP32-S3 rẻ hơn                           |
| **Độ phức tạp phát triển** | ⚠️ Cao (STM32 HAL/CubeMX)  | ✅ Thấp (Arduino/ESP-IDF) | ⭐⭐⭐⭐⭐ ESP32-S3 dễ hơn                          |
| **Cộng đồng/Tài liệu**     | ⭐⭐⭐⭐ Tốt (công nghiệp) | ⭐⭐⭐⭐⭐ Rất tốt (IoT)  | ⭐⭐⭐⭐⭐ ESP32-S3 phong phú hơn                   |
| **Thời gian phát triển**   | ⚠️ Lâu hơn                 | ✅ Nhanh hơn              | ⭐⭐⭐⭐⭐ ESP32-S3 nhanh hơn                      |

**Phân Tích Chi Tiết:**

**1. Tiêu Thụ Năng Lượng:**

- **STM32L4**: Deep sleep (STOP2) tiêu thụ **1–3 μA**, thấp hơn ESP32 3–5 lần. Đây là ưu điểm lớn cho ứng dụng battery-powered.
- **ESP32**: Deep sleep tiêu thụ **10–15 μA**, vẫn chấp nhận được cho pin 15,000 mAh (hoạt động 2–3 tháng với heartbeat 10–30 phút).

**2. Wakeup từ IMU (LIS3DH):**

- Cả hai đều hỗ trợ wakeup từ GPIO interrupt → **không có sự khác biệt đáng kể**.

**3. Xử Lý AT Commands (A7600CE‑T):**

- Cả hai đều có đủ UART và khả năng xử lý AT commands → **tương đương**.

**6. Kết Nối OBD2 BLE:**

- **ESP32-S3**: Hỗ trợ **BLE 5.0** → kết nối trực tiếp với OBD2 adapter vgate iCar Pro (BLE 4.0)
- **STM32WB**: Có BLE nhưng ESP32-S3 có BLE 5.0 tốt hơn, cộng đồng lớn hơn
- → **ESP32-S3 có lợi thế** cho việc đọc dữ liệu xe qua OBD2 BLE

**4. Phát Triển và Bảo Trì:**

- **STM32**: Yêu cầu kiến thức sâu về HAL, CubeMX, có thể phức tạp hơn cho đồ án sinh viên.
- **ESP32**: Hỗ trợ Arduino IDE, ESP-IDF, cộng đồng lớn, nhiều ví dụ → **phù hợp hơn cho đồ án**.

**5. Chi Phí:**

- ESP32 rẻ hơn 30–50% so với STM32L4 tương đương.

**Kết Luận và Lựa Chọn:**

Mặc dù **STM32L4 có ưu thế về tiêu thụ năng lượng** (1–3 μA vs 10–15 μA), nhưng với pin backup 15,000 mAh và chiến lược deep sleep + heartbeat, **sự khác biệt này không đủ để bù đắp** các nhược điểm:

- ✅ **ESP32-S3 được chọn** vì:

  1. **Hỗ trợ BLE 5.0**: Kết nối trực tiếp với OBD2 adapter vgate iCar Pro (BLE 4.0) → đọc dữ liệu xe chính xác (IGN, RPM, tốc độ, v.v.)
  2. **Dễ phát triển**: Arduino/ESP-IDF, cộng đồng lớn → phù hợp đồ án
  3. **Chi phí thấp**: Rẻ hơn 30–50%
  4. **Bộ nhớ lớn**: 512 KB SRAM đủ cho xử lý AT commands, MQTT, OBD2
  5. **Tiêu thụ vẫn chấp nhận được**: 10–15 μA deep sleep → đủ cho 2–3 tháng với pin 15,000 mAh
  6. **Thời gian phát triển ngắn**: Quan trọng cho đồ án có deadline
  7. **BLE 5.0 tốt hơn**: Hỗ trợ BLE tốt hơn ESP32 classic, tương thích với vgate iCar Pro

- ⚠️ **STM32L4 phù hợp hơn nếu**:
  - Yêu cầu tiêu thụ cực thấp là ưu tiên số 1 (ví dụ: pin nhỏ hơn, cần hoạt động >6 tháng)
  - Ứng dụng công nghiệp yêu cầu độ tin cậy cao
  - Team có kinh nghiệm với STM32

#### III.1.3 Vi Điều Khiển: **ESP32-S3** (Lựa Chọn)

**Mã Cụ Thể:**

- **Module**: ESP32-S3-WROOM-1 (4–16MB Flash)
- **Board**: ESP32-S3-DevKitC-1 hoặc ESP32-S3-DevKitM-1
- **Giá**: ~100,000–200,000 VNĐ

**Đặc Tính:**

- **CPU**: Dual-core Xtensa LX7 @ 240 MHz (32-bit RISC-V)
- **RAM**: 512 KB SRAM
- **Flash**: 4–16 MB (on-board, tùy variant)
- **WiFi**: 802.11 b/g/n (không sử dụng trong tracker này)
- **Bluetooth**: BLE 5.0
  - **BLE 5.0**: Kết nối với OBD2 adapter vgate iCar Pro (BLE 4.0 compatible)
  - **BLE Central/Peripheral**: Hỗ trợ đầy đủ BLE stack
- **GPIO**: 45 chân (nhiều hơn ESP32 classic)
- **UART**: 3 cổng (đủ cho modem A7600CE‑T)
- **I2C**: 2 cổng (cho LIS3DH)
- **SPI**: 3 cổng
- **ADC**: 12-bit, 20 kênh (đo điện áp ắc quy)
- **Deep Sleep**: ~10–15 μA (với external wakeup)
- **Active (BLE)**: ~20–40 mA
- **Active (WiFi)**: ~80–240 mA

**Lý Do Chọn:**

1. **Hỗ trợ BLE 5.0**: Kết nối trực tiếp với OBD2 adapter vgate iCar Pro (BLE 4.0) → đọc dữ liệu xe (IGN, RPM, tốc độ, nhiên liệu, mã lỗi)
2. **Đủ mạnh**: Dual-core 240 MHz, 512 KB RAM → xử lý đồng thời OBD2 + modem + IMU
3. **Nhiều UART**: 3 cổng → đủ cho modem A7600CE‑T và các thiết bị khác
4. **Hỗ trợ external wakeup**: EXT0/EXT1 từ GPIO → đánh thức từ deep sleep bằng IMU interrupt
5. **ADC 12-bit**: Đo chính xác điện áp ắc quy
6. **Thư viện phong phú**: Arduino BLE, ESP32 BLE, cộng đồng lớn
7. **Chi phí thấp**: Rẻ hơn STM32 30–50%
8. **Dễ phát triển**: Arduino IDE, ESP-IDF → phù hợp đồ án
9. **Tiêu thụ chấp nhận được**: Deep sleep 10–15 μA → đủ cho pin 15,000 mAh hoạt động 2–3 tháng
10. **BLE 5.0 tốt hơn**: Hỗ trợ BLE tốt hơn ESP32 classic, tương thích ngược với BLE 4.0

**Chức Năng:**

- Xử lý logic chính (3 chế độ: lái xe, đỗ, cảnh báo)
- Giao tiếp I2C với LIS3DH (IMU)
- Kết nối BLE với OBD2 adapter vgate iCar Pro
- Điều khiển UART với modem 4G (A7600CE‑T)
- Đo điện áp ắc quy qua ADC
- Điều khiển mạch LVD (relay/MOSFET) để tách tải
- Quản lý deep sleep và wakeup

**Lưu Ý:**

- Chọn board có USB-C (dễ cắm, ESP32-S3 thường dùng USB-C)
- Kiểm tra có CP2102 hoặc CH340 USB-to-UART chip
- Nên chọn board có pin header sẵn (dễ breadboard và debug)
- ESP32-S3 có native USB support (có thể không cần USB-to-UART)

#### III.1.4 OBD2 BLE Adapter: **vgate iCar Pro (BLE 4.0)**

**Đặc Tính:**

- **Giao thức**: Bluetooth Low Energy (BLE) 4.0
- **Chuẩn OBD2**: ELM327 protocol qua BLE
- **Kết nối**: BLE 4.0 → ESP32-S3 (BLE 5.0, tương thích ngược)
- **Giao tiếp**: AT commands (ELM327 commands) qua BLE GATT characteristics
- **Tiêu thụ**: ~5–15 mA khi active (thấp hơn Bluetooth Classic, chỉ khi IGN ON)
- **Giá**: ~150,000–300,000 VNĐ (tùy chất lượng)

**Lý Do Chọn:**

- **Bán sẵn, phổ biến**: Dễ mua, giá hợp lý, tương thích tốt
- **Kết nối không dây**: Không cần dây nối phức tạp đến OBD2 port
- **Tương thích ESP32-S3**: ESP32-S3 hỗ trợ BLE 5.0 → tương thích ngược với BLE 4.0
- **Tiêu thụ thấp hơn**: BLE tiêu thụ ít hơn Bluetooth Classic (~5–15 mA vs ~10–30 mA)
- **Đọc nhiều dữ liệu**: IGN status, RPM, tốc độ, nhiên liệu, mã lỗi (DTC), v.v.
- **Chính xác hơn**: Đọc IGN status từ ECU chính xác hơn đo điện áp
- **Kết nối nhanh hơn**: BLE kết nối nhanh hơn Bluetooth Classic (~1–3 giây vs 2–5 giây)

**Chức Năng:**

- Kết nối với OBD2 port của xe (16-pin OBD2 connector)
- Đọc dữ liệu từ ECU qua BLE GATT characteristics
- Truyền dữ liệu đến ESP32-S3 qua BLE
- Cung cấp thông tin: IGN status, RPM, tốc độ, nhiên liệu, nhiệt độ động cơ, mã lỗi

**Lưu Ý:**

- Chọn adapter **vgate iCar Pro** hoặc tương thích BLE 4.0+
- Tránh adapter giả mạo (có thể không hoạt động đúng)
- Chỉ bật BLE khi IGN ON để tiết kiệm pin
- Cần xử lý lỗi khi adapter không kết nối được (fallback về đo điện áp)
- BLE GATT characteristics cần được map đúng với ELM327 commands

**Vấn Đề Kết Nối BLE Khi Deep Sleep:**

**1. Deep Sleep và BLE Disconnect:**

- **Khi ESP32-S3 deep sleep**: BLE sẽ **bị ngắt kết nối** hoàn toàn
- **vgate iCar Pro adapter**: Vẫn hoạt động, chờ kết nối mới (không tự tắt)
- **Kết quả**: Mỗi lần ESP32-S3 wake up, cần **kết nối lại** với vgate iCar Pro

**2. Thời Gian Kết Nối Lại:**

- **Pairing lần đầu**: 3–10 giây (nếu chưa có trong danh sách paired devices)
- **Reconnect (đã paired)**: 1–3 giây (nếu đã lưu BLE address trong cache)
- **Tối ưu**: Lưu BLE address (MAC address) của vgate iCar Pro → reconnect nhanh hơn

**3. Chiến Lược Kết Nối:**

**Khi Xe Chạy (IGN ON):**

- ESP32-S3 wake up → Kết nối BLE với vgate iCar Pro (1–3 giây)
- Đọc IGN status từ OBD2 (xác nhận IGN ON)
- Đọc các thông số khác (RPM, tốc độ, nhiên liệu) định kỳ
- **Giữ kết nối** trong suốt thời gian IGN ON
- Không deep sleep khi IGN ON → chỉ light sleep nếu cần

**Khi Xe Đỗ (IGN OFF):**

- Đọc IGN status từ OBD2 lần cuối → xác nhận IGN OFF
- **Ngắt kết nối BLE** trước khi deep sleep
- ESP32-S3 deep sleep → tiết kiệm năng lượng
- **Không cần kết nối BLE** khi đỗ (không đọc OBD2)
- **Chỉ cần IMU (LIS3DH)** để phát hiện chuyển động:
  - IMU đủ để phát hiện rung, kéo, cẩu xe
  - Không cần OBD2 để phát hiện chuyển động vật lý
  - Tiết kiệm năng lượng đáng kể (~7,000 lần so với giữ BLE)

**4. Xử Lý Lỗi Kết Nối:**

- **Timeout kết nối**: Nếu không kết nối được sau 10 giây → fallback về đo điện áp
- **Mất kết nối giữa chừng**: Retry 2–3 lần, nếu vẫn lỗi → fallback
- **ELM327 không phản hồi**: Timeout sau 5 giây → fallback
- **Fallback**: Dùng phương pháp đo điện áp ắc quy để phát hiện IGN (kém chính xác hơn nhưng vẫn hoạt động)

**5. Tối Ưu Hóa:**

- **Lưu BLE address**: Lưu BLE address (MAC) của vgate iCar Pro vào flash → reconnect nhanh hơn
- **Chỉ kết nối khi cần**: Chỉ kết nối khi IGN ON, không giữ kết nối khi đỗ
- **Không cần OBD2 khi đỗ**: IMU đủ để phát hiện chuyển động → tiết kiệm năng lượng
- **Đọc batch**: Đọc nhiều thông số cùng lúc (IGN, RPM, tốc độ) → giảm số lần giao tiếp
- **Cache dữ liệu**: Lưu dữ liệu OBD2 vào RAM → có thể dùng khi mất kết nối tạm thời
- **BLE kết nối nhanh hơn**: BLE kết nối nhanh hơn Bluetooth Classic (~1–3 giây vs 2–5 giây)

**6. Lợi Ích của Thiết Kế Giấu Thiết Bị:**

- **Bảo mật**: Tracker giấu ở nơi khác → khó bị phát hiện/tháo
- **Linh hoạt**: Có thể đặt tracker ở vị trí tối ưu (gần ắc quy, tránh nhiệt)
- **Kết nối không dây**: Bluetooth không cần dây → dễ lắp đặt
- **OBD2 adapter**: Cắm vào cổng OBD2 (dễ thấy nhưng không ảnh hưởng tracker chính)

**Kết Luận:**

- **Deep sleep sẽ ngắt BLE** → cần reconnect mỗi lần wake up
- **Thời gian reconnect: 1–3 giây** (nhanh hơn Bluetooth Classic)
- **Chiến lược**: Chỉ kết nối khi IGN ON, không cần kết nối khi đỗ
- **IMU đủ để phát hiện chuyển động**: Không cần OBD2 khi đỗ → tiết kiệm năng lượng
- **Fallback**: Đo điện áp nếu không kết nối được OBD2
- **Thiết kế hợp lý**: Tracker giấu + OBD2 adapter riêng → bảo mật và linh hoạt

**Bảng Tóm Tắt Khi Nào Cần BLE OBD2:**

| Trạng Thái          | Cần BLE?        | Lý Do                                                        |
| ------------------- | --------------- | ------------------------------------------------------------ |
| **IGN ON (Lái xe)** | ✅ **Có**       | Đọc dữ liệu OBD2 (RPM, tốc độ, nhiên liệu)                   |
| **IGN OFF (Đỗ xe)** | ❌ **Không**    | Không cần dữ liệu OBD2, chỉ cần IMU để phát hiện chuyển động |
| **Motion Detected** | ⚠️ **Tùy chọn** | Có thể kết nối để xác nhận IGN, hoặc chỉ dùng IMU + GPS      |

#### III.1.5 Modem 4G/LTE + GNSS: **SIMCom A7600CE‑T**

**Đặc Tính:**

- Giao tiếp: UART (usb)
- AT commands
- Hỗ trợ MQTT, HTTP
- Tích hợp **GNSS/GPS** (lấy vị trí trực tiếp từ modem, không cần GPS rời)
- Tiêu thụ: 50–100 mA khi active, <1 mA khi sleep

**Lý Do Chọn:**

- Chuẩn công nghiệp cho telematics
- Giao tiếp đơn giản qua UART
- Có thể bật/tắt bằng GPIO để tiết kiệm điện
- 4G/LTE cho tracking + **GNSS tích hợp** giúp giảm số lượng module phần cứng

**Chức Năng:**

- Kết nối mạng cellular
- Lấy vị trí GNSS/GPS và truyền dữ liệu/cảnh báo lên server
- Có thể sleep hoặc tắt điện để tiết kiệm pin

#### III.1.6 Pin Dự Phòng: **1 Cell 21700 Li-ion 5000 mAh**

**Thông Số:**

- Loại: Li-ion 21700
- Dung lượng: 5000 mAh @ 3.7 V ≈ 18.5 Wh
- Cấu hình: 1 cell đơn
- Điện áp: 3.0–4.2 V (nominal 3.7 V)

**Lý Do Chọn:**

- Đơn giản, chi phí thấp (chỉ 1 cell)
- Dung lượng đủ cho backup khi ắc quy yếu
- Cell 21700 phổ biến, giá tốt, dung lượng cao
- Không cần BMS phức tạp (chỉ cần protection board đơn giản)
- Dễ lắp đặt và bảo trì

**Chức Năng:**

- Cung cấp nguồn backup khi ắc quy xe yếu (< 12 V)
- Được sạc khi xe chạy (IGN ON) và nguồn ắc quy ổn định
- Không sạc khi xe không chạy (IGN OFF) để bảo vệ ắc quy

#### III.1.7 Mạch Low Voltage Disconnect (LVD) và Quản Lý Nguồn

**Nguyên Lý:**

- Giám sát điện áp ắc quy (qua ADC ESP32)
- **Khi xe chạy (IGN ON)**:
  - Tracker dùng nguồn trực tiếp từ ắc quy
  - Sạc pin 21700 (nếu U_batt > 12 V)
- **Khi xe không chạy (IGN OFF)**:
  - Tracker dùng ắc quy (không sạc pin)
  - Nếu U_batt < 12 V: Chuyển sang pin + gửi cảnh báo
- **Hysteresis**: > 12.2 V → chuyển lại ắc quy (tránh dao động)

**Logic Chuyển Nguồn:**

| Trạng Thái          | IGN | U_batt   | Nguồn Tracker | Sạc Pin  | Cảnh Báo                 |
| ------------------- | --- | -------- | ------------- | -------- | ------------------------ |
| Xe chạy bình thường | ON  | > 12 V   | Ắc quy        | ✅ Có    | -                        |
| Xe đỗ bình thường   | OFF | > 12 V   | Ắc quy        | ❌ Không | -                        |
| Ắc quy yếu          | OFF | < 12 V   | Pin 21700     | ❌ Không | ✅ Cảnh báo chuyển nguồn |
| Ắc quy phục hồi     | OFF | > 12.2 V | Ắc quy        | ❌ Không | ✅ Cảnh báo chuyển lại   |

**Lý Do Chọn:**

- Bảo vệ ắc quy khỏi rút cạn quá mức → đảm bảo khả năng đề nổ
- Tự động chuyển nguồn khi ắc quy yếu
- Gửi cảnh báo để người dùng biết trạng thái nguồn
- Tự động, không cần can thiệp từ người dùng

**Chức Năng:**

- Tách tải tự động dựa trên điện áp và trạng thái IGN
- Chuyển giữa ắc quy và pin dự phòng
- Điều khiển sạc pin (chỉ khi IGN ON)
- Gửi cảnh báo khi chuyển nguồn (qua modem A7600CE‑T)

#### III.1.8 Mạch Buck DC-DC: **12 V → 5 V**

**Yêu Cầu:**

- Input: 12 V DC từ ắc quy
- Output: **5 V** (cho ESP32, modem logic, và module sạc IP2312)
- Dòng tối đa: ≥ 3.5 A (đủ cho tracker + sạc pin 3A)
- Hiệu suất cao (>85%)
- IC ví dụ: LM2596, MP1584, MT3608, XL6009

**Lý Do:**

- Giảm điện áp 12 V xuống 5 V cho các module logic
- Module sạc IP2312 nhận input 5V → không cần buck riêng cho sạc
- Đơn giản hóa thiết kế (chỉ cần 1 buck converter 5V)

**Phân Phối Nguồn:**

- 5V → ESP32 (qua LDO 3.3V hoặc onboard regulator)
- 5V → Modem A7600CE‑T (logic power)
- 5V → Module sạc IP2312 → Pin 21700 (4.2V)

#### III.1.9 Mạch Sạc và Bảo Vệ Pin 21700: **Module IP2312 (3A)**

**Module Sạc: IP2312 Charger Module (Type-C, 3A)**

**Đặc Tính:**

- **IC**: IP2312 (Injoinic)
- **Dòng sạc**: **3 A** (3000 mA) - có thể điều chỉnh
- **Điện áp vào**: 5 V (USB Type-C hoặc 5V từ buck converter)
- **Điện áp ra**: 4.2 V (Li-ion standard)
- **Hiệu suất**: ~85–90%
- **Tính năng**: Tự ngắt khi đầy, bảo vệ quá dòng, quá nhiệt, reverse protection

**Lý Do Chọn:**

- **Dòng sạc cao (3A)**: Sạc pin 5000 mAh nhanh hơn (~2 giờ thay vì 6 giờ với 1A)
- **Phổ biến ở Việt Nam**: Dễ mua trên Shopee, Lazada, cửa hàng linh kiện
- **Module sẵn có**: Không cần thiết kế PCB riêng, tiết kiệm thời gian
- **Type-C**: Dễ sử dụng, hiện đại
- **Tích hợp bảo vệ**: Bảo vệ quá dòng, quá nhiệt tự động

#### III.1.10 Thiết Kế Mạch Chuyển Đổi Nguồn (Power Path Management)

**Yêu Cầu:**

- Chuyển đổi tự động giữa ắc quy (12V) và pin backup (3.7V)
- Điều khiển sạc pin theo trạng thái IGN
- Low Voltage Disconnect (LVD) khi ắc quy < 12V
- Hysteresis để tránh dao động (12.0V OFF → 12.2V ON)

**Giải Pháp: Module + MOSFET (Giải Pháp A)**

**1. Power Path Management: MOSFET + Diode OR**

**Thành Phần:**

- **Q1, Q2**: IRF9540N (P-MOSFET, Vds = -100V, Id = -19A)
- **D1, D2**: 1N5822 (Schottky Diode, 3A, 40V) - backup
- **Gate Driver**: 2N7002 (N-MOSFET) hoặc transistor để điều khiển

**Nguyên Lý:**

- Q1 điều khiển nguồn từ ắc quy (Buck output)
- Q2 điều khiển nguồn từ pin (Boost output)
- ESP32 GPIO điều khiển gate Q1, Q2
- Diode OR (D1, D2) làm backup nếu MOSFET lỗi
- Logic: Ưu tiên ắc quy, tự động chuyển sang pin khi ắc quy mất

**Sơ Đồ Kết Nối:**

```
Ắc Quy (12V) ── Buck (12V→5V) ──┬── Q1 (P-MOS) ──┬── 5V Rail
                                  │                │
                                  └── Gate Control │
                                                   │
Pin (3.7V) ─── Boost (3.7V→5V) ──┬── Q2 (P-MOS) ──┘
                                  │
                                  └── Gate Control

Diode OR Backup:
D1 (Schottky) từ Buck ──┬── 5V Rail
D2 (Schottky) từ Boost ─┘
```

**Lợi Ích:**

- ✅ **Dễ mua ở VN**: MOSFET và diode phổ biến, dễ tìm
- ✅ **Giá rẻ**: ~10,000–15,000 VNĐ cho MOSFET + diode
- ✅ **Đơn giản**: Dễ hiểu, dễ debug
- ✅ **Linh hoạt**: Có thể điều khiển bằng firmware

**Nhược Điểm:**

- ⚠️ **Cần firmware**: Cần logic điều khiển trong ESP32
- ⚠️ **Tổn hao**: MOSFET có Rds(on) ~0.2Ω → tổn hao nhỏ
- ⚠️ **Cần gate driver**: Có thể cần transistor để điều khiển P-MOS

**2. Buck Converter: IC LM2596 + Linh Kiện Phụ Trợ**

**IC: LM2596-5.0 (Fixed 5V Output) hoặc LM2596-ADJ (Adjustable)**

**Đặc Tính:**

- **Input**: 7–40 V
- **Output**: 5 V @ 3 A (fixed) hoặc 1.23–37 V (adjustable)
- **Hiệu suất**: ~85%
- **Package**: TO-220-5 hoặc DDPAK
- **Giá IC**: ~5,000–10,000 VNĐ

**Linh Kiện Phụ Trợ:**

- **Inductor**: 100 µH, 3–5 A (L1) - ~10,000–15,000 VNĐ
- **Input Capacitor**: 100 µF, 50 V (C1) - ~3,000 VNĐ
- **Output Capacitor**: 220 µF, 16 V (C2) - ~3,000 VNĐ
- **Diode**: 1N5822 (Schottky, 3A, 40V) - ~2,000 VNĐ
- **Feedback Resistor**: R1 = 1 kΩ, R2 = 3.3 kΩ (nếu dùng ADJ) - ~1,000 VNĐ
- **Bootstrap Capacitor**: 10 µF, 16 V (C3) - ~1,000 VNĐ

**Lý Do Chọn:**

- ✅ **Phổ biến ở VN**: IC và linh kiện dễ mua
- ✅ **Thiết kế PCB**: Có thể tích hợp vào PCB tự vẽ
- ✅ **Giá rẻ**: IC ~5,000–10,000 VNĐ + linh kiện ~20,000 VNĐ
- ✅ **Đủ công suất**: 3A đủ cho tracker + sạc pin
- ✅ **Kích thước nhỏ**: Tích hợp vào PCB → gọn hơn module

**3. Boost Converter: IC MT3608 + Linh Kiện Phụ Trợ**

**IC: MT3608 (Step-Up Converter)**

**Đặc Tính:**

- **Input**: 2–24 V
- **Output**: 5–28 V (adjustable) @ 2 A
- **Hiệu suất**: ~85%
- **Package**: SOT23-6 hoặc SOP-8
- **Giá IC**: ~3,000–8,000 VNĐ

**Linh Kiện Phụ Trợ:**

- **Inductor**: 22 µH, 2–3 A (L1) - ~8,000–12,000 VNĐ
- **Input Capacitor**: 100 µF, 16 V (C1) - ~2,000 VNĐ
- **Output Capacitor**: 220 µF, 16 V (C2) - ~3,000 VNĐ
- **Feedback Resistor**: R1 = 10 kΩ, R2 = 10 kΩ (cho 5V output) - ~1,000 VNĐ
- **Bootstrap Capacitor**: 10 µF, 16 V (C3) - ~1,000 VNĐ

**Lý Do Chọn:**

- ✅ **Phổ biến ở VN**: IC và linh kiện dễ mua
- ✅ **Thiết kế PCB**: Có thể tích hợp vào PCB tự vẽ
- ✅ **Giá rẻ**: IC ~3,000–8,000 VNĐ + linh kiện ~15,000 VNĐ
- ✅ **Đủ công suất**: 2A đủ cho tracker khi dùng pin
- ✅ **Kích thước nhỏ**: Package SOT23-6 → rất nhỏ gọn

**4. Low Voltage Disconnect (LVD): LM393 Comparator**

**IC: LM393 (Dual Comparator)**

**Đặc Tính:**

- **Chức năng**: So sánh điện áp
- **Điện áp hoạt động**: 2–36 V
- **Output**: Open-drain (cần pull-up)
- **Giá**: ~3,000–8,000 VNĐ

**Sơ Đồ:**

```
U_batt ── Voltage Divider (R1=10k, R2=2.2k) ── LM393 (-)
                                                      │
Reference (TL431, 2.16V) ─────────────────────────── LM393 (+)
                                                      │
                                                      └── GPIO ESP32
```

**Tính Toán:**

- Voltage divider: R1 = 10 kΩ, R2 = 2.2 kΩ
- V_ref = U_batt × R2/(R1+R2) = U_batt × 0.18
- Khi U_batt = 12 V → V_ref = 2.16 V
- Comparator reference: 2.16 V (TL431)

**Hysteresis:**

- R3, R4 feedback để tạo hysteresis
- 12.0 V (OFF) → 12.2 V (ON)
- Tránh dao động khi điện áp gần ngưỡng

**5. Charger: IC IP2312 + Linh Kiện Phụ Trợ**

**IC: IP2312 (Injoinic) - Li-ion Charger**

**Đặc Tính:**

- **Input**: 4.5–5.5 V (USB Type-C hoặc 5V từ buck)
- **Output**: 4.2 V (Li-ion standard)
- **Dòng sạc**: 3 A (có thể điều chỉnh bằng resistor)
- **Package**: QFN-16 hoặc SOP-16
- **Giá IC**: ~10,000–20,000 VNĐ

**Linh Kiện Phụ Trợ:**

- **Input Capacitor**: 10 µF, 10 V (C1) - ~1,000 VNĐ
- **Output Capacitor**: 22 µF, 10 V (C2) - ~1,000 VNĐ
- **Charge Current Resistor**: R_ISET = 0.1 Ω (cho 3A) - ~1,000 VNĐ
- **Enable Resistor**: R_EN = 10 kΩ (pull-up) - ~500 VNĐ
- **Status LED Resistor**: R_LED = 1 kΩ (nếu dùng LED) - ~500 VNĐ

**Điều Khiển Charger: GPIO ESP32**

**Kết Nối:**

```
ESP32 GPIO ── R (10kΩ) ── IP2312 EN Pin
```

**Logic:**

- GPIO HIGH → Charger enabled (sạc pin)
- GPIO LOW → Charger disabled (không sạc)

**6. Kiến Trúc Tổng Thể**

```
┌─────────────────────────────────────────────────────────┐
│                    NGUỒN ĐẦU VÀO                        │
├─────────────────────────────────────────────────────────┤
│   Ắc Quy Xe (12V)          Pin 21700 (3.7V)            │
│         │                        │                      │
│    ┌────▼────┐              ┌────▼────┐                │
│    │ LM2596  │              │ MT3608  │                │
│    │ IC +    │              │ IC +    │                │
│    │ Phụ Trợ │              │ Phụ Trợ │                │
│    │12V→5V   │              │3.7V→5V  │                │
│    └────┬────┘              └────┬────┘                │
│         │                        │                      │
│         └────────┬───────────────┘                      │
│                  │                                      │
│         ┌────────▼────────┐                            │
│         │ MOSFET Switch  │                            │
│         │ Q1 (Ắc quy)     │                            │
│         │ Q2 (Pin)        │                            │
│         │ + Diode OR      │                            │
│         └────────┬────────┘                            │
│                  │                                      │
│         ┌────────▼────────┐                            │
│         │  5V Rail        │                            │
│         └────────┬────────┘                            │
│                  │                                      │
│    ┌─────────────┼─────────────┐                      │
│    │             │             │                      │
│ ┌──▼──┐    ┌─────▼─────┐  ┌───▼───┐                   │
│ │LDO  │    │  Modem    │  │IP2312 │                   │
│ │5→3.3│    │  A7600    │  │IC +   │                   │
│ │IC   │    │           │  │Phụ Trợ│                   │
│ └──┬──┘    └───────────┘  └───┬───┘                   │
│    │                           │                        │
│ ┌──▼──┐                    ┌──▼──┐                    │
│ │ESP32│                    │Pin  │                    │
│ └─────┘                    └─────┘                    │
│                                                         │
│ ┌──────────────────────────────────────┐               │
│ │  Điều Khiển (ESP32 GPIO + ADC)      │               │
│ │  - Đọc IGN (GPIO hoặc OBD2)         │               │
│ │  - Đọc U_batt (ADC)                 │               │
│ │  - Điều khiển Q1, Q2 (Power MUX)    │               │
│ │  - Điều khiển Charger EN            │               │
│ │  - Đọc LVD Status                   │               │
│ └──────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

**7. Logic Điều Khiển**

**Bảng Trạng Thái:**

| IGN | U_batt   | Power MUX (Q1/Q2) | Charger EN | Cảnh Báo |
| --- | -------- | ----------------- | ---------- | -------- |
| ON  | > 12 V   | Q1=ON, Q2=OFF     | ✅ HIGH    | -        |
| OFF | > 12 V   | Q1=ON, Q2=OFF     | ❌ LOW     | -        |
| OFF | < 12 V   | Q1=OFF, Q2=ON     | ❌ LOW     | ✅ Có    |
| OFF | > 12.2 V | Q1=ON, Q2=OFF     | ❌ LOW     | ✅ Có    |

**Flowchart:**

```
START
  │
  ├─ Đọc IGN (GPIO hoặc OBD2)
  │
  ├─ Đọc U_batt (ADC)
  │
  ├─ IGN = ON?
  │   ├─ YES → Charger_EN = HIGH (sạc pin)
  │   │         Q1 = ON, Q2 = OFF (dùng ắc quy)
  │   │         DONE
  │   │
  │   └─ NO → Charger_EN = LOW (không sạc)
  │            │
  │            ├─ U_batt < 12.0 V?
  │            │   ├─ YES → Q1 = OFF, Q2 = ON (chuyển sang pin)
  │            │   │         Gửi cảnh báo
  │            │   │         DONE
  │            │   │
  │            │   └─ NO → U_batt > 12.2 V?
  │            │            ├─ YES → Q1 = ON, Q2 = OFF (chuyển lại ắc quy)
  │            │            │         Gửi cảnh báo phục hồi
  │            │            │         DONE
  │            │            │
  │            │            └─ NO → Giữ nguyên trạng thái
  │            │                      DONE
```

**8. Lợi Ích Giải Pháp A (IC Rời + MOSFET)**

**Ưu Điểm:**

1. ✅ **Dễ mua ở VN**: IC và linh kiện phụ trợ phổ biến, dễ tìm trên Shopee/Lazada
2. ✅ **Giá rẻ**: ~60,000–90,000 VNĐ (IC rời rẻ hơn module)
3. ✅ **Thiết kế PCB**: Có thể tích hợp tất cả vào PCB tự vẽ → gọn gàng, chuyên nghiệp
4. ✅ **Linh hoạt**: Có thể điều khiển bằng firmware → dễ tùy chỉnh
5. ✅ **Kích thước nhỏ**: IC rời nhỏ hơn module → PCB gọn hơn
6. ✅ **Phù hợp sản xuất**: Thiết kế PCB một lần, sản xuất nhiều bản

**Nhược Điểm:**

1. ⚠️ **Cần firmware**: Cần logic điều khiển trong ESP32
2. ⚠️ **Cần thiết kế PCB**: Phải thiết kế PCB và layout đúng
3. ⚠️ **Tổn hao nhỏ**: MOSFET có Rds(on) ~0.2Ω → tổn hao ~0.05W
4. ⚠️ **Cần gate driver**: Có thể cần transistor để điều khiển P-MOS
5. ⚠️ **Phức tạp hơn**: Cần hiểu datasheet và thiết kế đúng

**9. Danh Sách Linh Kiện Chi Tiết (IC Rời)**

**IC Chính:**

- **LM2596-5.0**: Buck converter IC (TO-220-5) (~5,000–10,000 VNĐ)
- **MT3608**: Boost converter IC (SOT23-6) (~3,000–8,000 VNĐ)
- **IP2312**: Charger IC (QFN-16) (~10,000–20,000 VNĐ)
- **LM393**: Dual comparator (DIP-8 hoặc SOIC-8) (~3,000–8,000 VNĐ)
- **TL431**: Voltage reference (TO-92 hoặc SOT-23) (~2,000–5,000 VNĐ)

**Linh Kiện Buck Converter (LM2596):**

- **L1**: Inductor 100 µH, 3–5 A (~10,000–15,000 VNĐ)
- **C1**: Capacitor 100 µF, 50 V (input) (~3,000 VNĐ)
- **C2**: Capacitor 220 µF, 16 V (output) (~3,000 VNĐ)
- **D1**: Diode 1N5822 (Schottky, 3A, 40V) (~2,000 VNĐ)
- **C3**: Capacitor 10 µF, 16 V (bootstrap) (~1,000 VNĐ)

**Linh Kiện Boost Converter (MT3608):**

- **L1**: Inductor 22 µH, 2–3 A (~8,000–12,000 VNĐ)
- **C1**: Capacitor 100 µF, 16 V (input) (~2,000 VNĐ)
- **C2**: Capacitor 220 µF, 16 V (output) (~3,000 VNĐ)
- **R1, R2**: Resistor 10 kΩ (feedback, 2 cái) (~1,000 VNĐ)
- **C3**: Capacitor 10 µF, 16 V (bootstrap) (~1,000 VNĐ)

**Linh Kiện Charger (IP2312):**

- **C1**: Capacitor 10 µF, 10 V (input) (~1,000 VNĐ)
- **C2**: Capacitor 22 µF, 10 V (output) (~1,000 VNĐ)
- **R_ISET**: Resistor 0.1 Ω (charge current) (~1,000 VNĐ)
- **R_EN**: Resistor 10 kΩ (enable pull-up) (~500 VNĐ)
- **R_LED**: Resistor 1 kΩ (status LED, optional) (~500 VNĐ)

**Linh Kiện Power Path:**

- **Q1, Q2**: IRF9540N P-MOSFET (2 cái) (~10,000 VNĐ)
- **D1, D2**: 1N5822 Schottky Diode (2 cái, backup) (~5,000 VNĐ)
- **Q3, Q4**: 2N7002 N-MOSFET (gate driver, 2 cái) (~3,000 VNĐ)
- **R_G1, R_G2**: Resistor 10 kΩ (gate pull-down, 2 cái) (~1,000 VNĐ)

**Linh Kiện LVD:**

- **R1**: Resistor 10 kΩ (voltage divider) (~500 VNĐ)
- **R2**: Resistor 2.2 kΩ (voltage divider) (~500 VNĐ)
- **R3, R4**: Resistor 100 kΩ (hysteresis feedback, 2 cái) (~1,000 VNĐ)
- **R_PU**: Resistor 10 kΩ (comparator pull-up) (~500 VNĐ)

**Linh Kiện Phụ Trợ:**

- **Capacitor**: 10 µF, 100 µF (decoupling, nhiều giá trị) (~5,000 VNĐ)
- **Resistor**: 1 kΩ, 3.3 kΩ, 10 kΩ (nhiều giá trị) (~3,000 VNĐ)
- **Connector**: Terminal block, header pin (~5,000 VNĐ)

**Tổng Chi Phí:** ~60,000–90,000 VNĐ (rẻ hơn module vì không có PCB sẵn)

**10. Nơi Mua Hàng**

**Trên Shopee/Lazada VN:**

1. **IC LM2596**: Tìm "LM2596 IC", "LM2596-5.0", "buck converter IC"

   - Giá: ~5,000–10,000 VNĐ

2. **IC MT3608**: Tìm "MT3608 IC", "boost converter IC"

   - Giá: ~3,000–8,000 VNĐ

3. **IC IP2312**: Tìm "IP2312 IC", "IP2312 charger IC"

   - Giá: ~10,000–20,000 VNĐ

4. **IC LM393**: Tìm "LM393 IC", "comparator IC"

   - Giá: ~3,000–8,000 VNĐ

5. **IC TL431**: Tìm "TL431 IC", "voltage reference IC"

   - Giá: ~2,000–5,000 VNĐ

6. **MOSFET IRF9540N**: Tìm "IRF9540N", "P-MOSFET"

   - Giá: ~5,000–10,000 VNĐ/cái

7. **Diode 1N5822**: Tìm "1N5822", "Schottky diode 3A"

   - Giá: ~2,000–5,000 VNĐ/cái

8. **Inductor**: Tìm "inductor 100uH 3A", "inductor 22uH 2A"

   - Giá: ~8,000–15,000 VNĐ/cái

9. **Capacitor**: Tìm "capacitor 100uF 50V", "capacitor 220uF 16V"

   - Giá: ~1,000–3,000 VNĐ/cái

10. **Resistor**: Tìm "resistor 10k", "resistor 2.2k", "resistor 0.1 ohm"
    - Giá: ~500–1,000 VNĐ/gói

**Cửa Hàng Linh Kiện VN:**

- **Chipdientu.com.vn**: Linh kiện điện tử
- **DKE.vn**: Điện tử Kỹ Thuật
- **Linhkienfpt.vn**: Linh kiện FPT
- **Linh Kiện Điện Tử 3M**: Cửa hàng linh kiện

**11. Thiết Kế PCB**

**Yêu Cầu:**

- **PCB 2 lớp**: Đủ cho mạch này
- **Kích thước**: ~50×50 mm (ước tính)
- **Package**: SMD (ưu tiên) hoặc through-hole
- **Layout**: Tách phần analog (power) và digital (logic)

**Lưu Ý Thiết Kế:**

- **Power traces**: Dày ít nhất 0.5 mm cho dòng 3A
- **Ground plane**: Tạo ground plane lớn để giảm nhiễu
- **Decoupling**: Đặt capacitor gần IC (10–100 µF)
- **Thermal**: Thêm thermal via cho IC công suất (LM2596)
- **Inductor**: Đặt xa phần nhạy cảm (ADC, analog)

**12. Kết Luận**

Giải pháp A (IC Rời + MOSFET) phù hợp khi:

- ✅ **Thiết kế PCB tự vẽ**: Muốn tích hợp tất cả vào một PCB
- ✅ **Sản xuất số lượng**: Thiết kế một lần, sản xuất nhiều bản
- ✅ **Kích thước nhỏ gọn**: IC rời nhỏ hơn module → PCB gọn hơn
- ✅ **Giá thành hợp lý**: IC rời rẻ hơn module
- ✅ **Chuyên nghiệp**: Thiết kế PCB riêng → sản phẩm chuyên nghiệp hơn

**Khuyến Nghị:**

- ✅ **Nên dùng cho đồ án**: Thiết kế PCB tự vẽ → học hỏi nhiều hơn
- ✅ **Phù hợp sản xuất**: Thiết kế một lần, sản xuất nhiều bản
- ⚠️ **Cần kiến thức**: Phải hiểu datasheet và thiết kế PCB đúng
- ⚠️ **Prototype**: Có thể dùng module để test trước, sau đó thiết kế PCB
- **Giá hợp lý**: ~20,000–40,000 VNĐ

**Chức Năng:**

- Sạc pin 21700 với dòng 3A (khi IGN ON, U_batt > 12V)
- Tự ngắt khi pin đầy (4.2V)
- Bảo vệ quá dòng sạc
- Bảo vệ quá nhiệt
- Reverse protection (bảo vệ khi cắm ngược)

**Mạch Bảo Vệ Pin (Protection Board):**

- **Bảo vệ quá dòng xả**: Over-discharge protection (< 2.5V)
- **Bảo vệ quá áp**: Over-voltage protection (> 4.25V)
- **Bảo vệ ngắn mạch**: Short circuit protection
- **Dòng xả tối đa**: 3A (phù hợp với pin 21700)

**Lựa Chọn Protection Board:**

- **BMS 1S 3A**: Module bảo vệ chuyên dụng, giá ~10,000–20,000 VNĐ
- **DW01 + MOSFET**: IC bảo vệ phổ biến (nếu thiết kế PCB riêng)
- Có thể tích hợp sẵn trong một số module sạc

**Kết Nối:**

- Input: 5V từ buck converter (12V → 5V)
- Output: 4.2V → Pin 21700 (qua protection board)
- Điều khiển: Có thể bật/tắt sạc bằng GPIO ESP32 (nếu module hỗ trợ)

**Nơi Mua:**

- Shopee, Lazada: Tìm "IP2312 charger module", "sạc pin 1S 3A Type-C"
- Cửa hàng linh kiện: Chipdientu.com.vn, DKE.vn, Linhkienfpt.vn
- Giá: ~20,000–40,000 VNĐ

### III.2 Sơ Đồ Khối Hệ Thống

```text
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
│           │                       │                      │
│           └───────────┬───────────┘                      │
│                       │                                  │
│  ┌────────────────────┴─────────────────┐                │
│  │    Buck DC-DC (12V → 5V, 4.2V)       │                │
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
    │  Relay/     │
    │  MOSFET     │
    │  (LVD)      │
    └──────┬──────┘
           │
    ┌──────┴──────────┐
    │                 │
  ┌─┴──┐          ┌───┴──┐
  │12V │          │Pin   │
  │Accu│          │Backup│
  └────┘          └──────┘
```

### III.3 Danh Sách Vật Liệu (BOM)

| STT | Thành Phần                  | Đơn Vị   | SL  | Ghi Chú                              |
| --- | --------------------------- | -------- | --- | ------------------------------------ |
| 1   | ESP32-S3 DevKit              | Cái      | 1   | ESP32-S3-DevKitC-1 hoặc DevKitM-1   |
| 2   | LIS3DH                       | Cái      | 1   | Breakout board hoặc IC riêng         |
| 3   | OBD2 BLE (vgate iCar Pro)    | Cái      | 1   | BLE 4.0, tương thích với ESP32-S3    |
| 4   | Modem 4G + GNSS (A7600CE‑T) | Cái      | 1   | Kèm LTE antenna + GNSS antenna + SIM |
| 5   | 21700 Li-ion 5000mAh        | Cái      | 1   | Loại có protection board             |
| 6   | Module sạc IP2312 (3A)      | Cái      | 1   | IP2312 charger module Type-C, 3A     |
| 7   | BMS/Protection Board 1S     | Cái      | 1   | BMS 1S 3A hoặc DW01+MOSFET           |
| 8   | Buck DC-DC (12→5V, 5A)      | Cái      | 1   | LM2596, MP1584, hoặc XL6009 (≥3.5A)  |
| 9   | Relay 5V / MOSFET LVD       | Cái      | 1   | Điều khiển chuyển nguồn              |
| 10  | R, C, diode, connector, PCB | Assorted | -   | Mạch phụ trợ                         |
