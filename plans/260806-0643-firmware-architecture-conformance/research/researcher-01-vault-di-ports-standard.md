# Researcher 01 — Chuẩn ĐÍCH về Port/DI và Bootstrap/FSM từ vault

**Nguồn:** `E:/anmh1205/my-vault/30-embedded/firmware/esp32/03-projects/iot-vehicle-tracking/build-from-scratch/`
Viết tắt: `05` = `05-ports-va-dependency-injection.md`, `10` = `10-domain-telemetry-va-fusion.md`, `11` = `11-app-core-state-machine.md`, `12` = `12-bootstrap-wiring-va-main.md`, `13` = `13-power-sleep-ota-va-validation.md`.
**Phạm vi:** chỉ đọc vault. KHÔNG đọc và KHÔNG so sánh với code firmware hiện tại.

---

## 0. Cảnh báo quan trọng trước khi dùng report này

**Vault MÂU THUẪN NỘI BỘ về chữ ký field của 6/8 port.** Bài 05 và bài 12 đưa ra hai định nghĩa khác nhau cho cùng một port type. Vì vậy:

- Vault **là** nguồn chuẩn cho: *hình dạng registry, quy tắc const, quy tắc REQUIRES, validate fail-fast, thứ tự bootstrap, kiểu FSM, danh sách anti-pattern*.
- Vault **KHÔNG** là nguồn chuẩn cho: *danh sách field chính xác của từng port*. Phải chốt lại từ đầu, không copy mù từ vault.

---

## 1. Chữ ký port chuẩn — 8 port, nhưng 6 port mâu thuẫn

Vault định nghĩa đúng **8 port** (nhất quán cả hai bài): `modem_transport`, `mqtt_transport`, `storage_queue`, `ota_download`, `config_store`, `rtc_clock`, `obd_reader`, `power_control` (05:1369-1378; 12:641-650).

| Port | Bài 05 | Bài 12 | Kết luận |
|---|---|---|---|
| `modem_transport` | 6 fn: `set_apn, request_connect, is_initialized, is_connected, sleep, wakeup` (05:537-544) | y hệt (12:373-380) | ✅ **KHỚP** |
| `rtc_clock` | 4 fn: `init, get_time_ms, set_time_ms, get_health` (05:1150-1155) | y hệt (12:535-540) | ✅ **KHỚP** |
| `mqtt_transport` | 8 fn, có `subscribe_commands` + `set_command_callback` (05:698-711) | 8 fn, có `subscribe` + `deinit`, **không có** `set_command_callback` (12:407-416) | ❌ MÂU THUẪN |
| `storage_queue` | 3 fn; `enqueue(record_type, payload, gps_fix, net_up, time_trusted, timestamp_ms)` (05:865-874) | 5 fn; `enqueue(data, len)` + `get_count, clear, is_enabled`, **không có** `init` (12:440-446) | ❌ MÂU THUẪN NẶNG |
| `ota_download` | 2 fn: `apply_update(cfg, current_version, cmd, out_status, cb, cb_ctx)`, `manual_rollback` (05:982-990) | 5 fn: `start_update, get_status, apply_update, manual_rollback, set_status_callback` (12:470-476) | ❌ MÂU THUẪN |
| `config_store` | 3 fn: `init, load, save` (05:1064-1068) | 8 fn: thêm `get_string/set_string/get_u32/set_u32/erase_all` (12:503-512) | ❌ MÂU THUẪN |
| `obd_reader` | 7 fn, không có ctx; `request_pid(const char *pid)`, có `request_mode, elm327_init, get_ecu_state_label` (05:1190-1200) | 6 fn, có `void *ctx`; `request_pid(ctx, uint8_t pid)`, có `init, set_response_callback` (12:565-572) | ❌ MÂU THUẪN |
| `power_control` | 5 fn: `init, power_on, power_off, set_dtr, read_status` (05:1268-1274) | 7 fn rail-based: `set_modem_power, set_gnss_power, set_sd_power, set_imu_power, get_battery_voltage, get_supply_voltage, is_ignition_on` (12:598-606) | ❌ MÂU THUẪN NẶNG |

**3 callback type** (chỉ bài 05 định nghĩa, 05:440-457): `tracker_command_message_callback_t(topic, payload)`, `tracker_ota_status_callback_t(status, progress, error_msg)`, `tracker_obd_response_callback_t(pid, value, result)`. Bài 12 không nhắc lại → không có mâu thuẫn, nhưng cũng không có xác nhận chéo.

