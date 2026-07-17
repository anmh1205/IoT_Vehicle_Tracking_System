# Paper Plan — IoT Vehicle Tracking System for IEEE Access

> Outline + nội dung chi tiết cho paper IEEE Access.
> Tất cả claim được verify từ codebase (`file:line` tại phụ lục). Số đo là placeholder.

---

## Outline tổng quan

| Section | Nội dung | Trang |
|---|---|---|
| **I. Introduction** | Bối cảnh (xe cho thuê), 3 mâu thuẫn kỹ thuật, câu hỏi nghiên cứu, 4 contributions | ~1.5 |
| **II. Related Work** | 5 nhóm: telematics platforms, stream processing IoT, hybrid storage, offline queue, vehicle state detection + OBD diagnostics. Bảng so sánh 8 baseline. | ~2 |
| **III. System Architecture** | Tổng quan 3 tầng (firmware, bridge, cloud) — chỉ đủ để hiểu contribution | ~2 |
| **IV. Resilience Co-Design** | Contribution chính. Offline queue (FIFO + QoS + sanitize) + session recon + byte-identical envelope + co-design analysis. | ~3 |
| **V. Evaluation** | Resilience (chính), state accuracy (confusion matrix vs ECU sim), latency & scalability (kế thừa thesis), power & environment | ~3 |
| **VI. Discussion** | What worked / what didn't / what surprised / limitations | ~1 |
| **VII. Conclusion** | Tổng kết, future work | ~0.5 |

**Mạch logic xuyên suốt**: Mở đầu bằng 3 mâu thuẫn thực tế → Related Work chỉ ra chưa ai giải cả 3 → Architecture cho thấy tổng thể → Phần IV đào sâu giải pháp chính (resilience co-design) → Evaluation đo lường bằng chứng → Discussion phân tích trade-off (honest systems paper).

---

## 1. Mở đầu

Mô hình xe cho thuê tự lái đang phát triển nhanh ở Việt Nam, nhưng nó tạo ra một vấn đề chưa được giải quyết triệt để: làm sao để chủ xe có thể giám sát tài sản của mình (vị trí, tình trạng động cơ, cảnh báo bất thường) theo thời gian thực, khi người lái là người lạ và thiết bị phải hoạt động trong môi trường mạng 4G dân dụng vốn không ổn định?

Một thiết bị telematics gắn trong xe có thể giải quyết bài toán này, nhưng nó phải đương đầu với ba mâu thuẫn kỹ thuật:

**Thứ nhất**, giữa yêu cầu real-time (cảnh báo ngay khi xe bị kéo, vượt vùng) và thực tế mạng 4G thường xuyên mất sóng — xe vào hầm, vùng xa, chuyển trạm. Giải pháp thông thường là chấp nhận mất dữ liệu khi offline, hoặc log lại để đọc sau — cả hai đều không đáp ứng được yêu cầu cảnh báo.

**Thứ hai**, giữa nhu cầu biết chính xác trạng thái xe (máy bật/tắt, chạy/đỗ) và sự thiếu tin cậy của từng cảm biến riêng lẻ. OBD không đọc được khi máy tắt, IMU bị nhiễu rung cơ học, GPS không phân biệt được máy nổ hay xe đang kéo.

**Thứ ba**, một tracker lý tưởng không chỉ theo dõi vị trí mà còn chẩn đoán lỗi động cơ từ xa, nhưng ESP32-S3 không đủ tài nguyên cho ML, còn gửi raw data lên cloud xử lý sau lại tốn băng thông.

**Paper này trả lời câu hỏi**: làm sao xây dựng một vehicle tracker đáp ứng đồng thời ba yêu cầu trên, với chi phí dưới 100 USD, trên nền tảng 4G dân dụng và thiết bị nhúng 5W?

---

## 2. Công trình liên quan

### 2.1 Nền tảng telematics cho xe

Hai công trình gần nhất với hệ thống này là C-ITS 2023 (Rocha, Sensors) và Fleet Management 2024 (Farahpoor, IEEE Access). Cả hai đều đề xuất kiến trúc tích hợp hardware-firmware-cloud cho giám sát phương tiện. Tuy nhiên, cả hai đều thiếu hai yếu tố: (a) cơ chế store-and-forward khi mất kết nối, và (b) khả năng phân tích dữ liệu tại tầng ingest. Dữ liệu từ thiết bị được ghi xuống database rồi xử lý sau, không có xử lý real-time trên luồng MQTT.

