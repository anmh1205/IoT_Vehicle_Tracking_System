# CHƯƠNG 6. PHẢN HỒI VÀ BÀI HỌC KINH NGHIỆM – REFLECTION AND CASE-STUDIES

## 6.1. Ứng dụng kiến thức kỹ thuật – Earlier course work

Dự án "IoT Vehicle Tracking System" là kết quả tích hợp kiến thức từ nhiều học phần và lĩnh vực đã tích lũy trong quá trình học tập. Mỗi tầng của hệ thống — từ phần cứng, firmware, backend đến frontend — đều yêu cầu vận dụng trực tiếp kiến thức nền tảng. Phần này trình bày cách các học phần được chuyển hóa thành quyết định kỹ thuật trong thực tiễn dự án.

### 6.1.1. Vi xử lý và Vi điều khiển

Kiến thức về vi xử lý và vi điều khiển đóng vai trò cốt lõi trong việc thiết kế và lập trình thiết bị tracker IoT. Các nội dung được áp dụng bao gồm:

- **Lập trình ESP32-S3**: Áp dụng kiến thức về kiến trúc Xtensa LX7 dual-core, thanh ghi, bộ nhớ và tập lệnh để lập trình firmware trên nền tảng ESP-IDF. Việc hiểu rõ kiến trúc phần cứng của MCU giúp tối ưu hóa hiệu suất và tiêu thụ năng lượng.
- **FreeRTOS đa nhiệm (multitasking)**: Sử dụng kiến thức về hệ điều hành thời gian thực để thiết kế các task đồng thời: task đọc dữ liệu OBD2 qua BLE, task gửi dữ liệu MQTT qua modem UART, task đọc cảm biến IMU, và task quản lý năng lượng. Việc phân chia task và quản lý mutex/semaphore là kỹ năng trực tiếp từ môn Vi xử lý nâng cao.
- **Giao tiếp ngoại vi GPIO/ADC/UART/I2C/SPI**: Cấu hình và sử dụng các giao diện ngoại vi để giao tiếp với modem SIM7600CE-T (UART, tích hợp LTE + GNSS), cảm biến LIS3DH (SPI/I2C), đọc điện áp ắc quy (ADC), và điều phối power path theo kiến trúc diode-OR + EN (GPIO). Đây là những kỹ năng cơ bản được rèn luyện trong các bài thực hành vi điều khiển.

### 6.1.2. Mạng máy tính và IoT

Kiến thức mạng máy tính là nền tảng cho toàn bộ lớp truyền thông của hệ thống:

- **Mô hình TCP/IP**: Hiểu biết về các tầng giao thức mạng (Application, Transport, Internet, Network Access) giúp thiết kế luồng dữ liệu từ thiết bị IoT qua mạng 4G/LTE đến server. Việc lựa chọn giữa TCP và UDP cho các loại dữ liệu khác nhau (telemetry vs. commands) dựa trên kiến thức về đặc tính của từng giao thức.
- **Giao thức MQTT**: Áp dụng kiến thức về mô hình Publish/Subscribe, các mức QoS (0, 1, 2), Retain Message, và Last Will and Testament (LWT) để thiết kế hệ thống truyền thông giữa tracker và server. MQTT được lựa chọn dựa trên phân tích so sánh với HTTP và CoAP từ góc độ mạng máy tính.
- **HTTP/REST API**: Thiết kế RESTful API cho backend server dựa trên kiến thức về giao thức HTTP, phương thức (GET, POST, PUT, DELETE), mã trạng thái (status codes), và header. Việc tuân thủ các nguyên tắc REST (stateless, resource-based URLs, uniform interface) xuất phát từ kiến thức mạng ứng dụng.
- **WebSocket và giao tiếp thời gian thực**: Sử dụng Socket.IO để truyền dữ liệu thời gian thực từ server đến frontend, dựa trên hiểu biết về giao thức WebSocket (RFC 6455) và sự khác biệt với HTTP polling truyền thống.
- **Bảo mật mạng**: Áp dụng kiến thức về mã hóa (TLS/SSL), xác thực (authentication), phân quyền (authorization), và Access Control List (ACL) để bảo vệ các kênh truyền thông trong hệ thống.

