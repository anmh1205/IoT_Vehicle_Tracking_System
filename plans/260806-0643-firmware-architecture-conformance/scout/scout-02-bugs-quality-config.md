# Scout 02 — Bugs / Quality / Config (verify sau diff chưa commit)

> Nội dung do agent `scout-bugs-quality` (Explore, read-only) tạo; lưu file bởi orchestrator vì agent không có tool Write.
> Base: `git diff` 15 file (283+/140-).

---

## A. Đối chiếu audit cũ (2026-07-22) vs hiện tại

| # | Lỗi (audit cũ) | File:line hiện tại | Trạng thái |
|---|---|---|---|
| 1 | Buffer aliasing UB parse MQTT host | `adapter-mqtt-sim7600-at/src/mqtt_session.c:94-101` | **ĐÃ FIX** |
| 2 | `snprintf` bỏ return → cmd AT bị cắt | `mqtt_publish.c:117-149,241-244`; `util_ota_http.c` | **ĐÃ FIX** |
| 3 | `s_dropped_command_count` race | `command_handler.c:5,71,224,691,725,905` | **ĐÃ FIX** (`atomic_uint`) |
| 4 | `atof`/`atoi` không validate | `modem_gnss.c:319-337` | **ĐÃ FIX** (`strtod`/`strtol`) |
| 5 | `offline_queue_replay_tick` thiếu `return` | `domain-storage/src/offline_queue.c:700` | **ĐÃ FIX** |
| 6 | `modem_pwrkey_drive` nhánh trùng | `power_mgr.c:43-44` | **ĐÃ FIX** |
| 7 | `ctx=NULL` sau free (vô nghĩa) | `ble_obd.c:699` | **ĐÃ FIX** |
| 8 | `s_user_led_cycle_started_ms` biến chết | `state_led_control.c:130-133` | **ĐÃ FIX** |
| 9 | `refresh_telemetry` ghi đè cả struct GNSS khi fail | `state_wake_prelude.c:324-325` | **ĐÃ FIX một phần** (xem B) |
| 10 | `memcpy` không giới hạn | nhiều nơi | **KHÔNG TÁI HIỆN** |
| 11 | `strcpy`/`sprintf` | toàn repo | **KHÔNG TÁI HIỆN** (grep 0) |
| 12 | Stack buffer lớn | `modem_gnss.c:378,414,494,530` — 4× `char[512]` | **CÒN (P2)** |
| 13 | Race trong ISR | — | **SAI NGỮ CẢNH** (URC/notify chạy task, không ISR) |
| 14 | Kconfig `FIELD_VALIDATION_*` thiếu depends | `main/Kconfig.projbuild:140,178` | **BÁC BỎ** (đã bọc `if ... endif`) |
| 15 | `led_*` thiếu prefix module | `state_led_control.c:39,54,92,112` | **CÒN (P2)** |
| 16 | `config_store_*` naming không nhất quán | `config_store_nvs.c:60,74` vs `:121,153` | **CÒN (P2)** |
| 17 | 5 hàm >150 dòng | xem C | **CÒN**, `app_core_bootstrap_run` 152→189 |

### Lỗi MỚI từ diff chưa commit

| # | Lỗi | File:line | Sev |
|---|---|---|---|
| **N1** | **Deadlock mutex GNSS không đệ quy** | `modem_gnss.c:88-89` | **P0 — chặn merge** |
| **N2** | Token thật + TLS verify tắt trong file git-track | `sdkconfig:602,606` | P0 (bảo mật) |
| **N3** | Guard config gọi `app_config_set_defaults` → xoá sạch NVS | `tracker-app-bootstrap.c:317-327` | P1 |
| **N4** | Kconfig default đổi `""` vô tác dụng | `Kconfig.projbuild:5,9` vs `sdkconfig:601-602` | P1 |

### N1 — Deadlock GNSS (chặn merge)

`#define GNSS_LOCK()` (`modem_gnss.c:88`) — mutex KHÔNG đệ quy, `xSemaphoreTake(..., portMAX_DELAY)`. 3 đường tự khoá:

| Đường | Chuỗi gọi |
|---|---|
| A | `get_location`:825 LOCK → `try_self_heal`:905 → `power_off`:603 → `:775` LOCK lại |
| B | `get_location`:825 LOCK → `try_no_fix_recover`:828 → `power_on`:635 → `:675` LOCK lại |
| C | `get_location`:825 LOCK → `try_no_fix_recover`:962 → `power_off`:655 → `:775` LOCK lại |

**Mutex KHÔNG cần thiết** — toàn bộ caller nằm trong 1 task FSM (`state_sleep_controller.c:408`, `state_wake_prelude.c:55,56,91,113,134,319`). Khuyến nghị: **xoá hẳn GNSS_LOCK/UNLOCK** (KISS), hoặc recursive + create trong `power_on`.

---

## B. `state_machine_refresh_telemetry` — cơ chế đúng, hạ severity

- Nhánh else clear `fix_valid=false` + `timestamp_ms=0` (`:322-325` MỚI).
- `:334-336` không điều kiện: `if (timestamp_ms == 0) timestamp_ms = now_ms` → **dòng `:325` là code chết** (bị phủ trong 9 dòng).
- **KHÔNG consumer nào bị lừa**: `data_formatter.c:583` `effective_ts` luôn dùng `timestamp_ms` caller truyền (≠0, `state_publish_pipeline.c:245`); mọi gate trust check `fix_valid` TRƯỚC; `rtc_ds3231m_is_time_valid_ms` chỉ nhận epoch [2024,2100).
- → **P2** (state gây hiểu nhầm), sửa bằng đưa `:334-336` vào nhánh success hoặc bỏ `:325`.

**Rò rỉ THẬT (P1 data-integrity):** `data_formatter.c:610` publish `satellites` **vô điều kiện** (ngoài gate `has_valid_gnss_fix` `:601-603`) + `:426` `satellites_reported` → số vệ tinh cũ bị rò khi mất fix. Fix: thêm `s_telemetry.gnss.satellites = 0;` vào nhánh else, hoặc đưa `:610` vào gate.

---

## C. Hàm >150 dòng — ĐÚNG 5 hàm

| Hàm | File:line | Dòng | So audit cũ |
|---|---|---|---|
| `state_machine_refresh_telemetry` | `state_wake_prelude.c:259` | **232** | giữ nguyên |
| `app_core_bootstrap_run` | `tracker-app-bootstrap.c:292` | **189** | 152→189 (+37) |
| `data_formatter_add_diagnostics` | `data_formatter.c:386` | **162** | giữ nguyên |
| `imu_init` | `imu_lis3dsh.c:288` | **157** | giữ nguyên |
| `modem_gnss_get_location` | `modem_gnss.c:822` | **154** | 132→154 |

Tầng 100-150 (cảnh báo sớm): `ble_mgr_gap_event_cb` 139, `tracker_mqtt_publish_with_msg_id_internal` 117, `ble_obd_notify_cb` 108, `config_store_nvs_load` 106, `modem_gnss_send_cgpsinfo_and_parse` 106, `state_machine_try_connect_ble` 106.

---

## D. Timing / session

### D1. Sleep gate — KHÔNG bypass (xác nhận)
1 phễu duy nhất: `APP_STATE_SLEEP` (core.c:1103) → `handle_sleep_state` (:1113) → `state_machine_can_enter_sleep` (:1118, GATE) → `enter_configured_sleep` (:1140) → `esp_deep_sleep_start` chỉ ở `sleep_ctl.c:242,621`, `esp_light_sleep_start` chỉ ở `:546`. Lớp 2: `state_machine_resolve_sleep_mode` trả `NONE` cho state ≠ SLEEP. Blocker: sleep_policy_disabled, ota_in_progress, ota_pending_confirm, ignition_on, ignition_stable_on, ble_connect_inflight. **DRIVING không bao giờ ngủ — đúng yêu cầu.**

