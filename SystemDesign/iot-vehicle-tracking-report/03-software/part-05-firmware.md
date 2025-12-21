## PHẦN V: THIẾT KẾ PHẦN MỀM (FIRMWARE)

### V.1 Kiến Trúc

- **Layer 1 – Hardware Abstraction**: driver LIS3DH, **GNSS qua modem A7600 (AT commands)**, modem LTE, ADC, GPIO, **Bluetooth Classic (OBD2 ELM327)**
- **Layer 2 – Power Management**: sleep, wakeup, LVD
- **Layer 3 – Application**: logic chế độ lái/đỗ/cảnh báo, xử lý alert
- **Layer 4 – Communication**: MQTT/HTTP, mã hóa dữ liệu, xử lý lệnh từ server

### V.2 Luồng Hoạt Động Cơ Bản

1. Khởi tạo peripheral (IMU, modem LTE/GNSS, ADC, Bluetooth)
2. Đọc trạng thái IGN + U_batt:
   - **Ưu tiên**: Kết nối OBD2 Bluetooth → đọc IGN từ ECU
   - **Fallback**: Đo điện áp ắc quy nếu không kết nối được OBD2
3. Quyết định chế độ hoạt động
4. Trong mỗi chế độ:
   - **Lái**: Kết nối OBD2, track liên tục, giữ Bluetooth active
   - **Đỗ**: Không kết nối OBD2, sleep + heartbeat
   - **Cảnh báo**: Có thể kết nối OBD2 (tùy chọn), alert + track liên tục
5. Sau khi hoàn thành tác vụ:
   - **Nếu IGN ON**: Giữ kết nối Bluetooth, không deep sleep
   - **Nếu IGN OFF**: Ngắt Bluetooth, deep sleep

### V.3 Các Điểm Chính Trong Code

- **Cấu hình deep sleep và wakeup bằng IMU + timer**
- **Đọc IMU, lọc nhiễu, xác nhận chuyển động**
- **Đo U_batt và điều khiển LVD**
- **Quản lý kết nối Bluetooth OBD2** (kết nối/reconnect/fallback)
- **Bật/tắt GNSS trên modem và đọc vị trí qua AT commands**
- **Gửi dữ liệu lên server (MQTT/HTTP)**
- **Lưu trạng thái để sau sleep dậy vẫn biết chế độ trước đó**

### V.4 Chiến Lược Kết Nối Bluetooth OBD2

#### V.4.1 Vấn Đề Deep Sleep và Bluetooth

**Khi ESP32 Deep Sleep:**
- Bluetooth Classic **bị ngắt kết nối hoàn toàn**
- ELM327 adapter vẫn hoạt động, chờ kết nối mới
- Mỗi lần wake up, cần **kết nối lại** với ELM327

**Thời Gian Kết Nối Lại:**
- **Pairing lần đầu**: 5–15 giây (nếu chưa có trong danh sách)
- **Reconnect (đã paired)**: 2–5 giây (nếu đã lưu MAC address)
- **Tối ưu**: Lưu MAC address của ELM327 vào flash → reconnect nhanh hơn

#### V.4.2 Chiến Lược Kết Nối Theo Chế Độ

**Chế Độ 1: Lái Xe (IGN ON)**

1. **ESP32 wake up** (từ deep sleep hoặc reset)
2. **Kết nối Bluetooth với ELM327**:
   - Đọc MAC address từ flash (nếu đã lưu)
   - Kết nối với ELM327 (2–5 giây)
   - Nếu timeout (>10 giây) → fallback về đo điện áp
3. **Đọc IGN status từ OBD2**:
   - Gửi lệnh: `AT IGN` hoặc đọc PID 0x0C (RPM)
   - Xác nhận IGN = ON
4. **Giữ kết nối Bluetooth**:
   - Không deep sleep khi IGN ON
   - Chỉ light sleep nếu cần (giữ Bluetooth active)
   - Đọc dữ liệu OBD2 định kỳ (RPM, tốc độ, nhiên liệu)
