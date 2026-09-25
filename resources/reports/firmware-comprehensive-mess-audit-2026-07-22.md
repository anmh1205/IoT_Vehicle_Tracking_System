# Firmware Comprehensive Mess Audit

**Date:** 2026-07-22
**Scope:** All 47 .c files across 16 components
**Method:** Multi-agent parallel static analysis
**Score:** 2.5/10

---

## Phần 1: God Functions Census

**26 functions > 80 lines** được tìm thấy trên toàn bộ codebase. Đây là con số rất lớn cho ~17K LOC firmware.

### Tier S (Godzilla — > 150 lines)

| Function | File | Lines | Vấn đề |
|----------|------|-------|--------|
| `modem_gnss_get_location` | modem_gnss.c | **153** | Điều khiển primary/fallback query, backoff, self-heal, no-fix recovery, logging throttle, 7 telemetry counter updates |
| `imu_init` | imu_lis3dsh.c | **157** | Bus handle acquisition, device probe 4 addresses, fallback WHO_AM_I sweep 2 speeds, 2 chip variants, interrupt GPIO config |
| `data_formatter_add_diagnostics` | data_formatter.c | **161** | Build 5+ JSON sub-objects (channel, signals, quality, events, gnss_diag), stale OBD logic, readiness monitors 15 fields, DTC codes |
| `app_core_bootstrap_run` | tracker-app-bootstrap.c | **152** | 10 responsibilities: port validation, log config, NVS init, config load, field-validation, OTA diag, wake mapping, retry init loop, FSM loop |

### Tier A (Large — 100-150 lines)

| Function | File | Lines | Vấn đề |
|----------|------|-------|--------|
| `state_machine_refresh_telemetry` | state_wake_prelude.c | **235** | **Worst** - ADC, OBD, GNSS, ignition debounce, HW diags all in 1 function. 6 calls to `util_uptime_ms()`, nest depth 7 |
| `state_machine_try_connect_ble` | state_obd_runtime.c | **105** | Drain result, OTA check, retry cadence, ignition edge, MAC resolve, task create |
| `modem_gnss_send_cgpsinfo_and_parse` | modem_gnss.c | **106** | CSV split + field parse + epoch calc + error handling |
| `ble_obd_notify_cb` | ble_obd.c | **108** | Buffer mgmt, OBD parse, response validation, diag logging, callback dispatch |
| `command_handler_process` | command_handler.c | **100** | 7-branch if/else dispatch chain, each branch parse→build→enqueue |
| `state_machine_process_ota_command` | state_ota_runtime.c | **99** | Rollback + update 2 state machines trong 1 function |

### Tier B (Medium — 80-100 lines)

| Function | File | Lines |
|----------|------|-------|
| `sd_log_store_gc_if_needed` | sd_log_store.c | 95 |
| `modem_gnss_send_and_parse` | modem_gnss.c | 95 |
| `offline_queue_replay_tick` | offline_queue.c | 93 |
| `state_machine_shutdown_for_sleep` | state_sleep_controller.c | 90 |
| `command_parse_ota_update` | command_handler.c | 86 |
| `modem_gnss_power_on` | modem_gnss.c | 86 |
| `state_publish_via_pipeline` | state_publish_pipeline.c | 85 |
| `state_machine_core_init` | state_machine_core.c | 83 |
| `tracker_mqtt_connect_once` | mqtt_session.c | 83 |
| `sd_log_store_mount` | sd_log_store.c | 83 |
| `state_machine_enter_light_sleep_for_interval_us` | state_sleep_controller.c | 82 |
| `state_machine_enter_usb_guarded_sleep` | state_sleep_controller.c | 81 |
| `state_machine_obd_response_cb` | state_obd_runtime.c | 83 |
| `tracker_mqtt_session_connect` | mqtt_session.c | 80 |
| `util_ota_finalize_image` | util_ota_update.c | 82 |
| `util_ota_write_wire_payload` | util_ota_update.c | 80 |
| `rtc_ds3231m_init` | rtc_ds3231m.c | 80 |
| `ble_mgr_init` | ble_mgr.c | 76 |
| `sd_log_store_append` | sd_log_store.c | 80 |

