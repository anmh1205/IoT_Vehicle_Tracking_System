# CHƯƠNG 2. PHÂN TÍCH VẤN ĐỀ KỸ THUẬT

## 2.1. Mô tả vấn đề – Problem statement

### 2.1.1. Bối cảnh thực tế

Trong bối cảnh ngành cho thuê ô tô và quản lý đội xe tại Việt Nam ngày càng phát triển, nhu cầu giám sát và theo dõi phương tiện theo thời gian thực đã trở thành yêu cầu thiết yếu đối với doanh nghiệp vận tải. Theo thống kê của Bộ Giao thông Vận tải, số lượng phương tiện ô tô cá nhân và thương mại tăng trung bình 10–12% mỗi năm trong giai đoạn 2020–2025, qua đó làm gia tăng các thách thức về quản lý, an ninh và tối ưu vận hành [1].
Hiện nay, phần lớn các doanh nghiệp cho thuê xe và quản lý đội xe tại Việt Nam vẫn sử dụng các phương pháp giám sát thủ công hoặc bán tự động, dẫn đến nhiều bất cập:

- **Giám sát thủ công**: Tài xế báo cáo vị trí qua điện thoại, không có dữ liệu liên tục, không thể xác minh chính xác hành trình. Phương pháp này phụ thuộc hoàn toàn vào yếu tố con người, dễ xảy ra sai sót và gian lận.
- **Thiết bị GPS đơn giản**: Chỉ cung cấp tọa độ vị trí, không đọc được dữ liệu động cơ (tốc độ, vòng tua, nhiên liệu), không hỗ trợ phát hiện bất thường khi xe đậu. Thiếu khả năng tích hợp sâu với hệ thống quản lý.
- **Giải pháp thương mại (fleet management)**: Chi phí cao (50–200 USD/thiết bị + phí dịch vụ hàng tháng), phụ thuộc vào nhà cung cấp nước ngoài, khó tùy biến theo nhu cầu cụ thể của doanh nghiệp Việt Nam.

### 2.1.2. Xác định vấn đề kỹ thuật

Từ bối cảnh thực tiễn nêu trên, đề tài tập trung giải quyết bài toán thiết kế và xây dựng một hệ thống IoT toàn diện cho giám sát phương tiện, với các vấn đề kỹ thuật cốt lõi sau:

**Vấn đề 1: Quản lý năng lượng trong môi trường ô tô**

Thiết bị tracker cần hoạt động liên tục 24/7 trong môi trường ô tô với nhiều ràng buộc về năng lượng. Khi xe tắt máy (IGN OFF), thiết bị lấy điện từ ắc quy 12V hoặc 24V của xe. Nếu hoạt động liên tục (real-time tracking), thiết bị sẽ rút cạn ắc quy trong vài tuần, ảnh hưởng khả năng khởi động xe [2]. Đây là thách thức lớn nhất của các hệ thống GPS tracker hiện tại.

**Vấn đề 2: Giám sát khi xe đậu (Parking Mode)**

Khi xe tắt máy, hệ thống cần vừa tiết kiệm điện vừa có khả năng phát hiện chuyển động bất thường (trộm, kéo cẩu). Cần một cơ chế "thức dậy" (wake-up) nhanh khi có cảnh báo, đồng thời duy trì tiêu thụ năng lượng ở mức tối thiểu (micro-ampere).

**Vấn đề 3: Truyền dữ liệu qua mạng di động**

Hệ thống cần truyền dữ liệu GPS và OBD2 liên tục qua mạng 4G/LTE với độ trễ thấp, đồng thời xử lý các tình huống mất kết nối mạng (offline buffering). Việc chọn giao thức truyền thông phù hợp (MQTT, HTTP, CoAP) ảnh hưởng trực tiếp đến hiệu suất và độ tin cậy của hệ thống.

**Vấn đề 4: Kiến trúc đám mây có khả năng mở rộng**

Hệ thống cần hỗ trợ nhiều phương tiện đồng thời, cập nhật vị trí theo thời gian thực qua WebSocket, đảm bảo bảo mật thông qua xác thực phiên (session-based authentication), và xử lý luồng dữ liệu lớn từ nhiều thiết bị IoT.

### 2.1.3. Mục tiêu kỹ thuật

Đề tài đặt ra các mục tiêu kỹ thuật cụ thể như sau:

