---
title: "Firmware Complexity Reduction & Code Quality Improvement"
description: "Giảm độ phức tạp cấu trúc, loại bỏ dead code, chuẩn hóa patterns, giữ vững kiến trúc component-based"
status: completed
priority: P1
effort: 24h
branch: main
tags: [firmware, refactoring, complexity, code-quality, esp32]
created: 2026-05-19
updated: 2026-05-20
progress: "DONE: Phase 01 (boilerplate + 18 dead funcs), Phase 05 (retry macro), Phase 08 (counter macros), Phase 10 partial (TAG rename), Phase 06 partial (LED extraction), Critical fixes (IMU LIS3DSH, AT+CMS ERROR, GNSS mktime/range, LTE init timing, ESP_ERROR_CHECK, free+NULL, goto removal). Build verified clean."
---

# Firmware Complexity Reduction Plan (v2)

## Tổng quan Codebase

| Metric | Hiện tại | Mục tiêu |
|--------|----------|----------|
| Files (.c + .h) | 96 | ~100 (tách thêm vài module) |
| Tổng dòng code | 22,998 | ~18,000 (giảm ~22%) |
| Max file size | 1,332 lines | ≤600 lines |
| Max includes/file | 27 | ≤12 |
| Max functions/file | 57 | ≤25 |
| Extern globals | 60+ | ≤10 (gom struct) |
| Boilerplate comments | ~300+ | 0 |
| Dead functions | 18+ | 0 |

## Nguyên tắc

- **Behavior preservation**: Không đổi runtime logic
- **YAGNI/KISS/DRY**: Không thêm feature, giữ đơn giản, gom lặp
- **Incremental**: Mỗi phase build pass trước khi sang phase sau
- **Testability**: Refactor hướng tới code có thể unit test
- **ESP-IDF idioms**: Tuân thủ conventions của ESP-IDF ecosystem

---

## Phase Overview

| Phase | Tiêu đề | Effort | Priority |
|-------|---------|--------|----------|
| 01 | Noise removal: boilerplate comments + dead code | 2h | P0 |
| 02 | Global state consolidation (60 extern → structs) | 4h | P0 |
| 03 | Ignition fusion extraction | 3h | P0 |
| 04 | Trivial wrapper elimination + inline | 2h | P1 |
| 05 | Retry pattern macro + DRY | 1.5h | P1 |
| 06 | state_machine_core.c decomposition | 4h | P1 |
| 07 | Input validation & safety | 2h | P1 |
| 08 | telemetry_counters macro generation | 1h | P2 |
| 09 | modem_gnss.c + data_formatter.c cleanup | 2h | P2 |
| 10 | Comment & naming standardization | 1.5h | P2 |

---

## Phase 01: Noise Removal (2h) — P0

### Mục tiêu
Loại bỏ ~300 boilerplate comments và 18 dead functions. Tăng signal/noise ratio ngay lập tức.

### Task 1.1: Xóa boilerplate comments (toàn bộ 47 .c files)

**Patterns cần xóa** (regex-matchable, safe to bulk-remove):
```
// Keep this public facade thin and forward the real work to the focused implementation below.
// Keep this helper boundary explicit so its local policy and side effects stay predictable.
// File-local constants, retained state, and helper wiring stay private here so\n// higher layers interact with this module through its exported contract.
// Keep the branchy handle .* flow centralized here so side effects remain easy to audit.
// Advance one cooperative step here using the current state, time gates, and retry policy.
// Initialize module-local state and dependencies before later runtime paths rely on them.
// Reset counters reset here so stale data does not leak into the next cycle.
// Build the formatter .* representation here so every caller emits the same contract.
// Decode raw .* into the normalized form the rest of the module expects.
// Read .* without widening the mutation surface of this module.
// Persist .* here so later boots, retries, or recovery paths can resume cleanly.
// Rehydrate .* here so later logic reads one coherent snapshot after reset or sleep.
// Drive the transport or session toward a connected state while keeping retries explicit.
// Emit a focused .* diagnostic here so field logs explain the current stage.
// Copy the caller-provided .* into module-local state after lightweight guards.
// Translate app name into a readable label so logs and diagnostics stay easy to follow.
// Update the transition reason path here so later asynchronous work sees the latest intent.
// Log .* here so (later traces|field diagnostics) .*
// Refresh the always-on .* first so every later branch works from one coherent baseline.
// Accept the debounced start edge before the rest of the runtime sees a new session.
```

**Thống kê impact**: 40 files, ~300 comment lines → 0

### Task 1.2: Xóa 18 dead functions

| File | Function | Reason |
|------|----------|--------|
| modem_at.c | `modem_at_get_baud` | Never called |
| modem_at.c | `modem_at_get_frame_format` | Never called |
| modem_at.c | `modem_at_get_line_inverse` | Never called |
| modem_at.c | `modem_at_get_pins` | Never called |
| modem_gnss.c | `modem_gnss_has_fix` | Never called externally |
| modem_lte.c | `modem_lte_connect` | Replaced by request_connect |
| modem_lte.c | `modem_lte_init` | Replaced by tick-based init |
| modem_lte_uart_profile.c | `modem_lte_response_preview` | Debug leftover |
| power_mgr.c | `modem_get_pwrkey_inverted_stage` | Never called |
| power_mgr.c | `modem_set_pwrkey_inverted_stage` | Never called |
| sd_log_store.c | `sd_log_store_set_ack_seq_critical` | Never called |
| telemetry_counters.c | `telemetry_counters_inc_mqtt_connected` | Never called |
| telemetry_counters.c | `telemetry_counters_inc_mqtt_disconnected` | Never called |
| mqtt_urc_parser.c | `tracker_mqtt_response_has_prompt` | Never called |
| util_core.c | `util_clamp_float` | Never called |

Cũng xóa declarations tương ứng trong headers.

### Task 1.3: Xóa forward declarations thừa

| File | Count | Action |
|------|-------|--------|
| ble_obd.c | 12 | Sắp xếp lại: helpers trước, public API sau |
| ble_mgr.c | 7 | Tương tự |
| state_sleep_controller.c | 2 | Xóa, move function lên trước caller |

### Task 1.4: free() → free + NULL

5 chỗ: `ble_obd.c:704`, `state_obd_runtime.c:662,844`, `util_ota_update.c:651,654`

### Acceptance
- [ ] `grep -r "Keep this public facade" components/` → 0 results
- [ ] `grep -r "Keep this helper boundary" components/` → 0 results
- [ ] Build pass, 0 new warnings
- [ ] Giảm ~300 lines

---

## Phase 02: Global State Consolidation (4h) — P0

### Vấn đề gốc
`state_runtime_context.h` export **60+ biến global** qua `extern` với prefix `s_` (mâu thuẫn: `s_` = static convention nhưng thực tế là extern). Bất kỳ file nào include header này đều đọc/ghi tự do mà không có kiểm soát.

### Giải pháp: Gom thành 4 context structs có ngữ nghĩa rõ ràng

