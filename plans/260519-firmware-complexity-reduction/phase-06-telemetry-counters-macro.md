---
phase: "06"
title: "telemetry_counters.c Macro Generation"
status: pending
priority: P2
effort: 1h
---

# Phase 06: telemetry_counters.c Macro Generation

## Context
- Audit report: `resources/docs/firmware-complexity-audit-2026-05-18.md`
- Plan: `plans/260519-firmware-complexity-reduction/plan.md`
- Depends on: Phase 01
- Target: 220 lines → 80 lines

## Overview
telemetry_counters.c có 22 functions giống nhau, mỗi function 4-5 lines. Dùng macro để giảm repetition.

## Tasks

### 1. Replace repetitive functions with macro

**TRƯỚC** (22 functions):
```c
void telemetry_counters_inc_sd_write_ok(void) {
    telemetry_counters_inc_field(&s_counters.sd_write_ok);
}
void telemetry_counters_inc_sd_write_fail(void) {
    telemetry_counters_inc_field(&s_counters.sd_write_fail);
}
void telemetry_counters_inc_sd_fsync_fail(void) {
    telemetry_counters_inc_field(&s_counters.sd_fsync_fail);
}
// ... 19 more identical patterns
```

**SAU** (macro + 1 line per counter):
```c
/* Macro to generate increment function for a counter field */
#define TELEMETRY_COUNTER_INC(name) \
    void telemetry_counters_inc_##name(void) { \
        telemetry_counters_inc_field(&s_counters.name); \
    }

/* Counter definitions - one line each */
TELEMETRY_COUNTER_INC(sd_write_ok)
TELEMETRY_COUNTER_INC(sd_write_fail)
TELEMETRY_COUNTER_INC(sd_fsync_fail)
TELEMETRY_COUNTER_INC(replay_success)
TELEMETRY_COUNTER_INC(replay_fail)
TELEMETRY_COUNTER_INC(enqueue_total)
TELEMETRY_COUNTER_INC(publish_attempts)
TELEMETRY_COUNTER_INC(publish_success)
TELEMETRY_COUNTER_INC(publish_fail)
TELEMETRY_COUNTER_INC(obd_query_success)
TELEMETRY_COUNTER_INC(obd_query_fail)
TELEMETRY_COUNTER_INC(obd_connect_fail)
TELEMETRY_COUNTER_INC(lte_connect_attempts)
TELEMETRY_COUNTER_INC(lte_connect_success)
TELEMETRY_COUNTER_INC(lte_connect_fail)
TELEMETRY_COUNTER_INC(gnss_fix_success)
TELEMETRY_COUNTER_INC(gnss_fix_fail)
TELEMETRY_COUNTER_INC(ble_scan_success)
TELEMETRY_COUNTER_INC(ble_scan_fail)
TELEMETRY_COUNTER_INC(config_update_success)
TELEMETRY_COUNTER_INC(config_update_fail)
TELEMETRY_COUNTER_INC(health_snapshot_count)
```

### 2. Alternative: X-macro pattern (nếu muốn DRY hơn)

**telemetry_counter_fields.h** (new file):
```c
/* List of all telemetry counter fields. */
/* Format: X(field_name) */
X(sd_write_ok)
X(sd_write_fail)
X(sd_fsync_fail)
X(replay_success)
X(replay_fail)
X(enqueue_total)
X(publish_attempts)
X(publish_success)
X(publish_fail)
X(obd_query_success)
X(obd_query_fail)
X(obd_connect_fail)
X(lte_connect_attempts)
X(lte_connect_success)
X(lte_connect_fail)
X(gnss_fix_success)
X(gnss_fix_fail)
X(ble_scan_success)
X(ble_scan_fail)
X(config_update_success)
X(config_update_fail)
X(health_snapshot_count)
```

**telemetry_counters.c**:
```c
/* Generate struct fields */
#define X(name) uint32_t name;
typedef struct {
    TELEMETRY_COUNTER_FIELDS
} telemetry_counters_t;
#undef X

/* Generate increment functions */
#define TELEMETRY_COUNTER_INC(name) \
    void telemetry_counters_inc_##name(void) { \
        telemetry_counters_inc_field(&s_counters.name); \
    }

#define X(name) TELEMETRY_COUNTER_INC(name)
#include "telemetry_counter_fields.h"
#undef X
```

### 3. Update header file

**telemetry_counters.h** cần có declaration cho tất cả functions:
```c
/* Either manually declare each function, or use the same X-macro pattern */
#define X(name) void telemetry_counters_inc_##name(void);
#include "telemetry_counter_fields.h"
#undef X
```

## Success Criteria
- [ ] telemetry_counters.c <= 80 lines
- [ ] Build pass
- [ ] All counter functions still work
- [ ] No new warnings

## Risk Assessment
- Low risk: Macro generation là pattern chuẩn trong C
- Mitigation: Build và test counters sau refactor
