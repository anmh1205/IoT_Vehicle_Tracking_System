# Firmware Codebase Complexity Audit

Date: 2026-05-18  
Scope: `iot-vehicle-tracking-system-firmware/components/`  
Method: Static analysis + pattern matching

## Executive Summary

Firmware đã được **refactor đáng kể** từ kiến trúc monolithic cũ sang component-based. Các "god-file" cũ (state_machine.c 2417 lines, mqtt_client.c 1490 lines) đã được tách. Tuy nhiên vẫn còn **vấn đề complexity, boilerplate, và dead code** cần xử lý.

**Điểm số tổng thể: 6/10** (cải thiện từ ~3/10 của audit cũ)

---

## 1. Thống kê tổng quan

| Metric | Value | Assessment |
|---|---|---|
| Tổng components | 16 | Tốt, phân chia rõ ràng |
| Tổng .c files | 47 | Hợp lý |
| Tổng .h files | 43 | Hợp lý |
| Tổng lines of code | ~17,000 | Vừa phải cho ESP32 firmware |
| Tổng functions | ~613 | Nhiều nhưng phân tán đều |
| Avg lines/function | 28 | Tốt (target < 50) |
| Largest file | state_machine_core.c (1332 lines) | Vẫn còn lớn |
| Max nesting depth | 7 (modem_gnss.c) | Cao (target <= 5) |

### Component breakdown

| Component | Funcs | Lines | Avg lines/func |
|---|---|---|---|
| app-core | 139 | 4808 | 35 |
| adapter-modem-sim7600-at | 96 | 3135 | 33 |
| adapter-mqtt-sim7600-at | 79 | 2337 | 30 |
| adapter-ble-obd-nimble | 70 | 1965 | 28 |
| domain-connectivity | 38 | 1215 | 32 |
| platform-board-esp32s3 | 33 | 1041 | 32 |
| adapter-storage-sdmmc-fatfs | 29 | 836 | 29 |
| domain-ota | 27 | 1070 | 40 |
| shared-kernel | 20 | 557 | 28 |
| domain-storage | 17 | 702 | 41 |
| adapter-kv-nvs | 16 | 430 | 27 |
| adapter-rtc-ds3231m | 13 | 337 | 26 |
| contracts-device-cloud | 9 | 720 | **80** |
| domain-telemetry | 23 | 185 | 8 |
| domain-obd | 3 | 56 | 19 |
| platform-hal-esp-idf | 1 | 55 | 55 |

---

## 2. Dead Code - 22 hàm không được gọi

| File | Function | Lines | Severity |
|---|---|---|---|
| adc_reader.c | `adc_reader_deinit` | ~15 | Low - cleanup function, chưa dùng |
| tracker-app-bootstrap.c | `app_core_bootstrap_run` | - | **False positive** - gọi từ main.c |
| ble_init.c | `ble_stack_init` | ~10 | Low - alternative API |
| modem_at.c | `modem_at_deinit` | ~10 | Low - cleanup function |
| modem_at.c | `modem_at_get_baud` | ~5 | Low - getter không dùng |
| modem_at.c | `modem_at_get_frame_format` | ~5 | Low - getter không dùng |
| modem_at.c | `modem_at_get_line_inverse` | ~5 | Low - getter không dùng |
| modem_at.c | `modem_at_get_pins` | ~5 | Low - getter không dùng |
| power_mgr.c | `modem_get_pwrkey_inverted_stage` | ~5 | Low - getter không dùng |
| power_mgr.c | `modem_set_pwrkey_inverted_stage` | ~5 | Low - setter không dùng |
| modem_gnss.c | `modem_gnss_has_fix` | ~5 | Low - wrapper không dùng |
| modem_lte.c | `modem_lte_connect` | ~10 | Low - legacy API |
| modem_lte.c | `modem_lte_get_rssi` | ~10 | Medium - diagnostic không dùng |
| modem_lte.c | `modem_lte_init` | ~10 | Low - legacy API |
| modem_lte_uart_profile.c | `modem_lte_response_preview` | ~10 | Low - debug helper |
| sd_log_store.c | `sd_log_store_set_ack_seq_critical` | ~10 | Low - internal helper |
| state_machine.c | `state_machine_get_telemetry` | 3 | **Facade** - delegate đến core |
| state_machine_core.c | `state_machine_obd_recently_active` | ~10 | Medium - policy không dùng |
| telemetry_counters.c | `telemetry_counters_inc_mqtt_connected` | 4 | Low - counter không increment |
| telemetry_counters.c | `telemetry_counters_inc_mqtt_disconnected` | 4 | Low - counter không increment |
| mqtt_urc_parser.c | `tracker_mqtt_response_has_prompt` | ~10 | Medium - parser không dùng |
| util_core.c | `util_clamp_float` | ~5 | Low - utility không dùng |

