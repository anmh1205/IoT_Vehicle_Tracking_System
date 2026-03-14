# CHƯƠNG 5. ĐÁNH GIÁ VÀ KHUYẾN NGHỊ – EVALUATION AND RECOMMENDATION

## 5.1. Đánh giá hiệu năng

Chương này trình bày kết quả đánh giá toàn diện hệ thống IoT Vehicle Tracking System trên các khía cạnh: hiệu năng kỹ thuật, hiệu quả kinh tế - môi trường, rủi ro và khuyến nghị phát triển. Việc đánh giá dựa trên các tiêu chí cụ thể, có thể đo lường, nhằm cung cấp cái nhìn khách quan về chất lượng và khả năng ứng dụng thực tiễn của hệ thống.

### 5.1.1. Đánh giá hiệu năng phần cứng

Hệ thống phần cứng được đánh giá trên ba khía cạnh chính: quản lý năng lượng, kết nối BLE OBD2, và độ chính xác định vị GPS/GNSS.

**Quản lý năng lượng:**

Hệ thống quản lý năng lượng đa chế độ vận hành ổn định trong các kịch bản thử nghiệm. Mạch buck converter đầu vào 12V/24V (dải 7–40V) hạ áp xuống 5V rồi qua LDO 3.3V cho ESP32-S3, đạt hiệu suất tổng trên 90% ở điều kiện thử nghiệm profile 12V. Mạch Low Voltage Disconnect (LVD) và logic chuyển nguồn được chuẩn hóa theo hai profile: 12V (Switch_OFF=12.0V, Switch_ON=12.2V, IGN_ON>=13.0V, IGN_OFF<=12.0V) và 24V (Switch_OFF=24.0V, Switch_ON=24.4V, IGN_ON>=26.0V, IGN_OFF<=24.0V). Pin dự phòng 21700 (5000mAh) duy trì hoạt động độc lập khoảng 48–72 giờ ở chế độ cảnh báo và 2–3 tháng ở chế độ deep sleep.

[Bảng 5.1: Đánh giá hiệu năng quản lý năng lượng]

| Tiêu chí | Giá trị thiết kế | Giá trị thực tế | Đánh giá |
|---|---|---|---|
| Dòng tiêu thụ deep sleep | < 15 μA | 10–15 μA | Đạt yêu cầu |
| Dòng tiêu thụ driving mode | < 250 mA | 180–220 mA | Tốt |
| Thời gian hoạt động pin dự phòng (alert mode) | > 24 giờ | 48–72 giờ | Vượt yêu cầu |
| Hiệu suất buck converter | > 85% | 90–93% | Tốt |
| Ngưỡng LVD | Profile 12V: 12.0V; Profile 24V: 24.0V | 11.5V (± 0.1V) trên profile 12V | Chưa đạt (12V) |
| Thời gian chuyển chế độ (parking -> alert) | < 500 ms | 200–400 ms | Tốt |

**Kết nối BLE OBD2:**

Kết nối BLE với adapter vgate iCar Pro hoạt động ổn định sau khi thiết lập ban đầu. Thời gian kết nối BLE khi thiết bị đánh thức từ deep sleep dao động trong khoảng 1–3 giây, phụ thuộc trạng thái adapter. Các thông số OBD2 (RPM, tốc độ, nhiệt độ nước, mức nhiên liệu) được đọc thành công với độ chính xác cao, sai số dưới 2% so với đồng hồ táp-lô xe.

**Độ chính xác GPS/GNSS:**

GNSS tích hợp trên SIM7600CE-T cung cấp độ chính xác vị trí đạt mức chấp nhận được cho ứng dụng tracking xe. Sai số vị trí trung bình khoảng 2.5–5 mét trong điều kiện trời quang, và 5–15 mét trong điều kiện đô thị có nhiều tòa nhà cao tầng. Thời gian fix GPS cold start khoảng 30–60 giây, warm start khoảng 5–15 giây, và hot start dưới 3 giây.

### 5.1.2. Đánh giá hiệu năng firmware

Firmware xây dựng trên nền tảng ESP-IDF với hệ điều hành thời gian thực FreeRTOS được đánh giá theo các khía cạnh: khả năng đa nhiệm, máy trạng thái và cơ chế lưu trữ tạm.

**Đa nhiệm FreeRTOS:**

