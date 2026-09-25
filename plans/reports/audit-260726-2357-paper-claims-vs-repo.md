# Audit: Paper claims vs repo thật — paper-en-v2.md

**Ngày:** 2026-07-27 | **Đối tượng:** `resources/reports/paper/paper-en-v2.md`
**Phương pháp:** đối chiếu từng claim với code + 2 audit firmware 2026-07-22.

---

## 1. Verdict tổng

Đa số claim kiến trúc **đúng và có bằng chứng code**. 3 claim **phải sửa trước khi nộp** (mục 2). Có 4 "gem" trong repo chưa được viết vào paper, trong đó fence taxonomy là đáng giá nhất (mục 4).

---

## 2. Claim PHẢI SỬA (không khớp hiện trạng)

### 2.1 IV-A: "Domain modules consume those ports and never open UART or BLE directly" — SAI

- Audit kiến trúc 2026-07-22: **~293 direct adapter calls từ app-core** bypass port table; `domain-storage` include `mqtt_client.h`; 3 adapter REQUIRES `domain-telemetry`; 3 domain REQUIRES adapter. Port table (`tracker_runtime_ports_t`) tồn tại nhưng phần lớn app-core không dùng.
- Reviewer mở repo sẽ thấy leak ngay trong CMake REQUIRES.
- **Sửa:** giữ component map + port table như *cấu trúc tổ chức*, xoá câu "never open UART or BLE directly". Viết trung thực: "adapters are assembled into a runtime port table at bootstrap" — không claim enforced purity. (Khớp honesty-fix-notes #2.)

### 2.2 III-B + VI-I: simulator — tên sai, năng lực bị thổi phồng

- `mqtt-device-simulator-runner` **không tồn tại**. Thực tế: Backend domain `simulator` (`simulator.service.ts`) — fleet simulator điều khiển từ UI.
- Điểm ĐÚNG: publish qua **MQTT thật** (import `mqtt`, QoS option), per-device `seq_no`/`boot_id`, **swap auth-token hash** của device thật để đi qua đúng đường auth production → khớp quyết định "MQTT canonical".
- Điểm SAI: `SimulatorStartInput` chỉ có deviceIds/interval/duration/speed/IMU/battery/lat-lon — **không có delay, reorder, mid-trip reboot**; không archive `run-summary.json`.
- **Sửa:** III-B mô tả đúng cái đang có; fault injection (delay/reorder/reboot) chuyển thành "harness sẽ build cho Campaign VI-D" hoặc build trước khi nộp. VI-I đổi tên artifact.

### 2.3 IV-A.1: "bursty downlink cannot race policy state" — quá tuyệt đối

- Design intent đúng (command staging + FSM consume; `modem_at.c` có `s_uart_mux`), nhưng audit tìm thấy: app-core **0 lock / 80+ shared globals**, race ISR-vs-task ở `mqtt_urc_parser`, `modem_gnss` 21 globals không lock, race counter ở `command_handler` L690.
- **Sửa:** "serializes command consumption" thay vì "cannot race"; giới hạn claim single-writer vào đường command, không phải toàn bộ shared state.

### 2.4 Wording risk nhỏ (giữ hedge, đừng mạnh thêm)

| Điểm | Hiện trạng | Ứng xử trong paper |
|---|---|---|
| EMQX per-device ACL | `emqx.conf` chỉ có `no_match = deny`; ACL per-device không có trong repo | Giữ nguyên "(ops-provisioned)", không claim mạnh hơn |
| TLS verify OTA | `CONFIG_TRACKER_TLS_VERIFY_SERVER` default 0 | Nếu nhắc HTTPS OTA, thêm "server-cert verification is deployment-configurable" hoặc bật default trước khi nộp |

---

## 3. Claim ĐÃ XÁC MINH ĐÚNG (giữ nguyên)

| Claim trong paper | Bằng chứng |
|---|---|
| 7 FSM states đúng tên | `fsm_types.h:16-30` |
| Warm-modem parked (không DTR) | Kconfig `TRACKER_PARKED_KEEP_MODEM_GNSS_WARM` (Kconfig.projbuild:72); DTR NC |
| Offline replay byte-identical + cờ time trusted | `state_publish_pipeline.c:274-281` — comment "exact same payload… preserves the original cloud contract"; enqueue kèm `s_time_trusted` |
| `timestamp_trusted` trong mọi JSON | `data_formatter.c:594,679,742…` |
| OTA: SHA-256 streaming, confirm, dual-bank+factory | `util_ota_update.c` (mbedtls sha256 incremental); `state_ota_runtime.c:231` (`esp_ota_mark_app_valid_cancel_rollback`); `partitions.csv` factory+ota_0+ota_1 (1536K×3) |
| LTE recovery ladder bounded | `modem_lte_recovery.c` — backoff policy, hw-recover cooldown, force-threshold no-RDY |
| Backend không subscribe topic device | `mqtt-event-listener.ts:328` — chỉ `internal/events/#`, 4 topic nội bộ có QoS |
| Live-mutation fence | `session-runtime.util.ts:73-133` — 4 lý do reject + watermark persisted + tolerance 15 s |
| Batch writer + circuit breaker | `batch-writer.service.ts` — `isCircuitOpen`, drop-to-prevent-OOM, flush 1 s |
| Command ledger + assign_session | `13-device-commands.sql`; `session-assignment.publisher.ts` |
| Trip auto open/close theo ignition | `trip-auto.service.ts` (open in_progress / close completed; **không stats** — paper không claim stats nên ổn) |
| HIL: MCP2515 + chu kỳ 220 s | `main.cpp` MCP2515(10); `driver-input-profile.cpp:22` `% 220UL`, mốc 8/15/20/30/42/78/120 s |
| CI/CD path-filtered UAT, không firmware CI | 12 workflow `*-uat.yml` per-service; không có firmware workflow |
| EMQX deny-by-default + MQTTS | `emqx.conf` `authorization.no_match=deny`, listener ssl 8883 |
| Bridge auth token, geofence ingest | `device-auth.service.ts`, `geofence-checker.service.ts` |

---

## 4. Gem trong repo CHƯA viết vào paper (đề xuất thêm)

1. **Fence decision taxonomy (P1 — đáng nhất):** 4 lý do reject có tên (`stale_timestamp`, `stale_seq`, `stale_boot_identity`, `stale_session_identity`) + watermark persisted + reorder tolerance 15 s. Paper IV-E đang mô tả trừu tượng; thêm 1 đoạn + bảng nhỏ theo phong cách Rocha (đặt tên mọi thứ). VI-D đã có ô "rejects by reason" — khớp sẵn.
2. **Simulator auth-token swap (1 câu ở III-B):** simulator mượn identity device thật qua đúng đường auth production rồi restore — tăng tính "production-like" của phương pháp đánh giá.
3. **Phased drive cycle của HIL (1 câu ở III-B):** ECU sim có powertrain/diagnostic/driver-input models tách riêng, chu kỳ 220 s chia pha 8/15/20/30/42/78/120 s — cụ thể hoá "repeatable ground truth".
4. **Fuel analytics domain (tùy chọn, V-F):** `fuel-analytics` có repository/service/**tests** — paper chưa nhắc nhiên liệu. Chỉ thêm nếu UI console có expose (chưa verify UI).

## 5. KHÔNG nên thêm/đổi

- Không đưa "clean/hexagonal architecture" thành contribution (audit 3/10, 2.5/10).
- Không claim robustness/thread-safety firmware.
- Ignition fusion đa bằng chứng: giữ demoted (code là hàm 235 dòng nesting 7, có bug lân cận).
- Không claim fault-injection simulator khi chưa build.

## 6. Bug nên fix TRƯỚC khi chạy campaigns VI (ảnh hưởng số liệu)

| Bug | Vị trí | Ảnh hưởng campaign |
|---|---|---|
| GNSS fail → stale position nhận timestamp mới (silent corruption) | `state_wake_prelude.c` L320-338 | VI-H accuracy, VI-E trusted-time |
| Transport failure reset `s_no_fix_streak` → no-fix recovery không bao giờ trigger | `modem_gnss.c:841-843` | VI-A/VI-B GNSS TTFF |
| Race ISR-vs-task `mqtt_urc_parser` `s_rx_ctx` | mqtt_urc_parser.c | VI-B contention (số liệu nhiễu) |

## 7. Hành động đề xuất theo ưu tiên

- **P0 (sửa paper):** 2.1, 2.2, 2.3.
- **P1 (nâng paper):** thêm gem 4.1–4.3.
- **P2 (repo trước campaigns):** fix 3 bug mục 6; quyết định ACL + TLS verify default.

## Unresolved questions

1. Có build fault-injection (delay/reorder/mid-trip reboot) cho simulator trước khi nộp không? Quyết định này đổi cách viết III-B và tính khả thi VI-D.
2. Fuel analytics có hiển thị trên console UI không → có đưa vào V-F không?
3. Per-device ACL: đưa rule vào repo EMQX hay giữ "(ops-provisioned)"?