### 6.1.3. Cơ sở dữ liệu

Kiến thức cơ sở dữ liệu được áp dụng trong việc thiết kế và tối ưu hóa hệ thống lưu trữ:

- **Thiết kế cơ sở dữ liệu quan hệ (PostgreSQL)**: Áp dụng các nguyên tắc chuẩn hóa (normalization), thiết kế bảng (table design), khóa chính/khóa ngoại (primary/foreign keys), và ràng buộc toàn vẹn (integrity constraints) để xây dựng schema cho hệ thống quản lý phương tiện, người dùng, cảnh báo, và geofences.
- **Cơ sở dữ liệu chuỗi thời gian (VictoriaMetrics)**: Mở rộng kiến thức từ cơ sở dữ liệu truyền thống sang cơ sở dữ liệu chuyên biệt cho dữ liệu time-series — hiểu về cách tổ chức dữ liệu theo thời gian, chiến lược nén (compression), và chính sách lưu trữ (retention policy).
- **Tối ưu hóa SQL**: Sử dụng chỉ mục (indexing), truy vấn tối ưu (query optimization), và phân tích kế hoạch thực thi (EXPLAIN ANALYZE) để đảm bảo hiệu suất truy vấn đáp ứng yêu cầu dưới 200ms cho p95 request.

### 6.1.4. Lập trình hướng đối tượng

Các nguyên tắc lập trình hướng đối tượng (OOP) được áp dụng rộng rãi trong việc phát triển phần mềm:

- **TypeScript/JavaScript**: Sử dụng hệ thống kiểu dữ liệu tĩnh (static typing) của TypeScript để tăng tính an toàn và khả năng bảo trì của mã nguồn. Kiến thức về interface, generic types, và union types từ OOP giúp thiết kế API contracts rõ ràng.
- **Domain-Driven Design (DDD)**: Áp dụng kiến trúc DDD cho backend, tổ chức mã nguồn theo domain (vehicles, devices, telemetry, alerts, geofences) với các lớp: Controllers, Services, Repositories. Đây là sự nâng cao từ nguyên tắc encapsulation và separation of concerns trong OOP.
- **Design Patterns**: Sử dụng các mẫu thiết kế như Repository Pattern (trừu tượng hóa truy cập dữ liệu), Middleware Pattern (xử lý request pipeline), và Observer Pattern (sự kiện WebSocket) để giải quyết các vấn đề thiết kế phần mềm phổ biến.

### 6.1.5. Điện tử số và Analog

Kiến thức điện tử là nền tảng cho việc thiết kế phần cứng của thiết bị tracker:

- **Thiết kế mạch quản lý nguồn**: Áp dụng kiến thức về mạch buck converter (giảm áp ắc quy xe 12V hoặc 24V xuống 3.3V/5V), boost converter (tăng áp từ pin 3.7V lên 5V), và power path management để thiết kế hệ thống cấp nguồn đa đầu vào (ắc quy xe + pin dự phòng).
- **Đọc giá trị ADC**: Sử dụng kiến thức về bộ chuyển đổi tương tự - số (ADC) để đọc điện áp ắc quy xe thông qua mạch chia áp (voltage divider), tính toán độ phân giải và sai số.
- **Giao tiếp cảm biến**: Áp dụng kiến thức về giao diện SPI/I2C để giao tiếp với cảm biến gia tốc LIS3DH, cấu hình các thanh ghi điều khiển, đọc dữ liệu gia tốc 3 trục, và thiết lập ngắt (interrupt) cho phát hiện chuyển động.

### 6.1.6. Kỹ thuật phần mềm

Các phương pháp và công cụ kỹ thuật phần mềm được áp dụng xuyên suốt dự án:

- **Git version control**: Quản lý mã nguồn với Git, sử dụng branching strategy (feature branches, main branch), commit conventions, và code review. Kiến thức về Git giúp quản lý phiên bản và hợp tác phát triển hiệu quả.
- **Docker containerization**: Áp dụng kiến thức về container hóa để đóng gói và triển khai các dịch vụ (backend, frontend, MQTT broker, databases) một cách nhất quán giữa các môi trường phát triển và sản xuất.
- **CI/CD concepts**: Hiểu biết về quy trình tích hợp liên tục và triển khai liên tục giúp thiết kế cấu trúc dự án phù hợp với các pipeline tự động hóa.
- **Agile methodology**: Áp dụng phương pháp phát triển linh hoạt (Agile) với các chu kỳ phát triển ngắn (sprints), ưu tiên các tính năng theo giá trị, và điều chỉnh kế hoạch dựa trên phản hồi thực tế.

---

## 6.2. Giải quyết các vấn đề kỹ thuật phức tạp – Complex engineering problems

Trong quá trình thực hiện dự án, nhóm phát triển đã đối mặt và giải quyết nhiều vấn đề kỹ thuật phức tạp. Phần này trình bày bốn vấn đề tiêu biểu nhất cùng cách tiếp cận xử lý.

### 6.2.1. Vấn đề 1: Phân tích bản tin OBD2 đa khung qua BLE

**Mô tả vấn đề:**

Việc kết nối và giao tiếp với OBD2 adapter vgate iCar Pro qua Bluetooth Low Energy (BLE) là một trong những thách thức kỹ thuật lớn nhất của dự án. Vấn đề cụ thể bao gồm:

- Giao thức BLE của vgate iCar Pro không có tài liệu chính thức công khai. Thông tin giao tiếp (UUID dịch vụ, characteristic, định dạng bản tin) phải được khảo sát ngược (reverse engineering) từ các ứng dụng mã nguồn mở và bản ghi Bluetooth.
- Bản tin OBD2 có thể trải dài nhiều khung dữ liệu BLE (multi-frame response), đặc biệt với các lệnh như đọc mã lỗi DTC (Mode 03) hoặc dữ liệu động cơ nhiều PID. Việc ghép nối các khung dữ liệu cần tuân theo ISO 15765–2 (ISO-TP), một giao thức không được tài liệu OBD2 phổ thông đề cập chi tiết.
- Các nguồn tài liệu trực tuyến thường mâu thuẫn nhau về cách xử lý multi-frame: một số hướng dẫn chỉ áp dụng cho ELM327 (chip interpreter), không tương thích trực tiếp với vgate iCar Pro sử dụng chip STN1110.

**Cách giải quyết:**

1. *Nghiên cứu và khảo sát*: Phân tích mã nguồn của các dự án mã nguồn mở tương tự (esp32-obd2-meter, python-OBD), nghiên cứu tài liệu ISO 15765–2, và sử dụng ứng dụng nRF Connect để bắt và phân tích các bản tin BLE giữa điện thoại và vgate iCar Pro.
2. *Thiết kế lớp trừu tượng*: Xây dựng module phân tích OBD2 với khả năng xử lý cả bản tin đơn khung (single-frame) và đa khung (multi-frame), bao gồm Flow Control frames và Consecutive Frames theo chuẩn ISO-TP.
3. *Kiểm thử lặp đi lặp lại*: Tạo bộ test với các PID OBD2 phổ biến (Mode 01: RPM, Speed, Coolant Temp, Fuel Level) và các lệnh multi-frame (Mode 03: DTC, Mode 09: VIN) để đảm bảo tính chính xác.

**Bài học rút ra:** Khi làm việc với thiết bị bên thứ ba không có tài liệu rõ ràng, việc kết hợp reverse engineering, tham khảo nhiều nguồn, và kiểm thử kỹ lưỡng là phương pháp hiệu quả nhất.

### 6.2.2. Vấn đề 2: Đường ống dữ liệu thời gian thực với đảm bảo phân phối

**Mô tả vấn đề:**

