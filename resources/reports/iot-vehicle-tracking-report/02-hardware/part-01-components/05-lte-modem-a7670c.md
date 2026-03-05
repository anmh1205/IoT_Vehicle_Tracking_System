## III.1.4 Module LTE + GNSS: SIMCom SIM7600CE-T

### Tổng Quan

**SIM7600CE-T** là giải pháp LTE Cat-4 cùng GNSS tích hợp (GPS + GLONASS + BeiDou) do SIMCom cung cấp. Phiên bản CE-T được chọn vì:

- Hỗ trợ LTE và fallback 3G/2G, đáp ứng được vùng phủ Việt Nam
- GNSS tích hợp đủ độ chính xác (~2.5m CEP) nên không cần module GNSS riêng
- Giao tiếp chính vẫn là UART, phù hợp pin mapping hiện tại

> **Lưu ý:** Pin mapping và rail điện áp không đổi so với bản thiết kế mục tiêu dành cho ESP32-S3 và LTE modem cũ. Firmware mới chỉ nhắm mục tiêu SIM7600CE-T (không có nhánh runtime cho A7670C + NEO-M8N).

### Đặc Tính Kỹ Thuật Chính

| Thông số | Giá trị |
| -------- | ------- |
| Loại | LTE Cat-4 + GNSS tích hợp |
| Cellular | LTE, UMTS, GSM (Auto mode) |
| GNSS tích hợp | GPS/GLONASS/BeiDou hoàn chỉnh |
| Giao tiếp chính | UART, USB, SIM |
| Điện áp rail | 3.4V–4.2V (3.8V rail modem) |
| Nhiệt độ | -30°C đến +75°C |
| Ứng dụng phù hợp | Telematics, tracker tích hợp LTE + GNSS |

### Vai Trò Trong Hệ Thống

SIM7600CE-T đảm nhiệm cả hai vai trò:

1. Kết nối LTE/CATM1 đến MQTT/HTTP Broker
2. Cung cấp dữ liệu GNSS bằng AT commands tích hợp
3. Quản lý sleep/PSM để tiết kiệm tổng năng lượng
4. Cung cấp trạng thái mạng via `+CEREG` và `+CGACT`
5. Thực hiện xử lý SSL/TLS, MQTT, OTA (nếu cần)

### Luồng AT Command Định Danh Mục Tiêu

1. **Khởi động và kiểm tra trạng thái:**

   ```
   AT
   → OK
   AT+CPIN?
   → +CPIN: READY
   AT+CNMP=2
   → OK  ; module để Auto mode LTE/GSM/UMTS
   ```

2. **Thiết lập APN (mặc định `internet`):**

   ```
   AT+CGDCONT=1,"IP","internet"
   → OK
   ```

3. **Kiểm tra đăng ký mạng (CEREG trước CGACT):**

   ```
   AT+CEREG?
   → +CEREG: 0,1  ; đã đăng ký LTE
   ```

4. **Kích hoạt PDP Context:**

   ```
   AT+CGACT=1,1
   → OK
   AT+CGACT?
   → +CGACT: 1,1
   ```

> **Quy tắc:** luôn đọc `+CEREG` trước khi gọi `AT+CGACT` để đảm bảo mạng đã đăng ký. Nếu `CEREG` vẫn `0`, giữ retry không gọi `CGACT`.

5. **Kích hoạt GNSS tích hợp:**

   ```
   AT+CGNSPWR=1
   → OK
   AT+CGNSINF
   → +CGNSINF: 1,1,20260305120000.000,10.1234,106.1234,...
   AT+CGNSTST=1
   → +CGNSTST: $GNGGA,....  ; stream NMEA cho parser
   ```

6. **Xử lý mạng/MQTT:** sau khi `CGACT` active, thực hiện `AT+CMQTTSTART`, `AT+CMQTTCONNECT`, etc.

7. **Sleep/PSM:**

   ```
   AT+CSCLK=1        ; UART power save
   AT+CPSMS=1,,,,"00100000","00000101"  ; PSM cycled
   AT+CGNSPWR=0      ; tắt GNSS khi cần
   ```

### Kết Nối Vật Lý Với ESP32-S3

| Tín hiệu SIM7600CE-T | Vai trò | ESP32-S3 mục tiêu |
| -------------------- | ------- | ----------------- |
| UART_TX | Dữ liệu → ESP32 | GPIO17 (UART1 RX) |
| UART_RX | Dữ liệu từ ESP32 | GPIO18 (UART1 TX) |
| PWRKEY | Bật/tắt modem | GPIO4 |
| RESET | Reset phần cứng | GPIO5 |
| RI / STATUS | Wake/status | GPIO6/GPIO7 |
| EN (nguồn modem) | Enable rail 3.8V | GPIO14 |

### Tích hợp GNSS

- Module cung cấp NMEA qua `AT+CGNSTST=1` cho firmware, driver chỉ cần nối read / parse tương tự như NEO-M8N.
- Tự động điều chỉnh tần suất fix: dùng `AT+CGNSTST=1` để stream NMEA rồi throttle luồng GGA/RMC theo nhu cầu (1–5 Hz) thay vì giữ toàn bộ data.
- Không cần UART GNSS riêng nên phần pin map vẫn giữ như mô hình cũ.

### Lịch Sử: Từ A7670C + NEO-M8N sang SIM7600CE-T

Trước đây tài liệu mô tả kiến trúc hai module để giảm coupling. Giờ đây chúng ta chuyển sang SIM7600CE-T vì:

- Giảm độ phức tạp phần cứng (chỉ 1 module)
- Không cần đồng bộ UART GNSS phụ
- Giảm chi phí board layout và LDO riêng cho NEO-M8N

**Lưu ý lịch sử:** A7670C + NEO-M8N chỉ còn được giữ lại khi mô tả baseline cũ; không có nhánh runtime cho cấu hình này.

### Kết Luận

SIM7600CE-T là mục tiêu runtime duy nhất cho tracker:

- `Auto mode` network (CNMP=2) + APN `internet`
- `CEREG` kiểm tra trước `CGACT`
- GNSS tích hợp via `AT+CGNSPWR` / `AT+CGNSINF`
- Pin mapping và nguồn rail giống thiết kế trước nên firmware chỉ cần cập nhật driver modem và GNSS parser
- Kiến trúc mới tránh ghi đè thêm module GNSS riêng mà vẫn giữ khả năng debug GNSS qua `CGNSINF`/`CGNSTST`