**Đánh giá:** Phần lớn là low-severity (getter/setter, cleanup functions). Không có dead code lớn.

---

## 3. Forward Declarations Không Cần Thiết - 21 hàm

**Vấn đề:** Các file `ble_obd.c`, `ble_mgr.c`, `modem_at.c`, `mqtt_session.c`, `state_sleep_controller.c` có forward declarations cho static functions ở đầu file, sau đó định nghĩa lại ở dưới.

**Ví dụ ble_obd.c:**
- Lines 123-137: 15 forward declarations
- Lines 497+: Actual implementations

**Impact:**
- Tăng ~15-20 lines không cần thiết per file
- Gây nhầm lẫn khi đọc code (nhìn như duplicate)
- Không cần thiết nếu sắp xếp hàm đúng order

**Files bị ảnh hưởng:**
- `ble_obd.c`: 15 forward declarations
- `ble_mgr.c`: 7 forward declarations
- `modem_at.c`: 1 forward declaration
- `mqtt_session.c`: 1 forward declaration
- `state_sleep_controller.c`: 2 forward declarations

---

## 4. Boilerplate Comments Lặp Lại

**Vấn đề nghiêm trọng về readability.** Hầu hết mọi function đều có comment template:

```c
// Keep this public facade thin and forward the real work to the focused implementation below.
// Keep this helper boundary explicit so its local policy and side effects stay predictable.
// Reset counters reset here so stale data does not leak into the next cycle.
// Validate runtime ports validate here before it can influence shared or persisted runtime state.
```

**Impact:**
- `telemetry_counters.c`: 22 functions, mỗi function có 1 dòng boilerplate comment → 22 dòng vô nghĩa
- `state_machine.c`: 3 functions, 3 dòng boilerplate
- Hầu hết files đều có pattern này

**Đánh giá:** Comments này không mang thông tin gì, chỉ lặp lại điều hiển nhiên. Nên xóa hoặc thay bằng comment có giá trị.

---

## 5. Include Count Cao

| File | Includes | Assessment |
|---|---|---|
| state_machine_core.c | **27** | Quá cao - god-file mới |
| state_sleep_controller.c | 23 | Cao |
| state_wake_prelude.c | 20 | Cao |
| tracker-app-bootstrap.c | 20 | Cao |
| ble_mgr.c | 19 | Cao |
| sd_log_store.c | 17 | Cao |

**state_machine_core.c với 27 includes** vẫn đang là "god-file" dù đã refactor. Include từ quá nhiều domain: ADC, BLE, GNSS, IMU, MQTT, NVS, OBD, OTA, Power, RTC, SD, Session, Telemetry, Util.

---

## 6. Global State

| File | Global Variables | Assessment |
|---|---|---|
| state_machine_core.c | **18** | Cao - retained state phức tạp |
| modem_at.c | 14 | Cao - UART state |
| imu_lis3dsh.c | 12 | Trung bình |
| command_handler.c | 11 | Trung bình |
| modem_gnss.c | 18 | Cao |
| adc_reader.c | 5 | OK cho driver |

**state_machine_core.c** vẫn giữ quá nhiều global state (18 biến), dù đã được tách từ file gốc 2417 lines.

---

## 7. Nesting Depth

| File | Max Depth | Assessment |
|---|---|---|
| modem_gnss.c | **7** | Quá sâu - cần refactor |
| state_machine_core.c | 5 | Borderline |
| mqtt_session.c | 5 | Borderline |
| ble_obd.c | 5 | Borderline |
| ble_mgr.c | 5 | Borderline |

**modem_gnss.c depth 7** là vấn đề nghiêm trọng nhất về readability.

---

## 8. ESP_ERROR_CHECK trong Runtime Paths

| File | Line | Context |
|---|---|---|
| nvs_config.c:41 | `ESP_ERROR_CHECK(nvs_flash_erase())` | Init path - acceptable |
| state_machine_core.c:635 | `ESP_ERROR_CHECK(gpio_config(...))` | Runtime path - **rủi ro** |
| tracker-app-bootstrap.c:273 | `ESP_ERROR_CHECK(tracker_runtime_ports_validate(...))` | Init path - acceptable |
| power_mgr.c:129,148 | `ESP_ERROR_CHECK(gpio_config(...))` | Init path - acceptable |

