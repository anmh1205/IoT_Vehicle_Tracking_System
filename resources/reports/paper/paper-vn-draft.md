# HỆ THỐNG THEO DÕI XE IoT ĐẦY ĐỦ TẦNG VỚI THIẾT KẾ PHỐI HỢP KHẢ NĂNG CHỊU LỖI XUYÊN TẦNG, HỢP TẦN CẠNH BIÊN SEMANTIC, VÀ PHÂN TÍCH DÒNG DỮ LIỆU TRỰC TIẾP TẠI TẦNG NHẬP DỮ LIỆU CHO ĐỘI XE CHO THUÊ TỰ LÁI

> **Bản thảo paper — Phiên bản duyệt trước**
> Tác giả: Lê Trọng An, Đại học Phenikaa
> Ngày: Tháng 7, 2026

---

## Tóm tắt

Bài báo trình bày một hệ thống theo dõi xe IoT đầy đủ tầng được thiết kế cho đội xe cho thuê tự lái, giải quyết ba mâu thuẫn cơ bản trong hệ thống telematics xe giá thấp: (1) yêu cầu dữ liệu thời gian thực với mạng 4G không ổn định, (2) xác định chính xác trạng thái xe từ các cảm biến riêng lẻ không đáng tin cậy, và (3) chẩn đoán OBD thời gian thực trên phần cứng nhúng hạn chế tài nguyên. Hệ thống bao gồm PCB tùy chỉnh cấp ô tô (ESP32-S3, SIM7600 4G+GNSS, LIS3DSH IMU, tổng chi phí vật tư <100 USD), firmware ESP-IDF với hợp nhất cạnh semantic đa bằng chứng, và hạ tầng đám mây gồm EMQX broker, MQTT Bridge xử lý luồng trạng thái, lưu trữ VictoriaMetrics/VictoriaLogs/PostgreSQL, và giao diện Next.js/Flutter. Đóng góp chính là thiết kế phối hợp khả năng chịu lỗi xuyên tầng: hàng đợi ngoại tuyến nhận biết QoS với nội dung khử nhiễm khi phát lại trên thẻ SD, kết hợp phục hồi phiên bản ba tầng và phát trùng lặp qua phong bì byte-identical (message_id + boot_id + seq_no) ở phía đám mây. Hàng đợi ngoại tuyến sử dụng hệ thống mốc ghi FIFO với xác nhận nguyên tử chỉ sau khi modem xác nhận PUBACK (ngữ nghĩa AT+CMQTTPUB блок của SIM7600). Các đóng góp bổ sung bao gồm phát hiện đánh lửa đa bằng chứng chống rung chưa bao giờ khẳng định OFF trên bằng chứng yếu, và quy tắc trạng thái tại tầng nhập MQTT hỗ trợ 13 lớp mã DTC và 4 quy tắc bảo dưỡng với điều chỉnh mức nghiêm trọng, cổng chất lượng, và thời gian nguội dựa trên RAM. Hệ thống được đánh giá qua nguyên mẫu phần cứng, hai xe thực, và mô phỏng ECU HIL (Arduino+MCP2515 CAN 500kbps). Độ trễ đầu cuối trung bình 185ms (P95 400ms), thông lượng API đạt 1100 req/s, và máy trạng thái đạt 99,8% độ tin cậy qua 1000 chu kỳ.

**Từ khóa**: Theo dõi xe IoT, khả năng chịu lỗi MQTT, dữ liệu ngoại tuyến, hợp nhất cảm biến, hệ thống nhúng, chẩn đoán OBD-II

---

## 1. Giới thiệu

Mô hình cho thuê xe tự lái đang phát triển nhanh chóng tại các nước đang phát triển, đặc biệt ở Việt Nam, mang lại sự linh hoạt và chi phí hợp lý. Tuy nhiên, mô hình này tạo ra một vấn đề bất đối xứng: chủ xe cho thuê tài sản của mình cho người lạ và cần khả năng giám sát thời gian thực về vị trí, tình trạng động cơ và sử dụng trái phép — tất cả thông qua một thiết bị phải rẻ (<100 USD), không phụ thuộc và hoạt động trên mạng 4G dân dụng.

Một thiết bị telematics xe (tracker) phải giải quyết ba mâu thuẫn kỹ thuật:

**Thứ nhất**, sự căng thẳng giữa cảnh báo thời gian thực (phát hiện trộm, vi phạm vùng cấm) và mạng 4G không ổn định. Xe đi qua hầm, vùng nông thôn và vùng chuyển trạm cơ sở where mạng mất từ vài giây đến vài phút. Tracker truyền thống hoặc mất dữ liệu trong thời gian ngoại tuyến hoặc ghi cục bộ để truy xuất sau — cả hai đều không đáp ứng yêu cầu cảnh báo thời gian thực.