Kiến trúc đa nhiệm (multitasking) sử dụng FreeRTOS cho phép thực hiện đồng thời các tác vụ: đọc dữ liệu OBD2 qua BLE, xử lý định vị GPS, truyền dữ liệu MQTT, và giám sát năng lượng. Các task được phân bổ ưu tiên hợp lý, đảm bảo task truyền dữ liệu MQTT không bị block bởi task đọc OBD2 có độ trễ cao. Sử dụng message queue giữa các task giúp giao tiếp liên task an toàn và không bị race condition.

**Máy trạng thái (State Machine):**

Máy trạng thái ba chế độ (Driving, Parking, Alert) hoạt động chính xác trong các kịch bản thử nghiệm. Việc chuyển đổi giữa các trạng thái dựa trên tín hiệu IGN (ignition) và dữ liệu IMU LIS3DH được thực hiện trơn tru, không xảy ra tình trạng "state bouncing" nhờ cơ chế debounce và hysteresis. Thời gian chuyển từ Parking sang Alert khi phát hiện chuyển động bất thường dưới 500 ms, đảm bảo cảnh báo kịp thời.

**Lưu trữ tạm (Offline Buffering):**

Cơ chế lưu trữ tạm trên bộ nhớ flash của ESP32-S3 hoạt động hiệu quả khi mất kết nối 4G. Dữ liệu telemetry được lưu vào flash theo cấu trúc FIFO, đồng bộ lại server khi kết nối được phục hồi. Hệ thống có thể lưu trữ khoảng 500–1000 bản ghi telemetry offline, đủ cho 4–8 giờ mất kết nối ở tần suất gửi 30 giây/lần.

[Bảng 5.2: Đánh giá hiệu năng firmware]

| Tiêu chí | Giá trị thiết kế | Giá trị thực tế | Đánh giá |
|---|---|---|---|
| Số task FreeRTOS đồng thời | 5–7 task | 6 task | Đạt yêu cầu |
| Thời gian chuyển trạng thái | < 500 ms | 200–400 ms | Tốt |
| Dung lượng offline buffer | > 500 bản ghi | ~1000 bản ghi | Vượt yêu cầu |
| Tỷ lệ gửi thành công MQTT (QoS 1) | > 99% | 99.2–99.8% | Tốt |
| Thời gian đọc 1 PID OBD2 | < 200 ms | 100–150 ms | Tốt |
| Thời gian kết nối BLE sau wake-up | < 5 giây | 1–3 giây | Tốt |

### 5.1.3. Đánh giá hiệu năng hệ thống đám mây (Cloud)

**API Server (Tracking_Backend):**

API server xây dựng trên Express.js với TypeScript xử lý các request đồng thời hiệu quả. Trong điều kiện thử nghiệm với 50–100 thiết bị gửi dữ liệu đồng thời, thời gian phản hồi trung bình của các API endpoint dao động từ 20–80 ms cho các truy vấn đơn giản và 100–300 ms cho các truy vấn phức tạp có join nhiều bảng. Hệ thống sử dụng connection pooling cho PostgreSQL, giúp tối ưu hóa việc sử dụng kết nối cơ sở dữ liệu.

**MQTT Broker (EMQX):**

EMQX xử lý tin nhắn MQTT từ các thiết bị IoT với độ tin cậy cao. Broker hỗ trợ MQTT 5.0, cung cấp các tính năng như message expiry, topic alias, và user properties. Việc sử dụng EMQX Rules Engine cho phép xử lý và chuyển tiếp dữ liệu đến VictoriaMetrics (time-series) và PostgreSQL (dữ liệu quan hệ) một cách tự động, giảm tải cho API server.

**WebSocket thời gian thực:**

Kết nối WebSocket thông qua Socket.IO giữa backend và frontend cung cấp cập nhật vị trí xe theo thời gian thực với độ trễ dưới 2 giây (từ lúc thiết bị gửi dữ liệu MQTT đến khi hiển thị trên bản đồ). Độ trễ này bao gồm: thiết bị gửi MQTT (~200 ms qua 4G), EMQX xử lý và chuyển tiếp (~50 ms), backend xử lý và phát WebSocket (~100 ms), và frontend render (~100 ms). Phần còn lại là độ trễ mạng giữa các thành phần.

**Cơ sở dữ liệu:**