Các nền tảng IoT thương mại (AWS IoT Core, Google Cloud IoT, Azure IoT Hub) có stream processing tích hợp, nhưng qua managed service riêng (Kinesis, PubSub, Event Hub) — không phải kiến trúc tự xây trên MQTT broker. Pierleoni et al. (IEEE Access, 2019) so sánh ba nền tảng này, cho thấy chi phí và độ phức tạp cao hơn đáng kể so với giải pháp tự xây trên VPS.

### 2.2 Lưu trữ telemetry cho IoT

Các hệ thống IoT telematics thường chọn một trong hai hướng lưu trữ: time-series database (InfluxDB, TimescaleDB, VictoriaMetrics) cho dữ liệu cảm biến, hoặc relational database cho dữ liệu nghiệp vụ. Hệ thống này chọn cả hai — telemetry được ghi đồng thời vào VictoriaMetrics (metrics thuần số) và PostgreSQL JSONB (event_logs có cấu trúc), với chiến lược đọc PostgreSQL trước và fallback sang VictoriaMetrics — một thiết kế ít thấy trong literature.

### 2.3 Offline queue cho IoT di động

Cơ chế lưu trữ cục bộ và phát lại khi có kết nối là kỹ thuật phổ biến trong IoT cảm biến cố định. Tuy nhiên, áp dụng cho vehicular telematics đặt ra ba yêu cầu mới: (a) phân loại ưu tiên theo trạng thái xe (critical khi đang chạy, non-critical khi đỗ), (b) lọc nội dung khi replay để tránh sinh lỗi (dữ liệu OBD cũ, job firmware hết hạn), và (c) phối hợp với cloud session management để đảm bảo không trùng lắp.

### 2.4 Phát hiện trạng thái xe

Hai hướng chính trong literature: dùng IMU (Borecki 2020, một mình accelerometer cho xe đỗ) và dùng OBD + ML (Kumar 2023, phân loại driving behavior). Cả hai đều chỉ dùng một nguồn dữ liệu. Chưa có công trình nào kết hợp OBD + ADC + IMU + GPS trong một fusion real-time trên embedded firmware với cơ chế anti-flap dùng grace timers và UNKNOWN fallback.

### 2.5 Chẩn đoán OBD

Rimpas 2020 và Yen 2021 là hai đại diện — một bên là diagnostics local, một bên là deep learning post-processing. Chưa có công trình nào đặt rule engine DTC và bảo dưỡng ngay tại tầng MQTT ingest với quality gate và stateful cooldown.

**Như vậy**, cả ba mâu thuẫn ở phần 1 đều là những khoảng trống thực sự trong literature. Bảng so sánh 8 baseline theo các cột [offline queue | edge fusion | OBD diagnostics ingest | stream processing | evaluation thực tế] sẽ cho thấy "This work" điền đầy các ô trống.

---

## 3. Thiết kế hệ thống

Phần này trình bày cách giải quyết từng mâu thuẫn. Với mỗi giải pháp, tôi sẽ giải thích lựa chọn thiết kế và cơ sở của nó.

### 3.1 Resilience co-design firmware và cloud

Mâu thuẫn giữa real-time và mạng không ổn định được giải quyết bằng cách không chọn một trong hai, mà thiết kế một pipeline publish thống nhất với cơ chế live-first và offline-fallback.

Khi mạng hoạt động, firmware publish MQTT bình thường. Khi publish thất bại (mất sóng, timeout modem), dữ liệu được ghi vào hàng đợi FIFO trên thẻ SD với cùng message_id, seq_no và boot_id — tạo thành một "vỏ bọc" (envelope) byte-identical cho cả đường live và offline. Khi mạng trở lại, hàng đợi được replay. Bên cloud, session reconstruction và dedup dùng key (message_id + boot_id + seq_no) để loại bỏ trùng lắp. Cloud không cần phân biệt đường live hay replay.

Thiết kế này đặt ra bốn vấn đề con:

**(a) Phân loại ưu tiên.** Không phải bản tin nào cũng quan trọng như nhau. Các bản tin trạng thái, sự kiện và firmware dùng QoS 1 và được đánh dấu critical — cần đảm bảo gửi thành công. Dữ liệu telemetry thô dùng QoS 0 — nếu mất vài điểm là chấp nhận được. Trong hàng đợi, critical được replay trước.