5. **Khi IGN OFF được phát hiện**:
   - Đọc IGN status lần cuối từ OBD2
   - Xác nhận IGN = OFF
   - **Ngắt kết nối Bluetooth** trước khi deep sleep

**Chế Độ 2: Đỗ Xe (IGN OFF)**

1. **ESP32 wake up** (từ timer hoặc IMU interrupt)
2. **Không kết nối OBD2**:
   - IGN đã được xác nhận OFF trước khi deep sleep
   - Không cần đọc OBD2 khi đỗ
   - Tiết kiệm thời gian và năng lượng
3. **Chỉ đo điện áp ắc quy** (qua ADC)
4. **Gửi heartbeat** và quay lại deep sleep

**Chế Độ 3: Cảnh Báo (Motion Detected)**

1. **ESP32 wake up** (từ IMU interrupt)
2. **Có thể kết nối OBD2** (tùy chọn):
   - Nếu cần xác nhận IGN status
   - Hoặc chỉ dùng IMU + GPS để phát hiện chuyển động
3. **Gửi cảnh báo ngay** và track liên tục

#### V.4.3 Xử Lý Lỗi và Fallback

**Timeout Kết Nối:**
- Nếu không kết nối được sau **10 giây** → fallback
- Retry 2–3 lần với delay 2 giây giữa các lần thử

**Mất Kết Nối Giữa Chừng:**
- Phát hiện mất kết nối (không nhận được response)
- Retry reconnect 2–3 lần
- Nếu vẫn lỗi → fallback

**ELM327 Không Phản Hồi:**
- Timeout sau **5 giây** khi gửi lệnh
- Retry 1–2 lần
- Nếu vẫn lỗi → fallback

**Fallback Strategy:**
- **Phát hiện IGN**: Đo điện áp ắc quy (U_batt > 13V → IGN ON, < 12V → IGN OFF)
- **Độ chính xác**: Kém hơn OBD2 nhưng vẫn hoạt động
- **Log lỗi**: Ghi lại lỗi kết nối OBD2 để debug

#### V.4.4 Tối Ưu Hóa

**Lưu MAC Address:**
- Lưu MAC address của ELM327 vào flash/EEPROM
- Khi wake up, đọc MAC từ flash → reconnect nhanh hơn
- Cập nhật MAC nếu thay adapter mới

**Đọc Batch Dữ Liệu:**
- Đọc nhiều thông số cùng lúc (IGN, RPM, tốc độ, nhiên liệu)
- Giảm số lần giao tiếp → giảm thời gian và tiêu thụ năng lượng

**Cache Dữ Liệu:**
- Lưu dữ liệu OBD2 vào RAM
- Có thể dùng khi mất kết nối tạm thời
- Cập nhật cache mỗi lần đọc thành công

**Chỉ Kết Nối Khi Cần:**
- Chỉ kết nối khi IGN ON (chế độ 1)
- Không kết nối khi đỗ (chế độ 2) → tiết kiệm thời gian wake up
- Kết nối tùy chọn khi cảnh báo (chế độ 3)

#### V.4.5 Lợi Ích Thiết Kế Giấu Thiết Bị

**Bảo Mật:**
- Tracker giấu ở nơi khác → khó bị phát hiện/tháo
- OBD2 adapter cắm vào cổng (dễ thấy nhưng không ảnh hưởng tracker chính)

**Linh Hoạt:**
- Tracker có thể đặt ở vị trí tối ưu (gần ắc quy, tránh nhiệt)
- Kết nối không dây → không cần dây nối phức tạp

**Dễ Lắp Đặt:**
- OBD2 adapter: Chỉ cần cắm vào cổng OBD2
- Tracker: Đấu nguồn ắc quy ở vị trí thuận tiện

**Kết Luận:**
- Deep sleep sẽ ngắt Bluetooth → cần reconnect mỗi lần wake up (2–5 giây)
- Chiến lược: Chỉ kết nối khi IGN ON, không cần khi đỗ
- Fallback: Đo điện áp nếu không kết nối được OBD2
- Thiết kế hợp lý: Tracker giấu + OBD2 adapter riêng → bảo mật và linh hoạt