Hệ thống cần xử lý luồng dữ liệu telemetry liên tục từ nhiều thiết bị IoT (GPS, OBD2, IMU) với các yêu cầu:
- Dữ liệu phải được ghi đồng thời vào hai hệ thống lưu trữ khác nhau: VictoriaMetrics (time-series) và PostgreSQL (relational), tạo ra bài toán ghi kép (dual-write).
- Khi mất kết nối mạng 4G, thiết bị phải lưu trữ dữ liệu tạm thời (offline buffering) và đồng bộ lại khi kết nối phục hồi, đảm bảo không mất dữ liệu.
- MQTT QoS cần được cấu hình phù hợp cho từng loại dữ liệu: QoS 0 cho telemetry tần suất cao (chấp nhận mất một vài điểm dữ liệu), QoS 1 cho cảnh báo và lệnh điều khiển (đảm bảo gửi ít nhất một lần).

**Cách giải quyết:**

1. *MQTT Bridge Service độc lập*: Thiết kế dịch vụ Tracking_MqttBridge làm trung gian giữa EMQX broker và các hệ thống lưu trữ. Bridge service subscribe các topic telemetry và phân luồng dữ liệu đến VictoriaMetrics và PostgreSQL thông qua các queue nội bộ.
2. *Offline buffering trên thiết bị*: Hiện thực cơ chế lưu trữ dữ liệu vào SPIFFS/LittleFS trên ESP32-S3 khi mất kết nối MQTT, với cơ chế FIFO (First-In-First-Out) và giới hạn dung lượng. Khi kết nối phục hồi, dữ liệu được gửi lần lượt với rate limiting để tránh quá tải server.
3. *QoS phân tầng*: Áp dụng QoS 0 cho dữ liệu vị trí GPS tần suất cao (5–30 giây), QoS 1 cho cảnh báo và sự kiện quan trọng, đảm bảo cân bằng giữa hiệu suất và độ tin cậy.

**Bài học rút ra:** Thiết kế đường ống dữ liệu cần xem xét tất cả các trường hợp thất bại (mất mạng, server quá tải, dữ liệu bất đồng bộ) từ giai đoạn thiết kế, không để đến giai đoạn tích hợp mới xử lý.

### 6.2.3. Vấn đề 3: Quản lý năng lượng với nhiều nguồn cấp

**Mô tả vấn đề:**

Hệ thống phần cứng phải hoạt động với hai nguồn năng lượng có đặc tính rất khác nhau:
- Ắc quy xe 12V hoặc 24V DC (dao động tùy trạng thái sạc và tải), là nguồn chính khi xe hoạt động.
- Pin dự phòng 21700 Li-ion 3.7V (dao động 2.8V - 4.2V), là nguồn dùng khi ắc quy xe bị ngắt hoặc điện áp quá thấp.
- Việc chuyển đổi giữa hai nguồn phải diễn ra liền mạch (seamless switching), không được gây mất điện cho MCU, tránh reset hoặc mất dữ liệu.

**Cách giải quyết:**

1. *Power path management*: Thiết kế đường power path theo kiến trúc diode-OR + EN để tự động duy trì nguồn giữa ắc quy xe và pin dự phòng theo profile kép 12V/24V. Hệ thống dùng ngưỡng Switch_OFF/Switch_ON: 12V (12.0V/12.2V), 24V (24.0V/24.4V).
2. *Low Voltage Disconnect (LVD)*: Hiện thực LVD theo profile runtime OFF/ON để bảo vệ ắc quy khỏi rút cạn và đảm bảo xe vẫn khởi động được; đồng thời dùng comparator LM393 làm kênh trạng thái nhanh về GPIO19 (HIGH = low-voltage).
3. *Bộ sạc pin dự phòng*: Tích hợp IC sạc TP4056 để sạc pin 21700 từ bus 5V khi xe đang chạy, đảm bảo pin dự phòng luôn ở trạng thái sẵn sàng.
4. *Giám sát điện áp bằng firmware*: Đọc điện áp ắc quy và pin dự phòng liên tục qua ADC, kết hợp trạng thái GPIO19 để giám sát năng lượng từ xa, cảnh báo sớm và điều phối chuyển nguồn.