**(b) Xác nhận gửi thành công.** Với critical (QoS 1), firmware chỉ advance con trỏ đọc (ack_seq_critical) sau khi modem xác nhận rằng broker đã nhận PUBACK. Lệnh AT+CMQTTPUB trên module SIM7600 có cơ chế block cho tới khi broker trả PUBACK — đây là delivery confirmation end-to-end. (Caveat: cơ chế này là hành vi của modem, cần cite SIM7600 AT manual.)

**(c) Lọc khi replay.** Không phải dữ liệu nào trong hàng đợi cũng còn giá trị khi mạng trở lại. Ba cơ chế sanitize được áp dụng: (1) patch jobId rỗng để tránh firmware ODA nhận lệnh cũ, (2) drop stale OBD rawdata, (3) skip stale firmware status. Mục đích là replay không sinh lỗi downstream.

**(d) Session management bên cloud.** Bridge nhận message từ replay có thể đến chậm hơn message live. Session identity 3 tầng (canonical session id, local_session_key + boot_id) cho phép map message đúng session dù đến trễ. Live-mutation guard với reorder tolerance 15 giây chống dữ liệu cũ ghi đè lên state hiện tại.

### 3.2 Multi-evidence edge fusion

Thay vì tin vào một cảm biến duy nhất, ignition được suy ra bằng phép OR có trọng số của bảy nguồn: ADC đo rail điện áp (>=13V), OBD live (RPM>0, ELM ready, sample ≤5s), RPM tức thời, và ba grace timer chống mất tín hiệu tạm thời. Nếu tất cả đều không có kết luận, trạng thái được đặt là UNKNOWN — không phải OFF.

Thiết kế này dựa trên quan sát: lỗi phổ biến nhất của tracker thương mại là "ép xe về OFF" khi mất tín hiệu OBD (xe tắt máy → OBD mất kết nối → tracker kết luận sai "không có gì bất thường"). Fusion này tránh lỗi đó.

Kết hợp ignition với motion (từ GNSS hoặc OBD speed, ngưỡng 3 km/h), ta có ma trận 6 trạng thái: MOVING_ON, IDLING_ON, ROLLING_IGN_OFF (xe trôi/kéo khi tắt máy — cảnh báo trộm), PARKED_OFF, và hai trạng thái UNKNOWN.

Toàn bộ logic dùng OR + grace timer, không cần ML. Kết quả trong thesis (Bảng 4.24) cho thấy state machine đạt 99.8% độ tin cậy qua 1000 chu kỳ.

### 3.3 Stateful rule engine tại MQTT ingest

Thay vì ghi dữ liệu OBD xuống database rồi chạy query định kỳ (tốn thời gian, chậm phát hiện), rule engine được đặt ngay tại MQTT Bridge — service Node/TypeScript nhận message từ EMQX. Mỗi message rawdata được kiểm tra đồng thời 13 class DTC match (theo range hex: P0300-P0308 misfire, P0171/P0174 lean, P0562 voltage, P0420 catalyst, v.v.) và 4 luật bảo dưỡng.

Bốn luật bảo dưỡng được thiết kế dựa trên kinh nghiệm vận hành xe tại Việt Nam: coolant risk (nhiệt độ ≥105°C và tải ≥60%), idle-load anomaly (vòng tua >900 mà xe đứng yên ≥10 phút — dấu hiệu điều hoà/quạt gió hoạt động quá mức), channel-unstable (BLE OBD ngắt kết nối nhiều), và voltage risk under load.

Để tránh cảnh báo trùng, mỗi rule có cooldown 15 phút lưu trong RAM. Quality gate bắt buộc: chỉ xử lý khi BLE connected, ELM ready và sample age ≤60 giây. Severity được điều chỉnh động (pending-only hạ 1 bậc, MIL on tăng 1 bậc). Confidence clamp [0.55, 0.99].

Kiến trúc này khác với MQTT→DB→query truyền thống ở chỗ xử lý deterministic, real-time ngay trên luồng publish.

---

## 4. Tổng quan hệ thống

### 4.1 Phần cứng

PCB thiết kế riêng trên Altium, dùng chip trần ESP32-S3 (không dev module) cho chi phí thấp và kích thước nhỏ. SIM7600E/CE đảm nhận cả LTE và GNSS (GPS+GLONASS+BeiDou). LIS3DSH là IMU 3-axis cho phát hiện rung động. DS3231 RTC giữ thời gian qua reboot. W25Q128 (16 MB) cho firmware OTA, microSD cho offline queue.

