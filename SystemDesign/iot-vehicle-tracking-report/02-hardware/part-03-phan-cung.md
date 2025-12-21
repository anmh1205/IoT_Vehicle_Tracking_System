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

#### III.1.2 So Sánh MCU: STM32 vs ESP32

Để lựa chọn vi điều khiển phù hợp cho hệ thống tracker, cần đánh giá dựa trên các tiêu chí cụ thể của ứng dụng:

| Tiêu Chí                   | STM32 (STM32L4)            | ESP32                     | Đánh Giá                                           |
| -------------------------- | -------------------------- | ------------------------- | -------------------------------------------------- |
| **Deep Sleep Current**     | ~1–3 μA (STOP2 mode)       | ~10–15 μA (deep sleep)    | ⭐⭐⭐⭐⭐ STM32 thấp hơn 3–5 lần                  |
| **Wakeup từ GPIO**         | ✅ Hỗ trợ (EXTI)           | ✅ Hỗ trợ (EXT0/EXT1)     | ⭐⭐⭐⭐ Cả hai đều đáp ứng                        |
| **UART/AT Commands**       | ✅ Nhiều UART (3–8)        | ✅ Nhiều UART (3)         | ⭐⭐⭐⭐ Đủ cho modem A7600                        |
| **ADC (đo U_batt)**        | ✅ 12-bit ADC              | ✅ 12-bit ADC             | ⭐⭐⭐⭐ Tương đương                               |
| **I2C (LIS3DH)**           | ✅ I2C                     | ✅ I2C                    | ⭐⭐⭐⭐ Tương đương                               |
| **Bộ nhớ RAM**             | 64–320 KB (tùy dòng)       | 520 KB                    | ⭐⭐⭐ ESP32 nhiều hơn                             |
| **Flash**                  | 64 KB–2 MB (on-chip)       | 4 MB (thường external)    | ⭐⭐⭐ ESP32 linh hoạt hơn                         |
| **WiFi/Bluetooth**         | ❌ Cần module ngoài        | ✅ Tích hợp sẵn           | ⭐⭐⭐ ESP32 có lợi (không dùng trong tracker này) |
| **Chi phí**                | ~150,000–300,000 VNĐ       | ~80,000–200,000 VNĐ       | ⭐⭐⭐⭐ ESP32 rẻ hơn                              |
| **Độ phức tạp phát triển** | ⚠️ Cao (STM32 HAL/CubeMX)  | ✅ Thấp (Arduino/ESP-IDF) | ⭐⭐⭐⭐⭐ ESP32 dễ hơn                            |
| **Cộng đồng/Tài liệu**     | ⭐⭐⭐⭐ Tốt (công nghiệp) | ⭐⭐⭐⭐⭐ Rất tốt (IoT)  | ⭐⭐⭐⭐⭐ ESP32 phong phú hơn                     |
| **Thời gian phát triển**   | ⚠️ Lâu hơn                 | ✅ Nhanh hơn              | ⭐⭐⭐⭐⭐ ESP32 nhanh hơn                         |

**Phân Tích Chi Tiết:**

**1. Tiêu Thụ Năng Lượng:**

- **STM32L4**: Deep sleep (STOP2) tiêu thụ **1–3 μA**, thấp hơn ESP32 3–5 lần. Đây là ưu điểm lớn cho ứng dụng battery-powered.
- **ESP32**: Deep sleep tiêu thụ **10–15 μA**, vẫn chấp nhận được cho pin 15,000 mAh (hoạt động 2–3 tháng với heartbeat 10–30 phút).

**2. Wakeup từ IMU (LIS3DH):**

- Cả hai đều hỗ trợ wakeup từ GPIO interrupt → **không có sự khác biệt đáng kể**.

**3. Xử Lý AT Commands (A7600CE‑T):**

- Cả hai đều có đủ UART và khả năng xử lý AT commands → **tương đương**.

**6. Kết Nối OBD2 Bluetooth:**

- **ESP32**: Hỗ trợ **Bluetooth Classic (SPP)** → kết nối trực tiếp với OBD2 adapter ELM327
- **STM32WB**: Chỉ có BLE → **không tương thích** với ELM327 (cần adapter phức tạp)
- → **ESP32 có lợi thế lớn** cho việc đọc dữ liệu xe qua OBD2

**4. Phát Triển và Bảo Trì:**

