## III.1.4 Module LTE: SIMCom A7670C

### Tổng Quan

**SIMCom A7670C** là modem **LTE Cat-1 thuần túy**, được chọn cho vai trò kết nối cellular của tracker.

> **Điểm quan trọng:** A7670C **không tích hợp GNSS**. Toàn bộ dữ liệu vị trí trong kiến trúc hiện tại đến từ **u-blox NEO-M8N** qua UART riêng.

Thiết kế phần cứng hiện tại vì vậy dùng mô hình:

- **A7670C** → LTE / MQTT / HTTP / PPP
- **NEO-M8N** → GNSS / NMEA / UBX

### Đặc Tính Kỹ Thuật Chính

| Thông số | Giá trị |
| -------- | ------- |
| Loại | LTE Cat-1 module |
| Cellular | LTE + GSM fallback |
| GNSS tích hợp | **Không có** |
| Giao tiếp chính | UART, USB, SIM |
| Điện áp hoạt động | 3.4V–4.2V (typ. 3.8V) |
| Nhiệt độ | -40°C đến +85°C |
| Ứng dụng phù hợp | Telematics, IoT tracker, telemetry |

### Vai Trò Trong Hệ Thống

Trong tracker, A7670C đảm nhiệm:

1. Đăng ký mạng cellular
2. Thiết lập PDP context
3. Thực hiện MQTT/HTTP/TLS
4. Truyền telemetry từ ESP32-S3 lên backend
5. Hỗ trợ sleep/PSM để tối ưu năng lượng

A7670C **không** đảm nhiệm:

- đọc dữ liệu GNSS
- parse toạ độ
- quản lý NMEA
- giữ GNSS fix khi LTE sleep

Các phần này thuộc về **NEO-M8N**.

### Lý Do Chọn A7670C

#### 1. Phù hợp kiến trúc tách LTE và GNSS

- Giảm coupling giữa modem và định vị
- Dễ bật/tắt riêng LTE hoặc GNSS theo từng state
- Giúp firmware refactor rõ ràng hơn

#### 2. Đủ năng lực cho telemetry

- LTE Cat-1 phù hợp bài toán tracker
- Băng thông đủ cho MQTT/rawdata/alerts
- Hỗ trợ AT commands quen thuộc

#### 3. Dễ tích hợp với ESP32-S3

- Giao tiếp UART đơn giản
- Tài liệu, ví dụ và quy trình bring-up rõ ràng
- Phù hợp prototype và kế hoạch firmware hiện tại

#### 4. Tối ưu năng lượng tốt hơn thiết kế tích hợp cũ

- Có thể cho modem sleep/PSM trong lúc GNSS vẫn chạy độc lập nếu cần
- Tránh để modem mang luôn overhead GNSS khi không cần truyền dữ liệu

### Kết Nối Mục Tiêu Với ESP32-S3

#### UART và điều khiển nguồn

| Tín hiệu A7670C | Vai trò | ESP32-S3 mục tiêu |
| --------------- | ------- | ----------------- |
| UART_TX | Dữ liệu từ modem | GPIO17 (UART1 RX) |
| UART_RX | Dữ liệu tới modem | GPIO18 (UART1 TX) |
| PWRKEY | Bật/tắt modem | GPIO4 |
| RESET | Reset phần cứng | GPIO5 |
| RI / STATUS | Wake/status | GPIO6/GPIO7 |
| EN (nguồn modem) | Enable rail 3.8V | GPIO14 |

> Pin mapping trên là **mục tiêu kiến trúc** cho tài liệu/plan. Firmware source hiện tại chưa phản ánh đầy đủ mapping này.

### Quan Hệ Với NEO-M8N

A7670C được dùng cùng **NEO-M8N** theo kiến trúc hai module:

| Module | Nhiệm vụ | Giao tiếp với ESP32-S3 |
| ------ | -------- | ---------------------- |
| A7670C | LTE, MQTT, HTTP, PPP | UART1 |
| NEO-M8N | GNSS, NMEA, vị trí | UART2 |

Điều này cho phép:

- reset modem mà không làm mất logic GNSS độc lập
- refactor firmware thành `modem_lte` và `gnss` rõ ràng hơn
- tránh dùng các lệnh GNSS của modem tích hợp cũ

### So Sánh Với A7600CE-T

| Tiêu chí | A7600CE-T | A7670C + NEO-M8N |
| -------- | --------- | ---------------- |
| LTE | Có | Có |
| GNSS | Tích hợp trong modem | Tách thành module riêng |
| Firmware GNSS | AT command modem | UART GNSS riêng |
| Coupling | Cao | Thấp hơn |
| Khả năng quản lý nguồn | Chung modem + GNSS | Tách riêng LTE/GNSS |

### Tác Động Tới Firmware

Thiết kế này kéo theo các thay đổi trong firmware plan:

- bỏ giả định `AT+CGNSPWR`, `AT+CGNSINF` là luồng GNSS chính
- bổ sung UART GNSS riêng cho NEO-M8N
- tách lifecycle LTE connect/disconnect khỏi GNSS tracking
- tách task/parser cho NMEA/UBX

### Current Gap vs Target

Tài liệu phần cứng đã chuẩn hóa theo A7670C + NEO-M8N, nhưng baseline code hiện tại còn gap:

- `iot-vehicle-tracking-system/Tracking_Firmware/main/src/modem_gnss.c` vẫn dùng `AT+CGNSPWR` / `AT+CGNSINF`
- `iot-vehicle-tracking-system/Tracking_Firmware/main/inc/pin_map.h` chưa có UART GNSS riêng
- `iot-vehicle-tracking-system/Tracking_Firmware/main/src/state_machine.c` còn coupling LTE và GNSS

Đợt hiện tại chỉ cập nhật **docs + plans**; source firmware sẽ được sửa ở đợt refactor riêng.

### Kết Luận

A7670C là lựa chọn phù hợp cho **đường truyền cellular** của hệ thống vì:

- đáp ứng tốt nhu cầu LTE telemetry
- dễ tích hợp với ESP32-S3
- phù hợp kiến trúc tách LTE/GNSS
- hỗ trợ kế hoạch refactor firmware về mô hình hai module

Phần định vị không còn thuộc về modem này mà được chuyển sang **NEO-M8N**.
