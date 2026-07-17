# Outline IEEE Access v2 — tập trung vào "cái hay"

> Dựa trên `architecture-verified.md` (sự thật từ code) + thesis Ch.4 (số đo đã có) + literature abstracts (gap analysis).
> Target: IEEE Access, full-stack system paper, TRỤC CO-DESIGN RESILIENCE.
> Nguyên tắc: cái hay = architectural novelty + cross-layer interaction, không phải config/BOM/tiểu tiết.

---

## I. Introduction (~1.5 trang)

**Bối cảnh (3-4 câu)**: thị trường xe cho thuê tự lái VN tăng 15-20%/năm, cần telematics vừa theo dõi vị trí vừa chẩn đoán xe mà không gây hao ắc quy/chi phí cao.

**Gap thật (đây là phần quan trọng)**: 
- Tracker thương mại (Vietmap, GPSTracker, MeTrack) → push đơn giản, mất sóng = mất dữ liệu, không có semantic edge.
- Tracker học thuật (C-ITS 2023 Sensors [DOI:10.3390/s23031724], Fleet Management 2024 IEEE Access [DOI:10.1109/ACCESS.2023.3343920]) → modular architecture + cloud, nhưng chưa có offline-first QoS-aware replay cho vehicular, thiếu co-design resilience cross-layer.
- OBD-II papers (Rimpas 2020, Yen 2021) → chỉ diagnostics/eco-driving, không phải hệ thống full-stack.

**4 contributions**:
1. **Cross-layer resilience co-design**: firmware offline queue (QoS-aware ACK + content-aware sanitize) ↔ cloud session reconstruction + dedup — duy trì **tính liên tục & không trùng lặp dữ liệu qua mất kết nối**. Hiếm trong literature tracker.
2. **Semantic edge fusion**: multi-evidence ignition detection (ADC+IMU+OBD+RPM+grace timers) × motion (GNSS+speed) → 6-state vehicle semantics. "Never assert OFF on weak evidence" — design pattern chống flap.
3. **Stateful stream processing at MQTT ingest**: rule engine (13 DTC groups + maintenance), session reconstruction (3-tier identity), optimistic geofence — chạy trực tiếp trên luồng MQTT publish, không qua backend CRUD.
4. **Custom automotive-grade PCB** (schematic thật: 21700 Li-Ion, AP2112K LDO, LIS3DSH IMU, Diode-OR power-path) + đánh giá 7 ngày vận hành trên 2 xe thật + ECU simulator HIL (CAN/MCP2515).

[So với outline cũ: đã loại bỏ "multi-store", "hexagonal partial", "deployment" khỏi contributions — đó là background, không phải novelty.]

---

## II. Related Work (~2 trang) — BẢNG + PHÂN TÍCH GAP

### 2.1 Vehicle telematics platforms (3-4 paper)
- **C-ITS 2023** (Rocha, Sensors, 30 cites): modular in-vehicle architecture, sensor data + cloud connectivity. Không có offline queue, không có edge fusion. → Baseline gần nhất.
- **Fleet Management 2024** (Farahpoor, IEEE Access, 27 cites): IoT fleet management for industrial vehicles. Single-instance cloud, không resilience.
- **OBD-II Telematics 2019** (Rimpas, Energy Reports, 73 cites): OBD sensor diagnostics, không cloud.
- **Eco-driving OBD 2021** (Yen, Applied Sciences, 24 cites): OBD + deep learning, focus eco-driving.

### 2.2 Communication resilience in IoT (3-4 paper)
- **MQTT vs HTTP power 2023** (Jara Ochoa, Sensors, 30 cites): power comparison, không store-and-forward.
- **MQTT/CoAP evaluation 2021** (Seoane, Computer Networks, 94 cites): performance benchmark, không resilience.
- **Offline-first IoT (general)**: chủ yếu ứng dụng cảm biến cố định, không dành cho vehicular (độ ưu tiên QoS moving/non-moving, content sanitize, byte-identical replay).

### 2.3 Vehicle state detection (2 paper)
- **IMU driving behavior 2020** (Sensors, 67 cites): ML trên IMU, không hardware+gps+obd fusion.
- **Accelerometer movement 2020** (Borecki, Sensors, 8 cites): wheel-mount accelerometer for parked car, không real-time.

### Bảng so sánh (cột: offline queue | edge fusion | multi-sensor OBD+IMU+GPS | real-time cloud | evaluation thực tế)
→ 6-8 baseline, mỗi cột ✓/✗ → "This work" có ✓ ở offline queue + edge fusion + evaluation.

---