1. Thiết kế thiết bị tracker tích hợp GPS/GNSS và OBD2 dựa trên vi điều khiển ESP32-S3, tiêu thụ năng lượng tối thiểu khi xe đậu (dưới 15 µA trong chế độ deep sleep).
2. Xây dựng hệ thống quản lý năng lượng thông minh với pin dự phòng, cơ chế Low Voltage Disconnect (LVD) bảo vệ ắc quy xe.
3. Thiết kế kiến trúc truyền thông sử dụng giao thức MQTT qua mạng 4G/LTE, hỗ trợ lưu trữ tạm (offline buffering) khi mất kết nối.
4. Phát triển nền tảng đám mây (cloud platform) với khả năng mở rộng, bao gồm API server, cơ sở dữ liệu quan hệ và chuỗi thời gian (time-series), giao diện web theo dõi thời gian thực.

## 2.2. Bối cảnh và cơ sở kỹ thuật – Background and Technical reviews

### 2.2.1. Tổng quan về hệ thống IoT trong giám sát phương tiện

Internet of Things (IoT) là một mô hình công nghệ cho phép các thiết bị vật lý kết nối với nhau và với hệ thống đám mây thông qua mạng Internet. Trong lĩnh vực giám sát phương tiện, hệ thống IoT thường bao gồm ba lớp chính [3]:

- **Lớp cảm biến và thu thập dữ liệu (Perception Layer)**: Bao gồm các cảm biến GPS/GNSS, gia tốc kế (IMU), giao diện OBD2, và các cảm biến môi trường. Lớp này chịu trách nhiệm thu thập dữ liệu thô từ phương tiện.
- **Lớp mạng và truyền thông (Network Layer)**: Sử dụng các giao thức truyền thông như MQTT, HTTP, CoAP qua hạ tầng mạng di động (4G/LTE) để truyền dữ liệu từ thiết bị lên đám mây.
- **Lớp ứng dụng và xử lý (Application Layer)**: Bao gồm các dịch vụ đám mây (MQTT broker, API server, cơ sở dữ liệu) và giao diện người dùng (web dashboard, ứng dụng di động).

### 2.2.2. Các giải pháp giám sát phương tiện hiện có

[Bảng 2.1: So sánh các giải pháp giám sát phương tiện]

| Tiêu chí                     | Giám sát thủ công       | GPS Tracker đơn giản    | Fleet Management thương mại | Hệ thống đề xuất               |
| ---------------------------- | ----------------------- | ----------------------- | --------------------------- | ------------------------------ |
| Chi phí thiết bị             | Không                   | 500.000–1.500.000 VND | 1.000.000–5.000.000 VND   | 870.000–1.630.000 VND        |
| Phí dịch vụ hàng tháng       | Không                   | 50.000–100.000 VND    | 200.000–500.000 VND       | Chi phí 4G SIM (~70.000 VND)   |
| Độ chính xác vị trí          | Thấp (báo cáo thủ công) | Trung bình (GPS)        | Cao (GPS + A-GPS)           | Cao (GNSS đa hệ thống)         |
| Dữ liệu động cơ (OBD2)       | Không                   | Không                   | Có (tùy model)              | Có (BLE OBD2)                  |
| Phát hiện bất thường khi đậu | Không                   | Hạn chế                 | Có                          | Có (IMU + deep sleep)          |
| Khả năng tùy biến            | Không áp dụng           | Thấp                    | Thấp (phụ thuộc vendor)     | Cao (mã nguồn mở)              |
| Quản lý năng lượng           | Không áp dụng           | Cơ bản                  | Tốt                         | Tốt (đa chế độ + pin dự phòng) |
| Tích hợp hệ thống            | Không                   | Hạn chế (API riêng)     | API do vendor               | API mở (REST + WebSocket)      |

Từ bảng so sánh trên có thể nhận thấy giải pháp đề xuất kết hợp được các ưu điểm của hệ thống thương mại (độ chính xác cao, hỗ trợ dữ liệu OBD2, khả năng phát hiện bất thường) đồng thời duy trì chi phí thấp hơn và mức tùy biến cao hơn. Vì vậy, phương án này phù hợp với nhu cầu của doanh nghiệp cho thuê xe tại Việt Nam.

### 2.2.3. So sánh giao thức truyền thông IoT

