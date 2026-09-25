# Scout 01 — Bản đồ vi phạm dependency & hiện trạng DI

> Nội dung do agent `scout-di-deps` (Explore, read-only) tạo; lưu file bởi orchestrator vì agent không có tool Write.
> Đọc theo **working tree** (15 file modified chưa commit), không phải HEAD.

---

## 0. SỬA LỖI PHÁT HIỆN SƠ BỘ

| Claim ban đầu | Kết luận | Bằng chứng |
|---|---|---|
| `domain-ota/src/util_ota_http.c:10` → `modem_at.h` | ĐÚNG | xác nhận |
| `util_ota_update.c:14` → `modem_at.h` | ĐÚNG | xác nhận |
| `domain-storage/src/offline_queue.c:10` → `mqtt_client.h` | ĐÚNG | xác nhận |
| `command_handler.c:18` + `command_handler.h:7` → `nvs_config.h` | ĐÚNG | xác nhận |
| Danh sách trên đầy đủ | **THIẾU 1** | `domain-storage/src/offline_queue.c:12` → `sd_log_store.h` (adapter-storage-sdmmc-fatfs), 28 call-site |
| `state_runtime_context.h/.c` có "context struct" để nhét ports | **SAI** | Không có struct. Là **~70 biến `extern` global rời rạc** (`state_runtime_context.h:122-192`) |

Thêm: `mqtt_client.h` **trùng tên header ESP-IDF esp-mqtt**. Verify không component nào REQUIRES `mqtt`/`esp-mqtt` của IDF → phân giải đúng về `adapter-mqtt-sim7600-at/include/mqtt_client.h`. Vẫn nên đổi tên.

---

## A. VI PHẠM DEPENDENCY RULE

### A1. `domain-*` include header `adapter-*` (vi phạm CẢ include LẪN CMake)

| File:dòng | Header | Component chủ | Symbol thực dùng |
|---|---|---|---|
| `domain-ota/src/util_ota_http.c:10` | `modem_at.h` | adapter-modem-sim7600-at | `modem_at_send_expect` ×7 (73,419,434,454,465,476,487), `modem_at_register_urc:242`, `modem_at_poll_urc:276` |
| `domain-ota/src/util_ota_update.c:14` | `modem_at.h` | adapter-modem-sim7600-at | `modem_at_send_expect` ×7 (222,223,238,290,297,303,324,875), `modem_at_send_collect:491` |
| `domain-storage/src/offline_queue.c:10` | `mqtt_client.h` | adapter-mqtt-sim7600-at | `tracker_mqtt_publish_with_msg_id:453`, `tracker_mqtt_is_connected:640`, `tracker_mqtt_{status,events,firmware,rawdata}_topic:240-247` |
| `domain-storage/src/offline_queue.c:12` | `sd_log_store.h` | adapter-storage-sdmmc-fatfs | **28 call-site** `sd_log_store_*` (108→760) |
| `domain-connectivity/src/command_handler.c:18` | `nvs_config.h` | adapter-kv-nvs | `nvs_config_save:1064` — CHỈ 1 |
| `domain-connectivity/include/command_handler.h:7` | `nvs_config.h` | adapter-kv-nvs | **KHÔNG dùng symbol nào** → include chết, xoá ngay được |

`domain-obd`, `domain-telemetry` **SẠCH**. Không domain nào include `platform-*`.

### A2. Bảng REQUIRES thật (16 component + main)

| Component | REQUIRES | Vi phạm |
|---|---|---|
| shared-kernel | esp_hw_support, esp_timer, log | sạch |
| contracts-device-cloud | json, shared-kernel | sạch |
| domain-telemetry | shared-kernel | sạch |
| domain-obd | shared-kernel | sạch |
| domain-connectivity | **adapter-kv-nvs**, contracts, freertos, json, log, shared-kernel | **VI PHẠM** |
| domain-ota | **adapter-modem-sim7600-at**, app_update, contracts, domain-telemetry, log, mbedtls, shared-kernel | **VI PHẠM** + domain↔domain |
| domain-storage | **adapter-mqtt-sim7600-at**, **adapter-storage-sdmmc-fatfs**, domain-telemetry, log, shared-kernel | **VI PHẠM ×2** + domain↔domain |
| platform-board-esp32s3 | driver, esp_adc, log, shared-kernel | sạch |
| platform-hal-esp-idf | contracts, log, shared-kernel | sạch |
| adapter-kv-nvs | contracts, log, nvs_flash, shared-kernel | sạch |
| adapter-rtc-ds3231m | driver, log, platform-board, shared-kernel | sạch |
| adapter-modem-sim7600-at | **domain-telemetry**, driver, log, platform-board, shared-kernel | adapter→domain |
| adapter-mqtt-sim7600-at | adapter-modem-sim7600-at, log, shared-kernel | adapter→adapter (cùng lớp, OK) |
| adapter-ble-obd-nimble | bt, **domain-telemetry**, log, shared-kernel | adapter→domain |
| adapter-storage-sdmmc-fatfs | **domain-telemetry**, driver, fatfs, log, sdmmc, shared-kernel, vfs | adapter→domain |
| app-core | 5 adapter-*, contracts, 4 domain-*, esp_driver_usb_serial_jtag, log, platform-board, platform-hal, shared-kernel | hợp lệ Clean Arch, nhưng user đã quyết chuyển sang ports |
| main | app-core | sạch |