- **STM32**: Yêu cầu kiến thức sâu về HAL, CubeMX, có thể phức tạp hơn cho đồ án sinh viên.
- **ESP32**: Hỗ trợ Arduino IDE, ESP-IDF, cộng đồng lớn, nhiều ví dụ → **phù hợp hơn cho đồ án**.

**5. Chi Phí:**

- ESP32 rẻ hơn 30–50% so với STM32L4 tương đương.

**Kết Luận và Lựa Chọn:**

Mặc dù **STM32L4 có ưu thế về tiêu thụ năng lượng** (1–3 μA vs 10–15 μA), nhưng với pin backup 15,000 mAh và chiến lược deep sleep + heartbeat, **sự khác biệt này không đủ để bù đắp** các nhược điểm:

- ✅ **ESP32 được chọn** vì:

  1. **Hỗ trợ Bluetooth Classic**: Kết nối trực tiếp với OBD2 adapter ELM327 → đọc dữ liệu xe chính xác (IGN, RPM, tốc độ, v.v.)
  2. **Dễ phát triển**: Arduino/ESP-IDF, cộng đồng lớn → phù hợp đồ án
  3. **Chi phí thấp**: Rẻ hơn 30–50%
  4. **Bộ nhớ lớn**: 520 KB RAM đủ cho xử lý AT commands, MQTT, OBD2
  5. **Tiêu thụ vẫn chấp nhận được**: 10–15 μA deep sleep → đủ cho 2–3 tháng với pin 15,000 mAh
  6. **Thời gian phát triển ngắn**: Quan trọng cho đồ án có deadline

- ⚠️ **STM32L4 phù hợp hơn nếu**:
  - Yêu cầu tiêu thụ cực thấp là ưu tiên số 1 (ví dụ: pin nhỏ hơn, cần hoạt động >6 tháng)
  - Ứng dụng công nghiệp yêu cầu độ tin cậy cao
  - Team có kinh nghiệm với STM32

#### III.1.3 Vi Điều Khiển: **ESP32-WROOM-32** (Lựa Chọn)

**Mã Cụ Thể:**

- **Module**: ESP32-WROOM-32 (4MB Flash)
- **Board**: ESP32 DevKitC V4 hoặc ESP32-DevKit V1
- **Giá**: ~80,000–120,000 VNĐ

**Đặc Tính:**

- **CPU**: Dual-core Xtensa LX6 @ 240 MHz
- **RAM**: 520 KB SRAM
- **Flash**: 4 MB (on-board)
- **WiFi**: 802.11 b/g/n (không sử dụng trong tracker này)
- **Bluetooth**: v4.2 BR/EDR (Classic) + BLE
  - **Bluetooth Classic SPP**: Kết nối với OBD2 adapter ELM327
  - **BLE**: Có thể dùng cho kết nối khác (nếu cần)
- **GPIO**: 34 chân (30 chân sử dụng được)
- **UART**: 3 cổng (đủ cho modem A7600CE‑T)
- **I2C**: 2 cổng (cho LIS3DH)
- **SPI**: 3 cổng
- **ADC**: 12-bit, 18 kênh (đo điện áp ắc quy)
- **Deep Sleep**: ~10–15 μA (với external wakeup)
- **Active (Bluetooth Classic)**: ~30–50 mA
- **Active (WiFi)**: ~80–240 mA

**Lý Do Chọn:**

1. **Hỗ trợ Bluetooth Classic SPP**: Kết nối trực tiếp với OBD2 adapter ELM327 → đọc dữ liệu xe (IGN, RPM, tốc độ, nhiên liệu, mã lỗi)
2. **Đủ mạnh**: Dual-core 240 MHz, 520 KB RAM → xử lý đồng thời OBD2 + modem + IMU
3. **Nhiều UART**: 3 cổng → đủ cho modem A7600CE‑T và các thiết bị khác
4. **Hỗ trợ external wakeup**: EXT0/EXT1 từ GPIO → đánh thức từ deep sleep bằng IMU interrupt
5. **ADC 12-bit**: Đo chính xác điện áp ắc quy
6. **Thư viện phong phú**: Arduino OBD2, ESP32 Bluetooth SPP, cộng đồng lớn
7. **Chi phí thấp**: Rẻ hơn STM32 30–50%
8. **Dễ phát triển**: Arduino IDE, ESP-IDF → phù hợp đồ án
9. **Tiêu thụ chấp nhận được**: Deep sleep 10–15 μA → đủ cho pin 15,000 mAh hoạt động 2–3 tháng

