## PHẦN V: THIẾT KẾ PHẦN MỀM (FIRMWARE) - MODULE SIM7600CE-T

### V.5 Quản lý module SIM7600CE-T

SIM7600CE-T là lựa chọn runtime duy nhất cho tracker: **LTE Cat-4** + **GNSS tích hợp** (GPS/GLONASS/BeiDou) trong một module SIMCom duy nhất. Firmware dùng UART1 với map hiện tại `GPIO16 (TX)` và `GPIO17 (RX)` để trao đổi AT command và đọc vị trí GNSS qua `AT+CGNSINF`. Hệ thống không còn UART GNSS phụ; GNSS được kích hoạt bằng lệnh AT trong module.

#### V.5.1 Khởi tạo và xác thực module

1. `AT` → xác nhận modem còn hoạt động.
2. `AT+CPIN?` → `+CPIN: READY` → SIM sẵn sàng.
3. `AT+CNMP=2` → bật **Auto mode** để module tự chọn giữa LTE / UMTS / GSM.
4. `AT+CMEE=2` → bật báo lỗi chi tiết (hữu ích cho debugging).
5. `AT+CSQ` / `AT+COPS?` → kiểm tra chất lượng và nhà mạng.
6. Nếu không phản hồi → reset qua PWRKEY pulse (GPIO26) và chờ ~10–30 giây để boot lại.

> `Auto mode` giữ firmware đơn giản: không cần xử lý riêng các band, module sẽ đăng ký mạng khả dụng mà vẫn hỗ trợ fallback GSM.

#### V.5.2 Luồng mạng và GNSS

1. **Định nghĩa APN (mặc định `internet`):**

   ```
   AT+CGDCONT=1,"IP","internet"
   → OK
   ```

   - Mặc định runtime giữ APN `internet`; chỉ override khi có yêu cầu triển khai thực địa.

2. **Kiểm tra trạng thái mạng:** luôn đọc `+CEREG` trước khi gọi `+CGACT`.

   ```
   AT+CEREG?
   → +CEREG: 0,1  ; đã đăng ký LTE domain trước khi CGACT
   ```

3. **Kích hoạt PDP context:**

   ```
   AT+CGACT=1,1
   → OK
   AT+CGACT?
   → +CGACT: 1,1
   ```

4. **Kích hoạt GNSS tích hợp (runtime hiện tại dùng `AT+CGNSPWR` / `AT+CGNSINF`):**

   ```
   AT+CGNSPWR=1
   → OK
   AT+CGNSINF
   → +CGNSINF: 1,1,20260305120000.000,10.1234,106.1234,...
   ```

   - Runtime hiện tại parse vị trí từ `AT+CGNSINF`.
   - `AT+CGNSPWR=0/1` điều khiển việc cấp GNSS để tiết kiệm năng lượng.
   - `AT+CGNSTST=1` chỉ được giữ như tùy chọn debug/stream NMEA ở mức thiết kế, chưa là luồng chính trong firmware hiện tại.

5. **Kết nối MQTT sau khi PDP active:** `AT+CMQTTSTART`, `AT+CMQTTCONNECT`, v.v.

   - Nếu `+CEREG` đang `0`, delay 10–15 giây và retry, không gọi `CGACT` để tránh lỗi `+CME ERROR: 513`.

#### V.5.3 Sleep/PSM và GNSS tắt mở

- `AT+CSCLK=1` để bật UART power save.
- Runtime hiện tại chưa cấu hình `AT+CPSMS`; PSM được giữ như hướng tối ưu có thể bật sau.
- Khi deep sleep kéo dài: `AT+CGNSPWR=0` để tắt GNSS.
- Wake up: `AT+CGNSPWR=1` → đợi `AT+CGNSINF` có fix (timeout tùy điều kiện thu vệ tinh).

#### V.5.4 Chiến lược theo chế độ

**Chế độ 1 – Lái xe (IGN ON):**

- Giữ module ở chế độ `CFUN=1`, `CGACT=1,1`, `CGNSPWR=1` → GNSS + LTE hoạt động liên tục.
- Runtime hiện tại đọc dữ liệu GNSS qua `AT+CGNSINF`.
- Có thể giảm tần suất query `CGNSINF` theo chu kỳ 5–30s để cân bằng dữ liệu và năng lượng.

**Chế độ 2 – Đỗ xe (IGN OFF, heartbeat):**

- Tắt GNSS (`CGNSPWR=0`) khi không cần fix, chỉ bật lại khi chuẩn bị gửi heartbeat.
- Modem ở trạng thái sleep (`CSCLK=1`); PSM (`CPSMS`) hiện chưa là luồng runtime mặc định.
- Wake up mỗi 10–30 phút: `CGNSPWR=1`, đọc fix qua `CGNSINF`, gửi heartbeat, rồi `CGNSPWR=0` và `CSCLK=1` trở lại.

**Chế độ 3 – Cảnh báo (motion):**

- Wake ngay, bật GNSS + LTE, giữ `CGNSPWR=1`, `CFUN=1` và lấy vị trí qua `CGNSINF` theo chu kỳ ngắn → track liên tục.
- Publish alert → sau đó bật lại `CSCLK`; `CPSMS` chỉ cân nhắc khi có bài toán tối ưu sâu hơn.

#### V.5.5 Xử lý lỗi SIM7600CE-T

- Không phản hồi: reset PWRKEY, đợi boot 10–30s, log `+CME ERROR`.
- Mất LTE: kiểm tra `AT+CEREG?`, `AT+CGACT?`, `AT+CGACT=0,1` rồi `AT+CGACT=1,1` nếu cần.
- GNSS mất fix: `AT+CGNSINF` không trả về tọa độ → retry `CGNSPWR=1`, chờ thêm chu kỳ rồi dùng last known coordinate.
- Quá nhiệt: `AT+CFUN=4` → `AT+CFUN=1` sau khi nguội.

#### V.6 Tóm tắt driver

- UART1 (ESP32 GPIO16 TX, GPIO17 RX) tương thích trực tiếp với SIM7600CE-T.
- Modem xử lý cả giao tiếp mạng và GNSS, firmware chỉ cần một `modem_task`; luồng GNSS runtime dựa trên `CGNSINF` (không phụ thuộc NMEA stream mặc định).
- Runtime chỉ nhắm SIM7600CE-T; các tham chiếu module tách rời chỉ dùng cho phần baseline lịch sử.