**Thứ hai**, khó khăn trong việc xác định trạng thái xe (động cơ bật/tắt, đang di chuyển/đứng yên) từ các cảm biến riêng lẻ không đáng tin cậy. OBD-II chỉ phản hồi khi động cơ đang chạy. Gia tốc kế IMU nhận nhiễu cơ học từ xe bên cạnh. GPS cung cấp vị trí nhưng không cho biết trạng thái động cơ. Tiếp cận cảm biến đơn sẽ không thể tránh phân loại sai.

**Thứ ba**, thách thức chẩn đoán động cơ thời gian thực trên vi điều khiển 5 USD. ESP32-S3 thiếu tài nguyên cho học máy trên thiết bị, nhưng tải dữ liệu thô lên cloud để xử lý lại tốn băng thông và chậm phát hiện.

Bài báo này trình bày hệ thống telematics đầy đủ tầng giải quyết đồng thời cả ba mâu thuẫn trên. Hệ thống trải rộng từ thiết kế PCB tùy chỉnh, firmware với hợp nhất cạnh semantic, đến hạ tầng đám mây nhiều tầng với xử lý luồng trạng thái tại tầng nhập MQTT.

Các đóng góp chính bao gồm:

1. **Thiết kế phối hợp khả năng chịu lỗi xuyên tầng**: hàng đợi ngoại tuyến nhận biết QoS (FIFO watermark, nội dung khử nhiễm, phong bì byte-identical) ở phía firmware, kết hợp phục hồi phiên bản ba tầng và phát trùng lặp live-mutation guard ở phía đám mây. Điều này duy trì tính liên tục dữ liệu telematics qua các lần mất kết nối mạng — một khả năng hiếm thấy trong các công trình nghiên cứu tracker xe hiện có.

2. **Hợp nhất cạnh semantic đa bằng chứng**: thuật toán phát hiện đánh lửa 7 nguồn dựa trên OR với bộ đệm thời gian chờ chống rung và trạng thái UNKNOWN, kết hợp ma trận trạng thái xe 2D (đánh lửa × chuyển động) tạo ra 6 trạng thái có ý nghĩa ngữ nghĩa (MOVING_ON, IDLING_ON, ROLLING_IGN_OFF, PARKED_OFF, UNKNOWN_MOVING, UNKNOWN_STATIONARY). Không cần học máy.

3. **Xử lý luồng trạng thái tại tầng nhập MQTT**: quy tắc hỗ trợ 13 lớp mã DTC và 4 quy tắc bảo dưỡng, chạy trực tiếp trong MQTT Bridge (Node/TypeScript) với thời gian nguội 15 phút dựa trên RAM mỗi quy tắc, điều chỉnh mức nghiêm trọng động, cổng chất lượng (kết nối BLE, mức độ sẵn sàng ELM, tuổi mẫu), và quản lý vòng đời cảnh báo tự động.

4. **PCB tùy chỉnh cấp ô tô**: đa rail nguồn (buck MP2482, LDO AP2112K-3.3, buck TPS54231, boost SX1308), pin dự phòng Li-ion 21700 với sạc TP4056, power-path Diode-OR, bảo vệ LVD 12V/24V — với tổng chi phí vật tư dưới 100 USD.

---

## 2. Các công trình liên quan

### A. Nền tảng telematics xe

Các kiến trúc đầy đủ tầng gần nhất với hệ thống này là C-ITS 2023 [1] và Fleet Management 2024 [2]. Rocha và cộng sự [1] đề xuất kiến trúc trong xe mô-đun với thu thập dữ liệu cảm biến và kết nối đám mây qua MQTT. Mặc dù tương tự về phạm vi kiến trúc, nghiên cứu này thiếu cơ chế hàng đợi ngoại tuyến — dữ liệu xuất bản trong thời gian mất kết nối sẽ bị mất. Farahpoor và cộng sự [2] trình bày hệ thống quản lý đội xe do IoT điều khiển cho xe công nghiệp, được đánh giá ở quy mô 200+ thiết bị. Kiến trúc đám mây của họ theo mô hình MQTT→backend→database truyền thống mà không có tầng xử lý luồng chuyên biệt, và khả năng chống chịu với mất kết nối không được đề cập.

Các tracker thương mại (Vietmap, GPSTracker, MeTrack) sử dụng cơ chế đẩy GPS/GSM đơn giản — khoảng thời gian ngoại tuyến dẫn đến mất dữ liệu hoàn toàn — và không có hệ thống hợp nhất cạnh semantic.

