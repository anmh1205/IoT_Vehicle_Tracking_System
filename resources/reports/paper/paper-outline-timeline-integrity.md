# Đề cương bài báo — IoT Vehicle Tracking System

**Phiên bản:** v6 (viết lại cho dễ đọc)  
**Mẫu cách viết:** Rocha et al., *Sensors* 23(3):1724, 2023  
**File liên quan:** checklist sửa repo trước khi nộp → [`honesty-fix-notes.md`](./honesty-fix-notes.md)

---

## Mục lục

1. [Cách viết (học từ Rocha)](#1-cách-viết-học-từ-rocha)
2. [Bài này kể chuyện gì](#2-bài-này-kể-chuyện-gì)
3. [Mười ba trụ nội dung](#3-mười-ba-trụ-nội-dung)
4. [Cái gì không viết như đóng góp](#4-cái-gì-không-viết-như-đóng-góp)
5. [Đề cương từng mục I–VII](#5-đề-cương-từng-mục-ivii)
6. [Danh mục hình và bảng](#6-danh-mục-hình-và-bảng)
7. [Nguyên tắc khi viết manuscript](#7-nguyên-tắc-khi-viết-manuscript)
8. [Việc còn quyết / còn chạy](#8-việc-còn-quyết--còn-chạy)

---

## 1. Cách viết (học từ Rocha)

Rocha không bán một “claim” duy nhất. Họ mô tả **một hệ thống đã dựng thật**, có tên module / message / tần số, rồi **đo từng lớp**.

| Mục của họ | Họ làm gì | Ta làm tương tự thế nào |
|---|---|---|
| Introduction | Một đoạn đóng góp, không liệt kê bullet dài | Thuê xe tự lái → hệ đầy đủ tầng, đã chạy xe thật |
| Related Work | Vài nhóm chủ đề, chỉ ra khoảng trống | Telematics; OBD/IoT-cloud; thiếu hệ biên+cloud giá thấp hợp nhất |
| Materials & Methods | Bảng thiết bị + **phương pháp** (họ: đảo CAN) | Bảng board + **cách kiểm chứng** (HIL, mô phỏng đội xe, thực địa) |
| Architecture | Hình thiết bị, service có tên, message có tên | Nút biên, FSM năng lượng, 5 lớp MQTT, cloud tách tầng, giao thức phiên |
| Implementation | Từng khối kèm số (Hz, thời gian kết nối…) | OBD, modem, offline, Bridge, OTA, console |
| Tests & Results | Đo theo subsystem, dữ liệu thật, có hình | 10 chiến dịch đo khớp trụ hệ thống (xem mục VI) |
| Conclusions | **Mở bằng hạn chế**, rồi giá trị và hướng mở | 2 xe, OBD BLE, VPS đơn → giá trị đội xe thuê |
| Appendix | Định dạng message | JSON 5 lớp + envelope |

**Ý chính:** novelty = tổng thể triển khai thật + kiểm chứng, không phải danh sách heuristic.

---

## 2. Bài này kể chuyện gì

**Một câu:**  
Hệ theo dõi xe giá thấp cho thuê tự lái — từ board trên xe đến cloud và console — chịu được mất mạng, tiết kiệm điện khi đỗ, cập nhật firmware tại hiện trường, và giữ timeline dữ liệu liền mạch.

**Ba tầng hệ thống:**

```
[Xe] tracker ESP32-S3 + SIM7600CE-T + vgate iCar Pro (BLE OBD)
        ↓ MQTT (5 lớp topic)
[Cloud] EMQX → Bridge (ingest) → lưu trữ lai → Backend (API/UI)
        ↓
[Vận hành] Web/Mobile: bản đồ, chuyến, lệnh từ xa, OTA, cảnh báo
```

**Đối tượng dùng bài:** người đọc journal kiểu Sensors / IEEE Access — cần kiến trúc rõ, số liệu đo được, hạn chế nói thẳng.

---

## 3. Mười ba trụ nội dung

Mỗi trụ = một ý **tầm hệ thống** (có chỗ viết trong bài). Chi tiết cài đặt (ngưỡng, debounce…) không phải trụ.

### Trụ 1 — Năng lượng theo chu kỳ nhiệm vụ (duty-cycle)

- FSM 7 trạng thái theo vòng đời xe (lái / đỗ / cảnh báo / ngủ…).
- Hai kiểu ngủ: light (giữ RAM, dễ đánh thức) và deep (dòng rất thấp).
- Khi đỗ có thể **giữ modem/GNSS không tắt hẳn** (không PWRKEY-off) để reconnect nhanh; trên board hiện tại chân DTR modem không nối → không viết là “ngủ bằng DTR”.
- **Viết ở:** IV-B, đo ở VI-A.

### Trụ 2 — Một MCU, ba radio, một bus AT

- BLE (OBD) tách RF; LTE + GNSS cùng module **SIM7600CE-T**, chung một UART AT.
- FSM là chủ duy nhất gọi modem theo thứ tự; mutex bảo vệ bus AT.
- Lệnh MQTT từ cloud chỉ **xếp hàng**; FSM mới thi hành (single-writer).
- **Viết ở:** IV-A, đo contention ở VI-B.

### Trụ 3 — Tách hot path và control plane (cloud)

- **Hot path:** thiết bị → EMQX → Bridge → ghi store + phát sự kiện nội bộ.
- **Control plane:** Backend **không** subscribe topic thiết bị; chỉ nghe `internal/events/#` rồi đẩy Socket.IO ra UI.
- **Viết ở:** IV-D.

### Trụ 4 — Lưu trữ lai

| Store | Dùng cho |
|---|---|
| VictoriaMetrics | Chuỗi số, biểu đồ |
| PostgreSQL | Quan hệ, session, event JSONB; batch ghi |
| VictoriaLogs | Log ingest / vận hành |

Đọc waypoint: ưu tiên PostgreSQL, thiếu thì fallback VictoriaMetrics.  
**Viết ở:** IV-D.

### Trụ 5 — Giao thức phiên device–cloud (toàn vẹn timeline)

1. Thiết bị gắn envelope: `message_id`, `seq_no`, `boot_id`, session…  
2. Bridge tạo/gắn phiên.  
3. Cloud gửi `assign_session` xuống thiết bị.  
4. Hàng rào live-mutation: tin muộn vẫn vào **lịch sử**, không được phá **trạng thái live** trên dashboard.

**Viết ở:** IV-E; chứng minh bằng VI-C, VI-D.

### Trụ 6 — OTA qua mạng cellular

Lệnh MQTT → tải HTTPS trên đúng kênh AT modem → dual-bank + factory → confirm / rollback; ngữ cảnh job qua reboot; báo trạng thái lên cloud.  
**Viết ở:** V-E; đo ở VI-G.

### Trụ 7 — Store-and-forward

Mất LTE → ghi SD → có mạng lại phát lại. Timeline liền nhờ envelope + hàng rào live/history (trụ 5).  
Không sa đà watermark/sanitize.  
**Viết ở:** IV-C / V-C; đo ở VI-C.

### Trụ 8 — Hệ kiểm chứng

- HIL: Arduino + MCP2515 giả ECU, chu kỳ lái có ground truth.  
- Simulator MQTT đội xe (fault injection).  
- Simulator fleet trong Backend + UI.  
**Viết ở:** III-B; kết quả ở VI.

### Trụ 9 — Phần cứng tự thiết kế + nguồn nguồn

Nguồn tên linh kiện: netlist trong  
`iot-vehicle-tracking-system-firmware/documents/hardware-specs/`  
(không dùng Altium project — đã drift).  
Modem **trên board thật = SIM7600CE-T** (netlist ghi `SIM7600E` là lệch nhãn).

| Ref | Linh kiện | Vai trò |
|---|---|---|
| U6 | ESP32-S3 | MCU |
| U9 | **SIM7600CE-T** + MicroSIM | LTE + GNSS |
| U10 | LIS3DSH | IMU |
| U7 | DS3231M | RTC |
| U8 | W25Q128 | Flash SPI |
| — | microSD, USB-C, nút, LED | Đệm / debug / HMI |
| U1 | MP2482 | Buck → bus 5 V |
| U5 | TPS54231 | Buck → V-SIM ~3.8 V (modem) |
| U4 | AP2112K-3.3 | LDO → 3.3 V MCU |
| U3 | TP5100 | Sạc pin dự phòng |
| U2 | SX1308 | Boost 5 V khi mất nguồn xe |
| B1 | 18650-1C | Pin Li-ion dự phòng |

- Không có LM393 / LVD comparator trên board.  
- OBD ngoài board: **vgate iCar Pro** (BLE).  
- Chi phí vật tư mục tiêu &lt; 100 USD/thiết bị.  
**Viết ở:** III-A + Fig. 1, Fig. 3.

### Trụ 10 — Thời gian tin cậy (`timestamp_trusted`)

Ưu tiên giờ GNSS → ghi vào DS3231M → fallback RTC → không tin được thì uptime + cờ `false`.  
Cờ đi kèm bản ghi live và offline.  
**Viết ở:** IV-C; đo ở VI-E.

### Trụ 11 — Thang phục hồi kết nối (modem)

LTE attach FSM có bậc: warm-boot → soft sync → reset cứng (có cooldown, giới hạn lần) → backoff mũ; GNSS tự power-cycle riêng.  
**Viết ở:** V-B.

### Trụ 12 — Lệnh từ xa + sổ lệnh bền

UI → REST → bảng `device_commands` (pending → sent → ack) → MQTT QoS1 → thiết bị ack → Bridge → Socket.IO.  
Cùng đường downlink cho: `update_config`, `assign_session`, OTA.  
**Viết ở:** IV-E; đo ack ở VI-D.

### Trụ 13 — Console vận hành đội xe

Bản đồ live, chi tiết thiết bị, geofence, thông báo, chuyến tự mở/đóng theo ignition + replay, export.  
**Viết ở:** V-F / V-G; minh họa Fig. 6; checklist VI-J.

---

## 4. Cái gì không viết như đóng góp

Chỉ được nhắc tối đa **một câu** trong Implementation (nếu cần), hoặc bỏ:

- Suy luận ignition đa bằng chứng / OR-term / debounce  
- Ma trận 6 trạng thái xe chi tiết  
- Watermark / sanitize offline queue  
- Danh sách 13 lớp DTC, cooldown, dải geofence  
- “Hexagonal architecture enforced”  
- Chi tiết layering CMake nội bộ firmware  

---

## 5. Đề cương từng mục (I–VII)

### I. Introduction (~1,5 trang)

**Mục đích:** Đặt bài toán + một đoạn đóng góp (không bullet farm).

**Viết:**

1. Bối cảnh thuê xe tự lái: chủ không ngồi trên xe → cần vị trí, trạng thái, cảnh báo, sức khỏe cơ bản.  
2. Ràng buộc: 4G đứt đoạn; xe đỗ dài ngày trên ắc quy; lắp không xâm lấn; chi phí thấp.  
3. **Một đoạn đóng góp** (gợi ý nội dung): hệ mô-đun giá thấp — ESP32-S3 điều phối BLE OBD + LTE/GNSS dưới FSM tiết kiệm năng lượng; cloud MQTT tách ingest khỏi API; giao thức phiên giữ timeline; OTA cellular; kiểm chứng HIL + mô phỏng + 2 xe thật.  
4. Bố cục các mục còn lại.

---

### II. Related Work (~1,5 trang)

| Tiểu mục | Nội dung |
|---|---|
| II-A | Nền tảng telematics / C-ITS trong xe (Rocha, Farahpoor, tracker thương mại) |
| II-B | OBD và IoT-cloud cho phương tiện (Rimpas, Pierleoni, ESP32+cellular) |
| II-C | **Khoảng trống:** hoặc chỉ node thu thập, hoặc chỉ cloud — thiếu hệ biên+cloud hợp nhất, giá thấp, có duty-cycle và chịu đứt mạng cho thuê xe |

---

### III. Materials and Methods (~2 trang)

#### III-A. Thiết bị và môi trường thử

- Bảng linh kiện (trụ 9) + ảnh board / sơ đồ nguồn (Fig. 1, Fig. 3).  
- Xe: Toyota Vios 2020, Honda City 2021 (ISO 15765-4).  
- OBD: vgate iCar Pro.  
- Cloud: một VPS — EMQX, Bridge, PostgreSQL, VictoriaMetrics, VictoriaLogs, Backend, Grafana.  
- Nguồn tên linh kiện: `hardware-specs` netlist (+ xác nhận modem CE-T).

#### III-B. Phương pháp kiểm chứng (đây mới là “Methods”)

Giống chỗ Rocha đặt thuật toán đảo CAN — ta đặt **cách đo hệ thống**:

| # | Phương pháp | Mục tiêu |
|---|---|---|
| 1 | HIL ECU (Arduino + MCP2515, chu kỳ ~220 s, có ground truth) | Độ tin cậy chuyển trạng thái FSM; có **log**, không chỉ số tổng |
| 2 | Simulator MQTT đội xe (trễ, lộn thứ tự, reboot giữa chuyến) | Hot path + phiên; lưu `run-summary.json` |
| 3 | Bench phần cứng | Dòng theo mode; contention AT; mất LTE có kiểm soát 1–60 phút |
| 4 | Thực địa 2 xe | OBD, GNSS, E2E, geofence, chuyến trên console |
| 5 | Quy tắc đo | Mỗi chiến dịch ghi N, dụng cụ, pass/fail; **không** đưa số “ước tính” vào Results |

---

### IV. Architecture (~2,5–3 trang) — xương sống bài

#### IV-A. Kiến trúc firmware (Fig. 4) → rồi multi-radio (Fig. 5)

- Tổng thể trước: `main` → `app-core` bootstrap → runtime ports → domain → adapters → platform/board.  
- FSM cooperative là trung tâm vòng đời; domain không mở UART/BLE trực tiếp.  
- Bảng map component (entry/app, domain-*, adapter-*, platform-*, shared/contracts).  
- Con: một MCU, ba radio (BLE + LTE + GNSS), một bus AT (mutex + FSM serialize).  
- Command callback chỉ *stage*; FSM *consume* (single-writer).  
- Vì sao: rõ ownership + tránh race UART khi duty-cycle/OTA.

#### IV-B. Năng lượng (bảng mode + hình dòng điện)

- 7 trạng thái FSM ↔ vòng đời xe.  
- Light vs deep; teardown có thứ tự (BLE → modem…).  
- Trade-off “giữ modem khi đỗ”: tốn dòng hơn ↔ reconnect / GNSS nhanh hơn.  
- Không claim DTR sleep trên revision hiện tại.

#### IV-C. Hợp đồng message (Table 2)

Năm lớp (đặt tên rõ như OVSM/SPVSM/VSM của Rocha):

| Lớp | Topic (rút gọn) | QoS | Vai trò |
|---|---|---|---|
| RawData | `…/rawdata` | 0 | Telemetry định kỳ |
| Status | `…/status` | 1 | Trạng thái / phiên |
| Events | `…/events` | 1 | Cảnh báo |
| Firmware | `…/firmware` | 1 | Tiến trình OTA |
| Commands | `…/commands` | 1 | Downlink |

Envelope chung: `message_id`, `seq_no`, `boot_id`, session, `timestamp_trusted`.  
Thêm đoạn ngắn về chuỗi thời gian tin cậy (trụ 10).

#### IV-D. Cloud (Fig. 7)

```
Thiết bị --MQTT--> EMQX --v1/+/*--> Bridge
                                      |--> VictoriaMetrics / VictoriaLogs / PG (batch)
                                      +--> internal/events/# --> Backend --> Socket.IO --> UI
```

Backend không nằm trên hot path thiết bị.

#### IV-E. Phiên + downlink (Fig. 8 — sequence)

- Envelope → get-or-create session → `assign_session` → live-mutation fence.  
- Một đường lệnh cho config / session / OTA + sổ `device_commands` (audit).

---

### V. Implementation (~2 trang)

Mỗi tiểu mục vài đoạn + số giao diện (không lan man):

| Tiểu mục | Viết gì |
|---|---|
| V-A BLE OBD | vgate iCar Pro; connect ~4 s; PID ~60–75 ms; reconnect do FSM quyết |
| V-B Modem/GNSS | SIM7600CE-T; thang phục hồi (trụ 11); MQTT AT 3 pha; V-SIM ~3.8 V |
| V-C Offline | SD FIFO, phát lại khi có mạng (một câu tốc độ) |
| V-D Bridge | Validate, auth token, fan-out store, internal publish |
| V-E OTA | HTTPS modem, SHA-256, dual-bank, confirm/rollback |
| V-F Console | Bản đồ, workspace thiết bị, geofence, thông báo, KPI, export |
| V-G Chuyến đi | Auto start/end theo ignition; replay waypoint (PG rồi VM) |
| Bảo mật | Hộp ngắn: MQTTS, deny-default, ACL, auth_token payload |
| DevOps | 1 đoạn: CI UAT theo path; Kconfig + `update_config`/NVS |

---

### VI. Tests and Results (~3–3,5 trang)

**Lưu ý số cũ trong luận văn:** nhiều bảng (mA, E2E 185 ms, FSM 99,8%, k6…) **thiếu file đo thô**. Ưu tiên chạy lại chiến dịch dưới đây; số cũ chỉ dùng tạm nếu gắn nhãn “preliminary”.

| Mã | Chiến dịch | Đo gì | Artifact | Ưu tiên |
|---|---|---|---|---|
| VI-A | Năng lượng duty-cycle | Dòng theo mode; so sánh giữ modem vs deep (wake→MQTT, TTFF) | Table 3, Fig. 7 | **P0** |
| VI-B | Contention bus AT | Latency MQTT / TTFF GNSS: cô lập vs đồng thời OBD+MQTT+GNSS(+OTA) | Table 4 | P1 |
| VI-C | Offline 1–60 phút | % khôi phục, thời gian drain, gap dashboard, live không bị phá | Table 5, Fig. 8 | **P0** |
| VI-D | Fault injection phiên + lệnh | Accept/reject live-mutation; continuity session; latency cmd→ack | Table 6 | **P0** |
| VI-E | Trusted time | % `timestamp_trusted`; drift RTC sau sleep | Table riêng / Fig | P1 |
| VI-F | HIL FSM có log | Tỉ lệ đúng chuyển trạng thái; N rõ; kèm log | Table 7 | **P0** |
| VI-G | OTA cellular | Success / fail / rollback; thời gian tải | Table 8 (một phần) | P1 |
| VI-H | Cảm biến & thực địa | OBD, GNSS, E2E, geofence (có N) | Bảng phụ | P2 |
| VI-I | Tải đội xe | Simulator 50/100/200 @5 s; `run-summary.json` (không claim k6 nếu chưa có) | Table 8 | **P0** |
| VI-J | Console | Trip auto, replay, notify, remote config — pass/fail + screenshot | Fig. 6 | P2 |

---

### VII. Conclusions (~0,75 trang)

1. **Mở bằng hạn chế:** 2 mẫu xe; OBD qua BLE (không đọc CAN thô); VPS đơn chưa HA.  
2. Giá trị: chuỗi thu → truyền → xử lý → hiển thị đã kiểm chứng; &lt;100 USD/thiết bị; phù hợp đội xe thuê nhỏ–vừa.  
3. Mở rộng: handler Bridge mới; HA; nhiều mẫu xe; ML bảo dưỡng trên dữ liệu tích lũy.

### Appendix A

JSON schema rút gọn: 5 lớp message + envelope (tương tự Appendix ASN.1 của Rocha).

---

## 6. Danh mục hình và bảng

| ID | Nội dung | Gợi ý nguồn / ghi chú |
|---|---|---|
| Fig. 1 | Board + vgate trên xe | Ảnh thật; nhãn đúng bảng trụ 9 |
| Fig. 2 | Kiến trúc nút biên (MCU–radio–bus AT) | Adapt hình luận văn 4-5 / 4-12; sửa nhãn modem → CE-T |
| Fig. 3 | Đường nguồn đa rail | Adapt hình 4-6; đúng MP2482 / TPS54231 / AP2112 / TP5100 / SX1308 / 18650 |
| Fig. 4 | Cloud: hot path vs control plane | Vẽ mới hoặc adapt cloud thesis |
| Fig. 5 | Sequence phiên + lệnh (envelope → assign_session → live/history; ledger → ack) | Sequence diagram |
| Fig. 6 | Screenshot console (bản đồ / replay chuyến) | Như Fig. 24 Rocha |
| Fig. 7 | Dòng điện theo thời gian một chu kỳ duty-cycle | Từ VI-A |
| Fig. 8 | Đường cong recovery offline | Từ VI-C |
| Table 1 | Specs thiết bị + BOM | Trụ 9 |
| Table 2 | 5 lớp message + QoS + envelope | IV-C |
| Table 3 | Dòng theo mode + modem ấm vs deep | VI-A |
| Table 4 | Contention bus AT | VI-B |
| Table 5 | Offline recovery theo thời gian mất mạng | VI-C |
| Table 6 | Live-mutation + command ack | VI-D |
| Table 7 | HIL FSM (có N, có log) | VI-F |
| Table 8 | OTA outcomes + tải đội xe | VI-G, VI-I |

---

## 7. Nguyên tắc khi viết manuscript

1. **Tên riêng + số đo** ở tầng kiến trúc (module, topic, mode, ms, mA).  
2. Heuristic chỉ tối đa một mệnh đề.  
3. Mục Methods = cách **kiểm chứng**, không phải thuật toán vặt.  
4. Mỗi kết quả gắn một chiến dịch VI; timeline/phiên gắn trụ 5.  
5. Tên linh kiện theo bảng trụ 9; modem luôn **SIM7600CE-T**.  
6. Việc sửa repo còn lại: xem `honesty-fix-notes.md` — trong bài coi như đã xử lý theo hướng đã chốt.

---

## 8. Việc còn quyết / còn chạy

| # | Câu hỏi |
|---|---|
| 1 | Nộp *Sensors* hay IEEE Access? |
| 2 | Có ảnh board thật + screenshot dashboard đủ dùng Fig. 1 / Fig. 6 không? |
| 3 | Trước khi nộp chạy được những P0 nào: VI-C, VI-D, VI-A, VI-F, VI-I? |
| 4 | Số liệu luận văn cũ: giữ tạm (gắn nhãn) hay bỏ khỏi Results? |

**Bước tiếp sau khi duyệt v6:** viết manuscript tiếng Anh đầy đủ theo đúng mục I–VII ở trên.