**Chức Năng:**

- Xử lý logic chính (3 chế độ: lái xe, đỗ, cảnh báo)
- Giao tiếp I2C với LIS3DH (IMU)
- Kết nối Bluetooth Classic với OBD2 adapter ELM327
- Điều khiển UART với modem 4G (A7600CE‑T)
- Đo điện áp ắc quy qua ADC
- Điều khiển mạch LVD (relay/MOSFET) để tách tải
- Quản lý deep sleep và wakeup

**Lưu Ý:**

- Chọn board có USB-C hoặc micro-USB (dễ cắm)
- Kiểm tra có CP2102 hoặc CH340 USB-to-UART chip
- Nên chọn board có pin header sẵn (dễ breadboard và debug)

#### III.1.4 OBD2 Bluetooth Adapter: **ELM327 Bluetooth Classic**

**Đặc Tính:**

- **Giao thức**: Bluetooth Classic với Serial Port Profile (SPP)
- **Chuẩn OBD2**: ELM327 protocol
- **Kết nối**: Bluetooth Classic (BR/EDR) → ESP32-WROOM-32
- **Giao tiếp**: AT commands (ELM327 commands)
- **Tiêu thụ**: ~10–30 mA khi active (chỉ khi IGN ON)
- **Giá**: ~50,000–150,000 VNĐ (tùy chất lượng)

**Lý Do Chọn:**

- **Bán sẵn, phổ biến**: Dễ mua, giá rẻ, tương thích tốt
- **Kết nối không dây**: Không cần dây nối phức tạp đến OBD2 port
- **Tương thích ESP32**: ESP32-WROOM-32 hỗ trợ Bluetooth Classic SPP → kết nối trực tiếp
- **Đọc nhiều dữ liệu**: IGN status, RPM, tốc độ, nhiên liệu, mã lỗi (DTC), v.v.
- **Chính xác hơn**: Đọc IGN status từ ECU chính xác hơn đo điện áp

**Chức Năng:**

- Kết nối với OBD2 port của xe (16-pin OBD2 connector)
- Đọc dữ liệu từ ECU qua Bluetooth Classic
- Truyền dữ liệu đến ESP32 qua Serial Port Profile (SPP)
- Cung cấp thông tin: IGN status, RPM, tốc độ, nhiên liệu, nhiệt độ động cơ, mã lỗi

**Lưu Ý:**

- Chọn adapter ELM327 **Bluetooth Classic** (không phải BLE-only)
- Tránh adapter giả mạo (có thể không hoạt động đúng)
- Chỉ bật Bluetooth khi IGN ON để tiết kiệm pin
- Cần xử lý lỗi khi adapter không kết nối được (fallback về đo điện áp)

**Vấn Đề Kết Nối Bluetooth Khi Deep Sleep:**

**1. Deep Sleep và Bluetooth Disconnect:**

- **Khi ESP32 deep sleep**: Bluetooth Classic sẽ **bị ngắt kết nối** hoàn toàn
- **ELM327 adapter**: Vẫn hoạt động, chờ kết nối mới (không tự tắt)
- **Kết quả**: Mỗi lần ESP32 wake up, cần **kết nối lại** với ELM327

**2. Thời Gian Kết Nối Lại:**

- **Pairing lần đầu**: 5–15 giây (nếu chưa có trong danh sách paired devices)
- **Reconnect (đã paired)**: 2–5 giây (nếu đã lưu trong cache)
- **Tối ưu**: Lưu MAC address của ELM327 → reconnect nhanh hơn

**3. Chiến Lược Kết Nối:**

**Khi Xe Chạy (IGN ON):**

- ESP32 wake up → Kết nối Bluetooth với ELM327 (2–5 giây)
- Đọc IGN status từ OBD2 (xác nhận IGN ON)
- Đọc các thông số khác (RPM, tốc độ, nhiên liệu) định kỳ
- **Giữ kết nối** trong suốt thời gian IGN ON
- Không deep sleep khi IGN ON → chỉ light sleep nếu cần

**Khi Xe Đỗ (IGN OFF):**

- Đọc IGN status từ OBD2 lần cuối → xác nhận IGN OFF
- **Ngắt kết nối Bluetooth** trước khi deep sleep
- ESP32 deep sleep → tiết kiệm năng lượng
- **Không cần kết nối Bluetooth** khi đỗ (không đọc OBD2)