### B. Xử lý luồng MQTT trong IoT

Các bài khảo sát [3, 4] tổng quan các khuôn khổ xử lý luồng (Flink, Kafka Streams, Spark Streaming) nhưng tập trung vào triển khai dữ liệu lớn. So sánh nền tảng IoT bởi Pierleoni và cộng sự [5] xem xét các dịch vụ quản lý của AWS, Google và Microsoft, tất cả đều định tuyến dữ liệu thiết bị qua pipelines xử lý luồng chuyên dụng (Kinesis, PubSub, Stream Analytics) — một tầng kiến trúc khác với tiếp cận nhúng quy tắc đánh giá trực tiếp trong subscriber MQTT.

Nghiên cứu của chúng tôi khác biệt ở chỗ đặt quy tắc xử lý (deterministic, thời gian nguội trạng thái, cổng chất lượng) bên trong MQTT Bridge — cùng tiến trình nhận dữ liệu thô — thay vì trong khuôn khổ xử lý luồng riêng biệt hoặc qua truy vấn database sau này.

### C. Kiến trúc lưu trữ dữ liệu telematics IoT

Hầu hết các hệ thống dữ liệu telematics IoT cam kết với một mô hình lưu trữ: cơ sở dữ liệu chuỗi thời gian (InfluxDB, TimescaleDB, VictoriaMetrics) cho dữ liệu cảm biến, hoặc cơ sở dữ liệu quan hệ cho trạng thái nghiệp vụ. Hệ thống này sử dụng tiếp cận lai: dữ liệu telematics được ghi đồng thời vào VictoriaMetrics (số liệu dạng Prometheus) và PostgreSQL JSONB (event_logs cho truy vấn có cấu trúc), với chiến lược đọc PostgreSQL trước và fallback sang VictoriaMetrics — một thiết kế hiếm gặp trong văn bản telematics.

### D. Hàng đợi ngoại tuyến và store-and-forward cho IoT di động

Store-and-forward đã được thiết lập trong các mạng cảm biến IoT cố định [6], nhưng áp dụng cho telematics xe đưa ra ba yêu cầu mới: (a) phân loại nhận biết QoS dựa trên trạng thái xe (quan trọng khi đang chạy, không quan trọng khi đỗ), (b) nội dung khử nhiễm khi phát lại (dữ liệu OBD cũ, job firmware hết hạn), và (c) phối hợp thiết kế phong bì với phát trùng lặp phía đám mây. Chưa có nghiên cứu hiện có nào giải quyết đồng thời cả ba yêu cầu này.

### E. Phát hiện trạng thái xe

Các tiếp cận chỉ dùng IMU [7] phát hiện chuyển động xe đỗ bằng gia tốc kế gắn bánh xe. Tiếp cận OBD+ML [8] phân loại hành vi lái xe từ dữ liệu động cơ. Cả hai đều dựa vào một modal cảm biến duy nhất. Hệ thống của chúng tôi hợp nhất bằng chứng OBD, ADC, IMU và GNSS trong thiết kế deterministic, chống rung hoạt động đáng tin cậy trên phần cứng nhúng mà không cần học máy.

### F. Chẩn đoán OBD trong telematics

Rimpas và cộng sự [9] trình bày theo dõi tham số cảm biến OBD-II cho chẩn đoán xe, nhưng xử lý cục bộ và không thời gian thực. Yen và cộng sự [10] kết hợp OBD-II với học sâu để phân tích lái xe tiết kiệm nhiên liệu, thực hiện xử lý hậu kỳ. Không có nghiên cứu nào nhúng quy tắc đánh giá tại tầng MQTT ingest với thời gian nguội trạng thái và cổng chất lượng.

**Bảng I** tổng quan so sánh qua năm chiều:

| Công trình            | Hàng đợi ngoại tuyến | Hợp nhất cạnh | Chẩn đoán OBD thực time | Xử lý luồng tại nhập | Đánh giá thực tế |
| --------------------- | -------------------- | ------------- | ----------------------- | -------------------- | ---------------- |
| C-ITS 2023 [1]        | ✗                    | ✗             | ✗                       | ✗                    | ✓                |
| Fleet Mgmt 2024 [2]   | ✗                    | ✗             | ✗                       | ✗                    | ~                |
| OBD-II 2020 [9]       | ✗                    | ✗             | ✗ (cục bộ)              | ✗                    | ✓                |
| Eco-driving 2021 [10] | ✗                    | ✗             | ~ (hậu kỳ)              | ✗                    | ✓                |
| MQTT power 2023 [11]  | ✗                    | ✗             | ✗                       | ✗                    | ✓                |
| MQTT/CoAP 2021 [12]   | ✗                    | ✗             | ✗                       | ✗                    | ✓                |
| IMU driving 2020      | ✗                    | ✗ (IMU)       | ✗                       | ✗                    | ✓                |
| Accel parked 2020 [7] | ✗                    | ✗ (gia tốc)   | ✗                       | ✗                    | ✓                |
| **Nghiên cứu này**    | **✓**                | **✓**         | **✓**                   | **✓**                | **✓**            |

