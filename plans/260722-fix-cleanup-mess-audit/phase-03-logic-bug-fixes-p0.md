---
phase: "03"
title: "Logic Bug Fixes P0"
status: pending
priority: P0
effort: 3h
dependencies: []
---

# Phase 03: Logic Bug Fixes

## Overview
Fix 3 logic bugs causing silent data corruption and incorrect behavior.

## Requirements
- GNSS stale timestamp corruption fixed
- No-fix streak recovery works correctly
- Redundant/dead code removed or fixed

## Related Code Files
- Modify: `components/app-core/src/state_wake_prelude.c`
- Modify: `components/adapter-modem-sim7600-at/src/modem_gnss.c`
- Modify: `components/platform-board-esp32s3/src/power_mgr.c`
- Modify: `components/app-core/src/state_led_control.c`
- Modify: `components/app-core/src/state_machine_core.c`
- Modify: `components/adapter-ble-obd-nimble/src/ble_obd.c`

## Implementation Steps

### 3.1 Fix GNSS stale timestamp corruption

**File:** `state_wake_prelude.c:320-338`

**Problem:** After GNSS poll failure, the else-branch increments fail streak but does NOT clear `s_telemetry.gnss`. Then code after the if/else writes a fresh timestamp over stale position data → downstream can't distinguish "fresh fix" from "stale position with new timestamp".

**Fix:** Clear gnss data on poll failure:
```c
if (modem_gnss_get_location(&gnss) == ESP_OK) {
    s_telemetry.gnss = gnss;
    s_gnss_poll_fail_streak = 0;
} else {
    s_gnss_poll_fail_streak += 1;
    // CRITICAL: Invalidate stale data to prevent silent corruption
    s_telemetry.gnss.fix_valid = false;
    s_telemetry.gnss.timestamp_ms = 0;
}
// Remove the unprotected timestamp write (L336-339)
```

### 3.2 Fix no-fix streak reset on transport failure

**File:** `modem_gnss.c:841-843`

**Problem:** Transport failure (modem no response) resets `s_no_fix_streak = 0`. This means no-fix recovery threshold (10) never triggers when modem is intermittently unreachable.

**Fix:** Don't reset streak on transport failure:
```c
if (result != MODEM_GNSS_READ_OK) {
    // Transport failure — don't reset no_fix_streak
    // s_no_fix_streak should only be reset on successful read with fix
} else if (!fix_valid) {
    s_no_fix_streak++;
} else {
    s_no_fix_streak = 0;
}
```

### 3.3 Fix zero-soft-retry dead loop

**File:** `modem_gnss.c:27`

**Problem:** `#define MODEM_GNSS_QUERY_SOFT_RETRY_COUNT 0U` → loop runs exactly once, construct is dead code. Either remove the loop or use sensible default (e.g., 2).

**Fix:** Either remove the outer loop entirely, or set to 2 for resilience:
```c
#define MODEM_GNSS_QUERY_SOFT_RETRY_COUNT 2U
```

### 3.4 Fix now_ms variable shadowing

**File:** `state_wake_prelude.c:270,314,340`

**Problem:** `now_ms` declared 3 times in same function. Code between declarations references different `now_ms` depending on scope.

**Fix:** Single declaration at function top, reuse throughout:
```c
uint64_t now_ms = util_uptime_ms();
// Remove all subsequent uint64_t now_ms declarations
```

### 3.5 Fix redundant assignment in power_mgr.c:44-48

**Problem:** Both branches of `if (s_pwrkey_inverted_stage)` assign `raw_level = asserted ? 1 : 0` — identical.

**Fix:** Simplify:
```c
static void modem_pwrkey_drive(bool asserted) {
    bool inverted = s_pwrkey_inverted_stage;
    gpio_set_level(MODEM_PWRKEY_GPIO, inverted == asserted ? 1 : 0);
}
```

### 3.6 Fix dead store in state_led_control.c:135

**Problem:** `s_user_led_cycle_started_ms = util_uptime_ms()` — written but NEVER read.

**Fix:** Remove the assignment. If the variable is truly unused, remove it entirely. If it should be used for LED timing, add the read logic.

### 3.7 Fix useless NULL-after-free in ble_obd.c:702

**Problem:** `free(ctx); ctx = NULL;` — `ctx` is local copy, caller's pointer still dangling.

**Fix:** Remove the NULL assignment (useless), use `free()` only, and document that caller must NULL their pointer.

### 3.8 Fix mqtt_session.c:6 (void)snprintf in TLS config

**Problem:** All 6 TLS AT commands use `(void)snprintf` — truncation silently produces malformed AT commands.

**Fix:** Add truncation detection for all 6:
```c
int n = snprintf(buf, sizeof(buf), "...", ...);
if (n < 0 || (size_t)n >= sizeof(buf)) {
    ESP_LOGE(TAG, "event=tls_cmd_truncated cmd=%s", "AT+CSSLCFG");
    return ESP_ERR_INVALID_SIZE;
}
```

### 3.9 Fix stale record fallthrough in offline_queue.c

**Problem:** Lines 686-689, 699-702 — when skip fails, stale records get republished.

**Fix:** Return error from replay loop when skip fails, and don't fall through to publish logic.

## Success Criteria
- [ ] GNSS stale timestamp bug fixed
- [ ] No-fix streak not reset on transport failure
- [ ] Zero-soft-retry loop removed or set to 2
- [ ] No variable shadowing in refresh_telemetry
- [ ] power_mgr.c simplified
- [ ] Dead store removed or fixed
- [ ] NULL-after-free fixed (or at least documented)
- [ ] TLS snprintf truncation detected
- [ ] offline_queue stale record fallthrough fixed
- [ ] Build pass
