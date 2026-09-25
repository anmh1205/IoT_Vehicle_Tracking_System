---
phase: "07"
title: "Naming Violations & Forward Declarations"
status: pending
priority: P2
effort: 4h
dependencies: []
---

# Phase 07: Naming Violations & Forward Declarations

## Overview
Fix 7 naming violations (missing module prefix) and remove 26 unnecessary forward declarations.

## Requirements
- All functions follow `module_action` naming convention
- Zero unnecessary forward declarations

## Related Code Files
- Modify: `components/app-core/src/state_led_control.c`
- Modify: `components/adapter-ble-obd-nimble/src/ble_init.c`
- Modify: `components/shared-kernel/src/config_store_nvs.c`
- Modify: `components/adapter-ble-obd-nimble/src/ble_obd.c`
- Modify: `components/adapter-ble-obd-nimble/src/ble_mgr.c`
- Modify: `components/app-core/src/state_sleep_controller.c`
- Modify: `components/adapter-modem-sim7600-at/src/modem_at.c`
- Modify: `components/adapter-mqtt-sim7600-at/src/mqtt_session.c`

## Implementation Steps

### 7.1 Fix state_led_control.c naming

| Current | Fix |
|---------|-----|
| `led_pulse()` | `state_led_pulse()` |
| `led_pattern_on()` | `state_led_pattern_on()` |
| `led_drive()` | `state_led_drive()` |
| `led_ensure_initialized()` | `state_led_ensure_initialized()` |

Update all callers in `state_machine_core.c` and other files that reference these functions.

### 7.2 Fix ble_init.c naming

| Current | Fix |
|---------|-----|
| `default_reset_cb` | `ble_default_reset_cb` |

### 7.3 Fix config_store_nvs.c naming

| Current | Fix |
|---------|-----|
| `config_store_clamp_u16()` | `config_store_nvs_clamp_u16()` |
| `config_store_apply_legacy_v1()` | `config_store_nvs_apply_legacy_v1()` |

Update callers and the header declaration.

### 7.4 Fix command_handler.c prefix inconsistency

Add `command_handler_` prefix to internal functions currently using bare `command_`:
- `command_is_hex_sha256` → `command_handler_is_hex_sha256`
- `command_parse_ota_update` → `command_handler_parse_ota_update`
- `command_parse_config_update` → `command_handler_parse_config_update`
- `command_apply_update_config` → `command_handler_apply_update_config`

### 7.5 Remove forward declarations from ble_obd.c (15 → 0)

Reorder functions so helpers are defined before their first caller:
1. Move all static helper functions to top of file
2. Move public API functions to bottom
3. Remove the 15 forward declarations (lines 123-137)

### 7.6 Remove forward declarations from ble_mgr.c (7 → 0)

Same approach: reorder functions to eliminate all 7 forward declarations.

### 7.7 Remove forward declarations from remaining files

- `state_sleep_controller.c`: 2 → 0
- `modem_at.c`: 1 → 0
- `mqtt_session.c`: 1 → 0

### 7.8 Fix misleading names

| Current | Problem | Fix |
|---------|---------|-----|
| `ble_mgr_queue_send` | Uses `xQueueOverwrite`, not `xQueueSend` | `ble_mgr_queue_overwrite` |
| `s_ble_ctx` (extern) | `s_` means static, but variable is extern | `g_ble_ctx` |
| `tracker_mqtt_query_disconnect_state` | 3-line passthrough wrapper, zero value | Inline or remove |

## Success Criteria
- [ ] 0 naming violations in state_led_control.c
- [ ] ble_init.c: default_reset_cb → ble_default_reset_cb
- [ ] config_store_nvs.c: both functions renamed
- [ ] command_handler.c: consistent prefix
- [ ] 0 forward declarations in codebase
- [ ] Build pass
