---
phase: "05"
title: "Duplicate Code DRY"
status: pending
priority: P1
effort: 6h
dependencies: [01, 02, 03]
---

# Phase 05: Duplicate Code DRY

## Overview
Eliminate 19 duplicate code patterns by extracting shared helpers.

## Requirements
- Zero identical logic blocks
- Zero WET configuration blocks
- All extracted helpers tested

## Related Code Files
- Modify: `components/adapter-modem-sim7600-at/src/modem_gnss.c`
- Modify: `components/adapter-modem-sim7600-at/src/modem_at.c`
- Modify: `components/adapter-mqtt-sim7600-at/src/mqtt_urc_parser.c`
- Modify: `components/domain-connectivity/src/command_handler.c`
- Modify: `components/adapter-ble-obd-nimble/src/ble_mgr.c`
- Modify: `components/adapter-ble-obd-nimble/src/ble_obd.c`
- Modify: `components/app-core/src/state_ota_runtime.c`
- Modify: `components/app-core/src/state_sleep_controller.c`
- Modify: `components/app-core/src/state_wake_prelude.c`
- Modify: `components/shared-kernel/src/util_core.c`
- Modify: `components/domain-storage/src/offline_queue.c`
- Modify: `components/domain-storage/src/sd_log_store.c`
- Modify: `components/contracts-device-cloud/src/data_formatter.c`
- Modify: `components/app-core/src/state_obd_runtime.c`

## Implementation Steps

### 5.1 Extract UTC epoch calc helper (13 lines duped ×2)

**Location:** `modem_gnss.c` — same calendar→epoch conversion in 2 places.

**Fix:** Extract to `shared-kernel/include/util_time.h`:
```c
static inline uint64_t util_calendar_to_epoch_ms(int year, int month, int day,
                                                  int hour, int min, int sec, int ms) {
    // One implementation, no timezone dependency
}
```

### 5.2 Extract CSV split helper (12 lines duped ×2)

**Location:** `modem_gnss.c` — same delimiter parsing, different buffer sizes.

**Fix:** Extract `util_split_csv()` with parameterized buffer size.

### 5.3 Consolidate wait_connect / wait_publish (28 lines × 93% identical)

**Location:** `mqtt_urc_parser.c`

**Fix:** Single function with state parameter:
```c
static esp_err_t mqtt_wait_for_state(mqtt_expected_state_t target, uint64_t timeout_ms);
```

### 5.4 Consolidate parse_u32 / parse_u64 (41 lines × 95% identical)

**Location:** `command_handler.c`

**Fix:** Template macro or single function with 64-bit base:
```c
// Single u64 parse, callers cast if they need u32 (range check included)
```

### 5.5 Consolidate UUID16/32/128 loops (28 lines × 3, 100% structural)

**Location:** `ble_mgr.c`

**Fix:** Template function with UUID size parameter:
```c
static int ble_find_uuid_by_size(const ble_mgr_ctx_t *ctx, uint16_t uuid16,
                                  uint16_t service_idx, uint8_t uuid_size);
```

### 5.6 Extract error-teardown pattern ×3 in ble_mgr.c (13 × 3)

**Location:** `ble_mgr.c` — 3 cleanup sequences identical.

**Fix:** Extract `ble_cleanup_on_error()` helper.

### 5.7 Replace out_reason ×8 pattern with macro (3 lines × 8)

**Location:** `state_sleep_controller.c` — `out_reason_xxx` write + log.

**Fix:**
```c
#define SET_SLEEP_REASON(reason) do { \
    s_last_sleep_reason = (reason); \
    ESP_LOGD(TAG, "event=sleep_reason reason=%s", #reason); \
} while (0)
```

### 5.8 Consolidate GNSS cooldown ×3 (4 lines × 3)

**Location:** `state_wake_prelude.c`

**Fix:** Extract `is_gnss_in_cooldown()` helper.

### 5.9 Consolidate retry schedule ×5 (5 lines × 5)

**Location:** `state_wake_prelude.c`

**Fix:** Use `RETRY_ATTEMPT` macro from existing plan (already in retry_manager.h).

### 5.10 Consolidate hex_to_bytes ×2 in util_core.c (18 lines × 2)

**Fix:** Single function, remove duplicate.

### 5.11 Consolidate log functions ×2 in offline_queue.c (40 lines × 80%)

**Fix:** Extract `log_record_operation()` helper.

### 5.12 Consolidate recovery functions ×2 in sd_log_store.c (47 lines)

**Fix:** Extract `try_recover_card_state()` helper.

### 5.13 Consolidate data format preamble ×4 in data_formatter.c (15 lines × 4)

**Fix:** Extract `start_json_object()` helper.

### 5.14 Consolidate OBD connect fail ×2 in state_obd_runtime.c (10 lines × 2)

**Fix:** Extract `handle_obd_connect_failure()` helper.

### 5.15 Replace 7× AT+CSSLCFG blocks with loop

**Location:** `mqtt_session.c:646-702`

**Fix:**
```c
typedef struct { const char *name; const char *value; } tls_cfg_entry_t;
static const tls_cfg_entry_t TLS_CFG_ENTRIES[] = {
    {"sslversion", "4"}, {"cipher", "0xFFFF"}, /* ... */
};
for (size_t i = 0; i < COUNT; i++) {
    snprintf(cmd, sizeof(cmd), "AT+CSSLCFG=\"%s\",0,\"%s\"",
             TLS_CFG_ENTRIES[i].name, TLS_CFG_ENTRIES[i].value);
    // send + verify
}
```

### 5.16 Replace 6 retry policies with shared defaults

**Location:** `state_runtime_context.c:201-257`

**Fix:** Single `#define DEFAULT_RETRY_POLICY {...}` macro applied to all 6 states.

## Success Criteria
- [ ] 0 identical code blocks in codebase
- [ ] 7-block AT+CSSLCFG → loop
- [ ] 6 retry policies → shared macro
- [ ] Build pass