Nguồn đa rail đáp ứng điện áp xe 12-24V: buck MP2482 hạ 12-40V xuống 5V, LDO AP2112K-3.3 xuống 3.3V cho MCU, buck TPS54231 tạo 3.8V cho modem. Pin 21700 1S với sạc TP4056 và boost SX1308 cho pin dự phòng. Power-path Diode-OR Schottky chọn nguồn xe hay pin tự động. LVD hai profile 12V/24V bảo vệ ắc quy. OBD2 qua dongle BLE ELM327. Tổng BOM dưới 100 USD.

### 4.2 Firmware

Viết bằng C/ESP-IDF, 7-state FSM. Pipeline publish thống nhất: message_id (UUIDv4) + seq_no + boot_id. Hexagonal ports-adapters một phần — port registry kiểm tra fail-fast khi boot, nhưng FSM còn gọi adapter trực tiếp. Power management: light sleep giữ modem ấm tránh GNSS cold-start, deep sleep 0.5mA.

### 4.3 Cloud

Kiến trúc cloud gồm ba tầng xử lý:

**MQTT Bridge (tầng ingest)** là thành phần quan trọng nhất. Đây là service Node/TypeScript subscribe 5 topic (`v1/+/rawdata|status|events|firmware|commands/ack`) từ EMQX. Mỗi message rawdata được xử lý đồng thời theo bốn hướng:
- VictoriaMetrics: 30+ metric dạng Prometheus line prefix `tracker_telemetry_`, label `device_id`
- VictoriaLogs: tối đa 3 log entry (rawdata, obd_diagnostic_raw, snapshot)
- PostgreSQL batch-writer: update state mới nhất, buffer 100 records trong RAM, flush 1 giây, có circuit breaker (3 lỗi → open → drop data)
- EMQX re-publish: event nội bộ `internal/events/device/<type>` cho backend

Bridge cũng đảm nhiệm session reconstruction (3-tier identity + live-mutation guard + garbage collection), rule engine OBD/DTC, geofence check bằng JavaScript fresh (Haversine + ray-casting), và duy trì device-state cache trong RAM.

**Backend (tầng control plane)** là Express 4 với 30+ domain, PostgreSQL raw SQL 100% (không ORM), Socket.IO 5 namespace. Policy eval chạy ở bridge, backend chỉ CRUD policy + state. Realtime ba lớp: Bridge→EMQX→listener→Event Bus→Socket.IO→frontend. Auth bằng opaque token hashed + sliding window + RBAC + ABAC-lite.

**Frontend và mobile**: Next.js 16 + Leaflet (map), Flutter WebView hybrid.

Deployment: Docker Compose per-service trên single VPS, MQTTS 8883 qua NPM reverse proxy, Let's Encrypt TLS, EMQX ACL deny-default. Observability: VictoriaMetrics + VictoriaLogs + Grafana (9 panel, 5 alert).

---

## 5. Đánh giá

### 5.1 Resilience

Giả thuyết: hệ thống có offline queue sẽ phục hồi được gần như toàn bộ dữ liệu sau khi mất kết nối, và throughput replay đủ nhanh để không tạo gap đáng kể trên dashboard.

Phương pháp: ECU simulator → tracker → EMQX → bridge → store. Ngắt modem bằng AT+CFUN=0 trong 1, 5, 15, 30, 60 phút. Đo recovery rate (%), replay throughput (record/s) ở queue depth 100, 1000, 10000, và data gap (giây). So sánh với baseline không có offline queue (mất 100%).

### 5.2 State accuracy

Giả thuyết: multi-evidence fusion (OBD+ADC+IMU+GNSS) cho độ chính xác cao hơn OBD-only hoặc GPS-only trong việc xác định trạng thái xe.

Phương pháp: ECU simulator cung cấp ground-truth ignition và motion. So 6-state fusion output với ground truth (confusion matrix). Baseline A: chỉ dùng OBD (mất khi tắt máy). Baseline B: chỉ dùng GPS (không biết ignition).

### 5.3 Latency và scalability

Kế thừa số đo từ thesis Chương 4, củng cố thêm p99, confidence interval, boxplot. Các phép đo chính: MQTT 4G latency (QoS0/QoS1, ổn định/yếu), e2e device→dashboard (từng chặng), API throughput (k6, 1000 req/endpoint), concurrent device load (10-200).

### 5.4 Năng lượng và môi trường

Power per-mode (active, idle, sleep, deep sleep). Nhiệt độ -10→60°C. GPS accuracy CEP95 (outdoor, urban, covered).

---

## 6. Thảo luận

