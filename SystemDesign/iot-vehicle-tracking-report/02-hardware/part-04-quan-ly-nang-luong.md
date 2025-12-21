## PHẦN IV: CHIẾN LƯỢC QUẢN LÝ NĂNG LƯỢNG

### IV.1 Ba Chế Độ Hoạt Động

#### Chế Độ 1: Lái Xe (IGN = ON)

**Điều Kiện:**

- IGN = HIGH

**Hành Động:**

- Lấy nguồn trực tiếp từ ắc quy (U_batt > 12 V)
- **Kết nối Bluetooth với OBD2 ELM327** (2–5 giây reconnect nếu đã paired)
- Đọc IGN status từ OBD2 (xác nhận IGN ON)
- Bật **GNSS + 4G** (modem A7600CE‑T) liên tục
- Đọc dữ liệu OBD2 định kỳ (RPM, tốc độ, nhiên liệu) mỗi 5–30 giây
- Gửi vị trí + dữ liệu OBD2 mỗi 5–30 giây
- **Giữ kết nối Bluetooth** trong suốt thời gian IGN ON (không deep sleep)
- **Sạc pin 21700** (nếu U_batt > 12 V)

**Ước Lượng Dòng:** ~200–330 mA trung bình (bao gồm Bluetooth OBD2 + sạc pin)

**Lưu Ý về Bluetooth:**

- Kết nối lại mất 2–5 giây (nếu đã paired trước đó)
- Nếu không kết nối được OBD2 → fallback về đo điện áp để phát hiện IGN
- Giữ kết nối khi IGN ON → không cần reconnect liên tục

#### Chế Độ 2: Đỗ Bình Thường (IGN = OFF, Không Chuyển Động)

**Điều Kiện:**

- IGN = LOW
- Không có chuyển động trong vài phút

**Hành Động:**

- Lấy nguồn từ ắc quy (không sạc pin)
- **Ngắt kết nối Bluetooth OBD2** (không cần khi đỗ)
- ESP32 deep sleep, chỉ để timer + wakeup từ LIS3DH
- Thức dậy mỗi 10–30 phút:
  - Kiểm tra U_batt (qua ADC)
  - Nếu U_batt < 12 V: Chuyển sang pin + gửi cảnh báo
  - Bật **GNSS + 4G** (A7600CE‑T)
  - Lấy vị trí
  - Gửi heartbeat (vị trí, pin, ắc quy, trạng thái nguồn)
  - **Không kết nối OBD2** (tiết kiệm thời gian và năng lượng)
  - Tắt **GNSS + 4G**
  - Quay lại deep sleep

**Ước Lượng Dòng:** ~2–3 mA trung bình (từ ắc quy)

**Lưu Ý:**

- Không cần kết nối OBD2 khi đỗ → tiết kiệm thời gian wake up
- IGN status đã được xác nhận trước khi deep sleep (từ chế độ 1)

#### Chế Độ 3: Cảnh Báo (Security/Tow Alarm)

**Điều Kiện:**

- LIS3DH phát hiện gia tốc > ngưỡng trong thời gian định trước

**Hành Động:**

- ESP32 thức dậy
- Bật **GNSS + 4G** ngay (A7600CE‑T)
- Gửi cảnh báo ưu tiên
- Chuyển sang track liên tục (gần giống chế độ 1)
- Duy trì thêm 2–4 giờ hoặc cho đến khi xác nhận

### IV.2 Quản Lý Nguồn và Low Voltage Disconnect (LVD)

**Logic Chuyển Nguồn:**

**Khi Xe Chạy (IGN ON):**

- Tracker dùng nguồn trực tiếp từ ắc quy
- Sạc pin 21700 (nếu U_batt > 12 V)
- Dòng sạc: **3 A** (module IP2312)
- Thời gian sạc đầy: ~2 giờ (pin 5,000 mAh)

**Khi Xe Đỗ (IGN OFF):**

- Tracker dùng ắc quy (không sạc pin)
- Nếu U_batt < 12 V:
  - Chuyển sang pin 21700
  - Gửi cảnh báo "Ắc quy yếu - Chuyển sang pin backup"
- Nếu U_batt > 12.2 V (phục hồi):
  - Chuyển lại ắc quy
  - Gửi cảnh báo "Ắc quy phục hồi - Chuyển lại ắc quy"

**Bảng Trạng Thái:**

| IGN | U_batt   | Nguồn Tracker | Sạc Pin  | Cảnh Báo                 |
| --- | -------- | ------------- | -------- | ------------------------ |
| ON  | > 12 V   | Ắc quy        | ✅ Có    | -                        |
| OFF | > 12 V   | Ắc quy        | ❌ Không | -                        |
| OFF | < 12 V   | Pin 21700     | ❌ Không | ✅ Cảnh báo chuyển nguồn |
| OFF | > 12.2 V | Ắc quy        | ❌ Không | ✅ Cảnh báo phục hồi     |

**Lợi Ích:**

- Bảo vệ ắc quy khỏi rút cạn quá mức → đảm bảo khả năng đề nổ
- Chỉ sạc pin khi xe chạy → không làm cạn ắc quy khi đỗ
- Tự động chuyển nguồn khi ắc quy yếu
- Cảnh báo kịp thời để người dùng biết trạng thái

### IV.3 Quản Lý Pin Dự Phòng 21700

**Sạc Pin:**

- Chỉ sạc khi IGN ON và U_batt > 12 V
- Dòng sạc: **3 A** (module IP2312)
- Module IP2312 tự ngắt khi pin đầy (4.2V)
- BMS/Protection board bảo vệ quá dòng xả, quá áp
- Thời gian sạc đầy: ~2 giờ (nhanh hơn 3 lần so với sạc 1A)

**Xả Pin:**

- Khi ắc quy yếu (U_batt < 12 V), pin cấp nguồn cho toàn hệ thống
- Dung lượng: 5000 mAh → đủ cho vài ngày hoạt động ở chế độ heartbeat

**Cảnh Báo:**

- Gửi cảnh báo khi chuyển sang pin (U_batt < 12 V)
- Gửi cảnh báo khi pin yếu (< 3.2 V)
- Gửi cảnh báo khi chuyển lại ắc quy (U_batt > 12.2 V)