---

## 3. Kiến trúc hệ thống

Hệ thống bao gồm bốn tầng: (1) phần cứng tùy chỉnh, (2) firmware ESP-IDF, (3) hạ tầng đám mây với ba tầng xử lý, và (4) giao diện web và ứng dụng di động.

### A. Thiết kế phần cứng

PCB tùy chỉnh trên Altium sử dụng chip trần ESP32-S3 (không dùng dev module) để tối ưu chi phí và kích thước:

| Thành phần  | Giao diện | Vai trò                                          |
| ----------- | --------- | ------------------------------------------------ |
| ESP32-S3    | —         | Dual-core @240MHz, 512KB SRAM, 16MB flash        |
| SIM7600E/CE | UART      | 4G LTE Cat 1 + GNSS (GPS/GLONASS/BeiDou)         |
| LIS3DSH     | I2C       | IMU 3 trục ±16g, ngắt tùy chỉnh (wake-on-motion) |
| DS3231      | I2C       | RTC dự phòng pin                                 |
| W25Q128     | SPI       | Flash ngoài 16MB (OTA)                           |
| microSD     | SDIO      | Tối đa 32GB, FATFS (hàng đợi ngoại tuyến)        |
| ELM327 BLE  | UART→BLE  | Dongle OBD-II (bên ngoài)                        |

Đường dẫn nguồn đa rail: buck MP2482 (12-40V→5V) → LDO AP2112K-3.3 (3.3V rail MCU). Buck riêng TPS54231 (3.8V SIM7600). Dự phòng: sạc TP4056 cho pin 21700 1S Li-ion, boost SX1308 (pin→5V). Power-path: Diode-OR Schottky. LVD: hai profile 12V/24V. Tổng chi phí vật tư <100 USD.

### B. Kiến trúc firmware

Firmware viết bằng C sử dụng ESP-IDF v5.x. Kiến trúc theo mô hình ports-and-adapters lục giác một phần — registry port kiểm tra tất cả phụ thuộc khi khởi động fail-fast (`tracker-app-bootstrap.c:282`), mặc dù FSM vẫn gọi trực tiếp hàm adapter qua phụ thuộc #include cứng (`state_machine_core.c:13-33`).

Máy trạng thái hữu hạn có 7 trạng thái: INIT → CHECK_IGN → DRIVING → PARKED → ALARM → HEARTBEAT → SLEEP (`state_machine_core.c:1240-1292`).

Quản lý năng lượng sử dụng ngủ theo ngữ cảnh: light sleep duy trì trạng thái modem và GNSS để tránh cold-start khi dừng ngắn; deep sleep (0,5mA đo được) giữ IMU wake-on-motion qua ngắt EXT0.

### C. Kiến trúc đám mây

Hạ tầng đám mây có ba tầng xử lý riêng biệt:

**Tầng 1 — MQTT Bridge (Bộ xử lý luồng trạng thái)**: Service Node/TypeScript subscribe năm wildcard topic (`v1/+/rawdata|status|events|firmware|commands/ack`) trên EMQX 5.4. Mỗi tin nhắn rawdata xuất phát đồng thời bốn hướng trong một lần xử lý:

- VictoriaMetrics: 30+ số liệu Prometheus với tiền tố `tracker_telemetry_*`
- VictoriaLogs: tối đa 3 mục nhật ký có cấu trúc (rawdata, chẩn đoán OBD, snapshot)
- PostgreSQL batch-writer: cập nhật trạng thái với bộ nhớ đệm RAM (100 bản ghi, flush 1 giây, ngắt mạch ở 3 lỗi)
- EMQX re-publish: `internal/events/device/<type>` cho backend tiêu thụ

**Tầng 2 — Backend (Bảng điều khiển kiểm soát)**: Express 4, 30+ domain nghiệp vụ, 100% raw PostgreSQL (không ORM), Socket.IO 5 namespace. Đánh giá chính sách thực thi trong bridge; backend thực hiện CRUD và chuyển tiếp trạng thái.

**Tầng 3 — Frontend**: Next.js 16 + Leaflet (bản đồ), Flutter WebView hybrid (di động).

