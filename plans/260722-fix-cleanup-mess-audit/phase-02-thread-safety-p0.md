---
phase: "02"
title: "Thread Safety P0 Fixes"
status: pending
priority: P0
effort: 6h
dependencies: []
---

# Phase 02: Thread Safety P0

## Overview
Fix all critical data races: 11 files with unprotected shared globals. Add mutexes, atomic access, or critical sections.

## Requirements
- Zero unprotected shared globals in adapter layer
- ISR-safe URC parsing
- Thread-safe GNSS state

## Related Code Files
- Modify: `components/adapter-modem-sim7600-at/src/modem_gnss.c`
- Modify: `components/adapter-mqtt-sim7600-at/src/mqtt_urc_parser.c`
- Modify: `components/adapter-mqtt-sim7600-at/src/mqtt_session.c`
- Modify: `components/domain-connectivity/src/command_handler.c`
- Modify: `components/domain-storage/src/offline_queue.c`
- Modify: `components/domain-storage/src/sd_log_store.c`
- Modify: `components/domain-connectivity/src/session_mgr.c`
- Modify: `components/domain-ota/src/util_ota_http.c`
- Modify: `components/adapter-ble-obd-nimble/src/ble_obd.c`
- Modify: `components/adapter-ble-obd-nimble/src/ble_mgr.c`

## Implementation Steps

### 2.1 Fix modem_gnss.c — 21 globals, zero locks (P0)

**Problem:** `modem_gnss_get_location` runs from FSM loop + diagnostic task. All 21 globals are unprotected.

**Fix:** Add a global mutex protecting ALL shared state:
```c
// modem_gnss.c
static SemaphoreHandle_t s_gnss_mutex;

// In modem_gnss_init():
s_gnss_mutex = xSemaphoreCreateMutex();
assert(s_gnss_mutex);

// Lock ALL public functions:
esp_err_t modem_gnss_get_location(gnss_data_t *data) {
    if (!xSemaphoreTake(s_gnss_mutex, GNSS_LOCK_TIMEOUT_MS)) {
        return ESP_ERR_TIMEOUT;
    }
    // ... existing logic ...
    xSemaphoreGive(s_gnss_mutex);
}
```

**Lock scope:** All 6 public functions + any internal function that writes shared state.

### 2.2 Fix mqtt_urc_parser.c — ISR+main race (P0)

**Problem:** `s_rx_ctx` written from URC callback (ISR context) and read from synchronous polling. TOCTOU race.

**Fix:** Use `portMUX_TYPE` (ESP-IDF spinlock for ISR):
```c
// mqtt_urc_parser.c
static portMUX_TYPE s_rx_mux = portMUX_INITIALIZER_UNLOCKED;

// ISR context:
portENTER_CRITICAL_ISR(&s_rx_mux);
// write to s_rx_ctx
portEXIT_CRITICAL_ISR(&s_rx_mux);

// Task context:
portENTER_CRITICAL(&s_rx_mux);
// read from s_rx_ctx
portEXIT_CRITICAL(&s_rx_mux);
```

### 2.3 Fix command_handler.c — s_dropped_command_count race

**Problem:** L690 writes `s_dropped_command_count++` without lock. Other threads read it.

**Fix:** Use `atomic` or mutex:
```c
// Option A: atomic (preferred)
#include <stdatomic.h>
static atomic_uint s_dropped_command_count;

// All reads/writes use atomic_xxx functions

// Option B: mutex (consistent with existing s_lock)
uint32_t count;
xSemaphoreTake(s_lock, portMAX_DELAY);
s_dropped_command_count++;
count = s_dropped_command_count;
xSemaphoreGive(s_lock);
```

### 2.4 Fix sd_log_store.c — singleton s_ctx, zero locks

**Problem:** `s_ctx` singleton accessed from multiple tasks (logging, replay, GC). No mutex.

**Fix:** Add `SemaphoreHandle_t s_log_mutex`. Lock all public functions:
- `sd_log_store_append`
- `sd_log_store_replay`
- `sd_log_store_gc`
- `sd_log_store_mount`
- `sd_log_store_unmount`

### 2.5 Fix offline_queue.c — singleton s_ctx, zero locks

**Problem:** Same as sd_log_store — singleton context, multiple callers.

**Fix:** Add mutex, lock all 5 public functions.

### 2.6 Fix session_mgr.c — s_ctx singleton

**Fix:** Add mutex for `s_ctx` access.

### 2.7 Fix util_ota_http.c — callback+loop race

**Problem:** `s_ota_http_action` shared between HTTP event callback and main loop.

**Fix:** Add mutex or use `ATOMIC_INT` for action state.

### 2.8 Fix ble_obd.c + ble_mgr.c — existing mutex gaps

**ble_obd.c:** `s_obd_chars`, `s_preferred_addr` not under lock — add to existing mutex scope.

**ble_mgr.c:** Callback reads without `s_lock_mtx` — ensure critical sections cover all shared reads.

### 2.9 Fix mqtt_session.c — 10 extern shared globals

**Problem:** 10 extern variables shared across FSM loop + MQTT session tasks. Zero locks.

**Fix:** Group into `mqtt_session_ctx_t` struct under mutex:
```c
typedef struct {
    bool connected;
    bool connecting;
    uint64_t last_connect_ms;
    uint64_t last_publish_ms;
    uint32_t publish_fail_streak;
    uint32_t session_id;
    // ...
} mqtt_session_ctx_t;

static mqtt_session_ctx_t s_mqtt_ctx;
static SemaphoreHandle_t s_mqtt_mutex;
```

## Success Criteria
- [ ] modem_gnss.c: mutex added to all 6 public functions
- [ ] mqtt_urc_parser.c: ISR-safe spinlock for s_rx_ctx
- [ ] command_handler.c: atomic/mutex for dropped_command_count
- [ ] sd_log_store.c + offline_queue.c + session_mgr.c: mutex on all public functions
- [ ] util_ota_http.c: mutex for action state
- [ ] ble_obd.c + ble_mgr.c: existing mutex scopes cover all shared state
- [ ] mqtt_session.c: context struct + mutex
- [ ] Build pass