**Bài học rút ra:** Thiết kế hệ thống năng lượng cho IoT trong môi trường ô tô cần xem xét toàn diện: điện áp dao động, chuyển đổi nguồn liền mạch, bảo vệ ắc quy, và giám sát từ xa. Mỗi yếu tố ảnh hưởng trực tiếp đến độ tin cậy của toàn hệ thống.

### 6.2.4. Vấn đề 4: Kiến trúc đám mây có khả năng mở rộng cho IoT

**Mô tả vấn đề:**

Hệ thống cần xử lý dữ liệu từ nhiều thiết bị đồng thời, cung cấp giao diện thời gian thực cho nhiều người dùng, và đảm bảo bảo mật:
- Mỗi thiết bị có MQTT topic riêng (e.g., `devices/{device_id}/telemetry`), cần có ACL phân quyền để thiết bị chỉ được publish/subscribe trên topic của mình.
- Nhiều người dùng có thể xem cùng một xe trên dashboard, tạo ra nhiều kết nối WebSocket đồng thời cần được quản lý.
- Session management phải an toàn (token hash SHA-256 lưu trong database) nhưng không gây bottle-neck khi số lượng request lớn.

**Cách giải quyết:**

1. *MQTT ACL per device*: Cấu hình EMQX ACL rules để mỗi thiết bị chỉ được publish lên topic của mình, ngăn chặn việc giả mạo dữ liệu từ thiết bị khác. Sử dụng EMQX built-in authentication với username/password riêng cho từng thiết bị.
2. *WebSocket room-based architecture*: Sử dụng Socket.IO rooms để nhóm các client theo vehicle_id. Khi có dữ liệu telemetry mới cho một xe, server chỉ broadcast đến room tương ứng, giảm tải truyền dữ liệu không cần thiết.
3. *Session-based authentication*: Sử dụng database-backed session tokens (SHA-256 hashed) thay vì JWT để có khả năng thu hồi phiên (session revocation) ngay lập tức. Kết hợp với Redis cache (dự kiến Phase 2) để giảm tải truy vấn database cho việc xác thực.
4. *Per-service Docker Compose*: Mỗi dịch vụ (Backend, Frontend, MQTT Bridge, PostgreSQL, EMQX, VictoriaMetrics) có docker-compose.yml riêng, chia sẻ mạng `tracking-network`. Kiến trúc này cho phép mở rộng (scale) từng dịch vụ độc lập theo nhu cầu.

**Bài học rút ra:** Kiến trúc đám mây cho IoT cần được thiết kế từ đầu với khả năng mở rộng theo chiều ngang (horizontal scaling). Việc tách biệt các dịch vụ (separation of concerns) và sử dụng per-device ACL là nền tảng cho bảo mật và quản lý đội xe quy mô lớn.

---

## 6.3. Tác động đạo đức và xã hội – Ethical and Social impacts

### 6.3.1. Quyền riêng tư và bảo vệ dữ liệu cá nhân

Hệ thống theo dõi phương tiện liên tục thu thập dữ liệu vị trí GPS, hành trình và thói quen sử dụng xe của người lái — đây đều là dữ liệu nhạy cảm liên quan đến quyền riêng tư (privacy). Việc phát triển và triển khai hệ thống vì vậy đặt ra các vấn đề đạo đức cần được xem xét nghiêm túc.

**Các biện pháp bảo vệ quyền riêng tư đã được áp dụng:**

