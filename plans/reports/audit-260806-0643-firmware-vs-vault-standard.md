# Audit — Firmware ESP32-S3 vs Chuẩn kiến trúc vault (build-from-scratch)

Ngày: 2026-08-06 | Branch: main | Build hiện tại: PASS
Phạm vi: `iot-vehicle-tracking-system-firmware/components/**` — đọc theo working tree (15 file modified chưa commit).
Nguồn: researcher-01 (vault DI), researcher-02 (SIM7600 GNSS), scout-01 (dependency map). `scout-02` không tồn tại (agent chết) — kiểm chứng logic/race lấy từ đối chiếu code trực tiếp trong phiên này.

---

## Bảng phát hiện

| # | Mục | Mức | File:line | Trạng thái | Phase |
|---|---|---|---|---|---|
| 1 | Data race: `state_machine_obd_response_cb` (chạy trong NimBLE host task) ghi `s_telemetry`, `s_last_obd_sample_ms`, `s_last_obd_engine_on_evidence_ms` không mutex, FSM task đọc/ghi cùng | P0 | `app-core/src/state_obd_runtime.c:389-472`; nối tại `ble_obd.c:658` | CÒN | 01 |
| 2 | Bug logic: `refresh_telemetry` gán `s_telemetry.gnss.timestamp_ms = now_ms` khi ==0 → fix không hợp lệ trông như dữ liệu mới | P0 | `state_wake_prelude.c:334-336` | CÒN (đã sửa một phần — nhánh else đã clear `fix_valid`+`timestamp_ms` ở 324-325) | 02 |
| 3 | GNSS: speed nhân `1.852` giả định knots, chưa kiểm chứng — sai thì lệch 1.852x | P1 | `modem_gnss.c:474` (CGPSINFO), `modem_gnss.c:559` (CGNSINF) | CÒN (đã thêm safe_atof qua diff) | 02 (gated hardware) |
| 4 | GNSS: `MODEM_GNSS_NO_FIX_RECOVER_THRESHOLD=10` (dòng 40) nghi cắt ngang cold TTFF 30-120s | P1 | `modem_gnss.c:40` + `modem_gnss_try_no_fix_recover` | CÒN — cần điều tra cadence | 02 (gated hardware) |
| 5 | Dependency: domain-storage → adapter (`mqtt_client.h:10`, `sd_log_store.h:12`) | P1 | `domain-storage/src/offline_queue.c` (29 call-site sd_log_store) | CÒN | 03 (telemetry_counters) + 07 (port) |
| 6 | Dependency: domain-ota → adapter (`modem_at.h`) — HTTP-over-AT | P1 | `util_ota_http.c:10`, `util_ota_update.c:14` | CÒN | 04 (move sang adapter-modem) |
| 7 | Dependency: domain-connectivity → adapter-kv-nvs | P1 | `command_handler.c:18` (`nvs_config_save`) | CÒN | 06/07 (config_store port) |
| 8 | Include chết: `command_handler.h:7` → `nvs_config.h`, không dùng symbol | P2 | `domain-connectivity/include/command_handler.h:7` | CÒN | 09 |
| 9 | DI decorative: `s_runtime_ports` validate tại bootstrap:295 rồi bỏ xó, không truyền vào hàm nào; bootstrap gọi thẳng `nvs_config_init/load` (302-310) thay vì port | P1 | `tracker-app-bootstrap.c:244,295,302-310` | CÒN | 06, 07 |
| 10 | `tracker_runtime_ports_validate` chỉ null-check 18/38 field | P1 | `platform-hal-esp-idf/src/tracker-runtime-ports.c:29-83` | CÒN | 06 |
| 11 | Type-leak: `ota_persist_context_t`/`session_persist_context_t` do adapter-kv-nvs định nghĩa (`nvs_config.h:50,69`) nhưng app-core dùng trực tiếp | P1 | `nvs_config.h:50,69`; dùng ở `state_machine_core.c:629,662`, `state_ota_runtime.c:32,89` | CÒN | 06 |
| 12 | Type-leak: `state_runtime_context.h:10` include `ble_obd.h` vì `extern ble_obd_ctx_t *s_ble_ctx` | P1 | `state_runtime_context.h:10,122-192` (~70 global extern) | CÒN | 06 |
| 13 | Port thiếu GNSS/IMU/ADC (+~35 field) + `mqtt_client.h` trùng tên esp-mqtt | P1 | `tracker-runtime-ports.h:33-122`; `adapter-mqtt-sim7600-at/include/mqtt_client.h` | CÒN | 06 |
| 14 | 121 call-site adapter trong app-core (wake_prelude 46, core 29, sleep 18, obd 16, ota 7, publish 5; bootstrap 12 wiring hợp lệ) | P1 | `app-core/src/*` | CÒN | 07 |
| 15 | God function: `state_machine_refresh_telemetry` 232 dòng | P2 | `state_wake_prelude.c:259-498` (~239) | CÒN | 08 |
| 16 | God function: `app_core_bootstrap_run` 188 dòng | P2 | `tracker-app-bootstrap.c:293-490` | CÒN (đã thêm fallback device_id/auth_token + brace style qua diff) | 08 |
| 17 | God function: `data_formatter_add_diagnostics` 162+ dòng | P2 | `contracts-device-cloud/src/data_formatter.c:386-556` (~170) | CÒN | 08 |
| 18 | God function: `imu_init` 157 dòng | P2 | `platform-board-esp32s3/src/imu_lis3dsh.c:288-~445` | CÒN | 08 |
| 19 | God function: `modem_gnss_get_location` 154 dòng | P2 | `adapter-modem-sim7600-at/src/modem_gnss.c:822-~976` | CÒN (đã bọc mutex qua diff) | 08 |
| 20 | Naming: 4 file kebab-case cần snake_case | P2 | `tracker-app-bootstrap.{c,h}`, `tracker-runtime-ports.{c,h}` | CÒN | 09 |
| 21 | Doc-comment lỗi thời `state_machine_can_sleep` (tên cũ) | P2 | `state_sleep_controller.c:47` | CÒN | 09 |
| 22 | GNSS: nhánh CGNSINF/CGNSPWR = họ SIM800/7000, nhiều khả năng đã chết trên SIM7600; `satellites` từ CGNSINF đọc sai index (14/15 là vùng SNR) | P1 | `modem_gnss.c:493-585,690-737,776` | CÒN | 05 |
| 23 | GNSS: `satellites=1` hardcode trên đường CGPSINFO — không trung thực | P1 | `modem_gnss.c:468-472` | CÒN | 05 (đổi sang 0) |
| 24 | Contract: label `"cgpsinfo_fallback"` → phải đổi `"cgpsinfo"` khi xoá CGNSINF (đồng bộ server) | P1 | `data_formatter.c:417` | CÒN | 05 |
| 25 | Thread safety đã làm một phần: GNSS mutex + safe_atof/atoi + soft retry 2 | P1 | `modem_gnss.c` (diff) | ĐÃ FIX qua diff | 01 (giữ, không redo) |
| 26 | Bug fix đã làm một phần: nhánh else clear fix_valid+timestamp | P0 | `state_wake_prelude.c:324-325` | ĐÃ FIX qua diff | 02 (phần còn lại: dòng 334) |
| 27 | Bug fix đã làm một phần: `command_handler` atomic `s_dropped_command_count` | P1 | `command_handler.c:68-72,220-227,688-695,722,902-907` | ĐÃ FIX qua diff | 01/02 (giữ, không redo) |
| 28 | Bug fix đã làm một phần: `offline_queue_replay_tick` early-return khi không có record | P2 | `offline_queue.c:697-700` | ĐÃ FIX qua diff | — (giữ) |
| 29 | Cleanup đã làm: `s_user_led_cycle_started_ms` (biến chết) | P2 | `state_led_control.c`, `state_runtime_context.c` | ĐÃ FIX qua diff | 09 (giữ) |
| 30 | Refactor đã làm: `util_ota_http` thêm ESP_RETURN_ON_FALSE truncation check | P1 | `util_ota_http.c:410-489` | ĐÃ FIX qua diff | 04 (giữ) |
| 31 | Kconfig: credentials default rỗng, TLS_VERIFY default y | P1 | `main/Kconfig.projbuild` (diff 4 dòng) | ĐÃ FIX qua diff | — (SẠCH) |
| 32 | Git secret (sdkconfig chứa secret) | P2 | `sdkconfig` | CÒN — user quyết KHÔNG xử lý; chỉ ghi chú | — |
| 33 | **N1 (MỚI, scout-02):** deadlock GNSS_LOCK — mutex không đệ quy, 3 đường tự khoá (get_location→try_self_heal→power_off; get_location→try_no_fix_recover→power_on/off). Caller chỉ 1 task FSM → mutex thừa | **P0** | `modem_gnss.c:88-90` + 9 vị trí | CÒN (do diff vừa thêm) | 02 |
| 34 | **E2 (MỚI, scout-02):** UAF `ble_obd_ctx_t` — `ble_mgr_disconnect` break sau 1200ms rồi caller `free(ctx)` trong khi NimBLE host còn chạy notify_cb | P1 | `ble_obd.c:692-699`, `ble_mgr.c:970-1020,38,991` | CÒN | 01 |
| 35 | **B (MỚI, scout-02):** `data_formatter.c:610` publish `satellites` vô điều kiện ngoài gate `has_valid_gnss_fix` + `:426` → số vệ tinh cũ rò khi mất fix | P1 | `data_formatter.c:610,426` | CÒN | 02 |
| 36 | **N3 (MỚI, scout-02):** guard config gọi `app_config_set_defaults` khi device_id/auth_token rỗng → xoá sạch NVS cấu hình khác | P1 | `tracker-app-bootstrap.c:317-327` | CÒN | 08 |
| 37 | **D2 (MỚI, scout-02):** IGN OFF sleep đang 120s (clamp heartbeat 900 trong [60,120]) — user feedback cũ ghi 60s | P2 | `state_machine_core.c:168-174` | ĐÃ CHỐT giữ 120s (user chốt 2026-08-06 — KHÔNG phải lỗi, không sửa) | — |
| 38 | **G2/G3 (MỚI, scout-02):** TLS verify tắt + port 1883 plaintext trong sdkconfig | P0 (bảo mật) | `sdkconfig:602,606,604`; `mqtt_topics.c:41-42` | CÒN — user KHÔNG xử lý (chỉ ghi chú) | — |
| 39 | Naming: `led_*` thiếu prefix module (`state_led_control.c:39,54,92,112`); `config_store_*` không nhất quán (`config_store_nvs.c:60,74,121,153`) | P2 | nhiều nơi | CÒN | 09 (ghi chú, tách riêng) |