**4. Xử Lý Lỗi Kết Nối:**

- **Timeout kết nối**: Nếu không kết nối được sau 10 giây → fallback về đo điện áp
- **Mất kết nối giữa chừng**: Retry 2–3 lần, nếu vẫn lỗi → fallback
- **ELM327 không phản hồi**: Timeout sau 5 giây → fallback
- **Fallback**: Dùng phương pháp đo điện áp ắc quy để phát hiện IGN (kém chính xác hơn nhưng vẫn hoạt động)

**5. Tối Ưu Hóa:**

- **Lưu MAC address**: Lưu MAC của ELM327 vào flash → reconnect nhanh hơn
- **Chỉ kết nối khi cần**: Chỉ kết nối khi IGN ON, không giữ kết nối khi đỗ
- **Đọc batch**: Đọc nhiều thông số cùng lúc (IGN, RPM, tốc độ) → giảm số lần giao tiếp
- **Cache dữ liệu**: Lưu dữ liệu OBD2 vào RAM → có thể dùng khi mất kết nối tạm thời

**6. Lợi Ích của Thiết Kế Giấu Thiết Bị:**

- **Bảo mật**: Tracker giấu ở nơi khác → khó bị phát hiện/tháo
- **Linh hoạt**: Có thể đặt tracker ở vị trí tối ưu (gần ắc quy, tránh nhiệt)
- **Kết nối không dây**: Bluetooth không cần dây → dễ lắp đặt
- **OBD2 adapter**: Cắm vào cổng OBD2 (dễ thấy nhưng không ảnh hưởng tracker chính)

**Kết Luận:**

- **Deep sleep sẽ ngắt Bluetooth** → cần reconnect mỗi lần wake up
- **Thời gian reconnect: 2–5 giây** (chấp nhận được)
- **Chiến lược**: Chỉ kết nối khi IGN ON, không cần kết nối khi đỗ
- **Fallback**: Đo điện áp nếu không kết nối được OBD2
- **Thiết kế hợp lý**: Tracker giấu + OBD2 adapter riêng → bảo mật và linh hoạt

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
│  │  ESP32-WROOM-32 (Vi Điều Khiển)      │                │
│  │  - Xử lý logic                       │                │
│  │  - Deep sleep management            │                │
│  │  - ADC (đo U_batt)                   │                │
│  │  - Bluetooth Classic (OBD2)          │                │
│  └──────────────────────────────────────┘                │
│     │      │        │          │          │               │
│     I2C    BT       UART       GPIO       ADC             │
│     │      │        │          │          │               │
│  ┌──┴──┐ ┌─┴──┐ ┌───┴──────────┐  ┌──┴──────┐          │
│  │LIS3DH│ │OBD2│ │A7600CE‑T     │  │LVD      │          │
│  │(IMU) │ │BT  │ │(4G + GNSS)   │  │Control  │          │
│  └──────┘ │ELM │ └───────┘  └─────────┘                 │
│           │327 │                                            │
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
| 1   | ESP32-WROOM-32 DevKit       | Cái      | 1   | ESP32 DevKitC V4 hoặc DevKit V1      |
| 2   | LIS3DH                      | Cái      | 1   | Breakout board hoặc IC riêng         |
| 3   | OBD2 Bluetooth (ELM327)     | Cái      | 1   | Bluetooth Classic, không phải BLE    |
| 4   | Modem 4G + GNSS (A7600CE‑T) | Cái      | 1   | Kèm LTE antenna + GNSS antenna + SIM |
| 5   | 21700 Li-ion 5000mAh        | Cái      | 1   | Loại có protection board             |
| 6   | Module sạc IP2312 (3A)      | Cái      | 1   | IP2312 charger module Type-C, 3A     |
| 7   | BMS/Protection Board 1S     | Cái      | 1   | BMS 1S 3A hoặc DW01+MOSFET           |
| 8   | Buck DC-DC (12→5V, 5A)      | Cái      | 1   | LM2596, MP1584, hoặc XL6009 (≥3.5A)  |
| 9   | Relay 5V / MOSFET LVD       | Cái      | 1   | Điều khiển chuyển nguồn              |
| 10  | R, C, diode, connector, PCB | Assorted | -   | Mạch phụ trợ                         |
