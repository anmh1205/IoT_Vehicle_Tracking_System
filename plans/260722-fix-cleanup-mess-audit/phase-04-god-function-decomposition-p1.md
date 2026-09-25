---
phase: "04"
title: "God Function Decomposition"
status: pending
priority: P1
effort: 10h
dependencies: [01, 02, 03]
---

# Phase 04: God Function Decomposition

## Overview
Split the 5 worst god functions (all > 150 lines) and reduce 26 → ≤10 functions over 80 lines.

## Tier S: 5 Godzilla Functions (> 150 lines)

| Function | File | Lines | Split into |
|----------|------|-------|------------|
| `state_machine_refresh_telemetry` | state_wake_prelude.c | **235** | poll_adc, poll_obd, poll_gnss, resolve_ignition, log_diag |
| `data_formatter_add_diagnostics` | data_formatter.c | **161** | add_channel_status, add_signal_quality, add_event_state, add_gnss_diag, add_readiness_monitors |
| `imu_init` | imu_lis3dsh.c | **157** | imu_detect_chip, imu_probe_address, imu_configure_lis3dh, imu_configure_lis3dsh, imu_configure_interrupt |
| `app_core_bootstrap_run` | tracker-app-bootstrap.c | **152** | bootstrap_init_config, bootstrap_init_peripherals, bootstrap_run_fsm |
| `modem_gnss_get_location` | modem_gnss.c | **153** | gnss_try_primary, gnss_try_fallback, gnss_parse_and_store, gnss_update_diagnostics |

## Implementation Steps

### 4.1 Split state_machine_refresh_telemetry

**Current:** 235 lines, 23 locals, 19 if/else branches, 21 adapter calls, 6 `util_uptime_ms()`.

**Split into:**
```c
static void poll_adc_and_update(telemetry_t *t, uint64_t now_ms);     // ~20 lines
static void poll_imu_if_available(telemetry_t *t, uint64_t now_ms);    // ~15 lines
static void poll_obd_if_available(telemetry_t *t, uint64_t now_ms);    // ~30 lines
static void poll_gnss_if_ready(telemetry_t *t, uint64_t now_ms);       // ~20 lines
static ignition_fusion_result_t resolve_ignition(const telemetry_t *t, uint64_t now_ms); // ~40 lines
static void log_hw_diagnostics(const telemetry_t *t);                   // ~15 lines
```

**Main function becomes:**
```c
static void state_machine_refresh_telemetry(void) {
    uint64_t now_ms = util_uptime_ms();  // Single source of truth
    poll_adc_and_update(&s_telemetry, now_ms);
    poll_imu_if_available(&s_telemetry, now_ms);
    poll_obd_if_available(&s_telemetry, now_ms);
    poll_gnss_if_ready(&s_telemetry, now_ms);
    ignition_fusion_result_t ign = resolve_ignition(&s_telemetry, now_ms);
    s_telemetry.ignition = ign.on;
    log_hw_diagnostics(&s_telemetry);
}
```

### 4.2 Split data_formatter_add_diagnostics

**Current:** 161 lines, 32 cJSON calls, ~50 hardcoded strings.

**Split into per-subobject builders:**
```c
static cJSON *build_channel_status_json(const telemetry_t *tel);     // ~20 lines
static cJSON *build_signal_quality_json(const telemetry_t *tel);     // ~25 lines
static cJSON *build_event_state_json(const telemetry_t *tel);        // ~15 lines
static cJSON *build_gnss_diag_json(const telemetry_t *tel);          // ~20 lines
static cJSON *build_readiness_monitors_json(const telemetry_t *tel); // ~25 lines
```

### 4.3 Split imu_init

**Current:** 157 lines — device probe (4 addresses × 2 speeds × 2 variants) + interrupt config.

**Split:**
```c
static esp_err_t imu_detect_chip(uint8_t *who_am_i);                 // ~30 lines
static esp_err_t imu_configure_for_lis3dh(void);                     // ~25 lines
static esp_err_t imu_configure_for_lis3dsh(void);                    // ~25 lines
static esp_err_t imu_configure_motion_interrupt(bool is_lis3dsh);    // ~30 lines
```

### 4.4 Split app_core_bootstrap_run

**Current:** 152 lines, 10 responsibilities in 1 function.

**Split:**
```c
static esp_err_t bootstrap_validate_config(void);                    // ~15 lines
static esp_err_t bootstrap_init_config_stores(void);                 // ~25 lines
static esp_err_t bootstrap_init_peripherals(void);                   // ~30 lines
static esp_err_t bootstrap_apply_ota_recovery(void);                 // ~20 lines
static void bootstrap_run_fsm_loop(void);                            // ~50 lines
```

### 4.5 Split modem_gnss_get_location

**Current:** 153 lines — primary query, fallback, self-heal, backoff, logging.

**Split:**
```c
static esp_err_t gnss_query_primary(gnss_data_t *data);             // ~30 lines
static esp_err_t gnss_query_cgpsinfo_fallback(gnss_data_t *data);   // ~25 lines
static esp_err_t gnss_self_heal(void);                               // ~20 lines
static void gnss_apply_backoff_and_streak(void);                     // ~20 lines
static void gnss_log_diagnostics(const gnss_data_t *data);           // ~15 lines
```

### 4.6 Split remaining 21 god functions (80-100 lines)

These are smaller and can be addressed per-file:

**state_sleep_controller.c (3 functions > 80L):**
- `state_machine_shutdown_for_sleep` (90L) → extract `shutdown_modem()`, `shutdown_ble()`, `prepare_sleep()`
- `state_machine_enter_light_sleep_for_interval_us` (82L) → extract `wait_for_interrupt()`, `enter_sleep()`, `post_sleep_cleanup()`
- `state_machine_enter_usb_guarded_sleep` (81L) → extract `wait_for_usb_disconnect()`

**modem_gnss.c (2 more > 80L):**
- `modem_gnss_send_cgpsinfo_and_parse` (106L) → extract `send_cgpsinfo()`, `parse_cgpsinfo()`, `validate_gnss_data()`
- `modem_gnss_send_and_parse` (95L) → extract `send_query()`, `parse_and_validate()`

**offline_queue.c:**
- `offline_queue_replay_tick` (93L) → extract `replay_next_record()`, `log_replay_status()`

**command_handler.c:**
- `command_handler_process` (100L) → use dispatch table instead of 7-branch if/else

## Success Criteria
- [ ] `state_machine_refresh_telemetry` ≤ 50 lines (from 235)
- [ ] `data_formatter_add_diagnostics` ≤ 50 lines (from 161)
- [ ] `imu_init` ≤ 40 lines (from 157)
- [ ] `app_core_bootstrap_run` ≤ 55 lines (from 152)
- [ ] `modem_gnss_get_location` ≤ 50 lines (from 153)
- [ ] Total god functions > 80 lines ≤ 10 (from 26)
- [ ] Build pass