**Tóm tắt trạng thái:** CÒN 27 mục · ĐÃ FIX qua diff 8 mục · MỚI (từ scout-02) 7 mục. Tổng 39.

---

## Chú thích

- **Mục 1 (P0 race)** là ưu tiên số 1: callback NimBLE host task (qua `ble_obd_notify_cb`) ghi trực tiếp `s_telemetry`/`s_last_obd_*` mà FSM task cùng đọc → torn read. Dự án đã có sẵn pattern queue đúng: `s_ble_connect_result_queue` (state_machine_core.c:1171-1176) — queue hoá theo cùng pattern.
- **Mục 2**: nhánh else đã sửa (clear fix_valid+timestamp), nhưng dòng 334 vẫn gán timestamp = now_ms khi ==0 → null fix bị "fake-fresh". Cần chặn việc gán này khi không có fix.
- **Mục 22-24 (GNSS)**: quyết định user chốt — bỏ CGNSINF/CGNSPWR, `satellites`→0, label→`"cgpsinfo"`. `query_mode` serialize thành string (data_formatter.c:424) nên xoá enumerator `GNSS_QUERY_MODE_CGNSINF` an toàn về giá trị số.
- **Phần CHƯA làm của plan cũ** (`plans/260722-fix-cleanup-mess-audit/`): memory/thread safety P0, god function, naming, kconfig đã được gộp vào plan mới. Các mục trong diff chưa commit (GNSS mutex, atomic counter, fallback defaults, brace style) đã được thực hiện một phần — plan mới ghi rõ từng mục.

