## III.1.5 Modem 4G/LTE + GNSS: SIMCom A7600CE-T

### Tổng Quan

**SIMCom A7600CE-T** là module LTE Cat-4 với GNSS tích hợp, được sử dụng để kết nối mạng cellular và lấy vị trí GPS cho hệ thống tracker.

### Đặc Tính Kỹ Thuật

| Thông Số              | Giá Trị                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| **Loại**              | LTE Cat-4 Module                                                                                     |
| **Băng tần**          | LTE FDD: B1, B3, B5, B7, B8, B20<br>LTE TDD: B38, B40, B41<br>WCDMA: B1, B5, B8<br>GSM: 900/1800 MHz |
| **GNSS**              | GPS, GLONASS, BeiDou, Galileo (tích hợp)                                                             |
| **Giao tiếp**         | UART (khuyến nghị cho ESP32-S3)                                                                      |
| **AT Commands**       | 3GPP TS 27.007, 27.005                                                                               |
| **Hỗ trợ**            | MQTT, HTTP, TCP/UDP                                                                                  |
| **Tiêu thụ (Active)** | 50–100 mA (4G + GNSS)                                                                                |
| **Tiêu thụ (Sleep)**  | <1 mA                                                                                                |
| **Điện áp**           | 3.3V hoặc 1.8V (tùy chân)                                                                            |
| **Giá**               | ~300,000–500,000 VNĐ (kèm antenna)                                                                   |

### So Sánh UART vs USB

Xem chi tiết trong phân tích trước. **Khuyến nghị: Sử dụng UART** cho đồ án.

| Tiêu Chí                | UART                             | USB                         |
| ----------------------- | -------------------------------- | --------------------------- |
| **Độ Phức Tạp**         | ⭐⭐⭐⭐⭐ (Rất đơn giản)        | ⭐⭐ (Phức tạp)             |
| **Tốc Độ**              | 115200–921600 baud (~11–92 KB/s) | USB 2.0: 12–480 Mbps        |
| **Tiêu Thụ**            | ~1–5 mA (idle)                   | ~10–50 mA (active)          |
| **Deep Sleep**          | ✅ Tương thích                   | ⚠️ Phức tạp                 |
| **Phù Hợp AT Commands** | ✅ Rất phù hợp                   | ✅ Phù hợp (nhưng overkill) |

**Kết luận:** UART là lựa chọn tốt nhất cho đồ án vì đơn giản, ổn định, và đủ cho AT commands.

### Lý Do Chọn A7600CE-T

#### 1. Chuẩn Công Nghiệp

- Module telematics phổ biến
- Được sử dụng rộng rãi trong các ứng dụng IoT
- Tài liệu đầy đủ và hỗ trợ tốt

#### 2. Giao Tiếp Đơn Giản

- UART với AT commands → dễ tích hợp với ESP32-S3
- Không cần driver phức tạp
- Nhiều ví dụ code và thư viện

#### 3. GNSS Tích Hợp

- GPS, GLONASS, BeiDou, Galileo tích hợp sẵn
- Không cần module GPS riêng → giảm chi phí và độ phức tạp
- Độ chính xác tốt (3–5 m)

#### 4. Tiết Kiệm Năng Lượng

- Có thể bật/tắt bằng GPIO (PWRKEY)
- Sleep mode tiêu thụ <1 mA
- Có thể tắt hoàn toàn khi không cần

#### 5. Hỗ Trợ MQTT/HTTP

- Tích hợp sẵn MQTT client
- Hỗ trợ HTTP/HTTPS
- Dễ dàng gửi dữ liệu lên server

### Chức Năng Trong Hệ Thống

#### 1. Kết Nối Mạng Cellular

- Kết nối 4G/LTE với nhà mạng
- Gửi/nhận dữ liệu qua MQTT hoặc HTTP
- Quản lý kết nối và reconnect tự động

#### 2. Lấy Vị Trí GNSS/GPS

- Bật GNSS và đợi fix (30–60 giây cold start)
- Đọc vị trí (lat, lon, alt, speed)
- Gửi vị trí lên server

#### 3. Gửi Cảnh Báo

- Gửi cảnh báo motion detected
- Gửi cảnh báo low battery
- Gửi cảnh báo chuyển nguồn

#### 4. Nhận Lệnh từ Server

- Nhận lệnh cấu hình qua MQTT
- Nhận lệnh update firmware (OTA)
- Nhận lệnh điều khiển thiết bị

### Kết Nối với ESP32-S3

#### Sơ Đồ Kết Nối (UART)