```c
// === tracker_timing_ctx_t: Tất cả timestamp/timing state ===
typedef struct {
    uint64_t last_raw_publish_ms;
    uint64_t alarm_enter_ms;
    uint64_t ignition_off_started_ms;
    uint64_t heartbeat_started_ms;
    uint64_t last_obd_poll_ms;
    uint64_t last_obd_diagnostic_poll_ms;
    uint64_t last_obd_debug_log_ms;
    uint64_t last_obd_sample_ms;
    uint64_t last_obd_engine_on_evidence_ms;
    uint64_t obd_live_zero_started_ms;
    uint64_t last_gnss_poll_ms;
    uint64_t last_gnss_rearm_ms;
    uint64_t last_rtc_sync_ms;
    uint64_t last_sleep_reject_log_ms;
    uint64_t last_hw_diag_log_ms;
    uint64_t last_obd_fail_alert_ms;
    uint64_t ble_connect_started_ms;
    uint64_t event_timestamp_ms;
    uint64_t user_led_cycle_started_ms;
} tracker_timing_ctx_t;

// === tracker_connectivity_ctx_t: Network/BLE/MQTT state ===
typedef struct {
    ble_obd_ctx_t *ble_ctx;
    QueueHandle_t ble_connect_result_queue;
    retry_state_t ble_retry;
    retry_state_t network_retry;
    bool mqtt_started;
    bool ble_connect_inflight;
    bool prev_lte_initialized;
    bool lte_ever_initialized;
    bool modem_low_power_pending_wakeup;
    bool ble_retry_last_ignition;
} tracker_connectivity_ctx_t;

// === tracker_sensor_ctx_t: Sensor/OBD/GNSS state ===
typedef struct {
    bool gnss_started;
    uint32_t gnss_poll_fail_streak;
    bool imu_available;
    bool obd_elm_ready;
    uint8_t obd_aux_pid_cursor;
    uint8_t obd_diag_query_cursor;
    uint32_t obd_fail_window_count;
    uint64_t obd_fail_window_started_ms;
    bool obd_fail_alert_emitted;
    int last_obd_fail_alert_code;
    retry_state_t rtc_bootstrap_retry;
    retry_state_t rtc_read_retry;
    retry_state_t imu_bootstrap_retry;
    bool hw_bootstrap_done;
    bool time_trusted;
    bool imu_invalid_wakeup_gpio_logged;
} tracker_sensor_ctx_t;

// === tracker_session_ctx_t: Session/publish/metadata state ===
typedef struct {
    uint32_t session_id;
    uint64_t canonical_session_id;
    char session_boot_id[TRACKER_BOOT_ID_LEN];
    bool session_restore_pending;
    tracker_publish_status_t publish_status;
    uint32_t metadata_seq_no;
    char boot_id[TRACKER_BOOT_ID_LEN];
    char current_version[TRACKER_TARGET_VERSION_MAX_LEN];
    app_state_t runtime_state_hint;
    bool startup_system_check_log_once;
    // Sleep counters
    uint32_t sleep_blocked_count;
    uint32_t sleep_enter_count;
    uint32_t timer_wake_count;
    uint32_t imu_wake_count;
    uint32_t imu_false_wake_count;
    // LED
    tracker_user_led_override_t user_led_override;
    bool user_led_initialized;
    // OTA
    bool ota_confirm_checked;
    bool ota_in_progress;
    firmware_status_t deferred_firmware_report;
    bool deferred_firmware_report_pending;
    // Ignition log
    bool ignition_log_initialized;
    bool last_ignition_state;
    bool heartbeat_raw_published;
} tracker_session_ctx_t;
```

### Migration strategy
1. Tạo `state_runtime_context_v2.h` với structs mới
2. Trong `state_runtime_context.c`, khai báo 4 struct instances
3. Tạo accessor macros: `#define TIMING_CTX (&g_timing_ctx)` etc.
4. Migrate từng file một: thay `s_last_raw_publish_ms` → `g_timing.last_raw_publish_ms`
5. Sau khi migrate xong, xóa file cũ

### Naming convention mới
- `g_` prefix cho true globals (thay vì `s_` sai ngữ nghĩa)
- Struct access qua pointer: `ctx->field` thay vì bare global

### Acceptance
- [ ] `state_runtime_context.h` không còn bare `extern` variables
- [ ] Mỗi struct có 1 owner file, các file khác access qua const pointer khi chỉ đọc
- [ ] Build pass
- [ ] Behavior không đổi

---

## Phase 03: Ignition Fusion Extraction (3h) — P0

### Vấn đề gốc
`state_machine_refresh_telemetry()` trong `state_wake_prelude.c` chứa ~80 dòng ignition fusion logic với **12 boolean flags** tạo thành combinatorial explosion (4096 trạng thái lý thuyết). Logic này không thể unit test vì phụ thuộc 60+ globals.

### Giải pháp: Tách thành pure function với input/output struct

```c
// === ignition_fusion.h (MỚI) ===

typedef struct {
    float vehicle_battery_v;
    float ignition_threshold_v;
    bool obd_connected;
    const char *obd_ecu_state;
    bool obd_sample_fresh;        // age < LIVE_SAMPLE_MAX_AGE
    int32_t obd_rpm;
    int32_t obd_speed;
    int32_t obd_engine_load;
    uint64_t last_engine_on_evidence_ms;
    uint64_t obd_live_zero_started_ms;
    bool session_stable_ignition_on;
    uint64_t now_ms;
} ignition_fusion_input_t;

typedef struct {
    bool ignition_on;             // Final fused result
    bool adc_ignition;            // ADC-only component
    bool obd_live_ignition;       // OBD live component
    bool rpm_ignition;            // RPM > 0 component
    bool obd_engine_evidence;     // Engine-on evidence
    bool hold_live_zero;          // Holding ON during zero-signal window
    bool live_zero_confirmed_off; // Zero-signal confirmed OFF
    bool preserve_degraded;       // Degraded hold-on
} ignition_fusion_output_t;

/**
 * @brief Pure function: resolve ignition state from sensor inputs.
 * No side effects, no globals, fully testable.
 */
ignition_fusion_output_t ignition_fusion_resolve(const ignition_fusion_input_t *input);
```

### Implementation
- `ignition_fusion.c` trong `components/shared-kernel/src/`
- Header trong `components/shared-kernel/include/`
- `state_wake_prelude.c` builds input struct from globals, calls fusion, applies output
- Timing constants (`TRACKER_OBD_LIVE_ZERO_OFF_CONFIRM_MS` etc.) move to fusion header with documentation

### Timing constant documentation (hiện thiếu)
```c
/**
 * Ignition fusion timing relationships:
 *
 * LIVE_SAMPLE_MAX_AGE (5s): OBD sample considered "fresh" for ignition decision
 * ENGINE_ON_EVIDENCE_HOLD (5s): How long RPM>0 evidence persists after last sample
 * ENGINE_ON_CONFIRMED_GRACE (20s): Grace period after confirmed engine-on evidence
 * LIVE_ZERO_OFF_CONFIRM (30s): Duration of all-zero OBD before confirming OFF
 * LIVE_SIGNAL_MAX_AGE (30s): Max age before clearing cached OBD signal snapshot
 *
 * Timeline example (engine turns off):
 *   t=0s: Last RPM>0 sample
 *   t=5s: ENGINE_ON_EVIDENCE_HOLD expires → evidence flag drops
 *   t=20s: CONFIRMED_GRACE expires → grace flag drops
 *   t=30s: LIVE_ZERO_OFF_CONFIRM expires → confirmed OFF
 */
```