Việc lựa chọn giao thức truyền thông là một quyết định kỹ thuật trọng yếu vì tác động trực tiếp đến hiệu suất, độ tin cậy và mức tiêu thụ năng lượng của toàn hệ thống [4].

[Bảng 2.2: So sánh các giao thức truyền thông IoT]

| Tiêu chí                 | MQTT                | HTTP/REST                     | CoAP                                |
| ------------------------ | ------------------- | ----------------------------- | ----------------------------------- |
| Mô hình truyền thông     | Publish/Subscribe   | Request/Response              | Request/Response                    |
| Giao thức tầng giao vận  | TCP                 | TCP                           | UDP                                 |
| Overhead header          | 2 bytes (tối thiểu) | Hàng trăm bytes               | 4 bytes                             |
| Chất lượng dịch vụ (QoS) | 3 mức (0, 1, 2)     | Không có                      | 2 mức (Confirmable/Non-confirmable) |
| Tiêu thụ băng thông      | Thấp                | Cao                           | Thấp                                |
| Hỗ trợ bi-directional    | Có (Subscribe)      | Không (cần Polling/WebSocket) | Có (Observe)                        |
| Phù hợp cho IoT          | Rất tốt             | Trung bình                    | Tốt                                 |
| Độ phổ biến              | Rất cao             | Rất cao                       | Trung bình                          |
| Hỗ trợ EMQX Broker       | Có (native)         | Có (qua plugin)               | Hạn chế                             |

**Phân tích lựa chọn:** Giao thức MQTT được lựa chọn cho hệ thống này vì các lý do sau:

- **Overhead thấp**: Header tối thiểu 2 bytes, giảm băng thông và tiết kiệm năng lượng cho thiết bị IoT chạy bằng pin.
- **Mô hình Publish/Subscribe**: Cho phép nhiều subscriber nhận dữ liệu đồng thời mà không tăng tải cho thiết bị gửi. Phù hợp với kiến trúc đa client (web dashboard, mobile app, dịch vụ xử lý dữ liệu).
- **QoS linh hoạt**: QoS 0 cho dữ liệu telemetry tần suất cao (vị trí GPS), QoS 1 cho cảnh báo và lệnh điều khiển, đảm bảo tin nhắn được gửi ít nhất một lần.
- **Retain Message và Last Will**: Hỗ trợ lưu trữ tin nhắn cuối cùng và thông báo tự động khi thiết bị mất kết nối, rất hữu ích cho việc giám sát trạng thái online/offline của tracker.

### 2.2.4. So sánh vi điều khiển (MCU)

[Bảng 2.3: So sánh các vi điều khiển cho ứng dụng IoT tracker]

| Tiêu chí               | ESP32-S3                       | STM32L4                  | Raspberry Pi Zero 2W             |
| ---------------------- | ------------------------------ | ------------------------ | -------------------------------- |
| Kiến trúc              | Xtensa LX7, dual-core, 240 MHz | ARM Cortex-M4, 80 MHz    | ARM Cortex-A53, quad-core, 1 GHz |
| RAM                    | 512 KB SRAM + 8 MB PSRAM       | 256 KB SRAM              | 512 MB DRAM                      |
| BLE                    | BLE 5.0 (tích hợp)             | Không (cần module ngoài) | BLE 5.0 (tích hợp)               |
| Wi-Fi                  | 802.11 b/g/n (tích hợp)        | Không                    | 802.11 b/g/n (tích hợp)          |
| Tiêu thụ deep sleep    | 10–15 µA                      | 1–2 µA                  | Không hỗ trợ deep sleep          |
| Giá thành (VND)        | 80.000–150.000               | 150.000–300.000        | 400.000–600.000                |
| Framework phát triển   | Arduino / ESP-IDF              | STM32CubeIDE / Mbed      | Linux / Python                   |
| Cộng đồng hỗ trợ       | Rất lớn                        | Lớn                      | Rất lớn                          |
| Độ phù hợp cho tracker | Cao                            | Trung bình               | Thấp                             |

**Phân tích lựa chọn:** ESP32-S3 được lựa chọn làm vi điều khiển chính vì:

- **BLE 5.0 tích hợp**: Kết nối trực tiếp với OBD2 adapter (vgate iCar Pro) mà không cần module BLE ngoài, giảm độ phức tạp phần cứng và chi phí.
- **Chi phí thấp**: Rẻ hơn 30–50% so với STM32L4 với cùng khả năng xử lý, phù hợp với ngân sách đồ án.
- **Hệ sinh thái phát triển phong phú**: Hỗ trợ ESP-IDF (chính thức) và Arduino framework, cộng đồng lớn, nhiều thư viện có sẵn cho MQTT, BLE, GNSS.
- **Deep sleep 10–15 µA**: Mặc dù cao hơn STM32L4 (1–2 µA), mức này vẫn chấp nhận được cho ứng dụng tracker với pin dự phòng 5000mAh, cho phép hoạt động 2–3 tháng trong chế độ đậu xe.

### 2.2.5. So sánh cơ sở dữ liệu

[Bảng 2.4: So sánh các giải pháp cơ sở dữ liệu cho hệ thống IoT]

| Tiêu chí                            | PostgreSQL + VictoriaMetrics   | MongoDB + InfluxDB                   | TimescaleDB                  |
| ----------------------------------- | ------------------------------ | ------------------------------------ | ---------------------------- |
| Dữ liệu quan hệ (users, vehicles)   | Rất tốt (PostgreSQL)           | Trung bình (MongoDB)                 | Tốt (PostgreSQL core)        |
| Dữ liệu chuỗi thời gian (telemetry) | Rất tốt (VictoriaMetrics)      | Tốt (InfluxDB)                       | Tốt (TimescaleDB extension)  |
| Hiệu suất ghi (write)               | Cao (VM: hàng triệu điểm/giây) | Cao (InfluxDB: hàng triệu điểm/giây) | Trung bình                   |
| Nén dữ liệu                         | Rất tốt (VM: 10–70x nén)       | Tốt (InfluxDB: TSM)                  | Tốt (PostgreSQL compression) |
| Tài nguyên tiêu thụ                 | Thấp (VM: 1–2 GB RAM)          | Cao (InfluxDB: 4+ GB RAM)            | Trung bình                   |
| Ngôn ngữ truy vấn                   | SQL (PG) + MetricsQL (VM)      | MongoDB Query + Flux/InfluxQL        | SQL                          |
| Tích hợp Grafana                    | Có (native)                    | Có                                   | Có                           |
| Giấy phép                           | Apache 2.0                     | SSPL (MongoDB) + MIT (InfluxDB OSS)  | Apache 2.0 (Community)       |
| Độ phức tạp vận hành                | Trung bình (2 hệ thống riêng)  | Cao (2 hệ thống khác nhau)           | Thấp (1 hệ thống)            |

**Phân tích lựa chọn:** Sự kết hợp PostgreSQL + VictoriaMetrics được chọn vì:

- **Phân tách trách nhiệm rõ ràng**: PostgreSQL xử lý dữ liệu quan hệ (người dùng, phương tiện, cảnh báo, geofence), VictoriaMetrics xử lý dữ liệu chuỗi thời gian (tọa độ GPS, dữ liệu OBD2, telemetry cảm biến). Mỗi hệ thống được tối ưu cho loại dữ liệu của mình.
- **Hiệu suất và tài nguyên**: VictoriaMetrics có tỷ lệ nén dữ liệu rất cao (10–70x) và tiêu thụ ít RAM hơn InfluxDB, phù hợp với server có tài nguyên hạn chế.
- **Tương thích Grafana**: Cả hai đều hỗ trợ Grafana native, cho phép xây dựng dashboard giám sát toàn diện mà không cần công cụ bổ sung.

![Hình 2.1 - Sơ đồ kiến trúc dữ liệu của hệ thống - Data Architecture Diagram](./assets/figures/02-chuong-2-phan-tich-hinh-2–1.png)

*Hình 2.1: Sơ đồ kiến trúc dữ liệu của hệ thống - Data Architecture Diagram*

> Nguồn: Hình vẽ của tác giả

## 2.3. Yêu cầu kỹ thuật và các tiêu chuẩn thiết kế – Design criteria and Constraints

### 2.3.1. Yêu cầu chức năng

Hệ thống cần đáp ứng các yêu cầu chức năng sau:

**FC-01: Theo dõi vị trí thời gian thực**
- Gửi vị trí GPS định kỳ (5–30 giây khi lái xe, 10–30 phút khi đậu xe)
- Độ chính xác vị trí: dưới 5 mét trong điều kiện trời quang
- Hỗ trợ đa hệ thống định vị (GPS, GLONASS, BeiDou)