### D2. **IGN OFF sleep = 120s, KHÔNG phải 60s**
`core.c:168-174` clamp `heartbeat_interval_s` (sdkconfig:608 = 900) trong `[MIN_HEARTBEAT_INTERVAL_S=60, PARKED_WAKE_INTERVAL_CAP_S=120]` → **120s**. Muốn 60s: đặt `heartbeat_interval_s=60` hoặc hạ cap. **Cần user quyết.**

### D3. Session boundary — ĐÚNG
Start 1 lần trên cạnh ON sạch (`core.c:964-968`→:689); End sau hold+drain (`:912`→:743, publish "stopped" rồi mới clear); OFF chỉ clear `pending_start`, FSM giữ quyền (`session_mgr.c:68-72`).

### D4. Hằng số timing rải rác
- `state_runtime_context.h:32-76`: **34 macro**
- `runtime_config.h`: ~10
- `main/Kconfig.projbuild`: ~12
- Magic literal trong `.c`: `sleep_ctl.c:130` 60000ULL, `led_control.c:59-72` 5 pattern LED, `obd_runtime.c:585,641` 75ms, `bootstrap.c:471,478` 100ms, `modem_at.c:826-963` 30000×5, `ble_init.c:227` 3000, `util_ota_update.c:228` 300, `ble_mgr.c:38` BLE_DISCONNECT_WAIT_MS.

---

## E. Thread safety

**Xác nhận** `state_machine_obd_response_cb` (`state_obd_runtime.c:389`) chạy NimBLE host task (từ `ble_obd.c:567,592` trong `ble_obd_notify_cb`:493) ghi `s_telemetry` (`:402-454`), `s_last_obd_sample_ms` (`:466`), `s_last_obd_engine_on_evidence_ms` (`:470`) — không mutex.

**E1 (P1)** — `s_telemetry` bị **3 task** chạm: task FSM, NimBLE host, `ble_obd_conn` (tạo `state_obd_runtime.c:860`, body `:655`; `:676`→`prime_obd_diagnostics_after_connect`→`ble_obd_rxtx`→notify→callback ghi). Struct đa-byte có thể torn read.

**E2 (P1)** — **UAF `ble_obd_ctx_t`**: `ble_mgr_disconnect` (`ble_mgr.c:970-1020`) quiesce loop break sau `BLE_DISCONNECT_WAIT_MS=1200U` (`:38,:991`) → caller vẫn `free(ctx)` (`ble_obd.c:692-699`) trong khi NimBLE host task có thể còn chạy `notify_cb` chạm `ctx`. Đường gọi: `obd_runtime.c:716,811`, `sleep_controller.c:376`.

**E3 (P2)** — `GNSS_LOCK` lazy-create không đồng bộ (chỉ 1 task → chưa kích hoạt; xoá luôn theo N1).

**AN TOÀN**: `telemetry_counters` (portENTER_CRITICAL), `modem_at s_at_lock` (mutex+timeout, không portMAX_DELAY), `s_ble_ctx` handoff (xQueueOverwrite/Receive), `command_handler` (atomic+mutex timeout), `session_mgr s_ctx` (1 task). Chỉ 2 xTaskCreate: `ble_init.c:163`, `obd_runtime.c:860` + app_main = 3 task.

---

## F. Memory safety
- `strcpy/strcat/sprintf`: **0**.
- `memcpy` không bound: **0** (21 call site đều có check).
- `snprintf` bỏ return: **4 `(void)` + 4 bare**; rủi ro thật 1 chỗ `modem_lte_fsm.c:384` (APN dài → lệnh AT cắt). **P2**.
- Stack ≥512B: 4 chỗ `modem_gnss.c` (~1KB/frame, main stack 12288 OK nhưng dư).
- UAF: 1 chỗ (E2).

---

## G. Config / build / dependency