```
A7600CE-T Module          ESP32-S3
┌─────────────────┐     ┌──────────┐
│ VCC  ───────────┼─────┤ 3.3V     │
│ GND  ───────────┼─────┤ GND      │
│ UART_TX ────────┼─────┤ GPIO17   │ (UART RX)
│ UART_RX ────────┼─────┤ GPIO16   │ (UART TX)
│ PWRKEY ─────────┼─────┤ GPIO25   │ (Power Control)
│ RESET  ─────────┼─────┤ GPIO26   │ (Reset, optional)
│ STATUS ─────────┼─────┤ GPIO27   │ (Status, optional)
└─────────────────┘     └──────────┘
```

#### Cấu Hình UART

- **Baud Rate**: 115200 (khuyến nghị) hoặc 460800, 921600
- **Data Bits**: 8
- **Stop Bits**: 1
- **Parity**: None
- **Flow Control**: Không cần (RTS/CTS optional)

### AT Commands Cơ Bản

#### 1. Khởi Tạo và Kiểm Tra

```at
AT                    // Kiểm tra modem phản hồi
→ OK

AT+CPIN?             // Kiểm tra SIM card
→ +CPIN: READY

AT+CREG?             // Kiểm tra đăng ký mạng
→ +CREG: 0,1         // 0,1 = đã đăng ký mạng

AT+CSQ               // Kiểm tra chất lượng tín hiệu
→ +CSQ: 20,99        // RSSI = 20 (tốt), BER = 99
```

#### 2. Điều Khiển 4G/LTE

```at
AT+CNMP=38           // LTE only mode
→ OK

AT+CGDCONT=1,"IP","internet"  // Thiết lập APN
→ OK

AT+CGACT=1,1         // Kích hoạt PDP context
→ OK

AT+CGACT?            // Kiểm tra kết nối
→ +CGACT: 1,1        // Đã kích hoạt
```

#### 3. Điều Khiển GNSS

```at
AT+CGNSPWR=1         // Bật GNSS
→ OK

AT+CGNSMOD?          // Kiểm tra GNSS status
→ +CGNSMOD: 1,1,1    // GNSS enabled

AT+CGNSINF           // Đọc vị trí
→ +CGNSINF: 1,1,20231201120000,22.123456,105.123456,50.5,60.0,180.0,1,0,1.2,1.5,1.0,0,8,4,2,0
```

**Giải thích CGNSINF:**

- `1,1` = GNSS running, fixed
- `20231201120000` = Timestamp
- `22.123456,105.123456` = Latitude, Longitude
- `50.5` = Altitude (m)
- `60.0` = Speed (km/h)
- `180.0` = Course (degrees)
- `8,4,2` = GPS, GLONASS, BeiDou satellites

#### 4. Sleep Mode

```at
AT+CSCLK=1           // Enable sleep mode
→ OK                 // Modem tự động sleep khi không có UART activity

AT+CFUN=0            // Deep sleep (minimum functionality)
→ OK                 // Tắt RF, giữ UART hoạt động

AT+CFUN=1            // Full functionality (wake up)
→ OK
```

### Chiến Lược Điều Khiển Theo Chế Độ

#### Chế Độ 1: Lái Xe (IGN ON)

1. **Wake up modem** (nếu đang sleep)

   ```at
   AT                    // Wake up từ sleep
   AT+CFUN=1            // Full functionality
   ```

2. **Bật 4G:**

   ```at
   AT+CGACT=1,1         // Activate PDP
   AT+CGDCONT=1,"IP","internet"  // Set APN
   ```

3. **Bật GNSS:**

   ```at
   AT+CGNSPWR=1         // Enable GNSS
   // Đợi fix (30–60 giây)
   ```

4. **Giữ active:**
   - Không sleep modem khi IGN ON
   - Đọc GNSS định kỳ (mỗi 5–30 giây)
   - Gửi dữ liệu qua MQTT/HTTP

#### Chế Độ 2: Đỗ Xe (IGN OFF)

1. **Trước khi ESP32 deep sleep:**

   ```at
   AT+CGNSPWR=0         // Tắt GNSS
   AT+CGACT=0,1         // Tắt 4G
   AT+CSCLK=1           // Sleep mode
   ```

2. **Khi wake up (heartbeat):**
   ```at
   AT                    // Wake up modem
   AT+CFUN=1            // Full functionality
   AT+CGACT=1,1         // Bật 4G
   AT+CGNSPWR=1         // Bật GNSS
   // Đợi fix → đọc vị trí
   // Gửi heartbeat
   AT+CGNSPWR=0         // Tắt GNSS
   AT+CGACT=0,1         // Tắt 4G
   AT+CSCLK=1           // Sleep
   ```

