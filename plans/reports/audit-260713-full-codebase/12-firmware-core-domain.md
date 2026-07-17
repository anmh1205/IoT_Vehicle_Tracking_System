# Audit 12 — Firmware ESP-IDF: app-core + domain + shared-kernel (READ-ONLY)

**Phạm vi:** lõi logic firmware ESP-IDF — state machine (app-core), domain-* (connectivity/obd/ota/storage/telemetry), shared-kernel, contracts-device-cloud.
**Phương pháp:** đọc IN FULL từng file (.c/.h). 51 files, 13.143 dòng. Không sửa bất kỳ dòng code nào.
**Ngày:** 2026-07-14. Mọi finding có `path:line`, severity, và `verified` (đọc trực tiếp từ source).

> Lưu ý: audit WDT/BLE/LTE handoff đã có ở report trước; ở đây tập trung NEW issue ở tầng core/domain. Tất cả credential (nếu có) ghi dưới dạng `[REDACTED]`.

---

## 1. Bảng coverage per-file

| Component | File | Dòng | Trạng thái | Ghi chú |
|---|---|---:|---|---|
| app-core | src/state_machine.c | 41 | ✅ full | Facade mỏng, delegate sang core |
| app-core | src/state_machine_core.c | 1301 | ✅ full | Transition logic FSM chính |
| app-core | src/tracker-app-bootstrap.c | 432 | ✅ full | Init + main loop 100ms |
| app-core | src/state_runtime_context.c | 338 | ✅ full | Shared static `s_*` state |
| app-core | src/state_wake_prelude.c | 747 | ✅ full | Wake/telemetry/network/ignition |
| app-core | src/state_obd_runtime.c | 881 | ✅ full | BLE OBD session + DTC decode |
| app-core | src/state_publish_pipeline.c | 522 | ✅ full | Publish pipeline telemetry |
| app-core | src/state_sleep_controller.c | 624 | ✅ full | Sleep/power logic |
| app-core | src/state_ota_runtime.c | 361 | ✅ full | OTA confirm/rollback/persist |
| app-core | src/state_led_control.c | 196 | ✅ full | LED policy |
| app-core | include/*.h (11 file) | ~731 | ✅ full | app_state, sm_core, sm_internal, runtime_context, wake_prelude, sleep_controller, publish_pipeline, obd_runtime, ota_runtime, led_control, bootstrap |
| shared-kernel | src/util_core.c | 328 | ✅ full | util string/time/hex/clamp |
| shared-kernel | src/app_config_defaults.c | 202 | ✅ full | Default config (MQTT 1883) |
| shared-kernel | src/retry_manager.c | 190 | ✅ full | Backoff/retry policy |
| shared-kernel | include/*.h (9 file) | ~688 | ✅ full | telemetry_model, gnss_model, obd_model, fsm_types, runtime_config, app_config, rtc_context, retry_manager, util |
| contracts | src/data_formatter.c | 814 | ✅ full | Payload builder → cloud |
| contracts | include/data_formatter.h, ota_contract.h | 210 | ✅ full | Contract shape |
| domain-connectivity | src/session_mgr.c | 220 | ✅ full | Ignition debounce/session |
| domain-connectivity | src/command_handler.c | 1120 | ✅ full | Cloud command parse |
| domain-connectivity | include/session_mgr.h, command_handler.h | 190 | ✅ full | |
| domain-obd | src/obd_conversions.c | 66 | ✅ full | RPM/temp/percent convert |
| domain-obd | include/obd.h | 74 | ✅ full | |
| domain-ota | src/util_ota_update.c | 973 | ✅ full | Download/verify/install |
| domain-ota | src/util_ota_http.c | 482 | ✅ full | SIM7600 HTTP transport |
| domain-ota | src/util_ota_rollback.c | 69 | ✅ full | Manual rollback |
| domain-ota | include/ota_executor.h, ota_executor_internal.h | 135 | ✅ full | |
| domain-storage | src/offline_queue.c | 770 | ✅ full | SD-backed FIFO replay |
| domain-storage | include/offline_queue.h | 93 | ✅ full | |
| domain-telemetry | src/telemetry_counters.c | 86 | ✅ full | Runtime counters (spinlock) |
| domain-telemetry | include/telemetry_counters.h | 136 | ✅ full | |

**Tổng: 51 files / 13.143 dòng — đọc 100%, không sampling.**

---

## 2. Đánh giá tổng thể

Chất lượng lõi firmware **cao hơn mức trung bình** cho một project IoT tracker. Nhiều lens rủi ro trọng tâm đã được xử lý đúng:

- **OTA verify:** ép HTTPS-only (`util_ota_update.c:258`, `command_handler.c:796`), verify magic byte `0xE9` trước khi ghi (`:596`), SHA-256 running hash so với manifest trước khi `esp_ota_set_boot_partition` (`:809`), abort partial image khi fail (`:877-880`), reject oversized (`:641`). Rollback có priority chain factory/ota (`util_ota_rollback.c`). Confirm-on-boot + rollback deadline persist qua NVS (`state_ota_runtime.c`).
- **Concurrency:** command_handler dùng mutex + FreeRTOS queue, tách MQTT-callback (parse) khỏi FSM-task (apply); telemetry_counters dùng `portENTER_CRITICAL` spinlock cho mọi increment.
- **OBD math:** công thức SAE J1979 đúng (RPM `/4`, temp `-40`, percent `*100/255`).
- **Idempotency:** offline_queue tách QoS0 (advance ngay) vs QoS1/critical (ack watermark + advance atomic), filter stale record khi replay.

Tuy nhiên vẫn có findings đáng lưu ý về **bảo mật TLS mặc định**, **shape/đơn vị payload contract**, và **một số correctness/edge-case**.

---

## 3. Findings theo severity

### CRITICAL

**C-1. TLS server verification MẶC ĐỊNH TẮT cho OTA (và MQTT) — verified**
`domain-ota/src/util_ota_http.c:19-24`, `:80`, `:425`, `:441`
```
#ifndef CONFIG_TRACKER_TLS_VERIFY_SERVER
#define CONFIG_TRACKER_TLS_VERIFY_SERVER 0   // ← default OFF
...
authmode = CONFIG_TRACKER_TLS_VERIFY_SERVER ? 1 : 0   // authmode=0 = KHÔNG verify cert
ESP_LOGW("TLS server certificate verification disabled by Kconfig")
```
Firmware ép HTTPS scheme nhưng nếu `CONFIG_TRACKER_TLS_VERIFY_SERVER=0` (default), modem SIM7600 set `authmode=0` → **không verify certificate server**. Kẻ tấn công MITM có thể phục vụ image giả qua HTTPS mà không bị chặn ở tầng TLS. Lớp phòng thủ còn lại chỉ là SHA-256 so với manifest — nhưng manifest (`cmd.sha256`) đến từ **cùng kênh MQTT** (xem C-2), nên nếu attacker kiểm soát được kênh command họ có thể cấp cả URL lẫn sha256 khớp. Đây là điểm yếu chuỗi tin cậy nghiêm trọng. **Không có signature verification (chữ ký nhà sản xuất) độc lập với hash** → chỉ integrity, không authenticity.
→ Khuyến nghị: bật `CONFIG_TRACKER_TLS_VERIFY_SERVER=1` + nạp CA cert cho production; cân nhắc secure boot / signed OTA image (esp_ota native signature) thay vì chỉ SHA-256.

**C-2. MQTT mặc định port 1883 plaintext (no TLS) — verified**
`shared-kernel/src/app_config_defaults.c` (default MQTT port `1883`)
Kênh MQTT là nơi nhận **toàn bộ cloud command** (bao gồm `ota_update` với URL + sha256, `update_config`, `reboot`, `assign_session`). Nếu chạy port 1883 không TLS, command channel không được mã hoá/xác thực → attacker trên đường truyền inject command OTA/reboot tuỳ ý. Kết hợp C-1 tạo thành đường tấn công OTA hoàn chỉnh. `command_handler.c` có validate schema chặt nhưng **không xác thực nguồn gốc** message (không ký, không nonce).
→ Khuyến nghị: MQTTS (8883) + client cert/credential cho production; command payload nên có signature hoặc HMAC.

### HIGH

**H-1. OTA confirm deadline BỎ QUA khi không có trusted time → mất rollback tự động — verified**
`app-core/src/state_ota_runtime.c:347-353`, `:207-209`
```c
state_machine_update_time_source();
if (s_time_trusted) {
    g_rtc_context.ota_confirm_deadline_ms = s_event_timestamp_ms + confirm_timeout*1000;
} else {
    g_rtc_context.ota_confirm_deadline_ms = 0;   // ← deadline vô hiệu
}
```
Và tại confirm check (`:207`): điều kiện timeout chỉ chạy khi `ota_confirm_deadline_ms > 0 && s_time_trusted`. Nếu device boot lên firmware mới nhưng **không lấy được trusted time** (GNSS chưa fix + RTC chưa seed), `deadline_ms=0` → confirm timeout **không bao giờ kích hoạt**. Firmware sẽ gọi `esp_ota_mark_app_valid_cancel_rollback()` (`:231`) ngay khi FSM chạy tới, **hủy cơ chế rollback tự động của ESP-IDF** dù chưa chứng minh được firmware healthy/kết nối cloud. Firmware mới bị lỗi kết nối (nhưng không crash) sẽ được confirm là "good" vĩnh viễn.
→ Risk: brick mềm / mất khả năng auto-rollback trong điều kiện mất GNSS+RTC. Nên có fallback deadline theo uptime (monotonic) thay vì bỏ qua hoàn toàn.

**H-2. Confirm firmware dùng health-gate quá yếu — verified**
`app-core/src/state_ota_runtime.c:186-255`
`state_machine_try_confirm_running_firmware()` gọi `esp_ota_mark_app_valid_cancel_rollback()` mà **không kiểm tra điều kiện healthy thực sự** (ví dụ: đã kết nối MQTT thành công, đã publish status nhận ACK). Nó publish `CONFIRMING` rồi mark valid ngay trong cùng loop. Nếu firmware mới lên được tới FSM loop (kể cả khi LTE/MQTT chết) là đã tự confirm. OTA rollback tự động của ESP-IDF chỉ bảo vệ trường hợp crash/boot-loop trước khi tới đây — không bảo vệ trường hợp "boot OK nhưng mất khả năng liên lạc cloud".
→ Khuyến nghị: chỉ mark_app_valid sau khi có bằng chứng liên lạc cloud thành công (MQTT connected + status delivered).

**H-3. `state_machine_ble_connect_task` tự do đọc/ghi `s_ble_ctx`, `s_last_obd_sample_ms` không có lock — verified**
`app-core/src/state_obd_runtime.c:569-593`, `:655-694`, `:701-768`
Task nền `ble_obd_conn` (priority 5, `xTaskCreate` `:860`) trong `state_machine_prime_obd_after_connect` **đọc `s_last_obd_sample_ms`** (`:575,:580`) do callback `state_machine_obd_response_cb` (chạy trên BLE stack task) ghi (`:466`). Đồng thời main FSM task đọc cùng biến trong `state_wake_prelude.c:355`. Kết quả connect được truyền về qua `xQueueOverwrite` (`:690`) — đúng pattern — nhưng các biến `s_telemetry.obd_*` (scalar, DTC list, readiness struct) bị **ghi từ BLE callback task** (`:402,:407,:427...`) trong khi main FSM task **đọc để publish** (`state_wake_prelude.c:299-308`, publish pipeline) **mà không có mutex**. Với các struct nhiều byte (obd_readiness, DTC list `memset`+ghi từng phần) có nguy cơ **torn read** (đọc snapshot nửa cũ nửa mới) khi publish. Không gây crash nhưng có thể publish telemetry OBD không nhất quán.
→ Khuyến nghị: bảo vệ `s_telemetry.obd_*` bằng critical section ngắn hoặc double-buffer snapshot.

**H-4. Contract JSON: trộn camelCase (firmware/OTA) và snake_case (telemetry) — verified**
`contracts-device-cloud/src/data_formatter.c` (telemetry snake_case: `ble_obd_connected`, `elm_ready`, `signals.rpm`); OTA/firmware camelCase: `jobId`, `targetVersion`, `currentVersion` (`command_handler.c:747-751`, `offline_queue.c:348,412-428`).
Hai họ payload dùng convention đặt tên **khác nhau**. Backend phải parse cả hai style. Đây là schema drift dễ gây bug field-mapping phía server (ví dụ backend expect `job_id` nhưng firmware gửi `jobId`). Cần đối chiếu với backend contract để xác nhận (Câu hỏi mở Q1).

**H-5. Schema version drift firmware v2.0 vs telemetry v1.0.0 — verified**
`contracts-device-cloud/src/data_formatter.c` (firmware payload version `2.0`, telemetry payload version `1.0.0`).
Hai schema version không đồng bộ định dạng (`2.0` vs `1.0.0`) và không rõ backend dùng field version nào để route. Rủi ro khi backend nâng cấp một họ mà quên họ kia.

### MEDIUM

**M-1. `obd_convert_percent`/`rpm`/`temperature` không dùng `unit` metadata; đơn vị speed km/h ngầm định — verified**
`domain-obd/src/obd_conversions.c:26,45,64`; `state_obd_runtime.c:434` (`obd_speed = data[0]` raw byte km/h).
Speed lấy raw byte làm km/h (đúng SAE) nhưng **không có kiểm tra/annotation đơn vị** khi serialize sang cloud. `obd_pid_cfg_t.unit` (`obd.h:38`) được khai báo nhưng **không thấy consumer nào dùng** — dead field. Nếu backend giả định mph hoặc m/s sẽ sai scale. Cần đối chiếu (Q2).

**M-2. Timestamp fallback dùng uptime (không phải epoch) khi mất trusted time — verified**
`state_wake_prelude.c:335-338`, `:565-589`; `offline_queue_enqueue` (`offline_queue.c:574`): `ts_ms = timestamp_ms==0 ? util_uptime_ms() : timestamp_ms`.
Khi GNSS chưa fix + RTC chưa seed, timestamp gắn vào telemetry/record là **uptime (ms từ boot)**, không phải epoch. Các record này khi replay lên cloud sẽ mang timestamp nhỏ (vài giây/phút từ boot) → server hiểu nhầm là năm 1970. `s_time_trusted` flag tồn tại nội bộ nhưng **không rõ có được serialize kèm payload** để backend phân biệt trusted vs untrusted time (Q3). RTC seed fallback là epoch cứng `1735689600000` = 2025-01-01 (`state_wake_prelude.c:174`) — magic number.

**M-3. Magic number epoch seed & threshold rải rác — verified**
`state_wake_prelude.c:174` (`1735689600000ULL` = 2025-01-01 làm RTC baseline), `:226` (`imu_configure_motion_interrupt(120, 200)` — 120/200 không rõ đơn vị/nguồn), `state_obd_runtime.c:236` monitor bit math. Các hằng số nên đặt tên constant có chú thích nguồn gốc.

**M-4. `command_handler` drop command khi queue đầy hoặc lock busy — verified**
`command_handler.c:689-696` (`queue_full` → drop), `:218-229` (`lock_busy` → drop), queue len chỉ `16` (`:54`).
Command từ cloud (kể cả OTA/reboot quan trọng) bị **drop im lặng** khi queue đầy 16 slot hoặc mutex bận 250ms. Chỉ tăng counter + log warning, **không NACK về cloud**. Cloud không biết command bị mất → phải tự timeout/retry. Với burst command có thể mất `ota_update`. `request_location` counter bão hoà ở 255 (`:901`) cũng drop.
→ Khuyến nghị: cân nhắc ACK/NACK cơ chế, hoặc tăng queue cho command critical.

**M-5. Replay "stale firmware/OBD" filter dựa trên `strstr` chuỗi JSON thô — verified**
`offline_queue.c:377-429`, `:341-367` (`offline_queue_replace_fragment` sửa `jobId` in-place bằng memmove).
Việc phát hiện record cũ và **vá payload** bằng string matching (`strstr("\"jobId\":\"\"")`, replace fragment) rất mong manh: đổi format JSON (khoảng trắng, thứ tự field) sẽ làm filter/patch trượt → hoặc bỏ sót stale record, hoặc replay data sai. Đây là logic sửa payload lúc replay — fragile theo cách nguy hiểm.

**M-6. OTA HTTP hex-decode dùng size manifest * 2 cho wire length — verified**
`util_ota_update.c:549`, `:766-775`.
Chế độ hex: `transfer_wire_len = cmd.size * 2`. `size` là `uint32_t` từ cloud; `(size_t)cmd->size * 2U` trên ESP32 (size_t 32-bit) có thể **overflow** nếu `cmd.size > 2GB`. Manifest size lớn bất thường tuy đã qua `command_parse_u32_positive` (chỉ chặn 0 và >UINT32_MAX) nhưng **không chặn size vượt dung lượng partition OTA**. Overflow wire_len → vòng lặp stream sai. Ít khả năng thực tế (image firmware << 2GB) nhưng thiếu sanity bound theo partition size.

### LOW

**L-1. `state_machine_prime_obd_after_connect` dùng `vTaskDelay` + retry 3×4 PID blocking trong task — verified**
`state_obd_runtime.c:576-587` — vòng 3 lần × 4 PID, mỗi lần `vTaskDelay(75ms)` → tối đa ~900ms + timeout PID. Nằm trong task riêng (không block FSM) nên chấp nhận được, nhưng kéo dài thời gian connect.

**L-2. `s_field_validation_ble_skip_logged` static flag không reset qua deep-sleep — verified**
`state_obd_runtime.c:25,:822-832` — flag chỉ dùng cho field-validation build, low impact.

**L-3. `obd_pid_cfg_t` (obd.h:30-41) và `unit`/`name`/`len` fields — không có consumer — verified**
Struct metadata OBD PID khai báo đầy đủ nhưng chỉ 3 hàm convert được dùng; bảng cfg không thấy khởi tạo/dùng ở scope này → dead/placeholder contract.

**L-4. Bootstrap init retry infinite (max_attempts=0) không jitter — verified**
`tracker-app-bootstrap.c` init retry `RETRY_MODE_FIXED` base/max 10000ms, `max_attempts=0` (vô hạn), `jitter=0`. Nhiều device reboot đồng loạt có thể gây thundering-herd lên cloud/modem (nhưng init nội bộ nên impact thấp).

**L-5. `data_formatter.c` fallback status timestamp uptime — verified**
Cùng gốc M-2; khi build status/event payload dùng uptime nếu chưa trusted → chất lượng dữ liệu.

**L-6. Nhiều comment TODO/placeholder-style & hàm helper dày đặc — không phát hiện `TODO/FIXME/HACK` thực sự trong scope** (grep pattern không xuất hiện trong các file đã đọc; code comment chủ yếu là doc). Dead field xem L-3.

---

## 4. Xác nhận các lens KHÔNG phát hiện vấn đề (đã kiểm chứng)

- **Boot loop / state kẹt:** `state_machine_core.c` (1301 dòng) có transition rõ ràng; session_mgr debounce có seed sample đầu không tạo edge giả (`session_mgr.c:101-107`), `restore_active` reset debounce sau reboot (`:182-193`). Không thấy deadlock rõ ràng.
- **Divide-by-zero:** `offline_queue_should_throttle_rawdata` check `quota_bytes==0` trước chia (`offline_queue.c:731`); `util_ota_emit_download_progress` check `cmd->size==0` (`:670`). OK.
- **Buffer overflow OTA:** parse HTTPREAD có kiểm overflow declared_len (`util_ota_http.c:339`), reject truncated (`:360`); enqueue check payload size vs `sizeof(rec.payload)` (`offline_queue.c:582`). OK.
- **Timestamp monotonic guard:** `state_wake_prelude.c:336` đảm bảo timestamp != 0.
- **OTA power-loss:** abort partial write (`util_ota_update.c:877`), set_boot_partition CHỈ sau verify hash (`:809→:830`) → power-loss giữa download không brick (vẫn boot image cũ). OK — điểm mạnh.
- **Counter race:** telemetry_counters spinlock đầy đủ (`telemetry_counters.c:27-31`). OK.
- **OBD sign/scale:** temp cast `(int32_t)data[0]-40` cho phép âm đúng (`obd_conversions.c:64`). OK.

---

## 5. Câu hỏi mở (cần đối chiếu backend / chủ dự án)

1. **Q1 (H-4):** Backend expect field naming nào cho firmware/OTA payload — `jobId` (camelCase, như firmware gửi) hay `job_id` (snake_case)? Telemetry snake_case và firmware camelCase có được backend parser xử lý tách biệt đúng không?
2. **Q2 (M-1):** Backend hiểu `signals.speed` là km/h? RPM đã `/4` phía firmware — backend có nhân lại không (double-scaling)?
3. **Q3 (M-2/L-5):** Payload gửi cloud có kèm flag `time_trusted`/`gps_fix`/`net_up` để server phân biệt timestamp epoch-thật vs uptime-fallback không? (record trên SD có các flag này ở `sd_log_record_t` nhưng payload JSON có mang lên không?)
4. **Q4 (H-5):** Schema version `2.0` (firmware) vs `1.0.0` (telemetry) — backend route theo version nào? Có versioning policy chung không?
5. **Q5 (C-1/C-2):** Production có bật `CONFIG_TRACKER_TLS_VERIFY_SERVER=1`, nạp CA cert, và dùng MQTTS 8883 không? Có kế hoạch signed-OTA (chữ ký authenticity, không chỉ SHA-256 integrity) không?
6. **Q6 (H-1/H-2):** OTA confirm-on-boot có nên yêu cầu "MQTT connected + status ACK" làm điều kiện healthy trước khi `mark_app_valid`, và có nên dùng uptime-based deadline làm fallback khi mất trusted time không?
7. **Q7 (M-4):** Command bị drop (queue full/lock busy) có cần NACK về cloud để cloud biết retry không? OTA command mất im lặng có chấp nhận được?

---

## 6. Tóm tắt ưu tiên khắc phục

| # | Severity | Vấn đề | File chính |
|---|---|---|---|
| C-1 | CRITICAL | TLS verify OTA tắt mặc định, không signed image | util_ota_http.c:19,425 |
| C-2 | CRITICAL | MQTT command channel 1883 plaintext | app_config_defaults.c |
| H-1 | HIGH | OTA confirm deadline vô hiệu khi mất trusted time | state_ota_runtime.c:347 |
| H-2 | HIGH | mark_app_valid không gate theo health cloud | state_ota_runtime.c:231 |
| H-3 | HIGH | Race đọc/ghi `s_telemetry.obd_*` giữa BLE task & FSM | state_obd_runtime.c:402 |
| H-4 | HIGH | Trộn camelCase/snake_case payload | data_formatter.c |
| H-5 | HIGH | Schema version drift 2.0 vs 1.0.0 | data_formatter.c |
| M-1..M-6 | MEDIUM | đơn vị/timestamp/magic/drop command/replay-strstr/overflow | nhiều |
| L-1..L-6 | LOW | prime delay, dead field, init retry, dead code | nhiều |

**Kết luận:** Lõi OTA và concurrency được thiết kế cẩn thận (fail-safe flash, verify trước commit, mutex/queue tách luồng). Rủi ro cao nhất nằm ở **cấu hình TLS mặc định (C-1/C-2)** và **logic confirm OTA khi thiếu trusted time (H-1/H-2)**, cùng **race telemetry OBD (H-3)** và **contract naming/version drift (H-4/H-5)** cần đối chiếu backend.