### Acceptance
- [ ] `ignition_fusion_resolve()` is a pure function (no globals, no ESP_LOG)
- [ ] `state_wake_prelude.c` ignition section reduced from ~80 lines to ~15 lines
- [ ] Timing constants documented with relationship diagram
- [ ] Build pass

---

## Phase 04: Trivial Wrapper Elimination (2h) — P1

### Vấn đề gốc
~15-20 hàm trong `state_machine_core.c` và `state_machine_internal.h` chỉ là 1-line wrappers đọc 1 field từ global config. Chúng tạo call depth vô ích, tăng code size trên ESP32, và không thêm abstraction value.

### Danh sách candidates

| Function | Body | Action |
|----------|------|--------|
| `state_machine_tracking_interval_ms()` | `return s_config.tracking_interval_s * 1000` | → inline macro |
| `state_machine_alarm_interval_ms()` | `return s_config.alarm_interval_s * 1000` | → inline macro |
| `state_machine_alarm_timeout_ms()` | `return s_config.alarm_timeout_s * 1000` | → inline macro |
| `state_machine_imu_runtime_enabled()` | `return s_config.imu_wakeup_enabled` | → inline macro |
| `state_machine_should_throttle_rawdata()` | 1 condition | → inline in header |
| `state_machine_network_ready_for_heartbeat_publish()` | 1 condition | → inline in header |
| `state_machine_core_get_telemetry()` | `return s_telemetry` | → direct access |
| `ble_obd_tx_handle()` | `return s_obd_chars[0].handle` | → inline |
| `ble_obd_rx_handle()` | `return s_obd_chars[1].handle` | → inline |

### Strategy
```c
// TRƯỚC: function call overhead mỗi FSM loop
uint64_t interval = state_machine_tracking_interval_ms();

// SAU: static inline trong header, zero overhead
static inline uint64_t tracker_tracking_interval_ms(const config_t *cfg) {
    return (uint64_t)cfg->tracking_interval_s * 1000ULL;
}
```

Cho các hàm có logic thực sự (clamp, multi-condition): giữ function nhưng đánh `static inline` trong header.

### Quy tắc giữ/xóa
- **Xóa/inline**: Body ≤ 1 expression, no side effects, no logging
- **Giữ function**: Body > 1 statement, has side effects, or needs logging

### Acceptance
- [ ] `state_machine_internal.h` giảm từ 20 → ≤10 function declarations
- [ ] Không còn function chỉ return 1 field
- [ ] Build pass, behavior không đổi

---

## Phase 05: Retry Pattern DRY (1.5h) — P1

### Vấn đề gốc
Pattern retry xuất hiện **8 lần** với cùng structure (~10 dòng mỗi lần = 80 dòng duplicate):

```c
if (!retry_state_can_run(&s_xxx_retry, now_ms)) { return; }
err = do_operation();
if (err != ESP_OK) {
    uint32_t delay_ms = retry_state_current_delay_ms(&s_xxx_retry, &g_xxx_policy, now_ms);
    retry_state_schedule(&s_xxx_retry, &g_xxx_policy, now_ms, err);
    ESP_LOGW(TAG, "event=retry_scheduled step=%s err=%s attempt=%lu next_delay_ms=%lu", ...);
    return;
}
retry_state_reset(&s_xxx_retry);
```

### Giải pháp: Helper macro

```c
// retry_manager.h - thêm convenience macro
#define RETRY_ATTEMPT(state, policy, now, step_name, operation) do { \
    if (!retry_state_can_run(&(state), (now))) break; \
    esp_err_t _err = (operation); \
    if (_err != ESP_OK) { \
        uint32_t _delay = retry_state_current_delay_ms(&(state), &(policy), (now)); \
        (void)retry_state_schedule(&(state), &(policy), (now), _err); \
        ESP_LOGW(TAG, "event=retry_scheduled step=%s err=%s attempt=%lu delay_ms=%lu", \
                 (step_name), esp_err_to_name(_err), \
                 (unsigned long)(state).attempts, (unsigned long)_delay); \
        break; \
    } \
    retry_state_reset(&(state)); \
} while (0)
```

### Locations to refactor
1. `state_wake_prelude.c`: network retry (2x)
2. `state_wake_prelude.c`: RTC bootstrap retry
3. `state_wake_prelude.c`: IMU bootstrap retry
4. `state_wake_prelude.c`: RTC read retry
5. `state_wake_prelude.c`: modem wakeup retry
6. `state_obd_runtime.c`: BLE connect retry
7. `state_sleep_controller.c`: sleep retry

### Acceptance
- [ ] Macro defined in `retry_manager.h`
- [ ] 8 call sites refactored
- [ ] Net reduction ~50 lines
- [ ] Build pass

---

## Phase 06: state_machine_core.c Decomposition (4h) — P1

### Vấn đề gốc
1,332 lines, 57 functions, 27 includes. God-file biết về mọi subsystem.

### Tách thành modules có trách nhiệm rõ ràng

#### 6.1: Tách User LED → `state_led_control.c` (~100 lines)
```
Functions to move:
- state_machine_set_user_led()
- state_machine_ensure_user_led_initialized()
- state_machine_user_led_pulse()
- state_machine_user_led_pattern_on()
- state_machine_update_user_led()
- state_machine_force_user_led_on()
- state_machine_force_user_led_off()
- state_machine_resume_user_led_pattern()
```

#### 6.2: Tách Session Lifecycle → `state_session_lifecycle.c` (~150 lines)
```
Functions to move:
- state_machine_reset_session_runtime()
- state_machine_persist_active_session()
- state_machine_clear_persisted_session()
- state_machine_restore_session_context_from_nvs()
- state_machine_start_new_session()
- state_machine_resume_active_session()
- state_machine_drop_stale_restored_session()
- state_machine_commit_session_end()
- state_machine_apply_session_assignment()
- state_machine_resume_restored_session_if_needed()
- state_machine_publish_running_status_if_needed()
```

#### 6.3: Tách Health/Diagnostics → `state_health_monitor.c` (~80 lines)
```
Functions to move:
- state_machine_log_health_snapshot()
- state_machine_log_transition()
- state_machine_app_state_name()
- state_machine_transition_reason()
```

#### 6.4: Tách State Resolution → `state_resolver.c` (~100 lines)
```
Functions to move:
- state_machine_resolve_effective_ignition_state()
- state_machine_effective_ignition_on()
- state_machine_resolve_motion_state()
- state_machine_resolve_vehicle_state()
- state_machine_resolve_device_state()
- state_machine_resolve_sleep_mode()
- state_machine_sync_runtime_axes()
```

### Kết quả sau tách
- `state_machine_core.c`: ~500 lines (chỉ còn FSM handlers + init)
- 4 files mới, mỗi file ≤150 lines
- Includes trong core giảm từ 27 → ~10

### Acceptance
- [ ] state_machine_core.c ≤ 600 lines
- [ ] Mỗi file mới ≤ 150 lines
- [ ] Không circular dependencies
- [ ] Build pass