## III. System Architecture (~2.5 trang) — GỌN, CHỈ ĐỦ ĐỂ HIỂU CONTRIBUTION

### III.A Hardware
- Custom PCB (Altium): ESP32-S3 chip trần + SIM7600E/CE (LTE+GNSS) + LIS3DSH (IMU) + DS3231 (RTC) + W25Q128 (16MB flash) + microSD.
- Power topology: buck MP2482 (12-40V→5V) → LDO AP2112K-3.3 (3.3V MCU) + buck TPS54231 (3.8V modem); boost SX1308 từ pin 21700; TP4056 sạc; power-path Diode-OR Schottky; LVD 12V/24V.
- OBD2 = BLE ELM327 dongle (ngoài), GPS = tích hợp SIM7600 GNSS (GPS+GLONASS+BeiDou).
- **Điểm đáng chú ý cho paper**: automotive-grade design (LVD, multi-rail, -10→60°C operational, 0.5mA deep sleep).

### III.B Firmware architecture
- C/ESP-IDF, hexagonal ports-adapters (partially). FSM 7-state: INIT→CHECK_IGN→DRIVING→PARKED→ALARM→HEARTBEAT→SLEEP.
- **Core**: multi-evidence ignition fusion (7 sources OR, anti-flap) × motion → 6 vehicle states (MOVING_ON, IDLING_ON, ROLLING_IGN_OFF, PARKED_OFF, UNKNOWN_*, etc.).
- Unified publish pipeline: message_id (UUIDv4) + seq_no + boot_id + timestamp → byte-identical payload cho live & offline → cloud dedup.
- Power management: light sleep giữ modem ấm tránh GNSS cold-start; deep sleep IMU wake.

### III.C Cloud architecture
- EMQX 5.4 (MQTTS 8883, ACL deny-default) → **MQTT Bridge** (Node/TS, stateful stream processor) → multi-store fan-out (VMetrics + VLogs + PostgreSQL+PostGIS) + re-publish event.
- Backend (Express 4 + Socket.IO, PostgreSQL raw SQL) = control plane, KHÔNG real-time ingest.
- Frontend (Next.js 16, Leaflet) + Mobile (Flutter WebView hybrid).
- Deployment: single VPS, Docker Compose per-service, 7-day uptime testing.

---

## IV. Core Contribution — Resilience Co-Design (~3 trang) — ĐÂY LÀ "CÁI HAY"

### IV.A Firmware offline-first queue (1 trang)
- **FIFO via write_seq/replay_seq watermark** trên SD, bảo toàn qua reboot (`offline_queue.c:96-97,523-527`).
- **QoS-aware classification tại enqueue**: STATUS/EVENT/FIRMWARE = critical (QoS1), RAWDATA = non-critical (QoS0) — atomic ACK+cursor advance cho critical (`:218-221,486`).
- **Content-aware sanitize** khi replay: 3 cơ chế (patch jobId rỗng, drop stale OBD, skip stale firmware) (`:291-429`). → Đảm bảo replay không sinh lỗi downstream.
- **Byte-identical envelope**: message_id + seq_no + timestamp → payload giống hệt live & offline → cloud dedup key.
- Retry exponential + throttle 600ms.

### IV.B Cloud session reconstruction + dedup (1 trang)
- **3-tier identity**: canonical_session_id / (local_session_key + boot_id) (`session-runtime.util.ts:10-24`).
- **Live-mutation guard**: reorder tolerance 15s, reject stale_timestamp/seq/boot/session (`:73-133`). → Chống replay tấn công hoặc dữ liệu cũ.
- Dedup tự dọn session rác.

### IV.C Co-design analysis (0.5 trang)
- **Firmware ↔ cloud contract**: message_id (client) + seq_no (monotonic per session) + boot_id (phân biệt sau reboot) → cloud dedup key.
- **Live-first, offline-fallback**: pipeline publish → online → success → advance ack_seq_critical. Publish → fail → enqueue SD → replay khi online.
- **QoS1 PUBACK semantics**: lệnh `AT+CMQTTPUB` modem SIM7600 block tới khi broker gửi PUBACK (`mqtt_publish.c:137-201`) → advance ack_seq_critical LÀ delivery confirmation end-to-end. [Cite SIM7600 AT manual.]

### Novelty positioning:
- Tracker literature: đa số GPS+GSM push → mất sóng = mất data. Một số có store (SD log) nhưng không có QoS-aware ACK + content-aware sanitize + cloud dedup co-design.
- Offline-first IoT: common cho fixed sensors, không cho vehicular (không xử lý được priority theo moving/stopped state, không content sanitize).

