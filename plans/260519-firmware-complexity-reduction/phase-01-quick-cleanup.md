---
phase: "01"
title: "Quick Cleanup: Boilerplate, Dead Code, Forward Declarations"
status: pending
priority: P0
effort: 2h
---

# Phase 01: Quick Cleanup

## Context
- Audit report: `resources/docs/firmware-complexity-audit-2026-05-18.md`
- Plan: `plans/260519-firmware-complexity-reduction/plan.md`

## Overview
Loại bỏ code noise để tăng signal/noise ratio. Không thay đổi logic runtime.

## Tasks

### 1. Xóa boilerplate comments (~100+ lines)

Pattern cần xóa trong TẤT CẢ .c files:
```
// Keep this public facade thin and forward the real work to the focused implementation below.
// Keep this helper boundary explicit so its local policy and side effects stay predictable.
// Reset counters reset here so stale data does not leak into the next cycle.
// Validate runtime ports validate here before it can influence shared or persisted runtime state.
// Copy copy string into the destination buffer or struct while keeping bounds checks local here.
// Read read reg without widening the mutation surface of this module.
// File-local constants, retained state, and helper wiring stay private here so...
// Drive the transport or session toward a connected state while keeping retries explicit.
// Keep this public facade thin and forward the real work to the focused implementation below.
```

**Command tìm kiếm**: `rg "Keep this (public facade|helper boundary|public interface)" --type c`

### 2. Xóa unused functions

Xóa các function sau (không ai gọi, không cần cho future use):
- `modem_at_get_baud`, `modem_at_get_frame_format`, `modem_at_get_line_inverse`, `modem_at_get_pins` (modem_at.c)
- `modem_get_pwrkey_inverted_stage`, `modem_set_pwrkey_inverted_stage` (power_mgr.c)
- `modem_gnss_has_fix` (modem_gnss.c)
- `modem_lte_connect`, `modem_lte_init` (modem_lte.c)
- `modem_lte_response_preview` (modem_lte_uart_profile.c)
- `sd_log_store_set_ack_seq_critical` (sd_log_store.c)
- `state_machine_obd_recently_active` (state_machine_core.c)
- `telemetry_counters_inc_mqtt_connected`, `telemetry_counters_inc_mqtt_disconnected` (telemetry_counters.c)
- `tracker_mqtt_response_has_prompt` (mqtt_urc_parser.c)
- `util_clamp_float` (util_core.c)

Giữ lại với `__attribute__((unused))`:
- `adc_reader_deinit` (cleanup function, có thể dùng sau)
- `modem_lte_get_rssi` (diagnostic utility)

### 3. Xóa forward declarations

**ble_obd.c**: Xóa lines 123-137 (15 forward declarations), sắp xếp lại:
- Helper functions (static) lên trước
- Public API functions ở cuối

**ble_mgr.c**: Xóa 7 forward declarations, sắp xếp tương tự

**modem_at.c, mqtt_session.c, state_sleep_controller.c**: Xóa forward declarations

### 4. Fix free without NULL assignment

Sau mỗi `free(ptr)`, thêm `ptr = NULL;`:
- ble_obd.c:704
- state_obd_runtime.c:662, 844
- util_ota_update.c:651, 654

## Success Criteria
- [ ] Build pass không warning mới
- [ ] Không còn boilerplate comments
- [ ] 18 unused functions đã xử lý
- [ ] 21 forward declarations đã xóa
- [ ] 5 free() calls có NULL assignment

## Risk Assessment
- Low risk: Chỉ xóa code không dùng, không thay đổi logic
- Mitigation: Build và test sau mỗi file sửa