**Về câu hỏi "có khác `tracker-runtime-ports.h` hiện tại không?":** không trả lời được trong scope này — tôi bị giới hạn chỉ đọc vault và đã không mở header firmware. Cần scout khác đối chiếu.

### Quy tắc cấu trúc — phần này vault NHẤT QUÁN, coi là BẮT BUỘC

- Registry là struct gồm **8 con trỏ `const`**, không nhúng struct trực tiếp. Lý do RAM: "Con trỏ = 8 bytes RAM. Struct trực tiếp = ~800 bytes RAM." (12:722)
- Mọi port pointer phải `const`: "Port **không thay đổi** sau khi bootstrap gán — nó là bản hợp đồng cố định." (05:245). Bẫy 8: "❌ Không const — có thể bị sửa runtime" (05:2788-2799).
- Port instance ở bootstrap phải `static const`: "`const` → Nằm ở flash (rodata), không tốn RAM, không ai sửa được lúc chạy" (12:616).
- ISP — port nhỏ: "**Nguyên tắc:** Mỗi port chỉ có **5-10 functions**. Nếu nhiều hơn → có thể cần tách port." (05:2055)

---

## 2. Cách truyền ports xuống FSM — **qua tham số hàm** (không global, không setter)

**Vault chỉ dùng một cách duy nhất: truyền `const tracker_runtime_ports_t *` làm tham số.** Không có một ví dụ nào dùng biến global hay setter kiểu `set_ports()`.

Trích nguyên văn:

- `void fsm_init(const tracker_runtime_ports_t *ports) { ports->modem->connect(); ports->mqtt->publish(topic, payload, qos); ... }` (05:1403-1407)
- `void fsm_step(const tracker_runtime_ports_t *ports) { ports->modem->request_connect(); ports->mqtt->publish(topic, payload, QOS_1); }` (05:1768-1772) — dán nhãn "✅ FSM gọi qua port"
- `void fsm_step(const modem_transport_port_t *modem) { modem->connect(); }` với chú thích "FSM phụ thuộc vào abstraction" (05:335-337)
- Bootstrap gọi: `fsm_init(&ports);` với comment "8. Khởi động FSM với ports" (05:1679-1680); lặp lại ở 05:2274 và sơ đồ 05:1738.

**Setter bị nhắc tới nhưng theo nghĩa PHỦ ĐỊNH** — vault mô tả hiện trạng, không đề xuất:

> "Bootstrap **validate** registry rồi… _không_ tự tay 'inject' nó vào FSM bằng một hàm như `state_runtime_set_ports()`." (12:861)

Đây là câu mô tả hiện trạng codebase, đi kèm "Registry `s_runtime_ports` đóng vai trò **bản kiểm kê + chốt fail-fast** … hơn là một bảng con trỏ được FSM dereference mỗi vòng" (12:861). Cùng ý ở 05:1572 và 05 §16.

**Vault KHÔNG NÓI** về: ports được truyền tiếp xuống các module con `state_publish_pipeline.c` / `state_obd_runtime.c` / `state_sleep_controller.c` như thế nào. Mọi ví dụ dừng ở `fsm_init(&ports)` / `fsm_step(&ports)` cấp cao nhất. Đây là khoảng trống bạn phải tự quyết.

---

## 3. Domain có nhận ports không? — **KHÔNG.** App-core là nơi gọi port.

**Phần dứt khoát (mức CẢNH BÁO, BẮT BUỘC):**

> "⚠️ **CẢNH BÁO:** Nếu bạn thấy domain component phải `REQUIRES adapter-mqtt` hay `REQUIRES adapter-ble` → kiến trúc đã hỏng. Domain **không bao giờ** biết dữ liệu đến từ đâu. Hãy dừng lại và sửa kiến trúc trước khi viết thêm code." (10:177, lặp lại 10:1788)

> "✅ REQUIRES chỉ gồm shared-kernel (hoặc rất ít ESP-IDF components)" (10:170)

> "`domain-telemetry` và `domain-obd` `REQUIRES` chỉ `shared-kernel` — **bằng chứng chúng là domain thuần, nhận dữ liệu qua struct, không tự đọc cảm biến**." (10:1786)