---

## V. Evaluation (~3 trang) — ĐO TRỤC CHÍNH + KẾ THỪA SỐ THESIS

### V.A Resilience (trục chính — CẦN ĐO BỔ SUNG)
Đây là phần thesis chưa có, cũng là novelty mạnh nhất:
- **Recovery rate**: ngắt mạng 1/5/15/30/60 phút → % record phục hồi.
- **Replay throughput**: record/s khi drain queue độ sâu 100/1k/10k.
- **Data continuity**: Khoảng trống dữ liệu trên dashboard khi mất sóng 5/15/30 phút.
- **Queue depth capacity**: max SD queue trước overflow.

### V.B Latency (kế thừa thesis Bảng 4.23 + 4.27 — củng cố)
- MQTT 4G: QoS0 avg 120ms (P95 250ms), QoS1 avg 180ms (P95 380ms).
- E2E device→dashboard: avg 185ms (P95 400ms). Đoạn 4G chiếm ~80% độ trễ.
- **Củng cố**: thêm p99, boxplot, CI, đo trên weak 4G.

### V.C Resource & power (kế thừa thesis Bảng 4.14 — cần đo lại)
- Active 350mA, sleep 15mA, deep sleep 0.5mA.
- **Củng cố**: đo lại deep sleep chính xác, thêm CI, so với baseline.

### V.D State accuracy (dùng ECU simulator — thesis chưa có)
- Confusion matrix: 6 vehicle states vs ground-truth từ ECU sim (OBD + IMU + GPS controlled).
- DTC detection accuracy: ECU sim biết trước mã P0171/P0300/P0420 → precision/recall của rule engine.

### V.E Cloud scalability (kế thừa thesis Bảng 4.26, 4.28, 4.29)
- API throughput: 350-1100 req/s, P95 <200ms.
- Concurrent devices: 10-200, 0% loss at 100.
- VM write: 12k pts/s.

---

## VI. Discussion (~1 trang)

### Architecture trade-offs
- **Hexagonal partial**: port registry fail-fast tốt, nhưng FSM còn gọi adapter thẳng → refactor đang tiến hành. → Nêu trung thực, đây là "honest systems paper" approach.
- **QoS1 PUBACK qua modem**: reliable cho status/events/firmware, nhưng PUBACK là hành vi modem, không phải code — cite SIM7600 AT manual.
- **Single-instance ingest**: state RAM (cooldown, device-cache) + batch-writer buffer thuần RAM → crash mất cooldown, circuit-open drop data. Đau trade-off cho analytics tại ingest.

### Limitations
- Single VPS (no HA). Postgres/VM single-node. EMQX single-node.
- OBD2 test: chỉ 2 xe thật (Vios, City). ECU sim test tầng CAN, không test BLE stack.
- Pin battery life: ước tính, schematic dùng 21700 nhưng số đo quy đổi từ 18650.
- LVD 12V chưa đạt (lệch 4.33%). 24V chưa đo.

### Generalizability
- Kiến trúc co-design có thể áp dụng cho bất kỳ IoT telemetry platform nào có yêu cầu resilience.
- ESP32-S3 + SIM7600 là hardware config phổ biến, không đặc thù.

---

## VII. Conclusion & Future Work (~0.5 trang)

- Hệ thống hoàn chỉnh: custom PCB → firmware → cloud → frontend/mobile.
- Resilience co-design = contribution chính.
- Future: multi-instance HA, ML predictive maintenance, CAN security (IDS), hardware v2 (LVD chuẩn, 21700 cell đo thật).

---

## Appendix: Metrics Gap Analysis — thesis có gì, cần thêm gì

| Nhóm | Thesis có | Cần cho IEEE Access | Ưu tiên |
|---|---|---|---|
| Resilience | Reconnect định tính (Bảng 4.25) | Recovery rate, replay throughput, queue depth test | **CAO** — novelty trục chính |
| Latency | MQTT 4G (Bảng 4.23), e2e (4.27) | p99, CI, boxplot, weak 4G breakdown | TRUNG BÌNH |
| Power | Bảng 4.14 | Đo lại ±CI, so baseline | THẤP |
| State accuracy | FSM 99.8% (Bảng 4.24) | Confusion matrix 6-state vs ECU sim | **CAO** — semantic edge claim |
| DTC accuracy | Chưa có | Precision/recall rule engine | TRUNG BÌNH |
| Cloud | API (4.26), throughput (4.28), concurrent (4.29) | Đẩy tới bottleneck, circuit-breaker effect | THẤP |