**Hậu quả:** 26 god functions = testing nightmare, không thể unit test, chỉ integration test được.

### Chi Tiết state_machine_refresh_telemetry (235 dòng — WTF Function)

**File:** `state_wake_prelude.c:259-494`

| Metric | Count |
|--------|-------|
| Total lines | 236 |
| Local variables | 23 (1 static local) |
| if/else branches | 19 |
| `util_uptime_ms()` calls | 4 (3 different `now_ms` locals) |
| Direct adapter calls | 21 |
| Nesting depth | 4 (GNSS block) |
| Responsibilities | ADC reading, IMU poll, OBD poll (3 PIDs), GNSS poll, ignition debounce state machine, HW diag logging |

**Critical bug phát hiện:** GNSS poll failure corrupts telemetry data (lines 320-338):
```c
gnss_data_t gnss = {0};                          // L320: zeroed local
if (modem_gnss_get_location(&gnss) == ESP_OK) {  // L321: FAILS
    s_telemetry.gnss = gnss;                      // L322: NOT reached
    ...
} else {                                          // L324: enters else
    s_gnss_poll_fail_streak += 1;                 // L325: increment
    ...
}
// L336: OUTSIDE the if/else — runs regardless of success
if (s_telemetry.gnss.timestamp_ms == 0) {
    s_telemetry.gnss.timestamp_ms = util_uptime_ms();  // L337: WRITES NEW TIMESTAMP
}
```
Kết quả: `s_telemetry.gnss` có stale lat/lng/alt/speed/fix_valid từ cycle trước nhưng **brand-new timestamp**. Downstream không phân biệt được "fresh valid fix" vs "stale position with new timestamp". Đây là **silent data corruption bug**.

**Variable shadowing:** `now_ms` được khai báo 3 lần trong cùng function (L270, L314, L340). Mỗi lần là biến khác nhau, code giữa L314 và L340 tham chiếu `now_ms` của GNSS block. Maintenance trap.

---

## Phần 2: Thread Safety Audit

### app-core: 0 locks — 80+ unprotected globals

| File | Globals | Risk |
|------|---------|------|
| `state_runtime_context.c` | **80+** extern `s_` vars | FSM loop writes, BLE callback reads |
| `state_wake_prelude.c` | 15+ extern | `s_telemetry` written in refresh, read from BLE response |
| `state_sleep_controller.c` | 15+ extern | `s_ignition_off_started_ms` shared |
| `state_machine_core.c` | 3 file-static | `s_state_entered_ms` FSM-only, low risk |

### Adapter Layer: Mixed

| File | Locks | Unprotected Globals | Verdict |
|------|-------|--------------------|---------|
| `modem_at.c` | `portMUX_TYPE s_uart_mux` | 14 globals under lock | OK |
| `ble_obd.c` | `SemaphoreHandle_t s_obd_mutex` | `s_obd_chars`, `s_preferred_addr` | **RACE** |
| `ble_mgr.c` | `SemaphoreHandle_t s_lock_mtx` | Callback reads without lock | **RACE** |
| `modem_gnss.c` | **NONE** | **21 globals** | **CRITICAL** |
| `sd_log_store.c` | **NONE** | `s_ctx` singleton | **CRITICAL** |
| `mqtt_urc_parser.c` | **NONE** | `s_rx_ctx` extern across ISR/task | **CRITICAL** |
| `mqtt_session.c` | **NONE** | 10 extern shared | **CRITICAL** |
| `command_handler.c` | `s_lock` | `s_dropped_command_count` race (L690) | **RACE** |
| `offline_queue.c` | **NONE** | `s_ctx` singleton | **CRITICAL** |
| `util_ota_http.c` | **NONE** | `s_ota_http_action` callback+loop | **RACE** |
| `session_mgr.c` | **NONE** | `s_ctx` singleton | **RACE** |