PostgreSQL 16 lưu trữ dữ liệu quan hệ (người dùng, xe, khách hàng, hành trình, cảnh báo, geofence) với hiệu suất truy vấn ổn định. VictoriaMetrics lưu trữ dữ liệu chuỗi thời gian (tọa độ GPS, dữ liệu OBD2) với hiệu suất ghi và đọc cao hơn so với InfluxDB truyền thống, đồng thời tiêu thụ ít tài nguyên hơn.

### 5.1.4. Đánh giá hiệu năng giao diện người dùng (Frontend)

Giao diện web xây dựng trên Next.js 15 với React 19 cung cấp trải nghiệm người dùng mượt mà. Dashboard hiển thị thông tin tổng quan đội xe với thời gian tải trang dưới 2 giây (First Contentful Paint). Bản đồ Leaflet cập nhật vị trí xe trơn tru khi nhận dữ liệu WebSocket, không bị giật lag khi hiển thị 50–100 xe đồng thời. Biểu đồ ECharts hiển thị dữ liệu telemetry (tốc độ, RPM, nhiệt độ) trực quan, hỗ trợ zoom và pan mượt mà.

[Bảng 5.3: Đánh giá hiệu năng tổng hợp hệ thống đám mây]

| Thành phần | Tiêu chí | Giá trị đo được | Đánh giá |
|---|---|---|---|
| API Server | Thời gian phản hồi trung bình | 20–80 ms (đơn giản), 100–300 ms (phức tạp) | Tốt |
| API Server | Số request đồng thời | 100–500 req/s | Đạt yêu cầu |
| MQTT Broker | Độ trễ xử lý message | < 50 ms | Tốt |
| WebSocket | Độ trễ end-to-end | < 2 giây | Đạt yêu cầu |
| Frontend | First Contentful Paint | < 2 giây | Tốt |
| Frontend | Số xe hiển thị đồng thời | 50–100 xe | Đạt yêu cầu |
| PostgreSQL | Thời gian truy vấn có index | < 50 ms | Tốt |
| VictoriaMetrics | Tốc độ ghi time-series | > 10.000 samples/s | Tốt |

---

## 5.2. Đánh giá kinh tế và môi trường

### 5.2.1. Phân tích chi phí phần cứng

Chi phí Bill of Materials (BOM) của thiết bị tracker IoT được tính toán dựa trên giá linh kiện mua lẻ tại thị trường Việt Nam. Mức giá này có thể giảm 20–30% khi mua số lượng lớn (> 100 bộ).

[Bảng 5.4: Chi phí BOM thiết bị tracker]

| Linh kiện | Vai trò | Giá (VND) |
|---|---|---|
| ESP32-S3-WROOM-1 module | Vi điều khiển chính | 80.000–150.000 |
| SIMCom SIM7600CE-T             | Modem LTE + GNSS tích hợp | 330.000–500.000 |
| vgate iCar Pro BLE | Adapter OBD2 BLE | 250.000–500.000 |
| Module cảm biến LIS3DH | Cảm biến gia tốc (IMU) | 30.000–50.000 |
| Pin 21700 (1 cell, 5000mAh) | Pin dự phòng | 80.000–120.000 |
| Mạch sạc TP4056 + MP2482/SX1308 + diode-OR | Quản lý năng lượng | 50.000–100.000 |
| PCB, vỏ hộp, dây cáp, linh kiện phụ | Cơ khí và kết nối | 130.000–260.000 |
| **Tổng cộng** | | **870.000–1.630.000** |

So sánh với các giải pháp thương mại trên thị trường cho thấy lợi thế chi phí rõ rệt của hệ thống đề xuất:

[Bảng 5.5: So sánh chi phí với giải pháp thương mại]

| Giải pháp | Chi phí thiết bị | Phí dịch vụ hàng tháng | Tổng chi phí năm đầu | Khả năng tùy biến |
|---|---|---|---|---|
| Hệ thống đề xuất | 870.000–1.630.000 VND | ~70.000 VND (SIM 4G) | 1.710.000–2.470.000 VND | Cao (mã nguồn mở) |
| GPS Tracker đơn giản (Việt Nam) | 500.000–1.500.000 VND | 50.000–100.000 VND | 1.100.000–2.700.000 VND | Thấp |
| Fleet Management thương mại (quốc tế) | 5.000.000–12.500.000 VND (~$200–500 USD) | 500.000–1.250.000 VND (~$20–50 USD/tháng) | 11.000.000–27.500.000 VND | Thấp (phụ thuộc vendor) |
| iTracking / Vietmap Tracking | 2.000.000–4.000.000 VND | 100.000–300.000 VND | 3.200.000–7.600.000 VND | Trung bình |

