## PHẦN V: THIẾT KẾ PHẦN MỀM (FIRMWARE) - MODEM SIMCOM A7600CE-T

### V.5 Quản Lý Modem SIMCom A7600CE‑T

#### V.5.1 Khởi Tạo và Kiểm Tra Modem

**Khởi Tạo:**

1. **Kiểm tra modem có phản hồi:**

   ```
   AT
   → OK
   ```

2. **Kiểm tra SIM card:**

   ```
   AT+CPIN?
   → +CPIN: READY
   ```

3. **Kiểm tra đăng ký mạng:**

   ```
   AT+CREG?
   → +CREG: 0,1 (đã đăng ký mạng)
   ```

4. **Kiểm tra chất lượng tín hiệu:**
   ```
   AT+CSQ
   → +CSQ: 20,99 (RSSI = 20, BER = 99)
   ```

**Xử Lý Lỗi:**

- Nếu không phản hồi → Reset modem (GPIO PWRKEY)
- Nếu SIM chưa sẵn sàng → Đợi và retry
- Nếu chưa đăng ký mạng → Đợi và retry (có thể mất 30–60 giây)

#### V.5.2 Điều Khiển 4G/LTE

**Bật 4G:**

1. **Thiết lập chế độ mạng:**

   ```
   AT+CNMP=38  (LTE only)
   → OK
   ```

2. **Kích hoạt PDP context:**

   ```
   AT+CGACT=1,1
   → OK
   ```

3. **Thiết lập APN:**

   ```
   AT+CGDCONT=1,"IP","internet"  (hoặc APN của nhà mạng)
   → OK
   ```

4. **Kiểm tra kết nối:**
   ```
   AT+CGACT?
   → +CGACT: 1,1 (đã kích hoạt)
   ```

**Tắt 4G (Khi Đỗ Xe):**

1. **Đóng PDP context:**

   ```
   AT+CGACT=0,1
   → OK
   ```

2. **Hoặc đưa vào chế độ Flight Mode:**
   ```
   AT+CFUN=4
   → OK
   ```

**Lưu Ý:**

- **Khi IGN ON**: Giữ 4G active để gửi dữ liệu liên tục
- **Khi IGN OFF**: Tắt 4G trước khi deep sleep → tiết kiệm năng lượng
- **Khi Heartbeat**: Bật 4G → gửi heartbeat → tắt 4G → deep sleep

#### V.5.3 Deep Sleep cho Modem

**Chế Độ Sleep:**

1. **Chế độ Sleep (CSCLK):**

   ```
   AT+CSCLK=1  (Enable sleep mode)
   → OK
   ```

   - Modem tự động sleep khi không có UART activity
   - Wake up khi có dữ liệu trên UART
   - Tiêu thụ: ~1–5 mA

2. **Chế độ Deep Sleep (CFUN):**
   ```
   AT+CFUN=0  (Minimum functionality)
   → OK
   ```
   - Tắt RF, giữ UART hoạt động
   - Tiêu thụ: <1 mA
   - Wake up bằng lệnh AT hoặc GPIO

**Khi ESP32 Deep Sleep:**

**Trước khi ESP32 deep sleep:**

1. **Đưa modem vào sleep:**

   ```
   AT+CSCLK=1  (hoặc AT+CFUN=0)
   → OK
   ```

2. **Lưu trạng thái modem** (nếu cần)

3. **ESP32 vào deep sleep**

**Khi ESP32 wake up:**

1. **Đánh thức modem:**

   - Gửi ký tự bất kỳ trên UART (modem tự wake up)
   - Hoặc gửi lệnh AT:
     ```
     AT
     → OK
     ```

2. **Khôi phục kết nối 4G** (nếu cần):
   ```
   AT+CFUN=1  (Full functionality)
   AT+CGACT=1,1
   ```

**Thời Gian:**

- **Wake up từ sleep**: ~100–500 ms
- **Wake up từ deep sleep**: ~1–3 giây
- **Kết nối 4G lại**: ~5–15 giây

#### V.5.4 Điều Khiển GNSS/GPS

**Bật GNSS:**

1. **Bật GNSS power:**

   ```
   AT+CGNSPWR=1
   → OK
   ```

2. **Kiểm tra GNSS status:**

   ```
   AT+CGNSMOD?
   → +CGNSMOD: 1,1,1 (GNSS enabled)
   ```

3. **Đợi fix (có thể mất 30–60 giây):**
   ```
   AT+CGNSINF
   → +CGNSINF: 1,1,20231201120000,22.123456,105.123456,50.5,...
   ```

**Đọc Vị Trí:**

```
AT+CGNSINF
→ +CGNSINF: <run>,<fix>,<date>,<lat>,<lon>,<alt>,<speed>,<course>,<fix_mode>,<reserved1>,<hdop>,<pdop>,<vdop>,<reserved2>,<GPS_Sat>,<GLONASS_Sat>,<BEIDOU_Sat>,<reserved3>
```