**P0 Race: mqtt_urc_parser.c** — `s_rx_ctx` bị ghi từ URC callback (ISR context) và đọc từ synchronous polling loop. Không mutex, không critical section. TOCTOU race trên inbound message buffer.

**P0 Race: modem_gnss.c** — 21 globals, zero locks. `modem_gnss_get_location` có thể chạy đồng thời từ FSM loop + diagnostic task. Streak counters, fallback flag, timestamp globals đều race.

---

## Phần 3: Naming Violations

### 3.1 Missing Module Prefix

| Location | Function | Expected Prefix |
|----------|----------|----------------|
| `state_led_control.c:39` | `led_pulse()` | `state_led_pulse()` |
| `state_led_control.c:54` | `led_pattern_on()` | `state_led_pattern_on()` |
| `state_led_control.c:92` | `led_drive()` | `state_led_drive()` |
| `state_led_control.c:112` | `led_ensure_initialized()` | `state_led_ensure_initialized()` |
| `ble_init.c` | `default_reset_cb` | `ble_default_reset_cb` |
| `config_store_nvs.c:60` | `config_store_clamp_u16()` | `config_store_nvs_clamp_u16()` |
| `config_store_nvs.c:74` | `config_store_apply_legacy_v1()` | `config_store_nvs_apply_legacy_v1()` |

### 3.2 Prefix Inconsistency

| File | Prefix 1 | Prefix 2 | Conflict |
|------|----------|----------|----------|
| `command_handler.c` | `command_handler_` | `command_` | Mixed for internal functions — `command_handler_take_lock` vs `command_is_hex_sha256` |
| `state_led_control.c` | `led_` | `state_machine_` (from includes) | File should be `state_led_` consistent |

### 3.3 Misleading Names

| Location | Name | Reality |
|----------|------|---------|
| `ble_mgr.c:169` | `ble_mgr_queue_send` | Actually calls `xQueueOverwrite` (different semantics) |
| `state_runtime_context.h` | `s_ble_ctx` | Uses `s_` prefix but is `extern` — not file-static |
| `mqtt_session.c:815` | `tracker_mqtt_query_disconnect_state` | 3-line passthrough wrapper that adds zero value |

---

## Phần 4: Duplicate Code Catalog

### 4.1 Identical Logic Blocks

| Pattern | Files | Lines Duped | Impact |
|---------|-------|-------------|--------|
| UTC epoch calc | modem_gnss.c (×2) | 13 lines | Sửa leap year phải sửa 2 chỗ |
| CSV split loop | modem_gnss.c (×2) | 12 lines | Buffer size khác nhau (16 vs 20) |
| Whitespace trim | modem_at.c (×2) | 7 lines | Utility function lặp |
| wait_connect / wait_publish | mqtt_urc_parser.c | 28 lines × 93% | Chỉ khác state variable |
| parse_u32_positive / parse_u64 | command_handler.c | 41 lines × 95% | Chỉ khác type |
| apply_u16 / apply_bool | command_handler.c | 24 lines × 90% | Chỉ khác mask |
| take_ota / take_session | command_handler.c | 16 lines × 90% | Chỉ khác buffer pair |
| UUID16/32/128 loops | ble_mgr.c | 28 lines × 3 | 100% structural duplicate |
| Error-teardown × 3 | ble_mgr.c | 13 lines × 3 | Cleanup helper cần extract |
| Semaphore drain × 2 | ble_obd.c | 2 lines × 2 | Cosmetic |
| OTA clear pattern × 3 | state_ota_runtime.c | 4 lines × 3 | Helper cần extract |
| out_reason pattern × 8 | state_sleep_controller.c | 3 lines × 8 | Macro/helper cần extract |
| GNSS cooldown × 3 | state_wake_prelude.c | 4 lines × 3 | Helper |
| Retry schedule pattern × 5 | state_wake_prelude.c | 5 lines × 5 | Macro cần extract |
| hex_to_bytes × 2 | util_core.c | 18 lines | Helper |
| Log functions × 2 | offline_queue.c | 40 lines × 80% | Helper |
| Recovery functions × 2 | sd_log_store.c | 47 lines | Helper |
| File rotation × 2 | sd_log_store.c | 10 lines | Helper |
| Data format preamble × 4 | data_formatter.c | 15 lines × 4 | Helper |
| OBD connect fail × 2 | state_obd_runtime.c | 10 lines × 2 | Helper |