| # | Vấn đề | File:line | Sev |
|---|---|---|---|
| G1 | Token auth THẬT trong git-track | `sdkconfig:602` | P0 |
| G2 | TLS verify server TẮT → fallback `#define ... 0` | `sdkconfig:606`; `mqtt_session.c:57`, `util_ota_http.c:20` | P0 |
| G3 | MQTT port 1883 (plaintext) — TLS chỉ bật khi port==8883 | `sdkconfig:604`; `mqtt_topics.c:41-42` | P0 |
| G4 | Sửa Kconfig KHÔNG có tác dụng (sdkconfig materialized thắng) | `Kconfig.projbuild:5,9` vs `sdkconfig:601-602` | P1 |
| G5 | `sdkconfig` không nằm trong `.gitignore` nào | — | P1 |
| G6 | IP hạ tầng hardcode | `sdkconfig:605` `103.47.227.216` | P2 |
| G7 | Không bật Secure Boot / Flash Encryption | `sdkconfig.defaults` | P2 |
| G8 | Lãng phí flash: factory 1536K nằm không (OTA chỉ dùng ota_0/1) | `partitions.csv` | P2 |
| G9 | PM_ENABLE + tickless idle + UART 115200 — có thể rớt ký tự | `sdkconfig.defaults` | P2-verify |
| G10 | `idf_component.yml` không tồn tại | — | OK |
| G11 | Kconfig `if/endif`, `menu/endmenu` cân bằng | — | OK |

**Ghi chú G1**: token đã trong git history → xoá file không đủ; cần rotate + cân nhắc filter-repo. (User đã chốt "không cần quan tâm" → chỉ ghi chú, không hành động.)

---

## H. Naming — chi phí đổi tên kebab-case

**Chỉ 2 cặp file (4 file):**
- `app-core/src/tracker-app-bootstrap.c` + `app-core/include/tracker-app-bootstrap.h`
- `platform-hal-esp-idf/src/tracker-runtime-ports.c` + `platform-hal-esp-idf/include/tracker-runtime-ports.h`

Tham chiếu **code/build (bắt buộc) — 10 chỗ**: `main/main.c:17`, `app-core/CMakeLists.txt:3`, `platform-hal/CMakeLists.txt:3`, `tracker-app-bootstrap.c:1,23,27`, `tracker-runtime-ports.c:1,8`, 2 doxygen `@file` trong header. Tham chiếu **docs ~15 chỗ** (tuỳ chọn). Chi phí: 4× `git mv` + 10 dòng. Rẻ.

---

## Thứ tự ưu tiên đề xuất

1. **N1** xoá GNSS_LOCK/UNLOCK (chặn merge)
2. **G1/G2/G3** rotate token, untrack sdkconfig + .gitignore, bật TLS verify, port 8883
3. **G4** regenerate sdkconfig
4. **N3** field-level fallback thay `app_config_set_defaults`
5. **B** clear `satellites` nhánh else; bỏ `:325`
6. **E2** UAF ble_obd_ctx (orphan có chủ đích hoặc gỡ response_cb trước free)
7. **D2** chốt 60s vs 120s
8. **E1** mutex/snapshot cho `s_telemetry` (3 task)
9. Tách 5 hàm >150; gom timing; đổi tên 2 cặp file + led_*/config_store_*

---

## Câu hỏi chưa giải quyết

1. **IGN OFF sleep: 60s hay 120s?** (hiện 120s)
2. Token có rotate được không? (user đã trả lời "không cần quan tâm" — ghi nhận)
3. `sdkconfig` có nên untrack không? (user bỏ qua)
4. Threat model TLS: 1883 plaintext có chủ đích không? (user bỏ qua)
5. E1/E2 có trong scope sprint không? (race/UAF hiếm nhưng thật)
6. G9 (PM/tickless + UART) cần đo trên hardware.

---

Status: DONE_WITH_CONCERNS
Summary: Diff đã fix 11/17 mục audit cũ và bác bỏ 3 mục; phát sinh deadlock P0 (`modem_gnss.c` mutex không đệ quy, không cần thiết vì 1 task), UAF `ble_obd_ctx` (P1), leak `satellites` khi mất fix (P1), và 3 vấn đề config/bảo mật nghiêm trọng.
Concerns: N1 chặn merge; fix Kconfig vô tác dụng vì sdkconfig materialized + git-track kèm token; sleep đang 120s không phải 60s.