**FC-02: Đọc dữ liệu động cơ qua OBD2**
- Kết nối BLE với OBD2 adapter (vgate iCar Pro)
- Đọc trạng thái IGN (bật/tắt máy), RPM, tốc độ, nhiên liệu
- Tần suất đọc: 1–5 giây khi xe chạy

**FC-03: Phát hiện bất thường khi đậu xe**
- IMU (LIS3DH) phát hiện chuyển động/rung bất thường
- Đánh thức ESP32 từ deep sleep trong vòng 100ms
- Gửi cảnh báo ưu tiên (priority alert) lên server

**FC-04: Quản lý năng lượng thông minh**
- Chuyển đổi giữa 3 chế độ: Lái xe (Active) - Đậu xe (Sleep) - Cảnh báo (Alert)
- Pin dự phòng tự động tiếp quản theo profile nguồn: hệ 12V tại ngưỡng Switch_OFF=12.0V, hệ 24V tại ngưỡng Switch_OFF=24.0V
- Low Voltage Disconnect bảo vệ ắc quy không bị rút cạn: profile 12V dùng LVD_cut=11.5V, profile 24V dùng LVD_cut=23.0V

**FC-05: Giao diện web giám sát**
- Bản đồ thời gian thực (Leaflet) hiển thị vị trí tất cả phương tiện
- Biểu đồ dữ liệu OBD2 (ECharts) - tốc độ, RPM, nhiên liệu
- Hệ thống cảnh báo và thông báo (alert notifications)
- Quản lý phương tiện, tài xế, khách hàng, hành trình

### 2.3.2. Yêu cầu phi chức năng

**NFR-01: Hiệu suất (Performance)**
- Độ trễ end-to-end (thiết bị đến dashboard): dưới 3 giây trong điều kiện mạng bình thường
- API response time: dưới 200ms cho 95% request
- Hỗ trợ đồng thời tối thiểu 50 phương tiện kết nối MQTT

**NFR-02: Độ tin cậy (Reliability)**
- Lưu trữ tạm dữ liệu khi mất kết nối mạng (offline buffering trên thiết bị)
- Tự động kết nối lại (reconnect) khi mạng phục hồi
- MQTT QoS 1 cho các tin nhắn cảnh báo (đảm bảo gửi ít nhất một lần)

**NFR-03: Bảo mật (Security)**
- Xác thực phiên (session-based authentication) với token được hash SHA-256
- MQTT ACL (Access Control List) phân quyền theo từng thiết bị
- Mã hóa TLS cho kết nối MQTT và HTTPS trong môi trường sản xuất

**NFR-04: Khả năng mở rộng (Scalability)**
- Kiến trúc microservices với Docker container độc lập
- MQTT broker (EMQX) hỗ trợ phân cụm (clustering) để mở rộng
- Cơ sở dữ liệu chuỗi thời gian (VictoriaMetrics) tối ưu cho luồng dữ liệu lớn

**NFR-05: Khả năng bảo trì (Maintainability)**
- Mã nguồn tổ chức theo mô hình Domain-Driven Design (DDD)
- API RESTful với tài liệu Swagger/OpenAPI tự động
- Logging tập trung với VictoriaLogs và dashboard Grafana

### 2.3.3. Ràng buộc thiết kế

**Ràng buộc phần cứng:**
- Điện áp đầu vào: 12V hoặc 24V DC từ ắc quy xe (dao động phụ thuộc cấu hình hệ thống điện)
- Nhiệt độ hoạt động: -10 độ C đến 70 độ C (môi trường trong xe ô tô)
- Rung động và sốc: Chịu được rung động liên tục khi xe vận hành trên đường xá
- Kích thước: Đủ nhỏ để lắp đặt kín đáo trong xe (không lớn hơn 120x80x40 mm)

**Ràng buộc phần mềm:**
- Backend framework: Express.js + TypeScript (yêu cầu từ công nghệ hiện có của nhóm)
- Frontend framework: Next.js 15 + React 19 (yêu cầu học thuật)
- MQTT Broker: EMQX (giấy phép mã nguồn mở, hỗ trợ rules engine)
- Triển khai: Docker Compose trên máy chủ Linux (mỗi dịch vụ có docker-compose.yml riêng)