→ `domain-telemetry`, `domain-obd`: **dữ liệu thuần qua struct**, không port, không I/O. Vault không có bất kỳ ví dụ nào một hàm domain nhận `tracker_runtime_ports_t *`.

**Ngoại lệ vault tự thừa nhận — `domain-connectivity`:**

> `REQUIRES adapter-kv-nvs contracts-device-cloud freertos json log shared-kernel` (10:1750)
> "`domain-connectivity` cần thêm `adapter-kv-nvs`/`json` vì `command_handler` parse JSON lệnh và `session_mgr` lưu session vào NVS — đây là domain 'dày' hơn, **có chạm I/O gián tiếp**." (10:1786)

→ Vault **mô tả** ngoại lệ này kèm lý do, **không** dán nhãn "kiến trúc hỏng". Nhưng nó trực tiếp va vào cảnh báo 10:177. Nếu mục tiêu là DI thuần, `domain-connectivity` là điểm phải xử lý.

**Giới hạn của kết luận (nói thẳng):** vault cấm rõ ràng *domain REQUIRES adapter*. Vault **không nói** rõ *"domain không được nhận `const *_port_t *`"*. Về lý thuyết port nằm ở `platform-hal`, không phải adapter, nên nhận port sẽ không vi phạm câu chữ của quy tắc REQUIRES. Bằng chứng ngược duy nhất: lab ở 05:2406 có `float temperature_handler_read(const temperature_port_t *port)` — một "handler" nhận port qua tham số, nhưng đây là bài tập, không dán nhãn tầng domain. Zero ví dụ domain thật nhận port. → **Hướng của vault rõ (domain = data-only), nhưng không có câu cấm tường minh.**

---

## 4. Bootstrap chuẩn

**Thứ tự bắt buộc** (12:885-1050, sơ đồ 12:1056-1117, mục §8.1 12:1379-1405):

1. `ESP_ERROR_CHECK(tracker_runtime_ports_validate(&s_runtime_ports))` — validate TRƯỚC TIÊN (12:889).
2. `esp_log_level_set()` — hạ ồn NimBLE xuống WARN (12:900-901).
3. `nvs_config_init()` → `nvs_config_load(&config)`; lỗi → `app_config_set_defaults(&config)` + log `nvs_config_load_failed fallback=compiled_defaults` (12:911-921).
4. Mirror sleep policy `util_set_sleep_enabled()`, ghi `esp_ota_get_running_partition()`, `boot_count += 1` (12:926-949).
5. Wake-state deduction từ `esp_sleep_get_wakeup_cause()` — **chỉ khi** `util_is_sleep_enabled()`: TIMER→HEARTBEAT, EXT0+imu_enabled→ALARM, EXT0+imu_disabled→HEARTBEAT, còn lại→INIT (12:954-979).
6. Vòng lặp: nếu chưa `ready` → `retry_state_can_run()` → `state_machine_init(&config)` → OK thì `retry_state_reset()`+`ready=true`, lỗi thì `retry_state_schedule()`; `vTaskDelay(100ms)`; `continue`. Khi ready → `state = state_machine_run(state)` + `vTaskDelay(100ms)` (12:996-1049).

**Xử lý lỗi:**
- Thiếu port → `ESP_ERROR_CHECK` panic ngay tại boot. Lý do: "nếu thiếu port, firmware KHÔNG THỂ chạy an toàn. Panic ngay còn hơn chạy nửa vời." (12:893)
- `REQUIRE` trả `ESP_ERR_INVALID_STATE` + log `event=require_failed check="..." file=... line=...`, **không** abort tại chỗ; caller quyết định (12:797-804). Phân biệt: "`ASSERT` → `abort()` ngay… `REQUIRE` → return error code" (12:808-810).
- Init từng peripheral fail → return ngay, không init tiếp: "Mỗi init fail → return ngay… retry_manager sẽ thử lại sau. Đây là pattern 'fail-fast per component'." (12:1509)
- Retry: exponential backoff 10s ×2 (10/20/40/80…), jitter 10%, `max_delay_ms=0` (không cap), `max_attempts=0` (vô hạn) (12:1215-1221). Lý do không cap: "firmware PHẢI init thành công để hoạt động" (12:1370).