**3 domain vi phạm, 4 header adapter rò rỉ vào domain.**

### A3. shared-kernel + contracts — SẠCH
Không include ngược. shared-kernel chỉ dùng `esp_err/esp_log/esp_random/esp_timer`. contracts chỉ `app_config.h`, `ota_contract.h`, `telemetry_model.h`, `util.h`, `cJSON.h`.

### A4. domain↔domain + adapter→domain-telemetry

`telemetry_counters.h` dùng bởi **7 component**: domain-telemetry 32, adapter-storage 15, adapter-modem 15, domain-storage 8, domain-ota 6, app-core 5, adapter-ble 3.

- domain-ota → telemetry: 6 call `telemetry_counters_inc_ota_http_{start,fail,success}` (`util_ota_update.c:320-371`)
- domain-storage → telemetry: 8 call `inc_{replay_success,replay_drop,replay_retry,sd_write_fail}` (`offline_queue.c:466-709`)

**KHÔNG chính đáng ở vị trí hiện tại.** `telemetry_counters` là bộ đếm observability write-only (fire-and-forget), không phải business logic domain. 3 adapter include nó tạo mũi tên **adapter→domain (ngược chiều)**.

→ **Fix rẻ nhất toàn audit: move `telemetry_counters` xuống `shared-kernel`** — xoá đồng thời domain↔domain VÀ adapter→domain, không cần port nào.

---

## B. HIỆN TRẠNG DI

### B5. Port structs (`platform-hal-esp-idf/include/tracker-runtime-ports.h`)

3 callback typedef: `tracker_command_message_callback_t:22`, `tracker_ota_status_callback_t:24`, `tracker_obd_response_callback_t:26`.

| Struct (dòng) | Field |
|---|---|
| `modem_transport_port_t:33` | set_apn, request_connect, is_initialized, is_connected, sleep, wakeup **(6)** |
| `mqtt_transport_port_t:43` | init, connect, disconnect, is_connected, publish, publish_with_msg_id, subscribe_commands, set_command_callback **(8)** |
| `storage_queue_port_t:55` | init, enqueue, replay_tick **(3)** |
| `ota_download_port_t:67` | apply_update, manual_rollback **(2)** |
| `config_store_port_t:78` | init, load, save **(3)** |
| `rtc_clock_port_t:85` | init, get_time_ms, set_time_ms, get_health **(4)** |
| `obd_reader_port_t:93` | connect, disconnect, is_connected, request_pid, request_mode, elm327_init, get_ecu_state_label **(7)** |
| `power_control_port_t:104` | init, power_on, power_off, set_dtr, read_status **(5)** |
| `tracker_runtime_ports_t:113` | 8 con trỏ port |

**KHÔNG có port cho: GNSS, IMU, ADC, BLE stack lifecycle, session/OTA persist context.** Tổng 38 field.

### B6-B7. `s_runtime_ports` — VALIDATE RỒI BỎ XÓ (xác nhận)

`grep -rn tracker_runtime_ports` toàn repo → chỉ **2 vị trí code thật**:
- `tracker-app-bootstrap.c:244` khai báo `static const` (đủ 8 port, 9 wrapper `static` dòng 75-164)
- `tracker-app-bootstrap.c:295` `ESP_ERROR_CHECK(tracker_runtime_ports_validate(&s_runtime_ports))`

Sau dòng 295 **không bao giờ đọc lại, không truyền vào hàm nào**. Header chỉ được include bởi đúng 1 file app-core.

**Bằng chứng đắt nhất:** dòng **302-310** — 7 dòng sau validate — bootstrap gọi thẳng `nvs_config_init()` và `nvs_config_load(&config)` thay vì `s_runtime_ports.config_store->init/load`, dù port vừa validate xong.