---

## Phase 07: Input Validation & Safety (2h) — P1

### 7.1: cJSON NULL checks trong command_handler.c

Tất cả `cJSON_GetObjectItemCaseSensitive()` calls cần guard:
```c
// Pattern chuẩn:
const cJSON *field = cJSON_GetObjectItemCaseSensitive(params, "key");
if (!cJSON_IsString(field) || field->valuestring == NULL) {
    ESP_LOGE(TAG, "event=invalid_field field=key");
    return false;
}
```

Locations: `command_parse_ota_update()` (7 fields), `command_apply_update_config()` (4 fields)

### 7.2: atoi/atof → strtol/strtod trong modem_gnss.c

```c
// TRƯỚC (unsafe):
return ((uint64_t)epoch * 1000ULL) + (uint64_t)atoi(fractional);

// SAU (safe):
long frac = strtol(fractional, NULL, 10);
if (frac < 0 || frac > 999) frac = 0;
return ((uint64_t)epoch * 1000ULL) + (uint64_t)frac;
```

Locations: `modem_gnss_parse_timestamp()`, `modem_gnss_send_and_parse()` (atof for lat/lon/speed)

### 7.3: ESP_ERROR_CHECK → graceful error handling

```c
// TRƯỚC (crashes on failure):
ESP_ERROR_CHECK(gpio_config(&led_cfg));

// SAU (logs and returns):
esp_err_t err = gpio_config(&led_cfg);
if (err != ESP_OK) {
    ESP_LOGE(TAG, "gpio_config failed: %s", esp_err_to_name(err));
    return;
}
```

Location: `state_machine_ensure_user_led_initialized()`

### 7.4: NULL partition check in OTA rollback

```c
const esp_partition_t *rollback = esp_ota_get_next_update_partition(NULL);
if (rollback == NULL) {
    ESP_LOGE(TAG, "No rollback partition");
    return ESP_FAIL;
}
```

### Acceptance
- [ ] Không còn bare `atoi/atof` trong modem_gnss.c
- [ ] Không còn unguarded cJSON dereference
- [ ] Không còn `ESP_ERROR_CHECK` trong runtime paths (chỉ cho init-time fatal)
- [ ] Build pass

---

## Phase 08: Telemetry Counters Macro Generation (1h) — P2

### Vấn đề
22 functions giống hệt nhau, mỗi function 4 lines = 88 lines boilerplate.

### Giải pháp: X-macro pattern

```c
// telemetry_counter_fields.inc (MỚI)
X(sd_write_ok)
X(sd_write_fail)
X(sd_fsync_fail)
X(replay_success)
X(replay_retry)
X(replay_drop)
X(quota_hit)
X(mqtt_publish_ok)
X(mqtt_publish_fail)
X(mqtt_publish_fallback)
X(lte_recovery_start)
X(lte_recovery_success)
X(lte_recovery_fail)
X(obd_read_ok)
X(obd_timeout)
X(obd_invalid_response)
X(ota_http_start)
X(ota_http_success)
X(ota_http_fail)

// telemetry_counters.c
#define X(name) \
void telemetry_counters_inc_##name(void) { \
    telemetry_counters_inc_field(&s_counters.name); \
}
#include "telemetry_counter_fields.inc"
#undef X

// telemetry_counters.h (declarations)
#define X(name) void telemetry_counters_inc_##name(void);
#include "telemetry_counter_fields.inc"
#undef X
```

### Acceptance
- [ ] telemetry_counters.c ≤ 60 lines (từ 185)
- [ ] Xóa 2 dead counters (mqtt_connected, mqtt_disconnected)
- [ ] Build pass

---

## Phase 09: modem_gnss.c + data_formatter.c Cleanup (2h) — P2

### 9.1: modem_gnss.c — Loại bỏ goto, giảm nesting

**goto telemetry_finalize** trong `state_wake_prelude.c`:
```c
// TRƯỚC:
if (condition) { goto telemetry_finalize; }
// ... gnss logic ...
telemetry_finalize:
// ... finalize ...

// SAU: Tách GNSS polling thành hàm riêng
static void state_machine_poll_gnss_if_ready(void) {
    if (!state_machine_can_poll_gnss()) return;
    uint64_t now_ms = util_uptime_ms();
    if (s_last_gnss_poll_ms != 0 && (now_ms - s_last_gnss_poll_ms) < TRACKER_GNSS_POLL_INTERVAL_MS) return;
    // ... gnss logic with early returns ...
}
```

**modem_gnss_power_on()** — 6 sequential AT command attempts:
- Tách thành `modem_gnss_try_resume()` + `modem_gnss_try_cgnspwr_start()` + `modem_gnss_try_cgps_start()`
- Mỗi hàm max 20 lines, early return on success

### 9.2: data_formatter.c — Extract OBD/state builders

`data_format_rawdata()` hiện ~136 lines. Tách:
```
data_formatter_add_gnss_fields(root, tel)      // ~20 lines
data_formatter_add_obd_fields(root, tel)       // ~40 lines
data_formatter_add_state_fields(root, tel)     // ~20 lines
data_formatter_add_device_fields(root, tel)    // ~15 lines
```

### 9.3: State label functions → lookup table

```c
// TRƯỚC: 5 switch-case functions (mỗi cái 10-15 lines)
static const char *data_formatter_ignition_state_label(tracker_ignition_state_t state) {
    switch (state) { case ON: return "ON"; case OFF: return "OFF"; ... }
}

// SAU: static const array lookup
static const char *const IGNITION_STATE_LABELS[] = {"UNKNOWN", "ON", "OFF"};
static inline const char *ignition_state_label(tracker_ignition_state_t s) {
    return (s < ARRAY_SIZE(IGNITION_STATE_LABELS)) ? IGNITION_STATE_LABELS[s] : "UNKNOWN";
}
```

### Acceptance
- [ ] Không còn `goto` trong production code
- [ ] modem_gnss_power_on() ≤ 40 lines
- [ ] data_format_rawdata() ≤ 50 lines
- [ ] Build pass

---

## Phase 10: Comment & Naming Standardization (1.5h) — P2

### 10.1: Naming fixes

| Hiện tại | Vấn đề | Sửa thành |
|----------|--------|-----------|
| `s_config` (extern) | `s_` = static convention | `g_config` hoặc struct member |
| `s_telemetry` (extern) | Same | `g_telemetry` hoặc struct member |
| `state_machine_*` in 5 files | Prefix không match file | Giữ cho backward compat, document |
| `STATE_MACHINE_TAG` shared | 5 files dùng cùng TAG | Mỗi file có TAG riêng |

### 10.2: File header standardization

Mỗi .c file phải có:
```c
/**
 * @file filename.c
 * @brief One-line description.
 *
 * [Optional: state diagram, flow, or key design decisions]
 *
 * Thread safety: [single-threaded / mutex-protected / ISR-safe]
 * Dependencies: [list key dependencies]
 */
```

### 10.3: Comment rules

- **KEEP**: Comments explaining WHY, non-obvious side effects, timing relationships
- **REMOVE**: Comments restating WHAT the code does, trivial getter descriptions
- **ADD**: Comments for magic numbers, non-obvious conditions, cross-module contracts