**FreeRTOS task: vault KHÔNG tạo task riêng cho FSM.** Vòng lặp chạy ngay trong task của `app_main`, nhịp bằng `vTaskDelay(pdMS_TO_TICKS(100))`. `app_core_bootstrap_run()` "KHÔNG BAO GIỜ return" (12:883). `vTaskDelay` là bắt buộc để feed watchdog: "⚠️ **KHÔNG BAO GIỜ bỏ vTaskDelay(100ms).**… Nếu bạn optimize loop quá nhanh (bỏ delay), watchdog sẽ reset hệ thống." (12:1561)

**main.c:** chỉ gọi `app_core_bootstrap_run()`, `REQUIRES app-core` duy nhất (12:130-160). "main.c KHÔNG chứa logic nào khác. Đây là design decision có chủ đích." (12:140)

---

## 5. FSM chuẩn — **switch-case + facade**, KHÔNG transition table

- 7 state: `INIT, CHECK_IGN, DRIVING, PARKED, ALARM, HEARTBEAT, SLEEP` (+ `APP_STATE_COUNT`) (11:105-114).
- Facade: "`state_machine.c` mỏng, logic ở `state_machine_core.c`" (11:18).
- Mỗi state = một hàm `static app_state_t run_xxx(uint64_t now)` **trả về state kế tiếp**, không có bảng transition: `run_init` (11:198), `run_check_ign` (11:269), `run_driving` (11:323), `run_parked` (11:376), `run_alarm` (11:443), `run_heartbeat` (11:501), `run_sleep` (11:534). Bootstrap gọi `state = state_machine_run(state);` (12:1040).
- Cooperative, không blocking: "mỗi state làm 1 ít rồi trả về" (11:1584, 12:1569-1587).
- Vault **KHÔNG** đưa ra transition table dạng mảng ở bất kỳ đâu.

**FSM lấy dependency từ đâu? — Đây là MÂU THUẪN THỨ HAI của vault.** Mọi code skeleton FSM ở bài 11 **không nhận ports**, gọi thẳng module + dùng file-static:

```c
static app_state_t run_driving(uint64_t now) {
    static uint64_t s_last_publish = 0;      // module state
    obd_runtime_sample();                     // gọi thẳng
    state_publish_rawdata();                  // gọi thẳng
    command_handler_poll_actions();           // gọi thẳng
    if (!fusion_ignition_is_on()) return APP_STATE_PARKED;
    ...
}
```
(11:323-351; `config_store_load(&s_config)` với `s_config` file-static ở 11:212)

Trong khi bài 05 §18.1 dán nhãn chính cách gọi thẳng đó là "❌" và `fsm_step(const tracker_runtime_ports_t *ports)` là "✅" (05:1753-1772). → **Bài 11 mô tả hiện trạng; bài 05 mô tả đích. Lấy bài 05 làm chuẩn đích.**

---

## 6. Anti-pattern vault cảnh báo rõ

**BẮT BUỘC tránh (ngôn ngữ cảnh báo/mệnh lệnh):**

| # | Anti-pattern | Trích dẫn |
|---|---|---|
| A1 | FSM `#include` header adapter + gọi hàm adapter trực tiếp | "❌ FSM phụ thuộc cứng vào driver modem" (05:53-59); "❌ FSM gọi adapter trực tiếp" (05:1753-1761) |
| A2 | Vòng phụ thuộc FSM ↔ adapter | "Vòng phụ thuộc = **build chậm**, **không tách được module**, **không test được**." (05:84) |
| A3 | `platform-hal` REQUIRES adapter | "Đây là **nguyên tắc cốt lõi**: port **không biết** adapter nào sẽ điền nó. Nếu port REQUIRES adapter → tạo vòng phụ thuộc." (05:382) |
| A4 | Domain REQUIRES adapter | "→ kiến trúc đã hỏng… Hãy dừng lại và sửa kiến trúc trước khi viết thêm code." (10:177) |
| A5 | Cast bỏ `const` của port | "❌ Cast away const — undefined behavior" (05:2755-2758) |
| A6 | Giant port (vi phạm ISP) | "❌ Giant port — vi phạm Interface Segregation" (05:2769-2777) |
| A7 | Port pointer không `const` | "❌ Không const — có thể bị sửa runtime" (05:2791-2794) |
| A8 | Quên gọi validate | "❌ Quên validate — crash lúc runtime, khó debug" (05:2678-2680) |
| A9 | Callback blocking / malloc / printf | "❌ Callback xấu — dài, blocking, malloc" (05:520-525); "Callback nên **ngắn gọn** — không blocking, không malloc, không printf." (05:509) |
| A10 | Logic nặng trong `app_main()` | "Sau 6 tháng, `main.c` thành 500 dòng, không test được" (12:174); §19.3 (12:2098-2104) |
| A11 | Bỏ `vTaskDelay` trong loop | "Triệu chứng: Watchdog reset liên tục" (12:2106-2112) |
| A12 | Wrapper cast sai kiểu callback | "Crash khi gọi port function, hoặc dữ liệu bị corrupt" (12:2090-2096) |