Như vậy, chi phí tổng thể của hệ thống đề xuất chỉ bằng khoảng 10–20% so với giải pháp fleet management thương mại quốc tế, và tương đương hoặc thấp hơn so với giải pháp GPS tracker đơn giản nhưng cung cấp nhiều tính năng hơn (OBD2, cảnh báo thông minh, quản lý năng lượng).

### 5.2.2. Phân tích chi phí hạ tầng đám mây

Chi phí vận hành hạ tầng đám mây phụ thuộc vào quy mô đội xe và mức độ sử dụng. Đối với doanh nghiệp nhỏ (10–50 xe), toàn bộ hệ thống có thể chạy trên một máy chủ ảo (VPS) duy nhất.

[Bảng 5.6: Chi phí hạ tầng đám mây theo quy mô]

| Quy mô đội xe | Cấu hình VPS | Chi phí VPS/tháng | Chi phí SIM 4G/tháng (tổng) | Tổng chi phí vận hành/tháng |
|---|---|---|---|---|
| 10–30 xe | 2 vCPU, 4GB RAM, 80GB SSD | ~250.000 VND (~$10 USD) | 700.000–2.100.000 VND | 950.000–2.350.000 VND |
| 30–100 xe | 4 vCPU, 8GB RAM, 160GB SSD | ~500.000 VND (~$20 USD) | 2.100.000–7.000.000 VND | 2.600.000–7.500.000 VND |
| 100–500 xe | Kubernetes cluster (3 node) | ~2.500.000 VND (~$100 USD) | 7.000.000–35.000.000 VND | 9.500.000–37.500.000 VND |

### 5.2.3. Lợi thế từ công nghệ mã nguồn mở

Toàn bộ technology stack của hệ thống sử dụng các công nghệ mã nguồn mở, giúp loại bỏ chi phí bản quyền phần mềm:

- **Express.js + TypeScript**: Framework backend miễn phí, cộng đồng lớn
- **Next.js 15 + React 19**: Framework frontend miễn phí, hỗ trợ Server Components
- **PostgreSQL 16**: Cơ sở dữ liệu quan hệ miễn phí, hiệu suất cao
- **EMQX (Open Source Edition)**: MQTT broker miễn phí, hỗ trợ clustering
- **VictoriaMetrics**: Cơ sở dữ liệu time-series miễn phí, hiệu suất vượt trội
- **ESP-IDF + FreeRTOS**: Framework firmware miễn phí, hỗ trợ chính thức từ Espressif

So với việc sử dụng các giải pháp thương mại (AWS IoT Core, Azure IoT Hub, hoặc các nền tảng fleet management SaaS), chi phí bản quyền và dịch vụ có thể lên tới 500.000–5.000.000 VND/tháng tùy quy mô, trong khi hệ thống đề xuất chỉ cần chi phí VPS cơ bản.

### 5.2.4. Đánh giá tác động môi trường

Hệ thống được thiết kế với ý thức tối ưu hóa tiêu thụ năng lượng, góp phần giảm tác động môi trường:

- **Tiêu thụ điện thấp**: Chế độ deep sleep 10–15 μA khi xe đậu giúp giảm điện năng tiêu thụ từ ắc quy xe, giảm tần suất sạc ắc quy và kéo dài tuổi thọ ắc quy.
- **Pin dự phòng giảm phụ thuộc ắc quy xe**: Khi xe đậu lâu ngày, thiết bị chuyển sang sử dụng pin dự phòng 21700, tránh rút điện từ ắc quy xe, bảo vệ ắc quy và giảm lượng khí thải từ việc sạc ắc quy.
- **Giảm số lần đi kiểm tra xe trực tiếp**: Nhờ khả năng giám sát từ xa, người quản lý không cần lái xe đến vị trí xe để kiểm tra, giảm lượng khí thải CO2 từ các chuyến đi không cần thiết.
- **Tối ưu hành trình**: Dữ liệu GPS và OBD2 giúp phân tích và tối ưu hành trình, giảm quãng đường đi không cần thiết, giảm tiêu thụ nhiên liệu và khí thải.

---

## 5.3. Đánh giá rủi ro và biện pháp giảm thiểu

### 5.3.1. Ma trận rủi ro

Để đánh giá toàn diện rủi ro của hệ thống, đồ án sử dụng ma trận xác suất - tác động (Probability-Impact Matrix) gồm 5 mức độ. Các rủi ro được xác định dựa trên phân tích kỹ thuật và kinh nghiệm triển khai thực tế.