### 10.4: Mỗi split-FSM file có TAG riêng

```c
// state_wake_prelude.c
static const char *TAG = "WAKE_PRELUDE";

// state_sleep_controller.c
static const char *TAG = "SLEEP_CTRL";

// state_obd_runtime.c
static const char *TAG = "OBD_RUNTIME";
```

Hiện tại tất cả dùng `STATE_MACHINE_TAG` = "STATE_MACHINE" → không phân biệt được source trong logs.

### Acceptance
- [ ] Mỗi .c file có file header chuẩn
- [ ] Mỗi split-FSM file có TAG riêng
- [ ] Không còn `s_` prefix cho extern variables
- [ ] Build pass

---

## Phụ lục A: Vấn đề phát hiện bổ sung (không trong plan cũ)

### A.1: Split FSM coupling chặt hơn monolith

5 files (`state_machine_core.c`, `state_wake_prelude.c`, `state_obd_runtime.c`,
`state_sleep_controller.c`, `state_publish_pipeline.c`) share 60+ globals qua
`state_runtime_context.h`. Kết quả: phải mở 5-6 file để hiểu 1 flow, không thể
compile/test từng module độc lập.

**Mitigation**: Phase 02 (struct consolidation) + Phase 06 (decomposition) sẽ
giảm coupling bằng cách truyền context pointer thay vì global access.

### A.2: Log messages quá verbose

Một số log lines có 15-18 parameters trên 1 dòng. Trên ESP32:
- Mỗi format string chiếm flash (`.rodata`)
- Long lines khó grep trong serial monitor
- Không structured (key=value OK, nhưng quá nhiều keys)

**Recommendation**: Giới hạn ≤8 parameters/log line. Tách thành 2 lines nếu cần.
Không sửa trong plan này (low priority, high risk of behavior change in field logs).

### A.3: Session management over-decomposition

8 hàm cho session lifecycle, mỗi hàm 10-20 lines, gọi lẫn nhau. Flow khó theo dõi.
Phase 06 gom vào `state_session_lifecycle.c` với 3 entry points rõ ràng:
`session_start()`, `session_resume()`, `session_stop()`.

### A.4: modem_gnss_power_on() — 6 sequential AT attempts

Hàm này thử 6 AT commands tuần tự (CGNSPWR?, CGPS?, CGNSPWR=1, CGNSPWR?, CGPS=1, CGPS?).
Mỗi attempt có logging + state mutation. Tổng ~80 lines cho 1 concept (power on GNSS).
Phase 09 sẽ tách thành 3 sub-functions.

### A.5: Timing constants không document mối quan hệ

40+ `#define` timing constants trong `state_runtime_context.h` có quan hệ phụ thuộc
ngầm (ví dụ: `LIVE_ZERO_OFF_CONFIRM_MS` phải > `ENGINE_ON_EVIDENCE_HOLD_MS`).
Phase 03 sẽ document relationships khi tách ignition fusion.

### A.6: `state_runtime_context.c` — 322 lines nhưng chỉ 1 "function"

File này thực chất là **global variable dump** (30+ variable definitions + 1 reset function).
Không phải code phức tạp, nhưng vi phạm single-responsibility.
Phase 02 sẽ restructure thành struct initialization.

### A.7: mqtt_internal.h expose 43 functions

Header "internal" nhưng export 43 public functions. Nên tách:
- `mqtt_client.h` (public API: connect, disconnect, publish, subscribe)
- `mqtt_internal.h` (chỉ cho intra-module: session, URC, topics)

Không trong scope plan này (low priority, high effort, risky).

### A.8: `offline_queue.c` dùng context struct đúng cách

Đây là **ví dụ tốt** trong codebase: `offline_queue_ctx_t s_ctx` gom state vào 1 struct.
Các module khác nên follow pattern này (Phase 02).

---

## Phụ lục B: Thứ tự thực hiện khuyến nghị

```
Phase 01 (2h)  ─── Quick win, giảm noise ngay
    │
Phase 02 (4h)  ─── Foundation: struct consolidation
    │
Phase 03 (3h)  ─── Critical: ignition testability
    │
    ├── Phase 04 (2h)  ─── Inline trivial wrappers
    ├── Phase 05 (1.5h) ── Retry DRY
    │
Phase 06 (4h)  ─── Largest change: core decomposition
    │
Phase 07 (2h)  ─── Safety fixes
    │
    ├── Phase 08 (1h)   ── Counter macros
    ├── Phase 09 (2h)   ── GNSS + formatter cleanup
    │
Phase 10 (1.5h) ── Final polish
```

Phases 04, 05, 08, 09 có thể song song sau Phase 01+02.

---

## Phụ lục C: Rủi ro & Mitigation

| Rủi ro | Impact | Mitigation |
|--------|--------|------------|
| Struct migration breaks runtime | High | Migrate 1 file at a time, build after each |
| Ignition fusion extraction changes behavior | High | Compare log output before/after on real hardware |
| Inline wrappers break ABI | Low | Internal-only, no external consumers |
| Retry macro hides errors | Medium | Keep ESP_LOGW inside macro, same visibility |
| Session decomposition race | Low | Single-threaded FSM, no actual race |
| TAG rename breaks log parsing scripts | Medium | Announce in changelog, keep structured format |

---

## Phụ lục D: Metrics sau khi hoàn thành

| Metric | Trước | Sau (dự kiến) |
|--------|-------|---------------|
| Total lines | 22,998 | ~18,500 |
| Boilerplate comments | ~300 | 0 |
| Dead functions | 18 | 0 |
| Extern globals | 60+ | 4 structs |
| state_machine_core.c | 1,332 lines | ~500 lines |
| Max includes/file | 27 | ≤12 |
| Ignition fusion testable | No | Yes |
| Retry code duplication | 80 lines | 8 macro calls |
| telemetry_counters.c | 185 lines | ~60 lines |


---

## Phụ lục E: Phân tích Logic, Protocol & Edge Cases

### E.1: modem_at.c — AT Command Protocol Issues

#### E.1.1: Response completion detection thiếu `+CMS ERROR`
`modem_at_response_done()` check `OK`, `ERROR`, `+CME ERROR` nhưng **thiếu `+CMS ERROR`** (SMS-related errors). SIM7600 có thể trả về `+CMS ERROR: xxx` cho các lệnh liên quan SMS/MQTT.

```c
// HIỆN TẠI:
return strstr(buffer, "\r\nOK\r\n") != NULL || strstr(buffer, "\r\nERROR\r\n") != NULL ||
       strstr(buffer, "+CME ERROR") != NULL || ends_with_ok || ends_with_error;

// NÊN THÊM:
       strstr(buffer, "+CMS ERROR") != NULL ||
```

**Impact**: Nếu modem trả `+CMS ERROR`, hàm sẽ timeout thay vì return ngay → lãng phí thời gian.

#### E.1.2: Mutex timeout dùng chung với command timeout
```c
if (xSemaphoreTake(s_at_lock, pdMS_TO_TICKS(timeout_ms)) != pdTRUE) {
    return ESP_ERR_TIMEOUT;
}
```
Nếu task A giữ lock 1500ms (GNSS query), task B gọi `modem_at_send()` với timeout 1500ms → B timeout ngay khi lấy lock, không còn thời gian cho command thực sự.