| STT | Biện pháp | Mô tả chi tiết |
|-----|-----------|----------------|
| 1 | Mã hóa dữ liệu truyền tải | Dữ liệu MQTT được mã hóa TLS trong môi trường production, ngăn chặn nghe lén (eavesdropping) trên đường truyền |
| 2 | Phân quyền truy cập (RBAC) | Hệ thống phân quyền theo vai trò (admin, manager, viewer), chỉ những người có quyền mới xem được dữ liệu cụ thể |
| 3 | Chính sách lưu trữ dữ liệu | Dữ liệu telemetry được lưu trữ có thời hạn (retention policy), tự động xóa sau 90 ngày để giảm rủi ro lộ lọt dữ liệu |
| 4 | Session-based authentication | Token xác thực được hash SHA-256, lưu trữ trong database, có khả năng thu hồi ngay lập tức khi cần |
| 5 | MQTT ACL per device | Mỗi thiết bị chỉ truy cập được dữ liệu của mình, ngăn chặn truy cập trái phép dữ liệu thiết bị khác |

**Khuyến nghị bổ sung (chưa hiện thực):**
- Thông báo rõ ràng cho người thuê xe về việc xe được giám sát (transparency).
- Cho phép người thuê xe xem dữ liệu của mình (data access rights).
- Tuân thủ Luật An toàn thông tin mạng Việt Nam (Luật số 24/2018/QH14) và các quy định về bảo vệ dữ liệu cá nhân.

### 6.3.2. An toàn phương tiện và trách nhiệm kỹ thuật

Việc truy cập hệ thống OBD2 của xe đặt ra câu hỏi về an toàn phương tiện: liệu thiết bị tracker có thể ảnh hưởng đến hoạt động của động cơ hoặc các hệ thống điện tử trên xe?

**Các biện pháp đảm bảo an toàn đã được áp dụng:**

- **Chỉ đọc (read-only) OBD2 PIDs**: Hệ thống chỉ sử dụng các lệnh OBD2 Mode 01 (Current Data) và Mode 03 (Stored DTCs) để đọc dữ liệu. Tuyệt đối không gửi các lệnh ghi (write commands) hoặc lệnh điều khiển động cơ (Mode 04: Clear DTCs, Mode 08: Control operations). Đây là nguyên tắc an toàn cơ bản khi làm việc với hệ thống chẩn đoán xe.
- **Kết nối BLE gián tiếp**: Sử dụng OBD2 adapter vgate iCar Pro (thiết bị đã được chứng nhận an toàn) làm lớp trung gian, không kết nối trực tiếp vào bus CAN của xe. Điều này giảm rủi ro gây nhiễu hoặc xung đột trên bus truyền thông nội bộ xe.
- **Không điều khiển xe từ xa**: Hệ thống không có chức năng điều khiển động cơ (tắt bơm xăng, khóa xe). Đây là quyết định thiết kế có chủ đích để tránh rủi ro an toàn nghiêm trọng.

### 6.3.3. Tác động xã hội tích cực

Hệ thống IoT giám sát phương tiện mang lại nhiều tác động tích cực cho xã hội:

**Hỗ trợ doanh nghiệp nhỏ và vừa:**
- Cung cấp giải pháp quản lý đội xe với chi phí hợp lý (dưới 2.000.000 VND/thiết bị, chi phí 4G khoảng 70.000 VND/tháng), giúp các doanh nghiệp cho thuê xe nhỏ có thể tiếp cận công nghệ giám sát mà trước đây chỉ dành cho các công ty lớn.
- Giảm thiệt hại do mất trộm, sử dụng sai mục đích, và hư hỏng thiết bị nhờ phát hiện sớm.

**Giảm tai nạn giao thông:**
- Giám sát tốc độ và hành vi lái xe (phanh gấp, tăng tốc đột ngột) giúp nhận diện và cảnh báo các hành vi lái xe nguy hiểm.
- Cảnh báo geofencing giúp đảm bảo xe hoạt động trong phạm vi an toàn đã thỏa thuận.

**Tối ưu hóa nhiên liệu và giảm phát thải:**
- Phân tích dữ liệu OBD2 (tiêu hao nhiên liệu, RPM, tốc độ) giúp đánh giá hiệu suất sử dụng nhiên liệu.
- Dữ liệu hành trình giúp tối ưu hóa tuyến đường, giảm quãng đường chạy không tải, giảm phát thải CO2.