### 4.2 WET Configuration Repetition

**7x AT+CSSLCFG block** trong `mqtt_session.c:646-702` — 7 block giống hệt nhau, chỉ khác sub-command name. Có thể dùng loop + const table.

**6 retry policies** trong `state_runtime_context.c:201-257` — đều có `max_attempts=0, jitter_ms=0`. Có thể reduce với macro.

---

## Phần 5: Memory Safety

### 5.1 memcpy Without Bounds Check (12+ sites)

| Location | Code | Risk |
|----------|------|------|
| `ble_obd.c:509` | `memcpy(s_recent_pids, pids, len)` | `len` từ BLE packet, `s_recent_pids[20]` |
| `modem_at.c:364` | `memcpy(response, data, len)` | `len` từ UART, `response[512]` |
| `modem_at.c:755` | `memcpy(s_uart_rx_buf + s_uart_rx_len, data, len)` | Overflow nếu `len > free space` |
| `mqtt_session.c:100` | `memcpy(s_mqtt_rx_buf + offset, data, len)` | `s_mqtt_rx_buf[2048]`, không check offset+len |
| `mqtt_urc_parser.c:624` | `memcpy(topic, data, len)` | `topic[64]` |
| `mqtt_urc_parser.c:667` | `memcpy(command, data, len)` | `command[32]` |

### 5.2 Critical: Buffer Aliasing — Undefined Behavior

**`mqtt_session.c:95-103`:**
```c
char host[TRACKER_HOST_MAX_LEN] = {0};
memcpy(host, host_start, host_len);
host[host_len] = '\0';
if (tracker_mqtt_parse_ipv4_literal(host, host, sizeof(host))) {
    //                              ^^^^  ^^^^
    // SAME buffer as input AND output → memcpy overlap → UB
}
```

### 5.3 snprintf Truncation Ignored (42+ sites)

Pattern `(void)snprintf(buf, sizeof(buf), "...")` xuất hiện 42+ lần. Return value bị discard → không phát hiện truncation.

**Worst offenders:**
- `util_ota_http.c`: 6/7 snprintf calls cast to `(void)`
- `mqtt_session.c:653`: The only snprintf in that file that discards return (inconsistent)
- `command_handler.c`, `data_formatter.c`: pervasive `(void)snprintf`

### 5.4 Stack Overflow Risk

| Location | Stack Allocation | Note |
|----------|-----------------|------|
| `modem_gnss.c:355,383` | `char response[512] + char line[512]` | 1KB per call, 2KB chain in get_location |
| `mqtt_urc_parser.c:565` | `char response[MQTT_AT_RESPONSE_MAX_LEN]` | Depends on constant (>2KB?) |
| `mqtt_session.c:347` | `char response[MQTT_AT_RESPONSE_MAX_LEN]` | 1024 bytes on stack |

### 5.5 Unsafe C String Parsing

| Location | Function | Problem |
|----------|----------|---------|
| `modem_gnss.c` | `atof()` × 7 | Returns 0.0 on failure — indistinguishable from valid 0 |
| `modem_gnss.c` | `atoi()` × 2 | Same ambiguity |
| `ble_mgr.c:379` | `om->om_data` | Không check mbuf contiguity — silent truncation |

---