[Bảng 5.7: Thang đo xác suất và tác động]

| Mức độ | Xác suất | Tác động |
|---|---|---|
| 1 - Rất thấp | < 5% | Ảnh hưởng không đáng kể, hệ thống vẫn hoạt động bình thường |
| 2 - Thấp | 5–15% | Ảnh hưởng nhỏ, có thể khắc phục nhanh |
| 3 - Trung bình | 15–30% | Ảnh hưởng vừa phải, cần xử lý trong thời gian ngắn |
| 4 - Cao | 30–50% | Ảnh hưởng lớn, có thể làm gián đoạn dịch vụ |
| 5 - Rất cao | > 50% | Ảnh hưởng nghiêm trọng, có thể làm tê liệt hệ thống |

[Bảng 5.8: Ma trận đánh giá rủi ro và biện pháp giảm thiểu]

| ID | Rủi ro | Xác suất | Tác động | Mức độ rủi ro | Biện pháp giảm thiểu | Trạng thái |
|---|---|---|---|---|---|---|
| R1 | Mất sóng 4G/LTE tại khu vực nông thôn, vùng sâu | 4 - Cao | 3 - Trung bình | **Cao** | Offline buffering trên flash, tự động đồng bộ khi có sóng, GPS cache vị trí cuối | Đã triển khai |
| R2 | Không tương thích BLE OBD2 với một số dòng xe | 2 - Thấp | 3 - Trung bình | **Trung bình** | Sử dụng vgate iCar Pro (tương thích rộng), hỗ trợ nhiều giao thức OBD2 (ISO 15765, ISO 14230, J1850) | Đã giảm thiểu |
| R3 | Quá tải MQTT broker khi số lượng thiết bị tăng cao | 2 - Thấp | 4 - Cao | **Trung bình** | EMQX hỗ trợ clustering, có thể mở rộng theo chiều ngang, Rules Engine phân tải xử lý | Có phương án |
| R4 | Tấn công bảo mật (giả mạo thiết bị, chiếm quyền truy cập) | 3 - Trung bình | 5 - Rất cao | **Cao** | Session-based auth với SHA-256, MQTT ACL per device, HTTPS/TLS, Zod input validation, rate limiting | Đã triển khai cơ bản |
| R5 | Mất dữ liệu trong thời gian mất kết nối mạng kéo dài | 3 - Trung bình | 4 - Cao | **Cao** | Flash storage buffer (~1000 bản ghi), cơ chế retry với exponential backoff, QoS 1 đảm bảo delivery | Đã triển khai |
| R6 | Hư hỏng phần cứng do nhiệt độ cực đoan (xe đỗ ngoài nắng) | 2 - Thấp | 4 - Cao | **Trung bình** | ESP32-S3 hoạt động -40 đến 85°C, thiết kế tản nhiệt, đặt thiết bị trong vị trí mát, cảnh báo nhiệt độ | Thiết kế có tính đến |
| R7 | Cạn ắc quy xe do thiết bị hoạt động liên tục | 2 - Thấp | 5 - Rất cao | **Cao** | Mạch LVD + switch profile: 12V (OFF=12.0V, ON=12.2V), 24V (OFF=24.0V, ON=24.4V), deep sleep 10–15 μA, pin dự phòng 21700 | Đã triển khai |
| R8 | Lỗi firmware gây treo hệ thống (firmware hang) | 3 - Trung bình | 4 - Cao | **Cao** | Watchdog timer (cần triển khai), FreeRTOS task monitoring, OTA update từ xa | Triển khai một phần |

### 5.3.2. Phân tích chi tiết các rủi ro chính

**Rủi ro R1 - Mất sóng 4G tại khu vực nông thôn:**

Đây là rủi ro có xác suất cao nhất trong thực tế vận hành tại Việt Nam, đặc biệt khi xe di chuyển qua các tuyến đường liên tỉnh hoặc vùng núi. Hệ thống đã được thiết kế với cơ chế offline buffering: khi mất kết nối 4G, dữ liệu telemetry (GPS, OBD2) được lưu vào bộ nhớ flash của ESP32-S3 theo cấu trúc FIFO. Khi kết nối được phục hồi, dữ liệu được gửi lên server theo thứ tự thời gian, đảm bảo không mất dữ liệu hành trình. Với dung lượng buffer khoảng 1000 bản ghi, hệ thống có thể hoạt động offline liên tục 4–8 giờ mà không mất dữ liệu.