**Giải Thích:**

- **run**: 1 = GNSS running, 0 = stopped
- **fix**: 1 = fixed, 0 = not fixed
- **lat, lon**: Vĩ độ, kinh độ (độ thập phân)
- **alt**: Độ cao (mét)
- **speed**: Tốc độ (km/h)
- **GPS_Sat**: Số vệ tinh GPS

**Tắt GNSS:**

```
AT+CGNSPWR=0
→ OK
```

**Lưu Ý:**

- **Khi IGN ON**: Giữ GNSS active để track liên tục
- **Khi IGN OFF**: Tắt GNSS trước khi deep sleep → tiết kiệm năng lượng
- **Khi Heartbeat**: Bật GNSS → đợi fix → đọc vị trí → tắt GNSS → deep sleep

#### V.5.5 Chiến Lược Điều Khiển Modem Theo Chế Độ

**Chế Độ 1: Lái Xe (IGN ON)**

1. **Wake up modem** (nếu đang sleep)
2. **Bật 4G:**
   - `AT+CFUN=1` (full functionality)
   - `AT+CGACT=1,1` (activate PDP)
3. **Bật GNSS:**
   - `AT+CGNSPWR=1`
   - Đợi fix (30–60 giây)
4. **Giữ active:**
   - Không sleep modem khi IGN ON
   - Đọc GNSS định kỳ (mỗi 5–30 giây)
   - Gửi dữ liệu qua MQTT/HTTP

**Chế Độ 2: Đỗ Xe (IGN OFF)**

1. **Trước khi ESP32 deep sleep:**
   - Tắt GNSS: `AT+CGNSPWR=0`
   - Tắt 4G: `AT+CGACT=0,1` hoặc `AT+CFUN=4`
   - Đưa modem vào sleep: `AT+CSCLK=1`
2. **Khi wake up (heartbeat):**
   - Wake up modem (gửi AT)
   - Bật 4G: `AT+CFUN=1`, `AT+CGACT=1,1`
   - Bật GNSS: `AT+CGNSPWR=1`
   - Đợi fix → đọc vị trí
   - Gửi heartbeat
   - Tắt GNSS và 4G → sleep modem
   - ESP32 deep sleep

**Chế Độ 3: Cảnh Báo (Motion Detected)**

1. **Wake up modem ngay** (từ sleep)
2. **Bật 4G và GNSS ngay:**
   - `AT+CFUN=1`
   - `AT+CGACT=1,1`
   - `AT+CGNSPWR=1`
3. **Gửi cảnh báo ưu tiên**
4. **Track liên tục** (giữ modem active)

#### V.5.6 Xử Lý Lỗi Modem

**Modem Không Phản Hồi:**

1. **Timeout sau 5 giây** khi gửi lệnh AT
2. **Reset modem:**
   - GPIO PWRKEY: LOW → HIGH (1–2 giây)
   - Đợi modem khởi động lại (~10–30 giây)
3. **Retry khởi tạo**

**Mất Kết Nối 4G:**

1. **Phát hiện**: Không gửi được dữ liệu
2. **Kiểm tra:**
   ```
   AT+CREG?
   AT+CGACT?
   ```
3. **Reconnect:**
   ```
   AT+CGACT=0,1  (deactivate)
   AT+CGACT=1,1  (reactivate)
   ```

**GNSS Không Fix:**

1. **Timeout**: Sau 60 giây không fix
2. **Retry**: Tắt và bật lại GNSS
3. **Fallback**: Gửi dữ liệu không có GPS (nếu cần)

**Modem Quá Nhiệt:**

1. **Phát hiện**: Modem không phản hồi, nhiệt độ cao
2. **Giảm công suất**: `AT+QTXFREQ=...` (nếu hỗ trợ)
3. **Tạm dừng**: Đưa vào sleep mode

#### V.5.7 Tối Ưu Hóa

**Giảm Thời Gian Wake Up:**

- **Lưu trạng thái**: Lưu APN, PDP context vào flash
- **Không cần re-register**: Nếu modem chỉ sleep (không deep sleep)
- **Batch commands**: Gửi nhiều lệnh AT cùng lúc

**Tiết Kiệm Năng Lượng:**

- **Sleep khi không dùng**: Luôn đưa modem vào sleep khi không cần
- **Tắt GNSS khi không cần**: GNSS tiêu thụ ~30–50 mA
- **Tắt 4G khi không cần**: 4G tiêu thụ ~50–100 mA

**Giảm Thời Gian Fix GNSS:**

- **Hot start**: Nếu modem chỉ sleep → fix nhanh hơn (~5–10 giây)
- **Warm start**: Nếu đã có almanac → fix trung bình (~20–30 giây)
- **Cold start**: Nếu reset hoàn toàn → fix chậm (~30–60 giây)