---

## Unresolved questions

1. **Speed knots vs km/h** (`modem_gnss.c:474`): cần đối chiếu với speed OBD trên hardware. Plan tách thành gated task (cần board).
2. **`MODEM_GNSS_NO_FIX_RECOVER_THRESHOLD=10`**: cadence thật của `modem_gnss_get_location()` chưa xác định được trong phiên này — cần đo nhịp poll để chốt ngưỡng.
3. **`domain-connectivity` sau DI**: chấp nhận ngoại lệ thực dụng (session_mgr I/O NVS+MQTT) hay tách persistence ra sau port — plan giữ nguyên ngoại lệ, ghi rõ trong phase 06/07.
4. **`mqtt_client.h` đổi tên**: đổi trong phase 06 hay để riêng — quyết định đổi (tránh nhầm esp-mqtt) nhưng không nằm trong đường tới hạn.
5. **Có tách bootstrap khỏi app-core không**: vault không đề cập; plan giữ nguyên (không tách), ghi rõ rằng "DI thuần" với state_*.c là kỷ luật code review + include audit, không phải ràng buộc CMake.
6. **MỚI (N1):** deadlock GNSS_LOCK do diff chưa commit vừa thêm — đã đưa vào phase 02 (xoá mutex, KISS, 1 task). Xác nhận không có task khác gọi GNSS.
7. **MỚI (E2):** UAF `ble_obd_ctx_t` — ghán vào phase 01 (orphan có chủ đích hoặc gỡ response_cb trước free). Chọn phương án an toàn nhất khi implement.
8. **MỚI (G2/G3):** TLS verify tắt + 1883 plaintext — user đã quyết "không cần quan tâm" → KHÔNG đưa vào plan, chỉ ghi chú ở đây.