**Rủi ro R4 - Tấn công bảo mật:**

Bảo mật là rủi ro có tác động nghiêm trọng nhất. Hệ thống đã triển khai nhiều lớp bảo vệ: xác thực phiên (session-based authentication) với token được hash bằng SHA-256, MQTT ACL phân quyền theo từng thiết bị, Zod schema validation cho toàn bộ API input, và CORS configuration nghiêm ngặt. Tuy nhiên, một số biện pháp bảo mật nâng cao (device certificate, TLS cho MQTT, security event logging) chưa được triển khai đầy đủ và cần được bổ sung trong giai đoạn sản xuất.

**Rủi ro R7 - Cạn ắc quy xe:**

Đây là rủi ro có tác động nghiêm trọng nhất đối với trải nghiệm người dùng cuối — xe không khởi động được sẽ gây bất tiện lớn cho khách thuê xe. Hệ thống đã có nhiều cơ chế bảo vệ: profile 12V ngắt theo OFF=12.0V, profile 24V ngắt theo OFF=24.0V; cơ chế chuyển nguồn có hysteresis (12V: OFF 12.0V/ON 12.2V, 24V: OFF 24.0V/ON 24.4V); chế độ deep sleep chỉ tiêu thụ 10–15 μA; và pin dự phòng 21700 cho phép hoạt động độc lập khi LVD kích hoạt chuyển sang nhánh backup.

### 5.3.3. Tổng hợp mức độ rủi ro

[Bảng 5.9: Tổng hợp mức độ rủi ro theo phân loại]

| Phân loại | Số rủi ro | Mức cao | Mức trung bình | Mức thấp |
|---|---|---|---|---|
| Kết nối và truyền thông | 3 (R1, R3, R5) | 2 | 1 | 0 |
| Bảo mật | 1 (R4) | 1 | 0 | 0 |
| Phần cứng | 3 (R2, R6, R7) | 1 | 2 | 0 |
| Firmware | 1 (R8) | 1 | 0 | 0 |
| **Tổng cộng** | **8** | **5** | **3** | **0** |

Kết quả cho thấy 5/8 rủi ro ở mức cao; tuy nhiên, phần lớn đã có biện pháp giảm thiểu được triển khai hoặc đã có phương án xử lý. Các rủi ro cần ưu tiên xử lý tiếp theo là R4 (bảo mật nâng cao) và R8 (watchdog timer và OTA update).

---

## 5.4. Khuyến nghị cho tương lai

Dựa trên kết quả đánh giá ở các phần trên, đồ án đề xuất các hướng phát triển trong tương lai, được phân theo các giai đoạn triển khai cụ thể.

### 5.4.1. Giai đoạn 2: Mở rộng tính năng (Phase 2)

Hệ thống đã được thiết kế với kiến trúc mở rộng, cơ sở dữ liệu PostgreSQL đã bao gồm các bảng dữ liệu cho các tính năng Phase 2. Các tính năng khuyến nghị triển khai trong giai đoạn tiếp theo bao gồm:

- **Quản lý đặt xe (Bookings)**: Hệ thống đặt xe trực tuyến cho khách hàng, tích hợp lịch và trạng thái sẵn sàng của xe. Schema database đã sẵn sàng với bảng `bookings` và `reservations`.
- **Thanh toán trực tuyến (Payments)**: Tích hợp cổng thanh toán (VNPay, Momo, ZaloPay) để xử lý thanh toán tiền thuê xe tự động. Bảng `payments` và `invoices` đã được thiết kế trong schema.
- **Báo cáo hư hỏng (Damage Reports)**: Cho phép tài xế và nhân viên báo cáo tình trạng xe khi nhận và trả, kèm theo hình ảnh. Bảng `damage_reports` đã có trong cơ sở dữ liệu.
- **Đánh giá và xếp hạng (Reviews)**: Cho phép khách hàng đánh giá trải nghiệm thuê xe, giúp doanh nghiệp cải thiện chất lượng dịch vụ. Bảng `reviews` và `ratings` đã được thiết kế.

### 5.4.2. Ứng dụng trí tuệ nhân tạo và học máy (AI/ML)

Với lượng dữ liệu telemetry lớn được thu thập liên tục từ các thiết bị IoT, hệ thống có tiềm năng lớn trong việc ứng dụng AI/ML để tạo giá trị gia tăng:

**Phân tích hành vi lái xe (Driving Behavior Analysis):**

Sử dụng dữ liệu gia tốc kế (IMU), tốc độ, RPM và GPS để phân tích và chấm điểm hành vi lái xe. Các chỉ số có thể tính toán bao gồm: tần suất phanh gấp, gia tốc đột ngột, tốc độ vào cua, vượt quá tốc độ. Kết quả phân tích giúp doanh nghiệp đánh giá mức độ an toàn của tài xế và điều chỉnh chính sách cho thuê (phí bảo hiểm, mức đặt cọc).

**Bảo trì dự đoán (Predictive Maintenance):**

Phân tích xu hướng dữ liệu OBD2 theo thời gian (nhiệt độ động cơ, áp suất dầu, điện áp ắc quy, mã lỗi DTC) để dự đoán các vấn đề kỹ thuật trước khi xảy ra hư hỏng. Mô hình học máy có thể được huấn luyện từ dữ liệu lịch sử để cảnh báo sớm về nhu cầu bảo trì, giảm thời gian xe không hoạt động (downtime) và chi phí sửa chữa khẩn cấp.

**Phát hiện bất thường (Anomaly Detection):**

Sử dụng các thuật toán học máy không giám sát (unsupervised learning) để phát hiện các hành vi bất thường: xe đi vào khu vực không bình thường, thời gian sử dụng bất thường, thay đổi đột ngột trong mẫu sử dụng. Điều này giúp phát hiện sớm các tình huống rủi ro như chiếm đoạt xe hoặc sử dụng sai mục đích.

### 5.4.3. Ứng dụng di động (Mobile Application)

Hiện tại hệ thống chỉ có giao diện web (Tracking_Frontend). Để mở rộng khả năng tiếp cận người dùng, việc phát triển ứng dụng di động là cần thiết:

- **Phương án đề xuất**: Flutter WebView Hybrid (Tracking_Mobile/). Sử dụng Flutter để tạo ứng dụng native wrapper, nhúng trên WebView để hiển thị giao diện web đã có. Phương án này giúp tối ưu hóa thời gian phát triển (tái sử dụng giao diện web) trong khi vẫn có khả năng truy cập các tính năng native (push notification, GPS, camera).
- **Tính năng chính**: Theo dõi vị trí xe trên bản đồ, nhận push notification khi có cảnh báo, xem lịch sử hành trình, quản lý đặt xe (Phase 2).
- **Nền tảng**: Hỗ trợ đồng thời iOS và Android từ một codebase Flutter duy nhất.

### 5.4.4. Tính toán biên (Edge Computing)

Với khả năng xử lý của ESP32-S3 (dual-core Xtensa LX7, 240 MHz, 8MB PSRAM), có thể triển khai một số mô hình suy luận AI/ML ngay trên thiết bị (on-device inference):

- **Phát hiện bất thường tại thiết bị**: Thay vì gửi toàn bộ dữ liệu thô lên cloud để phân tích, thiết bị có thể chạy mô hình ML nhẹ (TensorFlow Lite Micro) để phát hiện bất thường ngay tại chỗ. Chỉ gửi cảnh báo khi phát hiện bất thường, giảm lượng dữ liệu truyền và tiết kiệm băng thông 4G.
- **Phân loại hành vi lái xe tại thiết bị**: Sử dụng dữ liệu IMU và OBD2 để phân loại hành vi lái xe (bình thường, hung hãn, mệt mỏi) ngay trên ESP32-S3, gửi kết quả phân loại thay vì dữ liệu thô.
- **Nén dữ liệu thông minh**: Sử dụng thuật toán nén dữ liệu trên thiết bị, chỉ gửi dữ liệu khi có thay đổi đáng kể (dead reckoning), giảm 50–70% lượng dữ liệu truyền.

### 5.4.5. Triển khai sản xuất (Production Deployment)

Để chuyển từ môi trường phát triển sang sản xuất, cần thực hiện các bước sau:

- **Container Orchestration**: Chuyển từ Docker Compose sang Kubernetes (K8s) để quản lý các service với khả năng tự động scale, self-healing, và rolling update. Mỗi service (Backend, Frontend, MqttBridge, EMQX) chạy trong pod riêng, được quản lý bởi Deployment và Service.
- **CI/CD Pipeline**: Thiết lập pipeline tự động (GitHub Actions hoặc GitLab CI) bao gồm: chạy lint và typecheck, chạy unit test và integration test, build Docker image, deploy lên môi trường staging, và deploy lên production sau khi được phê duyệt.
- **TLS/SSL toàn hệ thống**: Triển khai HTTPS cho toàn bộ API và web frontend (Let's Encrypt), TLS cho MQTT (port 8883), và mã hóa kết nối PostgreSQL. Sử dụng Nginx Proxy Manager (Tracking_NPM/) làm reverse proxy và quản lý chứng chỉ SSL.
- **Monitoring và Alerting**: Triển khai đầy đủ stack giám sát: Prometheus thu thập metrics, Grafana hiển thị dashboard, VictoriaLogs lưu trữ log tập trung, và Alertmanager gửi cảnh báo qua Telegram/email khi có sự cố.

### 5.4.6. Phần cứng phiên bản 2 (Hardware v2)

Phiên bản phần cứng hiện tại sử dụng các module rời và board prototype (breadboard/perfboard), phù hợp cho giai đoạn thử nghiệm và đối chiếu schematic. Để tiến tới sản xuất hàng loạt, cần cải tiến phần cứng:

- **Thiết kế PCB tùy chỉnh**: Thiết kế PCB 4 lớp (4-layer) tích hợp toàn bộ thành phần (ESP32-S3, mạch nạp, mạch nguồn, đầu nối SIM, đầu nối antenna) trên một board duy nhất. Giảm kích thước xuống khoảng 60x40 mm, phù hợp để lắp đặt trong xe.
- **Antenna tích hợp**: Sử dụng antenna ceramic cho GPS/GNSS và antenna PCB cho 4G/LTE, giảm số dây cáp và tăng độ tin cậy.
- **Vỏ hộp công nghiệp**: Thiết kế vỏ hộp nhựa ABS chống nước (IP65), chịu nhiệt, với đầu nối OBD2 tích hợp và đầu nối nguồn 12V.
- **Chi phí sản xuất hàng loạt**: Khi sản xuất từ 500 bộ trở lên, chi phí BOM có thể giảm xuống còn 500.000–800.000 VND/bộ nhờ mua linh kiện số lượng lớn và tối ưu hóa thiết kế PCB.

### 5.4.7. Tóm tắt lộ trình phát triển

[Bảng 5.10: Lộ trình phát triển khuyến nghị]

| Giai đoạn | Thời gian | Nội dung chính | Ưu tiên |
|---|---|---|---|
| Phase 1.5 - Bảo mật | 1–2 tháng | TLS cho MQTT, device certificate, watchdog timer, security logging | Cao |
| Phase 2 - Mở rộng tính năng | 2–4 tháng | Bookings, payments, damage reports, reviews, mobile app | Cao |
| Phase 2.5 - Tối ưu hóa | 1–2 tháng | Redis caching, query optimization, connection pooling, health checks | Trung bình |
| Phase 3 - AI/ML | 3–6 tháng | Driving behavior analysis, predictive maintenance, anomaly detection | Trung bình |
| Phase 4 - Production | 2–3 tháng | Kubernetes, CI/CD, monitoring, TLS everywhere | Cao |
| Phase 5 - Hardware v2 | 4–6 tháng | Custom PCB, vỏ hộp công nghiệp, sản xuất hàng loạt | Thấp (tùy nhu cầu) |

---

## Kết luận chương 5

Tổng hợp kết quả đánh giá cho thấy hệ thống IoT Vehicle Tracking System nhìn chung đạt các mục tiêu kỹ thuật cốt lõi: thiết bị tracker vận hành ổn định với cơ chế quản lý năng lượng phù hợp, firmware FreeRTOS đa nhiệm hoạt động hiệu quả, hạ tầng đám mây xử lý dữ liệu thời gian thực trong ngưỡng độ trễ chấp nhận được và giao diện web đáp ứng nhu cầu khai thác vận hành. Về kinh tế, mức chi phí BOM 870.000–1.630.000 VND cùng chi phí vận hành thấp (VPS + SIM 4G) tạo lợi thế cạnh tranh rõ rệt so với giải pháp thương mại cùng phân khúc. Các rủi ro trọng yếu cũng đã được nhận diện kèm biện pháp giảm thiểu tương ứng, qua đó hình thành cơ sở khả thi cho lộ trình 5 giai đoạn chuyển từ prototype sang sản phẩm thương mại.