`tracker_runtime_ports_validate` (`platform-hal-esp-idf/src/tracker-runtime-ports.c:29-83`) chỉ null-check **18/38 field**; 20 field còn lại không kiểm tra.

→ **DI hiện tại là decorative: có hình thức, không hiệu lực runtime.**

### B9. `state_runtime_context.h/.c` — KHÔNG phải chỗ nhét ports

Không có struct. Là **~70 biến global `extern`** (`state_runtime_context.h:122-192`) + 6 `retry_policy_t` + `state_runtime_context_reset()`. Đây là **global mutable state**, đối lập DI.

Nguy hơn: `state_runtime_context.h:10` include `ble_obd.h` (adapter) vì `extern ble_obd_ctx_t *s_ble_ctx;` → **type adapter rò rỉ vào header trung tâm app-core**, lây sang mọi file include nó. Phải xử lý trước (opaque handle / `void *`).

Khuyến nghị: tạo struct mới (vd `tracker_runtime_t`) chứa `const tracker_runtime_ports_t *ports` + state, truyền qua tham số. KHÔNG bơm ports vào file global hiện tại.

---

## C. QUY MÔ REFACTOR

### C10. Call-site trực tiếp trong `app-core/src/` (đã lọc false-positive)

| Adapter/nhóm | Số file | Call-site |
|---|---|---|
| ble_obd_* (adapter-ble) | 5 | **31** (gồm `ble_stack_deinit`, `ble_addr_*`) |
| tracker_mqtt_* (adapter-mqtt) | 5 | **21** (`is_connected` 14) |
| offline_queue_* (domain-storage) | 5 | **15** |
| rtc_ds3231m_* (adapter-rtc) | 2 | **15** |
| modem_lte_* (adapter-modem) | 3 | **14** |
| nvs_config_* (adapter-kv-nvs) | 3 | **10** |
| imu_* (platform-board) | 4 | **10** |
| modem_gnss_* (adapter-modem) | 2 | **7** |
| adc_* (platform-board) | 2 | **3** |
| power_mgr/modem_power/modem_set_dtr | 2 | **3** |
| util_ota_* (domain-ota) | 1 | **2** |
| **TỔNG** | **7 file** | **133** → trừ 12 wiring hợp lệ ở bootstrap = **121 cần refactor** |

Theo file: `state_wake_prelude.c` **46** · `state_machine_core.c` **29** · `state_sleep_controller.c` **18** · `state_obd_runtime.c` **16** · `tracker-app-bootstrap.c` 12 (hợp lệ) · `state_ota_runtime.c` **7** · `state_publish_pipeline.c` **5**.

**CẢNH BÁO ĐẾM:** 2 pattern dễ đếm sai — `imu_runtime_enabled` thực chất là substring của hàm app-core `state_machine_imu_runtime_enabled()` (KHÔNG phải adapter, 6 lần); `ble_mac` khớp field `g_rtc_context.ble_mac`. Bảng trên dùng lookbehind `(?<![A-Za-z0-9_])` để loại. Grep thô sẽ phồng số.

App-core **KHÔNG publish MQTT trực tiếp** — `tracker_mqtt_publish_with_msg_id` chỉ có 1 caller ngoài adapter: `domain-storage/src/offline_queue.c:453`.

### C11. [RỦI RO CHÍNH] Hàm ĐANG GỌI nhưng CHƯA có field port