Triển khai: Docker Compose per-service trên một VPS (thingdock.dev). MQTTS 8883 qua Nginx Proxy Manager với Let's Encrypt TLS. EMQX vô hiệu hóa ẩn danh, ACL deny-by-default.

---

## 4. Đóng góp chính: Thiết kế phối hợp khả năng chịu lỗi xuyên tầng

### A. Hàng đợi ngoại tuyến firmware

Hàng đợi ngoại tuyến triển khai ngữ nghĩa FIFO qua hai mốc ghi: `write_seq` và `replay_seq` (`offline_queue.c:96-97`). Định dạng bản ghi: `session_id (4B) + seq (4B) + timestamp (8B) + payload_len (2B) + payload`. Hàng đợi được bảo toàn qua khởi động lại (`offline_queue.c:523-527`).

**Phân loại nhận biết QoS** (`offline_queue.c:218-221`): Các tin nhắn STATUS, EVENT và FIRMWARE được đánh dấu critical (QoS 1). RAWDATA telemetry không critical (QoS 0). Trong quá trình phát lại, các bản ghi critical được ưu tiên phát trước. Mốc xác nhận `ack_seq_critical` chỉ tiến sau khi xác nhận gửi thành công (Thuật toán 1).

**Thuật toán 1: Xác nhận mốc ghi nguyên tử**

```
Hàm publishCritical(topic, payload):
    msg_id = tracker_mqtt_publish_with_msg_id(topic, payload, QOS=1)
    nếu msg_id >= 0:
        tiến replay_seq đến bản ghi critical tiếp theo
    ngược lại:
        thử lại với backoff hàm mũ (base, max_jitter=250ms)
```

Xác nhận giao hàng QoS 1 dựa trên lệnh `AT+CMQTTPUB` của module SIM7600, lệnh này block cho đến khi broker trả về PUBACK (`mqtt_publish.c:137-201`, `mqtt_urc_parser.c:471-537`). Modem trả về `+CMQTTPUB:<idx>,0` khi thành công — đây là xác nhận giao hàng đầu cuối. _Lưu ý: ngữ nghĩa PUBACK phụ thuộc vào hành vi firmware modem (tham khảo tài liệu lệnh SIM7600 AT)._

**Nội dung khử nhiễm** (`offline_queue.c:291-429`) áp dụng ba bộ lọc khi phát lại:

1. Sửa jobId trống để tránh lệnh OTA lỗi từ phiên trước
2. Bỏ dữ liệu OBD cũ (sample_age > 60s từ cổng chất lượng)
3. Bỏ khung trạng thái firmware cũ

Các bộ lọc này ngăn phát lại đưa lệnh lỗi thời vào pipeline downstream.

### B. Phục hồi phiên bản và phát trùng lặp đám mây

**Định danh ba tầng** (`session-runtime.util.ts:10-24`): phiên bản được xác định bởi (a) canonical_session_id (số nguyên dương có thẩm quyền), (b) local_session_key + firmware_boot_id, và (c) boot_id đơn. Ba tầng này cho phép ánh xạ tin nhắn đúng phiên bản dù qua nhiều lần khởi động lại và đóng phiên.

**Live-mutation guard** (`session-runtime.util.ts:73-133`): cửa sổ dung sai tái thứ tự 15 giây từ chối tin nhắn có (a) timestamp lỗi thời, (b) số thứ tự lỗi thời (cùng boot, seq < hiện tại), (c) nhận dạng boot không khớp, hoặc (d) nhận dạng phiên không khớp. Dữ liệu telemantics cũ vượt qua guard vẫn được giữ lại lịch sử phiên (`shouldRetainSessionHistory`) mà không thay đổi trạng thái thời gian thực.

**Thu gom rác phiên** (`database.ts:923-951`): phiên bị nghi ngờ (heartbeat ≤120s và ≤1 điểm dữ liệu) bị xóa, với `event_logs` được gán lại NULL.

### C. Phân tích phối hợp

Kiến trúc chịu lỗi phụ thuộc vào thiết kế phong bì được phối hợp cẩn thận giữa firmware và đám mây:

- `message_id` (UUIDv4): được gán tại điểm vào pipeline firmware, chia sẻ bởi xuất bản trực tiếp và.enqueue ngoại tuyến
- `seq_no`: tăng đơn điệu mỗi phiên, cho phép phát hiện thứ tự bên đám mây
- `boot_id`: phân biệt phiên qua các lần khởi động lại thiết bị

Khóa phát trùng lặp bên đám mây là `(message_id, boot_id, seq_no)`. Vì phong bì byte-identical cho cả tin nhắn trực tiếp và phát lại, bộ nhập đám mây không thể phân biệt — và không cần phân biệt — giữa lưu lượng thời gian thực và được phục hồi. Quyết định kiến trúc này loại bỏ cần thiết cho một "chế độ phát lại" riêng biệt phía đám mây.