**Fix**: Mutex timeout nên là `timeout_ms + margin` hoặc tách riêng lock timeout vs command timeout.

#### E.1.3: UART flush khi FIFO overflow có thể mất URC
Khi `UART_FIFO_OVF` hoặc `UART_BUFFER_FULL`, code gọi `uart_flush_input()`. Nếu URC quan trọng (như `+CMQTTCONNLOST`) đang trong buffer → mất URC → MQTT disconnect không được detect.

**Mitigation**: Log warning khi flush xảy ra, tăng RX buffer size nếu overflow thường xuyên.

---

### E.2: modem_lte_fsm.c — LTE State Machine Issues

#### E.2.1: `s_lte_initialized = true` đặt quá sớm
```c
// modem_lte_handle_set_pdp():
s_lte_initialized = true;  // ← Set ở đây
modem_lte_transition(MODEM_LTE_STATE_CEREG_WAIT, ...);
```

`s_lte_initialized` được set **trước khi** CEREG registered và PDP activated. Các module khác check `modem_lte_is_initialized()` để quyết định có gửi MQTT hay không. Nếu CEREG timeout → modem chưa thực sự connected nhưng `is_initialized` = true.

**Impact**: MQTT connect attempt khi chưa có IP → fail → retry storm.

**Fix**: Chỉ set `s_lte_initialized = true` sau `modem_lte_finalize_connected()`, hoặc tách thành `is_at_ready` vs `is_data_ready`.

#### E.2.2: CEREG stat=2 (searching) không có timeout riêng
FSM dùng chung `MODEM_LTE_CEREG_TIMEOUT_MS` cho cả "not registered" và "searching". Trong vùng phủ sóng yếu, modem có thể stuck ở stat=2 rất lâu. Nên có:
- Short timeout cho stat=0 (not registered, not searching) → recover sớm
- Long timeout cho stat=2 (searching) → cho modem thêm thời gian

#### E.2.3: Không check CEREG stat=3 (registration denied)
stat=3 nghĩa là network từ chối đăng ký (SIM bị khóa, roaming bị cấm). Code hiện tại chỉ check `stat == 1 || stat == 5` (registered). stat=3 nên trigger immediate backoff thay vì chờ timeout.

---

### E.3: modem_gnss.c — GNSS Protocol Issues

#### E.3.1: `mktime()` timezone dependency
```c
time_t epoch = mktime(&tm_value);
```
`mktime()` trên ESP-IDF mặc định dùng UTC, nhưng nếu ai đó set timezone qua `setenv("TZ", ...)` → kết quả sai. RTC module đã tự implement `rtc_tm_to_epoch_ms_utc()` để tránh vấn đề này, nhưng GNSS module vẫn dùng `mktime()`.

**Fix**: Dùng `timegm()` (POSIX) hoặc tự tính epoch như RTC module đã làm.

#### E.3.2: `atof()` cho latitude/longitude không validate range
```c
data->latitude = field_count > 3 && fields[3] != NULL ? atof(fields[3]) : 0.0;
data->longitude = field_count > 4 && fields[4] != NULL ? atof(fields[4]) : 0.0;
```
Không validate: lat ∈ [-90, 90], lon ∈ [-180, 180]. Modem garbage data có thể tạo coordinates ngoài range → backend reject hoặc map hiển thị sai.

#### E.3.3: GNSS power-on sequence không check STATUS pin
SIM7600 HW guide khuyến nghị check STATUS pin sau PWRKEY pulse để confirm modem đã boot. Code hiện tại chỉ gửi AT commands và hy vọng modem respond. Nếu modem chưa boot xong → AT command timeout.

#### E.3.4: `modem_gnss_power_on()` — race giữa CGNSPWR và CGPS
Hàm thử CGNSPWR=1 trước, nếu fail thì thử CGPS=1. Nhưng nếu CGNSPWR=1 **partially succeeds** (modem nhận command nhưng internal error) → GNSS engine ở trạng thái undefined → CGPS=1 cũng có thể fail.

**Fix**: Nếu CGNSPWR=1 fail, nên gửi CGNSPWR=0 trước khi thử CGPS=1 để reset state.

---

### E.4: imu_lis3dsh.c — IMU Protocol Issues

#### E.4.1: LIS3DSH motion interrupt dùng LIS3DH register addresses
```c
if (imu_is_lis3dsh()) {
    imu_write_reg(LIS3DH_LEGACY_CTRL_REG2, 0x01);  // ← LIS3DH address!
    imu_write_reg(LIS3DH_LEGACY_CTRL_REG3, 0x40);  // ← LIS3DH address!
```

`imu_configure_motion_interrupt()` cho LIS3DSH branch vẫn dùng `LIS3DH_LEGACY_CTRL_REG2` (0x21) và `LIS3DH_LEGACY_CTRL_REG3` (0x22). Trên LIS3DSH:
- 0x21 = CTRL_REG1 (ODR selection) — **KHÔNG PHẢI** interrupt config
- 0x22 = CTRL_REG2 (HP filter) — **KHÔNG PHẢI** INT routing

**Impact**: Motion interrupt có thể không hoạt động đúng trên LIS3DSH silicon. Wake-from-sleep bằng IMU có thể unreliable.

**Fix**: Dùng đúng LIS3DSH register map:
- CTRL_REG3 (0x23) cho interrupt enable
- THRS1_1 (0x57) cho threshold
- Hoặc dùng state machine 1 (SM1) registers

#### E.4.2: Acceleration delta conversion factor cứng `x / 16.0f`
```c
float x_mg = x / 16.0f;
```
Giá trị 16.0 chỉ đúng cho LIS3DH ở mode 12-bit left-justified, +/-2g. Nhưng:
- LIS3DSH ở +/-2g, 16-bit output → sensitivity = 0.06 mg/digit → factor = `x * 0.06f`
- LIS3DH high-resolution 12-bit → sensitivity = 1 mg/digit (left-justified) → factor = `x / 16.0f` ✓

**Impact**: Trên LIS3DSH, acceleration delta sẽ sai ~267x → vibration metric vô nghĩa.

**Fix**: Dùng chip-specific conversion:
```c
float x_mg = imu_is_lis3dsh() ? (x * 0.06f) : (x / 16.0f);
```

#### E.4.3: I2C bus sharing giữa IMU và RTC không có arbitration
Cả IMU và RTC dùng `I2C_NUM_0`. Code handle bus reuse qua `i2c_master_get_bus_handle()`, nhưng không có explicit coordination. Nếu IMU read và RTC read xảy ra gần nhau (cùng FSM loop) → I2C bus contention.

ESP-IDF I2C master driver có internal mutex, nên technically safe. Nhưng nếu 1 device NACK hoặc stretch clock → có thể block device kia.

---

### E.5: rtc_ds3231m.c — RTC Issues

#### E.5.1: Không clear OSF bit sau khi set time
DS3231M datasheet: "OSF bit is set to 1 any time the oscillator stops". Sau khi set time thành công, nên clear OSF bit để indicate time is now valid.