**Ràng buộc về chi phí:**
- Tổng chi phí phần cứng: dưới 2.000.000 VND cho một bộ tracker
- Sử dụng các module có sẵn trên thị trường Việt Nam (Shopee, Lazada)
- Ưu tiên các giải pháp mã nguồn mở để giảm chi phí giấy phép

### 2.3.4. Tiêu chuẩn thiết kế áp dụng

| Tiêu chuẩn                | Mô tả                   | Áp dụng trong hệ thống             |
| ------------------------- | ----------------------- | ---------------------------------- |
| IEEE 802.15.1 (Bluetooth) | Chuẩn BLE 4.0/5.0       | Kết nối OBD2 adapter               |
| 3GPP LTE Cat-1            | Chuẩn 4G/LTE            | Truyền dữ liệu qua modem A7670C |
| NMEA 0183                 | Chuẩn dữ liệu GPS       | Phân tích tọa độ từ module GNSS    |
| SAE J1979 (OBD2)          | Chuẩn chẩn đoán động cơ | Đọc dữ liệu qua OBD2 BLE adapter   |
| MQTT v5.0 (OASIS)         | Giao thức IoT messaging | Truyền dữ liệu thiết bị - server   |
| REST (RFC 7231)           | Kiến trúc API           | Backend API server                 |
| OAuth 2.0 / Session Auth  | Chuẩn xác thực          | Xác thực người dùng và thiết bị    |

## 2.4. Yêu cầu từ các bên liên quan – Constituent's requirements

### 2.4.1. Xác định các bên liên quan

Hệ thống IoT Vehicle Tracking System phục vụ nhiều nhóm đối tượng với nhu cầu và kỳ vọng khác nhau. Vì vậy, việc phân tích yêu cầu từ các bên liên quan (stakeholders) là cơ sở để bảo đảm thiết kế có tính toàn diện và bám sát nhu cầu thực tiễn.

### 2.4.2. Ma trận yêu cầu các bên liên quan

[Bảng 2.5: Ma trận yêu cầu các bên liên quan]

| STT | Bên liên quan                   | Vai trò                | Yêu cầu chính                                                                                                                                                                                   | Mức độ ưu tiên |
| --- | ------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | Công ty cho thuê xe             | Chủ sở hữu hệ thống    | Giám sát vị trí tất cả xe theo thời gian thực; Nhận cảnh báo khi xe đi ra khỏi vùng cho phép (geofence); Báo cáo hành trình, quãng đường, nhiên liệu; Giảm thiểu thời gian xe đậu không sử dụng | Cao            |
| 2   | Tài xế / Người thuê xe          | Người vận hành xe      | Không bị giám sát quá mức (quyền riêng tư); Thiết bị không ảnh hưởng đến vận hành xe; Không rút cạn ắc quy xe                                                                                   | Trung bình     |
| 3   | Quản trị viên hệ thống          | Người quản lý kỹ thuật | Giao diện quản lý dễ sử dụng; Hệ thống ổn định, ít lỗi; Có khả năng theo dõi trạng thái thiết bị (online/offline); Quản lý người dùng và phân quyền                                             | Cao            |
| 4   | Đội bảo trì                     | Kỹ thuật viên          | Thiết bị dễ lắp đặt và bảo trì; Chẩn đoán lỗi từ xa (remote diagnostics); Cảnh báo bảo trì định kỳ (battery low, thiết bị offline)                                                              | Trung bình     |
| 5   | Khách hàng (người thuê xe cuối) | Người dùng gián tiếp   | Quá trình thuê xe nhanh gọn; Tin tưởng vào độ bảo mật của dữ liệu cá nhân; Nhận thông báo về trạng thái đơn thuê                                                                                | Thấp (Phase 2) |

### 2.4.3. Phân tích chi tiết yêu cầu

**Công ty cho thuê xe (Stakeholder chính)**

Đây là nhóm đối tượng trọng tâm của hệ thống. Các yêu cầu của nhóm này tập trung vào ba khía cạnh:

1. *Giám sát và an ninh*: Theo dõi vị trí phương tiện 24/7, phát hiện và cảnh báo ngay khi có bất thường (xe bị di chuyển trái phép, vượt qua geofence, tốc độ vượt ngưỡng). Hệ thống cần gửi thông báo qua nhiều kênh (web dashboard, Telegram bot, email).