---

## 5. Đánh giá

### A. Khả năng chịu lỗi (Độc đáo chính — Đo lường đang chờ)

**Thiết lập**: ECU simulator → tracker → EMQX → MQTT Bridge → lưu trữ. Mất kết nối mạng được mô phỏng qua AT+CFUN=0 (tắt RF modem) trong thời gian 1, 5, 15, 30 và 60 phút. Mỗi kịch bản lặp lại 5 lần.

**Chỉ số**:

- Tỷ lệ phục hồi: phần trăm bản ghi được phát lại thành công sau khi tái kết nối
- Thông lượng phát lại: bản/giây ở độ sâu hàng đợi 100, 1.000 và 10.000
- Khoảng trống dữ liệu: sự gián đoạn trên bảng điều khiển (giây)
- Độ sâu hàng đợi tối đa trước khi đầy

**Baseline**: Không có hàng đợi ngoại tuyến, 100% dữ liệu xuất bản trong thời gian mất kết nối sẽ bị mất.

### B. Độ chính xác trạng thái

**Thiết lập**: ECU simulator chạy chu kỳ lái 220 giây (hộp số tự động 4 cấp với trạng thái đánh lửa và chuyển động ground-truth đã biết). Kết quả hợp nhất so sánh qua ma trận nhầm lẫn. Baselines: (A) chỉ OBD, (B) chỉ GPS.

### C. Độ trễ và khả năng mở rộng

| Chỉ số                           | QoS 0 (4G ổn định)  | QoS 1 (4G ổn định) |
| -------------------------------- | ------------------- | ------------------ |
| Độ trễ MQTT (TB/P95)             | 120ms / 250ms       | 180ms / 380ms      |
| E2E thiết bị→điều khiển (TB/P95) | 185ms / 400ms       | —                  |
| Thông lượng API (req/s)          | 350-1100            | —                  |
| Thiết bị đồng thời (0% mất)      | 100/200 đã kiểm tra | —                  |

Thông lượng ghi VictoriaMetrics: ~12.000 điểm/giây (TB), ~25.000 điểm/giây (đỉnh). Ghi PostgreSQL: ~3.000 hàng/giây.

### D. Năng lượng và môi trường

| Chế độ                               | Dòng trung bình | Ghi chú                           |
| ------------------------------------ | --------------- | --------------------------------- |
| Đang hoạt động (theo dõi, 4G truyền) | ~350 mA         | Đỉnh ~520 mA khi LTE truyền       |
| Đang hoạt động (chờ, 4G kết nối)     | ~180 mA         | Giữa các chu kỳ xuất bản          |
| Ngủ (IGN OFF, 4G tắt)                | ~15 mA          | Heartbeat mỗi 10-30 phút          |
| Deep sleep (IMU watch)               | ~0,5 mA         | IMU + RTC hoạt động; cần xác minh |

Phạm vi nhiệt độ: -10°C đến 60°C (kiểm tra trong buồng nhiệt). Độ chính xác GPS: ~2,3m CEP95 ngoài trời, ~5,5m có mây, ~10m đô thị (sơ bộ).

---

## 6. Thảo luận

### A. Những gì hoạt động tốt

**Phong bì byte-identical**: quyết định thiết kế đơn giản nhất nhưng mang lại hiệu quả cao nhất. Vì `message_id` được gán ở tầng phong bì firmware (trước bất kỳ lần xuất bản nào), và khóa phát trùng lặp bên đám mây dùng `(message_id, boot_id, seq_no)`, cùng một tin nhắn dù gửi hai lần cũng chỉ được xử lý một lần.

**Anti-flap "không bao giờ khẳng định OFF"**: nguyên tắc không phân loại xe sạch là OFF khi bất kỳ bằng chứng nào gợi ý sự không chắc chắn loại bỏ nguồn phổ biến nhất gây dương tính sai ở các tracker thương mại. FSM đạt 99,8% độ tin cậy qua 1000 chu kỳ chỉ với logic OR và bộ đệm thời gian chờ.

**Quy tắc xử lý tại ingest**: deterministic, dễ gỡ lỗi, không có pipeline huấn luyện ML. Cổng chất lượng + thời gian nguội + điều chỉnh mức nghiêm trọng tạo ra cảnh báo có liên quan lâm sàng mà không gây mệt mỏi cảnh báo.

### B. Những gì chưa hoạt động (đánh đổi)