```c
// Sau rtc_ds3231m_set_time_ms() thành công:
uint8_t status = 0;
rtc_read_regs(RTC_REG_STATUS, &status, 1);
status &= ~RTC_STATUS_OSF_BIT;  // Clear OSF
rtc_write_reg(RTC_REG_STATUS, status);
```

**Impact**: Sau power loss + time set, `time_valid` vẫn = false cho đến khi next read cycle.

#### E.5.2: 12-hour mode handling edge case
```c
int hour = (int)rtc_bcd_to_dec((uint8_t)(regs[2] & 0x1FU));
bool pm = (regs[2] & 0x20U) != 0U;
tm_value.tm_hour = pm ? (hour % 12) + 12 : (hour % 12);
```
Nếu hour = 12 (noon): `12 % 12 = 0`, `0 + 12 = 12` ✓
Nếu hour = 12 (midnight): `12 % 12 = 0` ✓
Nhưng nếu RTC trả BCD garbage (hour > 12 trong 12h mode) → undefined behavior.

---

### E.6: power_mgr.c — Hardware Sequencing Issues

#### E.6.1: `modem_power_on()` không verify modem actually powered on
SIM7600 HW guide: Sau PWRKEY pulse, check STATUS pin goes HIGH within 3-5s. Code hiện tại chỉ pulse và return OK ngay.

**Impact**: Nếu modem battery low hoặc hardware fault → PWRKEY pulse không effect → code nghĩ modem đã on → AT commands timeout.

**Fix**: Sau pulse, poll STATUS pin với timeout:
```c
esp_err_t modem_power_on(void) {
    modem_power_key_pulse(MODEM_PWRKEY_ON_PULSE_MS);
    // Wait for STATUS pin to go HIGH (modem booted)
    for (int i = 0; i < 50; i++) {  // 5s timeout
        bool status = false;
        if (modem_read_status(&status) == ESP_OK && status) return ESP_OK;
        vTaskDelay(pdMS_TO_TICKS(100));
    }
    return ESP_ERR_TIMEOUT;
}
```

#### E.6.2: `ESP_ERROR_CHECK` trong `power_mgr_init()` — fatal crash
```c
ESP_ERROR_CHECK(gpio_config(&output_cfg));
```
Nếu GPIO config fail (invalid pin number, pin already in use) → **crash toàn bộ firmware**. Đây là runtime path, không phải boot-time assertion.

#### E.6.3: PWRKEY inversion logic có thể sai
```c
static void modem_pwrkey_drive(bool asserted) {
    int raw_level = asserted ? 1 : 0;
    if (s_pwrkey_inverted_stage) {
        raw_level = asserted ? 1 : 0;  // ← SAME as non-inverted!
    } else {
        raw_level = asserted ? 0 : 1;
    }
```
Khi `s_pwrkey_inverted_stage = true`: `raw_level = asserted ? 1 : 0`
Khi `s_pwrkey_inverted_stage = false`: `raw_level = asserted ? 0 : 1`

Nếu hardware có inverting transistor (Q → PWRKEY):
- MCU HIGH → transistor ON → PWRKEY pulled LOW (asserted)
- Vậy `inverted_stage = true` → MCU output HIGH khi assert → đúng

Nếu direct connection:
- MCU LOW → PWRKEY LOW (asserted)
- Vậy `inverted_stage = false` → MCU output LOW khi assert → `asserted ? 0 : 1` → đúng

Logic **đúng** nhưng code confusing vì cả 2 branch trông giống nhau. Nên simplify:
```c
int raw_level = s_pwrkey_inverted_stage ? (asserted ? 1 : 0) : (asserted ? 0 : 1);
```

---

### E.7: state_machine_core.c — FSM Logic Issues

#### E.7.1: PARKED state không có handler riêng
```c
case APP_STATE_PARKED:
    s_runtime_state_hint = APP_STATE_PARKED;
    if (s_telemetry.ignition && command_handler_is_tracking_enabled()) {
        next_state = APP_STATE_CHECK_IGN;
        break;
    }
    if (s_heartbeat_started_ms == 0) {
        s_heartbeat_started_ms = util_uptime_ms();
        s_heartbeat_raw_published = false;
    }
    next_state = APP_STATE_HEARTBEAT;
    break;
```

PARKED state **ngay lập tức** chuyển sang HEARTBEAT. Không có dwell time, không có parked-specific logic. Đây thực chất là **pass-through state** — nó chỉ tồn tại để check ignition rồi forward sang heartbeat.

**Question**: Tại sao cần PARKED state nếu nó chỉ là gateway? Có thể merge PARKED logic vào HEARTBEAT entry.

#### E.7.2: Session end khi tracking disabled nhưng ignition vẫn ON
```c
static bool state_machine_driving_ignition_active(void) {
    bool stable_ignition_on = session_mgr_has_stable_ignition() && session_mgr_stable_ignition();
    return command_handler_is_tracking_enabled() && (s_telemetry.ignition || stable_ignition_on);
}
```

Nếu cloud gửi `enable_tracking = false` khi xe đang chạy → `driving_ignition_active()` = false → ignition-off hold timer bắt đầu → session end sau hold period.

**Edge case**: Nếu cloud gửi `enable_tracking = true` lại trong hold period → timer không reset vì `ignition_active` trở lại true → OK, timer reset ở line:
```c
if (ignition_active) { s_ignition_off_started_ms = 0U; return false; }
```
Logic đúng, nhưng không document rõ behavior này.

#### E.7.3: `state_machine_obd_recently_active()` — dead code nhưng có side effect
Plan cũ đánh dấu hàm này là dead code cần xóa. Nhưng nó được gọi trong `state_sleep_controller.c` để block sleep khi OBD active. Cần verify trước khi xóa.

---

### E.8: mqtt_session.c — MQTT Protocol Issues

#### E.8.1: DNS fallback không validate IP format
```c
static bool tracker_mqtt_parse_ipv4_literal(const char *value, char *out_ip, size_t out_ip_size);
```
Nếu `CONFIG_TRACKER_MQTT_DNS_FALLBACK_IPV4` chứa invalid IP → connect attempt với garbage address → timeout.

#### E.8.2: MQTT keepalive vs modem sleep conflict
Nếu modem enters low-power mode (DTR high) nhưng MQTT keepalive timer expires → broker disconnect client → khi modem wakes up, MQTT session đã mất.

**Mitigation**: Trước khi modem sleep, nên MQTT disconnect gracefully. Code hiện tại có `tracker_mqtt_disconnect()` trong sleep path — cần verify nó luôn được gọi.

---

### E.9: offline_queue.c — Data Integrity Issues

#### E.9.1: Không có CRC/checksum cho SD records
Nếu SD card corrupt (power loss during write, bad sector) → replay reads garbage → publish garbage to cloud → data pollution.

**Fix**: Thêm CRC32 per record, skip corrupt records during replay.

#### E.9.2: Session ID = 0 khi enqueue trước session start
Nếu offline_queue_enqueue() được gọi trước `offline_queue_set_session()` → record có session_id = 0 → cloud không thể correlate.

---

### E.10: Tổng hợp Severity