## Phần 6: Boilerplate Comments — Signal/Noise Analysis

**Pattern pervasive:** Mọi function đều có Doxygen block lặp lại tên function.

### Ví dụ Điển Hình

```c
// sd_log_store.c
// Reset the peek cache here whenever card state changes so replay never resumes from a stale file offset.
static void sd_log_store_reset_peek_cache(void) { ... }

// Mirror the storage health state here so mount availability and cache validity stay in sync.
static void sd_log_store_set_state(sd_log_state_t state) { ... }

// Mark the store degraded here when I/O guarantees weaken but the card is still partially usable.
static void sd_log_store_mark_degraded(void) { ... }
```

**Format template:** `// <verb> <what> here so <why>.`

### Boilerplate Count by Component

| Component | Est. Boilerplate Lines | % of File |
|-----------|------------------------|-----------|
| `sd_log_store.c` | 120 | ~12% |
| `mqtt_session.c` | 320 | ~22% |
| `state_wake_prelude.c` | 76 | ~10% |
| `state_sleep_controller.c` | 60 | ~10% |
| `state_machine_core.c` | 85 | ~7% |
| `command_handler.c` | 116 | ~10% |
| `modem_at.c` | 80 | ~7% |
| `modem_gnss.c` | 70 | ~8% |
| `imu_lis3dsh.c` | 40 | ~6% |
| `telemetry_counters.c` | 23 | **27%** |
| `retry_manager.c` | 30 | ~16% |
| `config_store_nvs.c` | 35 | ~14% |
| `state_obd_runtime.c` | 50 | ~6% |
| **Total** | **~1,105 lines** | **~6.5% of codebase** |

**Kết luận:** ~1,100 dòng boilerplate comments trên 17K LOC. Nếu xóa đi, codebase clean hơn đáng kể.

---

## Phần 7: Hardcoded Magic Numbers

### 7.1 Magic 60000 (1 phút) — 4 chỗ, 0 shared constant

```c
state_sleep_controller.c:130     if (util_uptime_ms() < 60000ULL)
modem_gnss.c:35                  #define MODEM_GNSS_QUERY_PRIMARY_BACKOFF_COOLDOWN_MS 60000ULL
mqtt_session.c:1273              uint64_t cleanup_deadline_ms = util_uptime_ms() + 60000ULL;
state_machine_core.c:98          #define TRACKER_HEALTH_SNAPSHOT_INTERVAL_MS 60000ULL
```

### 7.2 Other Magic Values

| Value | Location | Suggestion |
|-------|----------|------------|
| `1735689600000ULL` | `state_wake_prelude.c:174` | RTC fallback epoch — cần named constant |
| `128` | `modem_at.c:239,344,742` | Chunk buffer size ×3 |
| `96` | `mqtt_session.c:339,651` | Command buffer size ×2 |
| `420` | `mqtt_session.c:1024` | Connect command — why 420 vs 96 vs 220? |
| `8` | `command_handler.c:796` | `strlen("https://")` — nên dùng sizeof-1 |
| `64` | `command_handler.c:254,258` | SHA256 hex length — nên là `#define SHA256_HEX_LEN 64` |
| `1200` | `data_formatter.c:439` | Poll interval literal |
| `0x6F, 0x00, 0x27, 0x88` | `imu_lis3dsh.c:405-414` | Register config values — nên là `#define` |
| `3300.0f, 4095.0f` | `adc_reader.c:117` | ADC ref voltage + max count |
| `3.0f` | `state_machine_core.c:266,273` | Speed threshold ×2 |
| `75` | `state_obd_runtime.c:585,641` | BLE polling delay ×2 |
| `100` | `tracker-app-bootstrap.c:423,430` | Boot loop delay ×2 |

---

## Phần 8: Spaghetti Logic Patterns

### 8.1 Ignition Decision Tree — Depth 7

`state_wake_prelude.c:382-470`: Chain điều kiện ignition dài nhất codebase:

```
if (obd_live_zero_candidate)                    // level 1
  if (s_obd_live_zero_started_ms == 0 ...)      // level 2
    if (!s_ignition_log_initialized ...)         // level 3
      if (s_last_obd_engine_on_evidence_ms ...)  // level 4
        if (age > s_config.ignition_off_delay)   // level 5
          ...                                    // level 6-7
```

### 8.2 Self-Heal Fallback — Depth 7

`modem_gnss.c:841-886`:
```
if (result != OK)                              // level 2
  if (fail_streak >= THRESHOLD)                // level 3
    if (try_self_heal)                         // level 4
      if (s_use_cgps_query_only)               // level 5
      else                                     // level 5
        if (send_and_parse != OK)              // level 6
          if (cgpsinfo_and_parse == OK)        // level 7 → DEPTH 7
```

### 8.3 God Dispatch Function

`command_handler_process` (command_handler.c:865-964): 7-branch if/else chain, mỗi branch parse→build→enqueue. Nên là dispatch table.

### 8.4 4 switch(state) Chains

`data_formatter.c`: 4 function, mỗi function có 1 switch chain. 4×4=16 cases khác nhau cho JSON formatting.

### 8.5 7-Block AT Command Config

`mqtt_session.c:646-702`: 7 block AT+CSSLCFG giống hệt nhau. Nên là loop + const table.

### 8.6 Logic Bug: No-Fix Streak Reset

`modem_gnss.c:841-843`:
```c
if (result != MODEM_GNSS_READ_OK) {
    s_no_fix_streak = 0;  // BUG: transport failure resets no-fix counter
```
Khi modem không trả lời (transport failure), `s_no_fix_streak` bị reset. No-fix recovery (threshold=10) không bao giờ trigger vì streak counter bị reset liên tục.

### 8.7 Dead Loop: Zero Retry Count

`modem_gnss.c:27`:
```c
#define MODEM_GNSS_QUERY_SOFT_RETRY_COUNT 0U
```
Loop chạy đúng 1 lần — loop construct vô dụng.

### 8.8 Redundant Assignment

`power_mgr.c:44-48`:
```c
int raw_level = asserted ? 1 : 0;
if (s_pwrkey_inverted_stage) {
    raw_level = asserted ? 1 : 0;  // IDENTICAL — no-op branch
}
```

### 8.9 Dead Store

`state_led_control.c:135`:
```c
s_user_led_cycle_started_ms = util_uptime_ms();  // Written but NEVER READ
```

### 8.10 Useless NULL After Free

`ble_obd.c:702`:
```c
free(ctx);
ctx = NULL;  // Local copy — caller's pointer still dangling
```

---

## Phần 9: Forward Declarations Không Cần Thiết

| File | Declarations | Waste |
|------|-------------|-------|
| `ble_obd.c` | 15 | ~25 lines |
| `ble_mgr.c` | 7 | ~10 lines |
| `state_sleep_controller.c` | 2 | ~4 lines |
| `modem_at.c` | 1 | ~4 lines |
| `mqtt_session.c` | 1 | ~4 lines |
| **Total** | **26** | **~47 lines** |

26 forward declarations. Hầu hết có thể tránh bằng cách sắp xếp function order.

---

## Phần 10: Global State Density

### Top Global Variable Counts

| File | Globals | Assessment |
|------|---------|------------|
| `state_runtime_context.c` | **80+** | (s_ + g_ vars) — cực kỳ cao |
| `modem_gnss.c` | 21 | Zero locks — cực kỳ nguy hiểm |
| `state_machine_core.c` | 18 | Retained state phức tạp |
| `modem_at.c` | 14 | Under lock — OK |
| `ble_obd.c` | 12 | 2 unprotected |
| `imu_lis3dsh.c` | 12 | 11 unprotected |
| `command_handler.c` | 11 | 1 race |
| `mqtt_session.c` | 10 extern | 10 shared, zero locks |