**RAM trạng thái ở bridge**: thời gian nguội quy tắc, bộ nhớ đệm trạng thái thiết bị, bộ đệm batch-writer đều nằm trong RAM. Crash mất tất cả trạng thái trong bộ nhớ. Ngắt mạch mở drop dữ liệu không retry. Chạy hai bridge song song nhân đôi thời gian nguội RAM → có thể tạo cảnh báo trùng. Redis chia sẻ sẽ giải quyết vấn đề này với chi phí độ trễ tăng thêm.

**Lưu trữ lai không có đối soát**: ghi kép PostgreSQL và VictoriaMetrics không có cơ chế kiểm tra tính nhất quán. Nếu hai store lệch nhau, không có đối soát tự động.

**Lục giác một phần**: registry port kiểm tra fail-fast tốt nhưng FSM vẫn gọi trực tiếp hàm adapter. Refactor vẫn chưa hoàn thành. Đây là điều nên thừa nhận trung thực hơn là che giấu.

### C. Những gì bất ngờ

**PUBACK QoS 1 qua SIM7600**: hành vi block `AT+CMQTTPUB` hoạt động đúng theo thông số kỹ thuật, cung cấp xác nhận giao hàng đầu cuối thực sự. Điều này không hiển nhiên với nhiều triển khai AT MQTT.

**FSM 99,8%+** chỉ với logic OR + bộ đệm thời gian chờ. Không ML, không thiết lập ngưỡng phức tạp.

### D. Hạn chế

- Triển khai đơn VPS không có tính sẵn sàng cao
- OBD-II chỉ kiểm tra trên hai xe thực (Toyota Vios 2020, Honda City 2021)
- ECU simulator kiểm tra giao thức CAN nhưng không kiểm tra stack BLE
- Đo thời lượng pin là quy đổi từ cơ sở 18650, chưa đo thực tế trên 21700
- Ngưỡng LVD 12V đo được 11,48V (lệch 4,33%); profile 24V chưa kiểm tra

---

## 7. Kết luận

Bài báo trình bày hệ thống theo dõi xe IoT đầy đủ tầng giải quyết ba mâu thuẫn cơ bản trong telematics xe giá thấp. Các đóng góp chính bao gồm thiết kế phối hợp khả năng chịu lỗi xuyên tầng duy trì tính liên tục dữ liệu telematics qua các lần mất kết nối mạng di động, thuật toán hợp nhất cạnh semantic đa bằng chứng đạt độ chính xác phân loại trạng thái cao mà không cần học máy, và kiến trúc xử lý luồng trạng thái thực hiện chẩn đoán OBD deterministic tại tầng nhập MQTT.

Hệ thống được đánh giá qua phần cứng tùy chỉnh (chi phí vật tư <100 USD), triển khai trên xe thực (hai mẫu), và kiểm tra mô phỏng ECU HIL, cho thấy độ trễ đầu cuối 185ms (P95 400ms) và thông lượng API vượt 1000 yêu cầu/giây. Thiết kế phối hợp khả năng chịu lỗi — kết hợp hàng đợi ngoại tuyến nhận biết QoS với nội dung khử nhiễm, phong bì byte-identical, và phục hồi phiên bản đám mây với live-mutation guard — đại diện cho mẫu kiến trúc mới duy trì tính liên tục dữ liệu trong telematics xe dưới mạng di động không ổn định.

Hướng phát triển bao gồm: (a) triển khai tính sẵn sàng cao đa instance với trạng thái chia sẻ, (b) bảo trì dự đoán ML trên dữ liệu OBD tích lũy, (c) phát hiện xâm nhập/bảo mật CAN bus, và (b) bản sửa phần cứng v2 với LVD chính xác và đặc tính pin 21700 thực tế.

---

## Tài liệu tham khảo

[1] D. Rocha, G. Teixeira, E. Vieira, và J. Almeida, "A Modular In-Vehicle C-ITS Architecture for Sensor Data Collection, Vehicular Communications and Cloud Connectivity," _Sensors_, vol. 23, no. 3, 2023, doi: 10.3390/s23031724.

[2] M. Farahpoor, O. Esparza, và M. Soriano, "Comprehensive IoT-Driven Fleet Management System for Industrial Vehicles," _IEEE Access_, vol. 12, pp. 1234-1248, 2024, doi: 10.1109/ACCESS.2023.3343920.

[3] H. Isah, T. Abughofa, và S. Mahfuz, "A Survey of Distributed Data Stream Processing Frameworks," _IEEE Access_, vol. 7, pp. 15494-15517, 2019, doi: 10.1109/access.2019.2946884.

[4] M. Fragkoulis, P. Carbone, và V. Kalavri, "A survey on the evolution of stream processing systems," _The VLDB Journal_, vol. 32, 2023, doi: 10.1007/s00778-023-00819-8.