| # | Vấn đề | Severity | Component |
|---|--------|----------|-----------|
| E.4.1 | LIS3DSH interrupt dùng sai register | 🔴 Critical | IMU |
| E.4.2 | Acceleration conversion sai cho LIS3DSH | 🔴 Critical | IMU |
| E.2.1 | lte_initialized set quá sớm | 🟠 High | LTE FSM |
| E.3.1 | mktime() timezone dependency | 🟠 High | GNSS |
| E.6.1 | Power-on không verify STATUS | 🟠 Medium | Power |
| E.1.1 | Thiếu +CMS ERROR detection | 🟠 Medium | AT transport |
| E.5.1 | Không clear OSF sau set time | 🟠 Medium | RTC |
| E.3.2 | Lat/lon không validate range | 🟠 Medium | GNSS |
| E.2.3 | CEREG stat=3 không handle | 🟡 Low | LTE FSM |
| E.3.4 | GNSS power-on race condition | 🟡 Low | GNSS |
| E.6.2 | ESP_ERROR_CHECK trong runtime | 🟡 Low | Power |
| E.1.2 | Mutex timeout = command timeout | 🟡 Low | AT transport |
| E.7.1 | PARKED state pass-through | 🟡 Info | FSM design |


---

## Phụ lục F: Khuyến nghị Fix cho Logic/Protocol Issues

### F.1: IMU LIS3DSH Critical Fixes (nên làm ngay, không cần đợi refactor)

```c
// imu_lis3dsh.c — imu_configure_motion_interrupt()

if (imu_is_lis3dsh()) {
    // LIS3DSH interrupt routing uses different register map than LIS3DH
    // CTRL_REG3 (0x23): INT1_EN bit, interrupt signal config
    // Use state machine 1 for motion detection
    ESP_RETURN_ON_FALSE(imu_write_reg(0x23, 0x48) == ESP_OK, ESP_FAIL, TAG, "CTRL_REG3");
    // THRS1_1 (0x57): Threshold for state machine 1
    ESP_RETURN_ON_FALSE(imu_write_reg(0x57, threshold) == ESP_OK, ESP_FAIL, TAG, "THRS1_1");
    // TIM1_1 (0x55): Timer for state machine 1
    ESP_RETURN_ON_FALSE(imu_write_reg(0x55, duration) == ESP_OK, ESP_FAIL, TAG, "TIM1_1");
    // MASK1_A (0x5A): Axis mask for SM1
    ESP_RETURN_ON_FALSE(imu_write_reg(0x5A, 0xFC) == ESP_OK, ESP_FAIL, TAG, "MASK1_A");
    // SETT1 (0x5B): SM1 settings (SITR=1 for interrupt on SM1)
    ESP_RETURN_ON_FALSE(imu_write_reg(0x5B, 0x01) == ESP_OK, ESP_FAIL, TAG, "SETT1");
} else {
    // LIS3DH path (existing, correct)
    ...
}
```

```c
// imu_lis3dsh.c — imu_get_peak_accel_delta_mps2()

// Fix conversion factor per chip
float sensitivity_mg_per_digit = imu_is_lis3dsh() ? 0.06f : (1.0f / 16.0f);
float x_mg = (float)x * sensitivity_mg_per_digit;
float y_mg = (float)y * sensitivity_mg_per_digit;
float z_mg = (float)z * sensitivity_mg_per_digit;
```

### F.2: LTE FSM — Move initialized flag

```c
// modem_lte_fsm.c — modem_lte_handle_set_pdp()
// REMOVE: s_lte_initialized = true;

// modem_lte_fsm.c — modem_lte_finalize_connected()
// ADD (already has s_lte_connected = true, just add):
s_lte_initialized = true;
```

### F.3: GNSS — Replace mktime with manual UTC conversion

```c
// modem_gnss.c — modem_gnss_parse_timestamp()
// Replace mktime() with timezone-safe manual conversion (same pattern as rtc_ds3231m.c)

static uint64_t modem_gnss_calendar_to_epoch_ms(int year, int month, int day,
                                                 int hour, int min, int sec, int frac_ms) {
    // Same algorithm as rtc_tm_to_epoch_ms_utc but inline
    uint64_t days = 0;
    for (int y = 1970; y < year; ++y) {
        days += ((y % 4 == 0 && y % 100 != 0) || (y % 400 == 0)) ? 366 : 365;
    }
    static const uint8_t mdays[] = {31,28,31,30,31,30,31,31,30,31,30,31};
    for (int m = 1; m < month; ++m) {
        days += mdays[m-1];
        if (m == 2 && ((year%4==0 && year%100!=0) || year%400==0)) days++;
    }
    days += (uint64_t)(day - 1);
    uint64_t secs = days*86400ULL + hour*3600ULL + min*60ULL + sec;
    return secs * 1000ULL + (uint64_t)frac_ms;
}
```

### F.4: AT Transport — Add +CMS ERROR detection

```c
// modem_at.c — modem_at_response_done()
return strstr(buffer, "\r\nOK\r\n") != NULL ||
       strstr(buffer, "\r\nERROR\r\n") != NULL ||
       strstr(buffer, "+CME ERROR") != NULL ||
       strstr(buffer, "+CMS ERROR") != NULL ||  // ← ADD
       ends_with_ok || ends_with_error;
```

### F.5: RTC — Clear OSF after time set

```c
// rtc_ds3231m.c — rtc_ds3231m_set_time_ms() (at end, after successful write)
uint8_t status = 0;
if (rtc_read_regs(RTC_REG_STATUS, &status, 1) == ESP_OK) {
    if (status & RTC_STATUS_OSF_BIT) {
        rtc_write_reg(RTC_REG_STATUS, status & ~RTC_STATUS_OSF_BIT);
    }
}
s_ctx.time_valid = true;
```

---

## Phụ lục G: Unresolved Questions

1. **E.4.1 LIS3DSH interrupt**: Cần xác nhận board thực tế dùng chip nào (LIS3DH hay LIS3DSH). Nếu chỉ dùng LIS3DH thì bug E.4.1 không ảnh hưởng runtime, chỉ là dead code path.

2. **E.7.1 PARKED pass-through**: Đây là design decision hay oversight? Nếu intentional (PARKED chỉ là transition gate), nên document. Nếu oversight, nên merge vào HEARTBEAT.

3. **E.7.3 obd_recently_active()**: Plan cũ đánh dấu dead code nhưng cần grep toàn bộ codebase xác nhận không có caller nào.

4. **E.2.1 lte_initialized timing**: Có module nào phụ thuộc `is_initialized` trước PDP active không? Nếu GNSS startup cần AT ready (không cần IP), thì cần tách thành 2 flags.

5. **E.9.1 SD CRC**: Thêm CRC sẽ break backward compatibility với records đã ghi. Cần migration strategy hoặc version header.

6. **Acceleration conversion (E.4.2)**: Cần đo thực tế trên hardware để verify sensitivity factor. Datasheet LIS3DSH FS=±2g → 0.06 mg/LSB (16-bit). Datasheet LIS3DH FS=±2g, high-res → 1 mg/LSB (12-bit left-justified in 16-bit register → divide by 16).