Chỉ có 1 trường hợp rủi ro: `state_machine_core.c:635` dùng `ESP_ERROR_CHECK` trong runtime path thay vì error handling proper.

---

## 9. Unused Functions - Chi tiết

### modem_at.c - 4 getter functions không ai gọi
```c
modem_at_get_baud()
modem_at_get_frame_format()
modem_at_get_line_inverse()
modem_at_get_pins()
```
→ Có thể là预留 cho future use hoặc debug. Nếu không dùng trong 2 sprint, nên xóa.

### power_mgr.c - 2 functions không ai gọi
```c
modem_get_pwrkey_inverted_stage()
modem_set_pwrkey_inverted_stage()
```
→ Setter/getter cho config không dùng.

### telemetry_counters.c - 2 counters không increment
```c
telemetry_counters_inc_mqtt_connected()
telemetry_counters_inc_mqtt_disconnected()
```
→ Defined nhưng không ai gọi. Có thể là leftover từ refactor.

---

## 10. So sánh với Audit Cũ (2026-04-24)

| Issue cũ | Trạng thái | Notes |
|---|---|---|
| Hardcoded credentials | **FIXED** | Không còn tìm thấy |
| TLS authmode=0 | **FIXED** | Không còn tìm thấy |
| state_machine.c 2417 lines | **IMPROVED** | Tách thành 6 files, core còn 1332 |
| mqtt_client.c 1490 lines | **IMPROVED** | Tách thành 5 files |
| nvs_config.c đa vai trò | **IMPROVED** | Tách thành config_store_nvs, ota_context_store_nvs |
| ESP_ERROR_CHECK trong init | **PARTIAL** | Vẫn còn 5 chỗ, nhưng đa số ở init path |
| Dead code | **IMPROVED** | Giảm đáng kể, còn 22 functions nhỏ |
| __attribute__((unused)) | **FIXED** | Không còn |

---

## 11. Vấn đề Mới Phát Hiện

### 11.1 Boilerplate comment pattern
Mỗi function đều có comment template vô nghĩa. Đây là anti-pattern mới xuất hiện sau refactor.

### 11.2 Forward declarations không cần thiết
21 forward declarations cho static functions trong cùng file.

### 11.3 state_machine_core.c vẫn là "mini god-file"
- 1332 lines
- 27 includes
- 18 global variables
- 139 functions trong app-core total

### 11.4 contracts-device-cloud avg 80 lines/function
`data_formatter.c` 720 lines với chỉ 9 functions → avg 80 lines/function. Có functions có thể quá dài.

### 11.5 telemetry_counters boilerplate
22 functions, mỗi function 4-5 lines, trong đó 1 line là boilerplate comment. Tỷ lệ signal/noise thấp.

---

## 12. Khuyến nghị ưu tiên

### P0 - Nên làm ngay
1. **Xóa boilerplate comments** → Giảm ~100 lines vô nghĩa, tăng readability đáng kể
2. **Xóa forward declarations không cần thiết** → Sắp xếp lại order functions trong file
3. **Xóa unused getter/setter** trong modem_at.c, power_mgr.c

### P1 - Nên làm trong sprint tới
4. **Giảm includes của state_machine_core.c** → Dùng forward declarations trong header, include cụ thể hơn
5. **Giảm nesting depth của modem_gnss.c** → Extract helper functions
6. **Giảm global state của state_machine_core.c** → Gom vào context struct

### P2 - Cải tiến dài hạn
7. **Split state_machine_core.c tiếp** → Tách health monitoring, policy helpers ra file riêng
8. **Giảm data_formatter.c function size** → Extract JSON building helpers
9. **Telemetry counters macro generation** → Thay vì 22 functions giống nhau, dùng macro

---

## 13. Kết luận

Firmware đã **cải thiện đáng kể** so với audit tháng 4/2026:
- Kiến trúc component-based rõ ràng
- Security issues (credentials, TLS) đã fix
- God-files đã được tách

**Vấn đề còn lại chủ yếu là:**
- Boilerplate comments (style issue, không phải bug)
- Unused functions nhỏ (dead code nhẹ)
- state_machine_core.c vẫn còn phức tạp
- Một số functions quá dài

**Không có critical issue nào.** Codebase ở trạng thái **có thể maintain được** nhưng cần cleanup để giảm cognitive load.