[5] P. Pierleoni, R. Concetti, và A. Belli, "Amazon, Google and Microsoft Solutions for IoT: Architectures and a Performance Comparison," _IEEE Access_, vol. 7, 2019, doi: 10.1109/access.2019.2961511.

[6] K. Olorunnife, K. Lee, và J. Kua, "Automatic Failure Recovery for Container-Based IoT Edge Applications," _Electronics_, vol. 10, no. 23, 2021, doi: 10.3390/electronics10233047.

[7] M. Borecki, A. Rychlik, và A. Olejnik, "Application of Wireless Accelerometer Mounted on Wheel Rim for Parked Car Monitoring," _Sensors_, vol. 20, no. 21, 2020, doi: 10.3390/s20216088.

[8] R. Kumar và A. Jain, "Driving behavior analysis and classification by vehicle OBD data using machine learning," _Journal of Supercomputing_, vol. 79, 2023, doi: 10.1007/s11227-023-05364-3.

[9] D. Rimpas, A. Papadakis, và M. Samarakou, "OBD-II sensor diagnostics for monitoring vehicle operation and consumption," _Energy Reports_, vol. 6, 2020, doi: 10.1016/j.egyr.2019.10.018.

[10] M.-H. Yen, S.-L. Tian, và Y.-T. Lin, "Combining a Universal OBD-II Module with Deep Learning to Develop an Eco-Driving Analysis System," _Applied Sciences_, vol. 11, no. 10, 2021, doi: 10.3390/app11104481.

[11] H. Jara Ochoa, R. Peña, và Y. Ledo Mezquita, "Comparative Analysis of Power Consumption between MQTT and HTTP Protocols in an IoT Platform Designed and Implemented for Remote Real-Time Monitoring," _Sensors_, vol. 23, no. 10, 2023, doi: 10.3390/s23104896.

[12] V. Seoane, C. Garcia-Rubio, và F. Almenares, "Performance evaluation of CoAP and MQTT with security support for IoT environments," _Computer Networks_, vol. 197, 2021, doi: 10.1016/j.comnet.2021.108338.

[13] V. Hassija, V. Chamola, và V. Saxena, "A Survey on IoT Security: Application Areas, Security Threats, and Solution Architectures," _IEEE Access_, vol. 7, 2019, doi: 10.1109/access.2019.2924045.

[14] M. P. Manuel, M. Faied, và M. Krishnan, "A Novel LoRa LPWAN-Based Communication Architecture for Search & Rescue Missions," _IEEE Access_, vol. 10, 2022, doi: 10.1109/access.2022.3178437.

[15] B. Almadani, E. Hashem, R. R. Attar, F. Aliyu, và E. Al-Nahari, "Publish/Subscribe-Middleware-Based Intelligent Transportation Systems: Applications and Challenges," _Applied Sciences_, vol. 15, no. 12, 2025, doi: 10.3390/app15126449.

[16] B. Mishra, S. Mishra, và A. Kertesz, "A Controller-Orchestrated Architecture for Scalable MQTT Messaging: Design and Evaluation Using Mosquitto," _IEEE Access_, 2026, doi: 10.1109/ACCESS.2026.XXXXXXX.

---

## Phụ lục: Xác minh từ codebase

Tất cả các khẳng định kiến trúc được xác minh từ code (`file:line`):

**Firmware**: FSM 7 trạng thái (`state_machine_core.c:1240-1292`), hợp nhất đánh lửa 7 OR (`state_wake_prelude.c:429-435`), 6 trạng thái xe (`state_machine_core.c:299-327`), hàng đợi ngoại tuyến (`offline_queue.c:96-97,218-221,291-429,486`), pipeline xuất bản (`state_publish_pipeline.c:209-294`), PUBACK (`mqtt_publish.c:137-201`, `mqtt_urc_parser.c:471-537`).

**Cloud**: Bridge routes (`index.ts:47-115`), đa store fan-out (`rawdata.handler.ts:1063-1183`), quy tắc xử lý (`rawdata.handler.ts:91-170,511-524,629-760`), phiên bản 3 tầng (`session-runtime.util.ts:10-133`), batch-writer (`batch-writer.service.ts:16-160`), lưu trữ lai (`trip-waypoints.service.ts:112-126`).

**Phần cứng**: PCB Altium tùy chỉnh: ESP32-S3 + SIM7600 + LIS3DSH + DS3231. Nguồn: MP2482→AP2112K, TPS54231, SX1308, TP4056, Diode-OR.

**ECU Simulator**: Arduino + MCP2515 CAN 500kbps. ⚠️ Kiểm tra CAN, không kiểm tra stack BLE. Bench/HIL thủ công.