### 6.3.4. Những lo ngại cần xem xét

- **Giám sát quá mức**: Cần cân bằng giữa nhu cầu giám sát của doanh nghiệp và quyền riêng tư của người lái xe. Không nên sử dụng dữ liệu vị trí để theo dõi hoạt động cá nhân ngoài phạm vi hợp đồng cho thuê.
- **Phụ thuộc công nghệ**: Hệ thống cần có cơ chế dự phòng (fallback) khi mất kết nối hoặc thiết bị hỏng, không để việc mất kết nối làm ảnh hưởng đến hoạt động bình thường của xe.
- **Trách nhiệm dữ liệu**: Doanh nghiệp sử dụng hệ thống có trách nhiệm bảo vệ dữ liệu thu thập được, không chia sẻ cho bên thứ ba khi chưa có sự đồng ý của người liên quan.

---

## 6.4. Tổng kết và bài học kinh nghiệm – General reflection and case-studies

### 6.4.1. Tầm quan trọng của thiết kế kiến trúc trước khi lập trình

Một trong những bài học quan trọng nhất của dự án là phải ưu tiên thiết kế kiến trúc hệ thống trước khi lập trình. Ở giai đoạn đầu, nhóm từng có xu hướng triển khai nhanh từng mô-đun khi chưa có mô hình tương tác tổng thể.

Khi phát sinh các lỗi tích hợp (interface mismatch, data format inconsistency, circular dependencies), nhóm chuyển sang cách tiếp cận có kỷ luật hơn: xác lập sơ đồ kiến trúc và luồng dữ liệu, chốt API contracts trước hiện thực, hoàn thiện database schema bằng ER diagram trước khi tạo bảng, và chuẩn hóa kế hoạch Docker networking/port mapping.

Cách làm này giúp giảm đáng kể thời gian sửa lỗi tích hợp và khối lượng làm lại ở các giai đoạn sau.

### 6.4.2. Độ phức tạp của hệ thống IoT toàn diện

Dự án cho thấy độ phức tạp của một hệ thống IoT toàn diện (end-to-end) vượt xa so với một ứng dụng web thông thường. Hệ thống bao gồm bốn tầng công nghệ hoàn toàn khác nhau:

| Tầng | Ngôn ngữ / Công nghệ | Thách thức chính |
|------|----------------------|-----------------|
| Phần cứng | Thiết kế mạch, PCB layout | Nhiều lỗi, khó debug, cần oscilloscope |
| Firmware | C/C++ (ESP-IDF), FreeRTOS | Quản lý bộ nhớ, timing, concurrency |
| Backend | TypeScript (Express.js) | Thiết kế API, xử lý dữ liệu lớn, bảo mật |
| Frontend | TypeScript (Next.js, React) | State management, real-time updates, UX |

Mỗi tầng đòi hỏi kỹ năng chuyên môn khác nhau, và việc tích hợp giữa các tầng là nơi xuất hiện nhiều lỗi nhất. Bài học rút ra là: khi làm việc với hệ thống đa tầng, cần có các bài kiểm thử tích hợp (integration tests) sớm, không đợi đến khi toàn bộ các tầng hoàn thành mới kiểm thử.

### 6.4.3. Sức mạnh của hệ sinh thái mã nguồn mở

Dự án sử dụng hoàn toàn công nghệ mã nguồn mở, qua đó cho thấy các giải pháp này đã đủ trưởng thành để xây dựng hệ thống IoT ở mức sẵn sàng sản xuất:

- **ESP-IDF** (Espressif): Framework chính thức cho ESP32-S3, cung cấp API đầy đủ cho Wi-Fi, BLE, GPIO, UART, và các ngoại vi khác. Tài liệu phong phú và cộng đồng hỗ trợ lớn.
- **Express.js + TypeScript**: Framework web nhẹ, linh hoạt, với hệ sinh thái middleware phong phú. TypeScript bổ sung hệ thống kiểu giúp giảm lỗi runtime.
- **Next.js 15 + React 19**: Framework frontend hiện đại với Server Components, App Router, và nhiều tối ưu hóa hiệu suất tự động.
- **PostgreSQL 16**: Cơ sở dữ liệu quan hệ mã nguồn mở mạnh mẽ nhất, hỗ trợ PostGIS cho dữ liệu không gian (geofencing).
- **EMQX**: MQTT broker quy mô doanh nghiệp với hiệu suất cao, hỗ trợ clustering, và rules engine tích hợp.
- **VictoriaMetrics**: Cơ sở dữ liệu chuỗi thời gian hiệu suất cao, tiêu thụ ít tài nguyên, tương thích API Prometheus.
- **Docker**: Nền tảng container hóa giúp đồng nhất môi trường phát triển và sản xuất, đơn giản hóa việc triển khai và quản lý các dịch vụ.

Chi phí giấy phép phần mềm cho toàn bộ hệ thống là 0 VND, cho phép đầu tư toàn bộ ngân sách vào phần cứng và hạ tầng máy chủ.

### 6.4.4. Kiểm thử ở mọi tầng là bắt buộc

Dự án khẳng định rằng kiểm thử ở mọi tầng của hệ thống là yêu cầu bắt buộc:

- **Unit tests**: Kiểm thử các hàm xử lý dữ liệu, phân tích bản tin OBD2, tính toán năng lượng trong firmware và backend.
- **Integration tests**: Kiểm thử giao tiếp giữa các dịch vụ — MQTT Bridge nhận dữ liệu từ EMQX và ghi vào VictoriaMetrics, Backend API đọc/ghi PostgreSQL.
- **End-to-end tests**: Mô phỏng toàn bộ luồng dữ liệu từ thiết bị giả lập (simulated device) đến giao diện web, kiểm tra tính đúng đắn của dữ liệu hiển thị trên dashboard.

Các lỗi được phát hiện trong giai đoạn kiểm thử sớm (unit test) có chi phí sửa chữa thấp hơn 10–100 lần so với lỗi được phát hiện trong giai đoạn tích hợp hoặc triển khai sản xuất [1].

### 6.4.5. Tổng kết cá nhân

Dự án "IoT Vehicle Tracking System" là một trải nghiệm học tập toàn diện, cho phép tổng hợp và áp dụng kiến thức đã học vào một sản phẩm thực tế có giá trị ứng dụng. Quá trình triển khai dự án đã rèn luyện tư duy hệ thống (systems thinking), năng lực giải quyết vấn đề phức tạp và khả năng làm việc độc lập với các công nghệ mới.

Những bài học rút ra từ dự án này — về thiết kế kiến trúc, quản lý năng lượng IoT, bảo mật hệ thống, và phát triển full-stack — là những kinh nghiệm quý báu có thể áp dụng trực tiếp vào công việc chuyên môn trong tương lai.

---

## Kết luận chương 6

Chương này đã tổng hợp quá trình vận dụng kiến thức kỹ thuật liên ngành vào xây dựng hệ thống IoT Vehicle Tracking System, đồng thời phân tích các vấn đề kỹ thuật phức tạp đã được xử lý trong quá trình phát triển. Bên cạnh đó, chương cũng đánh giá các tác động đạo đức và xã hội của hệ thống giám sát phương tiện theo hướng cân bằng giữa hiệu quả quản trị và quyền riêng tư người dùng. Các bài học kinh nghiệm rút ra — từ thiết kế kiến trúc, tích hợp hệ thống đa tầng đến khai thác hệ sinh thái mã nguồn mở — tạo nền tảng cho các hướng phát triển hệ thống IoT tương tự trong giai đoạn tiếp theo.

---

## Tài liệu tham khảo Chương 6

[1] B. Boehm and V. R. Basili, "Software Defect Reduction Top 10 List," *IEEE Computer*, vol. 34, no. 1, pp. 135–137, 2001.