| Port | Hàm thiếu | Call-site |
|---|---|---|
| modem | `modem_lte_disconnect` | sleep_controller:434 |
| modem | `modem_lte_is_at_ready` | wake_prelude:113,121 |
| modem | `modem_lte_tick` | wake_prelude:653 |
| **GNSS — CHƯA CÓ PORT** | `modem_gnss_power_on` | wake_prelude:56,91,134 |
| | `modem_gnss_power_off` | wake_prelude:55; sleep_controller:408 |
| | `modem_gnss_warm` | sleep_controller:101,368,545,610 |
| | `modem_gnss_get_location` | wake_prelude:319 |
| | `modem_gnss_is_query_ready` | wake_prelude:113 |
| mqtt | `tracker_mqtt_{status,events,firmware,rawdata}_topic` | offline_queue.c:240-247 |
| storage_queue | `offline_queue_set_online` ×4 | wake:739; sleep:431,449; core:1248 |
| | `offline_queue_set_session` ×4 | core:696,709,731,751 |
| | `offline_queue_stop_session` | core:750 |
| | `offline_queue_depth` | core:495 |
| | `offline_queue_should_throttle_rawdata` | core:147 |
| rtc_clock | `rtc_ds3231m_is_available` | wake_prelude:153,522,570 |
| | `rtc_ds3231m_is_time_valid_ms` | wake_prelude:165,172,178,504,527 |
| obd_reader | `ble_obd_set_preferred_address` | obd_runtime:667,669 |
| | `ble_obd_get_peer_address_string` | obd_runtime:732 |
| | `ble_stack_deinit` | sleep_controller:382 |
| | `ble_addr_to_str` / `ble_addr_from_str` | obd_runtime:74,86 |
| config_store | `nvs_config_{save,load,clear}_ota_context` | ota_runtime:45,58,62,77,91 |
| | `nvs_config_{save,load,clear}_session_context` | core:635,649,664 |
| **IMU — CHƯA CÓ PORT** | `imu_init`, `imu_configure_motion_interrupt`, `imu_motion_detected`×4, `imu_clear_motion_interrupt`×2, `imu_get_peak_accel_delta_mps2`, `imu_reset_accel_delta_window` | 10 call-site / 4 file |
| **ADC — CHƯA CÓ PORT** | `adc_reader_init`, `adc_read_vehicle_battery_voltage`, `adc_read_device_battery_voltage` | core:1188; wake:261,262 |

**Cần thêm ~35 field + 3 port struct mới (gnss, imu, adc). Port hiện 38 field → GẦN GẤP ĐÔI.**

**Type-leak kèm theo:** `ota_persist_context_t` / `session_persist_context_t` do **adapter-kv-nvs** định nghĩa (`nvs_config.h:50,69`) nhưng app-core dùng trực tiếp (`state_machine_core.c:629,662`; `state_ota_runtime.c:32,89`). Muốn đưa vào `config_store_port_t` thì **PHẢI move type xuống contracts/shared-kernel TRƯỚC**, nếu không port vẫn phụ thuộc adapter header.

---

## THỨ TỰ ĐỀ XUẤT (rẻ → đắt)

1. Xoá `#include "nvs_config.h"` ở `command_handler.h:7` (include chết, 0 rủi ro)
2. Move `telemetry_counters` → `shared-kernel`: xoá 2 domain↔domain + 3 adapter→domain một lần
3. Move `ota_persist_context_t` / `session_persist_context_t` → `contracts`
4. Bỏ `ble_obd_ctx_t` khỏi `state_runtime_context.h:10` (opaque handle)
5. Mở rộng port (+3 struct, +~35 field), siết `validate` đủ field
6. Đảo 121 call-site: publish_pipeline(5) → ota_runtime(7) → obd_runtime(16) → sleep_controller(18) → machine_core(29) → wake_prelude(46)
7. Port hoá 3 domain vi phạm bằng inversion (domain định nghĩa port, adapter implement)

---

## UNRESOLVED QUESTIONS

1. Move `telemetry_counters` xuống `shared-kernel` — user chấp nhận? Rẻ nhất nhưng đổi vị trí 1 component.
2. `domain-ota` gọi `modem_at_send_expect` 14× với chuỗi AT thô (`AT+HTTPINIT`, `AT+HTTPACTION`...). Logic HTTP-over-AT này thực chất là **adapter concern**. Port hoá hay **move cả `util_ota_http/update` sang adapter-modem**? Ảnh hưởng ranh giới component → cần user quyết.
3. Đổi tên `adapter-mqtt-sim7600-at/include/mqtt_client.h` (trùng header ESP-IDF esp-mqtt) — có trong scope?
4. `ble_addr_t` (NimBLE type) dùng ở `state_obd_runtime.c:74,86` — port hoá bằng string MAC hay giữ nguyên?

---

Status: DONE_WITH_CONCERNS
Summary: Bản đồ đầy đủ 6 vi phạm include + 3 domain vi phạm CMake; xác nhận DI decorative (validate tại bootstrap:295 rồi bỏ xó); đo 121 call-site cần refactor và ~35 field port còn thiếu.
Concerns: (1) 2 phát hiện sơ bộ SAI — thiếu `sd_log_store.h`; `state_runtime_context.h` không có context struct mà là ~70 global extern. (2) Port phải gần gấp đôi (thêm GNSS/IMU/ADC). (3) 2 type adapter phải move xuống contracts TRƯỚC khi port hoá config_store. (4) Không tạo được file report — thiếu tool Write.
