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

- IGN = LOW (đã được xác nhận từ chế độ 1)
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

**Tại Sao Không Cần Bluetooth OBD2 Khi Đỗ:**

1. **IGN đã OFF**: Không cần đọc IGN status từ OBD2 (đã biết là OFF)
2. **Không cần dữ liệu xe**: RPM, tốc độ, nhiên liệu không cần khi đỗ
3. **IMU đủ để phát hiện chuyển động**: LIS3DH có thể phát hiện rung, kéo, cẩu xe mà không cần OBD2
4. **Tiết kiệm năng lượng**: Không cần Bluetooth (~30–50 mA) → tiết kiệm ~7,000 lần năng lượng
5. **Tiết kiệm thời gian**: Không cần reconnect Bluetooth (2–5 giây) → wake up nhanh hơn
6. **Đơn giản hóa logic**: Không cần quản lý kết nối Bluetooth khi đỗ

**Lưu Ý:**

- IGN status đã được xác nhận trước khi deep sleep (từ chế độ 1)
- IMU (LIS3DH) đủ để phát hiện chuyển động khi đỗ → không cần OBD2
- Chỉ cần kết nối OBD2 khi IGN ON (chế độ 1) để đọc dữ liệu xe

#### Chế Độ 3: Cảnh Báo (Security/Tow Alarm)

**Điều Kiện:**

- LIS3DH phát hiện gia tốc > ngưỡng trong thời gian định trước
- Wake-up từ GPIO interrupt (LIS3DH INT pin)

**Hành Động:**

- ESP32 thức dậy ngay (từ deep sleep)
- Bật **GNSS + 4G** ngay (A7600CE‑T)
- Gửi cảnh báo ưu tiên (rung, kéo, cẩu xe)
- Chuyển sang track liên tục (gần giống chế độ 1)
- **Có thể kết nối Bluetooth OBD2** (tùy chọn):
  - Nếu cần xác nhận IGN status (xe có đang chạy không?)
  - Hoặc chỉ dùng IMU + GPS để phát hiện chuyển động → đơn giản hơn
- Duy trì thêm 2–4 giờ hoặc cho đến khi xác nhận

**Lưu Ý:**

- IMU đã phát hiện chuyển động → không nhất thiết cần OBD2
- Có thể kết nối OBD2 để xác nhận IGN status (nếu cần)
- Hoặc chỉ dùng IMU + GPS → đơn giản và tiết kiệm năng lượng hơn

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