### Những gì hoạt động tốt

**Byte-identical envelope** là quyết định thiết kế đơn giản nhất nhưng mang lại hiệu quả lớn nhất: cloud không cần biết đường live hay replay. Vì message_id được gán từ firmware và dedup key dùng (message_id + boot_id + seq_no), cùng một message dù gửi hai lần cũng chỉ xử lý một lần.

**Anti-flap "never assert OFF"** hoạt động tốt hơn dự kiến. FSM đạt 99.8% độ tin cậy mà không cần ML — chỉ OR và grace timer. Điều này cho thấy nhiều vấn đề trong vehicle state detection có thể giải quyết bằng logic đơn giản nếu thiết kế fusion đúng.

**Bridge/backend split** có ranh giới rõ ràng: stream xử lý ở bridge, backend nhẹ. Điều này cho thấy bằng chứng `evaluateVehiclePolicies` tồn tại trong backend code nhưng không có caller — toàn bộ policy eval chạy ở bridge.

### Những gì không hoạt động (trade-off)

**State RAM ở bridge** tạo ra vấn đề cho HA. Cooldown rule, device-state cache, idle-window tracking đều trong RAM. Nếu bridge crash, tất cả mất. Circuit-breaker batch-writer drop data không retry. Nếu chạy hai bridge song song, cooldown bị nhân đôi → cảnh báo trùng. Đây là trade-off: nếu muốn exactly-once cần Kafka/Redis/shared state, nhưng tăng complexity và latency.

**Hybrid storage không có consistency check**. Telemetry ghi kép PG + VM không có cơ chế đối soát. Nếu một store lỗi hoặc lệch, không có reconciliation.

**Hexagonal partial** — port registry fail-fast tốt nhưng FSM còn gọi adapter thẳng. Refactor chưa xong. Đây là điều nên thừa nhận hơn là che giấu.

### Những gì bất ngờ

**QoS1 PUBACK qua SIM7600** hoạt động đúng spec. Có thể dùng làm delivery confirmation end-to-end. Điều này không hiển nhiên với nhiều AT MQTT implementation.

**FSM 99.8%+** chỉ với OR logic + grace timer. Không ML, không threshold tuning phức tạp.

### Hạn chế

Single VPS, không HA. OBD2 test chỉ 2 xe thật (Vios, City). ECU sim test CAN, không test BLE stack. Pin 21700 chưa đo thực tế (số thesis quy đổi từ 18650). LVD 12V lệch 4.33% (thesis snapshot).

---

## 7. Kết luận

Paper trả lời câu hỏi nghiên cứu: ba mâu thuẫn (real-time vs mạng không reliable, cảm biến unreliable, diagnostics real-time trên thiết bị yếu) được giải bằng (1) resilience co-design firmware↔cloud với byte-identical envelope và session reconstruction, (2) multi-evidence anti-flap edge fusion, (3) stateful rule engine tại MQTT ingest. Resilience co-design là contribution chính.

Hướng phát triển: HA multi-instance với shared state, ML predictive maintenance, CAN security/IDS, hardware v2 (LVD chính xác, đo pin 21700 thực tế).

---

## Phụ lục: Kiến trúc đã verify từ code

### Firmware
- FSM 7-state: `state_machine_core.c:1240-1292`
- Ignition fusion 7 OR: `state_wake_prelude.c:429-435`
- 6 vehicle states: `state_machine_core.c:299-327`
- Offline queue: `offline_queue.c:96-97,218-221,291-429,486`
- Publish envelope: `state_publish_pipeline.c:209-294`
- QoS1 PUBACK: `mqtt_publish.c:137-201`, `mqtt_urc_parser.c:471-537`

### Cloud
- Bridge 5 topic: `index.ts:47-115`
- Multi-store fan-out: `rawdata.handler.ts:1063-1183`
- Rule engine: `rawdata.handler.ts:91-170,511-524,629-760`
- Session 3-tier: `session-runtime.util.ts:10-133`
- Batch-writer circuit: `batch-writer.service.ts:16-18,30-160`
- Hybrid storage: `trip-waypoints.service.ts:112-126`

### Hardware
- Custom Altium: ESP32-S3 + SIM7600 + LIS3DSH + DS3231
- Power: MP2482→AP2112K, TPS54231, SX1308, TP4056, Diode-OR

### ECU Simulator
- Arduino + MCP2515 CAN 500kbps
- ⚠️ CAN, không BLE. Bench/HIL thủ công.