2. *Báo cáo và phân tích*: Xuất báo cáo hành trình chi tiết (quãng đường, thời gian, điểm dừng), thống kê nhiên liệu tiêu thụ, đánh giá hành vi lái xe (tốc độ trung bình, số lần phanh gấp). Các báo cáo này giúp tối ưu hóa chi phí vận hành và bảo trì.

3. *Quản lý đội xe*: Quản lý trạng thái từng phương tiện (đang cho thuê, đang bảo trì, sẵn sàng), lịch bảo trì định kỳ dựa trên số km hoặc thời gian, lịch sử cho thuê và doanh thu theo phương tiện.

**Quản trị viên hệ thống**

Yêu cầu của quản trị viên tập trung vào khả năng vận hành và giám sát hệ thống:

1. *Dashboard tổng quan*: Hiển thị trạng thái tất cả thiết bị (online/offline, mức pin, cường độ tín hiệu), số lượng phương tiện đang hoạt động, cảnh báo chưa xử lý.

2. *Quản lý thiết bị*: Thêm/xóa/sửa thông tin thiết bị tracker, cấp phát thiết bị cho phương tiện, gửi lệnh điều khiển từ xa (reset, cập nhật cấu hình, yêu cầu vị trí).

3. *Quản lý người dùng*: Tạo tài khoản, phân quyền (admin, manager, viewer), theo dõi lịch sử đăng nhập và thao tác (audit log).

**Đội bảo trì**

Yêu cầu của đội bảo trì hướng đến việc giảm thời gian và chi phí bảo trì:

1. *Chẩn đoán từ xa*: Xem trạng thái thiết bị (mức pin, nhiệt độ, cường độ tín hiệu 4G) từ xa, phát hiện và cảnh báo khi thiết bị gặp lỗi (mất kết nối kéo dài, pin yếu).

2. *Hướng dẫn lắp đặt*: Tài liệu hướng dẫn lắp đặt chi tiết, danh sách kiểm tra (checklist) khi lắp đặt mới hoặc bảo trì.

### 2.4.4. Ma trận truy xuất yêu cầu - chức năng

[Bảng 2.6: Ma trận truy xuất yêu cầu các bên liên quan với chức năng hệ thống]

| Yêu cầu bên liên quan  | FC-01 (Vị trí) | FC-02 (OBD2) | FC-03 (Bất thường) | FC-04 (Năng lượng) | FC-05 (Web) |
| ---------------------- | -------------- | ------------ | ------------------ | ------------------ | ----------- |
| Giám sát vị trí 24/7   | X              |              |                    | X                  | X           |
| Cảnh báo geofence      | X              |              |                    |                    | X           |
| Báo cáo nhiên liệu     |                | X            |                    |                    | X           |
| Phát hiện trộm xe      |                |              | X                  | X                  | X           |
| Không rút cạn ắc quy   |                |              |                    | X                  |             |
| Quản lý thiết bị từ xa |                |              |                    |                    | X           |
| Chẩn đoán lỗi từ xa    | X              | X            |                    | X                  | X           |

Ma trận truy xuất trên cho thấy các chức năng hệ thống (FC-01 đến FC-05) bao phủ toàn bộ yêu cầu của các bên liên quan chính. Trong đó, FC-04 (Quản lý năng lượng) và FC-05 (Giao diện web) là hai chức năng được nhắc đến nhiều nhất, qua đó khẳng định tầm quan trọng của thiết kế quản lý năng lượng thông minh và giao diện giám sát thân thiện.

---

## Kết luận chương 2

Chương này đã hệ thống hóa các vấn đề kỹ thuật trọng yếu trong xây dựng hệ thống IoT giám sát phương tiện, bao quát từ phần cứng, truyền thông, xử lý dữ liệu đến kiến trúc hệ thống. Trên cơ sở khảo sát và đối sánh các giải pháp hiện có, chương đã xác lập hướng tiếp cận phù hợp, đồng thời cụ thể hóa yêu cầu kỹ thuật, ràng buộc thiết kế và ma trận truy xuất yêu cầu từ các bên liên quan. Các kết quả phân tích này là cơ sở trực tiếp để xây dựng và lựa chọn phương án thiết kế ở Chương 3.