**Anti-pattern:** `state_runtime_context.c` dùng `s_` prefix (file-static convention) nhưng tất cả đều `extern` trong header. Prefix sai — không phải file-static.

---

## Phần 11: Kconfig Security

| Issue | Config | Default | Risk |
|-------|--------|---------|------|
| Device ID dễ đoán | `TRACKER_001` | `"TRACKER_001"` | Tất cả devices cùng ID nếu quên config |
| Auth token mặc định | `provisioning-required` | `"auth-token"` | Security risk nếu deploy trước khi change |
| Duplicate host | `TRACKER_FIELD_VALIDATION_MQTT_HOST` | `"mqtt.example.com"` | Same value as `TRACKER_DEFAULT_MQTT_HOST` |
| TLS verify OFF | `CONFIG_TRACKER_TLS_VERIFY_SERVER` | `0` (default) | OTA download không verify server cert |

---

## Phần 12: Kết Luận

### Tổng Quan

| Metric | Value | Score |
|--------|-------|-------|
| God functions > 80 lines | **26** | FAIL |
| Thread safety violations | **11 files** | CRITICAL FAIL |
| Duplicate code blocks | **19 patterns** | FAIL |
| Boilerplate comment lines | **~1,105** | FAIL |
| memcpy without bounds | **12+** | FAIL |
| snprintf truncation ignored | **42+** | FAIL |
| Naming violations | **7 functions** | LOW |
| Forward declarations | **26** | LOW |
| Kconfig security issues | **4** | MEDIUM |
| Magic 60000 duplication | **4** | LOW |
| Logic bugs | **3** | HIGH |
| Stack overflow risk | **3 files** | MEDIUM |
| Overlapping memcpy (UB) | **1** | CRITICAL |

### So Sánh Với Audit Trước

| Audit 2026-05-18 | Audit 2026-07-22 | Delta |
|------------------|------------------|-------|
| God functions: không có số liệu | **26 god functions** | ⟵ New |
| Nesting depth 7: 1 file | Nesting depth 7: 2 files | ⟵ Worse |
| Dead code: 22 functions | Dead code: 5 new findings | ⟵ Worse |
| Forward decls: 21 | Forward decls: 26 | ⟵ Worse |
| Global state: 6 files analyzed | Global state: 10 files | ⟵ Worse |
| Overlapping memcpy: not found | **Buffer aliasing UB** | ⟵ New critical |
| Thread safety: not analyzed | **11 files with races** | ⟵ New critical |
| Duplicate code: not analyzed | **19 duplicate patterns** | ⟵ New |
| Boilerplate: ~100 lines | **~1,105 lines** | ⟵ Worse |

### Điểm số: 2.5/10 (giảm từ 3/10 của audit gần nhất)

### Priority Actions

1. **P0 — Fix overlapping memcpy UB** trong `mqtt_session.c:95-103`
2. **P0 — Add mutex to modem_gnss.c** (21 globals, zero locks)
3. **P0 — Add atomic/critical section to mqtt_urc_parser.c** (ISR+main race)
4. **P1 — Split 5 worst god functions** (refresh_telemetry 235L, imu_init 157L, data_formatter_add_diagnostics 161L, app_core_bootstrap_run 152L, get_location 153L)
5. **P1 — Fix data race** trong command_handler.c L690
6. **P1 — Fix no-fix streak bug** trong modem_gnss.c L841-843
7. **P1 — Add bounds check** cho 12 memcpy sites
8. **P2 — Xóa ~1,100 dòng boilerplate comments**
9. **P2 — Extract 19 duplicate code patterns vào helpers**
10. **P2 — Fix 7 naming violations** (state_led_control.c, ble_init.c, config_store_nvs.c)
11. **P3 — Kconfig defaults an toàn hơn** (device ID, auth token, TLS verify)
12. **P3 — Shared constant** cho 60000 thay vì 4 bản sao