**Vault KHÔNG NÓI** về: global port variable / singleton như một anti-pattern có tên. Vault không bao giờ dùng global, nhưng cũng không có câu cấm tường minh.

**Hai NGOẠI LỆ vault cho phép (quan trọng — chúng giới hạn mức "thuần" đạt được):**

1. **`app-core` được REQUIRES tất cả adapter:** "`app-core` là 'trung tâm', nó cần biết tất cả adapter để wiring. **Đây là exception cho DIP: bootstrap là nơi duy nhất được phép phụ thuộc vào implementation.**" (12:1745; CMakeLists 12:1716-1742). Hệ quả: vì bootstrap và các file `state_*.c` **nằm chung một component `app-core`**, CMake không thể chặn `state_*.c` include header adapter. Vault **không** đề xuất tách bootstrap ra component riêng → **vault không nói** cách bịt lỗ hổng này.
2. **Sleep controller gọi board API trực tiếp:** "⚠️ Deep sleep gọi `modem_power_off()`/`modem_set_dtr()` thẳng (board layer), không qua `s_runtime_ports.modem->sleep`… Lý do: deep sleep phải tắt modem **trước khi** sleep, không thể chờ port abstraction." (13:390)

---

## 7. Tóm tắt BẮT BUỘC vs GỢI Ý

**BẮT BUỘC:** registry 8 con trỏ `const`; port instance `static const`; `platform-hal` không REQUIRES adapter; domain không REQUIRES adapter; validate + fail-fast trước khi chạy FSM; `main.c` mỏng REQUIRES chỉ `app-core`; `vTaskDelay` trong loop; callback non-blocking; port 5-10 fn.

**GỢI Ý / chỉ là mô tả hiện trạng:** danh sách field cụ thể của từng port (mâu thuẫn, không dùng được); con số retry (10s ×2, jitter 10%); nhịp 100ms (được biện minh là "sweet spot", không phải mệnh lệnh); wrapper pattern (12:308 dùng chữ "Quy tắc" nhưng là hướng dẫn kỹ thuật, không phải ràng buộc kiến trúc); cách bài 11 để FSM gọi thẳng module (hiện trạng, KHÔNG phải đích).

---

## Unresolved questions

1. **Chốt chữ ký port ở đâu?** Vault mâu thuẫn 6/8 port. Cần một quyết định độc lập (từ header hiện tại + nhu cầu thật), không copy từ vault. Ai chốt?
2. **Ports xuống module con thế nào?** Vault dừng ở `fsm_init(&ports)`. `state_publish_pipeline.c`, `state_obd_runtime.c`, `state_sleep_controller.c` nhận ports qua tham số từng hàm, hay qua một context struct do `state_runtime_context` giữ? Vault không nói.
3. **`domain-connectivity` xử lý ra sao?** Nó đang REQUIRES `adapter-kv-nvs` + `json` (10:1750) — va vào cảnh báo 10:177. Tách `session_mgr` persistence ra sau port, hay chấp nhận ngoại lệ?
4. **Có tách bootstrap khỏi `app-core` không?** Nếu không tách, CMake không chặn được `state_*.c` include adapter → "DI thuần" chỉ là kỷ luật code review, không phải ràng buộc build. Vault không đề cập.
5. **Ngoại lệ sleep controller (13:390) có giữ không?** Nếu giữ, cần ghi rõ là ngoại lệ có chủ đích để audit sau không báo nhầm.
6. **Domain được phép nhận `const *_port_t *` không?** Vault chỉ cấm REQUIRES adapter, không cấm nhận port. Cần quyết định tường minh để có tiêu chí audit rõ ràng.