#### Chế Độ 3: Cảnh Báo (Motion Detected)

1. **Wake up modem ngay:**

   ```at
   AT                    // Wake up
   AT+CFUN=1            // Full functionality
   ```

2. **Bật 4G và GNSS ngay:**

   ```at
   AT+CGACT=1,1         // Bật 4G
   AT+CGNSPWR=1         // Bật GNSS
   ```

3. **Gửi cảnh báo ưu tiên:**

   - Gửi qua MQTT với QoS = 1 hoặc 2
   - Hoặc HTTP POST với retry

4. **Track liên tục:**
   - Giữ modem active
   - Đọc GNSS định kỳ
   - Gửi vị trí liên tục

### Xử Lý Lỗi

#### 1. Modem Không Phản Hồi

**Nguyên nhân:**

- Modem bị hang
- UART lỗi
- Modem chưa khởi động xong

**Giải pháp:**

```c
// Timeout sau 5 giây
if (timeout > 5000) {
    // Reset modem
    gpio_set_level(MODEM_RESET, 0);
    vTaskDelay(100 / portTICK_PERIOD_MS);
    gpio_set_level(MODEM_RESET, 1);
    vTaskDelay(10000 / portTICK_PERIOD_MS); // Đợi modem khởi động
    // Retry khởi tạo
}
```

#### 2. Mất Kết Nối 4G

**Nguyên nhân:**

- Mất sóng
- APN sai
- SIM card lỗi

**Giải pháp:**

```at
AT+CREG?             // Kiểm tra đăng ký mạng
AT+CGACT?            // Kiểm tra PDP context

// Reconnect
AT+CGACT=0,1         // Deactivate
AT+CGACT=1,1         // Reactivate
```

#### 3. GNSS Không Fix

**Nguyên nhân:**

- Không có tầm nhìn trời
- Cold start (cần thời gian)
- Antenna lỗi

**Giải pháp:**

```c
// Timeout sau 60 giây
if (fix_timeout > 60000) {
    // Retry
    AT+CGNSPWR=0      // Tắt GNSS
    vTaskDelay(1000);
    AT+CGNSPWR=1      // Bật lại GNSS

    // Hoặc fallback: Gửi vị trí cache
    send_location_cached();
}
```

### Tối Ưu Hóa

#### 1. Giảm Thời Gian Wake Up

- **Lưu trạng thái**: Lưu APN, PDP context vào flash
- **Không cần re-register**: Nếu modem chỉ sleep (không deep sleep)
- **Batch commands**: Gửi nhiều lệnh AT cùng lúc

#### 2. Tiết Kiệm Năng Lượng

- **Sleep khi không dùng**: Luôn đưa modem vào sleep khi không cần
- **Tắt GNSS khi không cần**: GNSS tiêu thụ ~30–50 mA
- **Tắt 4G khi không cần**: 4G tiêu thụ ~50–100 mA

#### 3. Giảm Thời Gian Fix GNSS

- **Hot start**: Nếu modem chỉ sleep → fix nhanh hơn (~5–10 giây)
- **Warm start**: Nếu đã có almanac → fix trung bình (~20–30 giây)
- **Cold start**: Nếu reset hoàn toàn → fix chậm (~30–60 giây)

### Nơi Mua Hàng

#### Trên Shopee/Lazada VN:

- Tìm: "A7600CE-T", "SIM7600", "4G LTE module", "GNSS module"
- Giá: ~300,000–500,000 VNĐ (kèm antenna)
- Lưu ý: Chọn module có antenna và SIM card slot

#### Cửa Hàng Linh Kiện:

- Chipdientu.com.vn
- DKE.vn
- Linhkienfpt.vn

### Tài Liệu Tham Khảo

- **Datasheet**: SIMCom A7600CE-T Hardware Design
- **AT Commands**: SIMCom A7600 Series AT Command Manual
- **Application Note**: GNSS Application Note
- **Examples**: SIMCom GitHub repositories

### Kết Luận

SIMCom A7600CE-T là lựa chọn phù hợp vì:

- ✅ Chuẩn công nghiệp cho telematics
- ✅ Giao tiếp đơn giản qua UART
- ✅ GNSS tích hợp → không cần GPS riêng
- ✅ Tiết kiệm năng lượng (có thể sleep)
- ✅ Hỗ trợ MQTT/HTTP
- ✅ Phù hợp với yêu cầu đồ án

**Lưu ý quan trọng:**

- Sử dụng UART thay vì USB (đơn giản hơn, phù hợp đồ án)
- Quản lý sleep mode để tiết kiệm năng lượng
- Xử lý lỗi và retry mechanism
