---
phase: "03"
title: "state_machine_core.c Complexity Reduction"
status: pending
priority: P1
effort: 4h
---

# Phase 03: state_machine_core.c Complexity Reduction

## Context
- Audit report: `resources/docs/firmware-complexity-audit-2026-05-18.md`
- Plan: `plans/260519-firmware-complexity-reduction/plan.md`
- Depends on: Phase 01
- Target: 1332 lines → ~900, 27 includes → ~15, 18 globals → ~8

## Overview
state_machine_core.c vẫn là "mini god-file" dù đã refactor. Phase này gom global state vào struct, giảm includes, và tách các module con.

## Tasks

### 1. Tạo runtime state context struct

**TẠO MỚI**: `components/app-core/include/state_runtime_state.h`
```c
#ifndef STATE_RUNTIME_STATE_H
#define STATE_RUNTIME_STATE_H

#include <stdint.h>
#include <stdbool.h>

#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"

#include "state_machine_core.h"
#include "telemetry.h"

/**
 * @brief Consolidated runtime state for the tracker FSM.
 *
 * Replaces 18 scattered global variables with a single context struct.
 * Benefits: easier to debug, serialize, reset, and test.
 */
typedef struct {
    /* State timing */
    uint64_t state_entered_ms;
    uint64_t last_health_snapshot_log_ms;
    uint64_t ignition_off_started_ms;
    uint64_t alarm_enter_ms;
    uint64_t heartbeat_started_ms;
    uint64_t last_sleep_reject_log_ms;

    /* State flags */
    app_state_t runtime_state_hint;
    tracker_publish_status_t publish_status;
    tracker_user_led_override_t user_led_override;
    bool user_led_initialized;
    bool heartbeat_raw_published;
    bool startup_system_check_log_once;

    /* LED timing */
    uint64_t user_led_cycle_started_ms;

    /* Session tracking */
    uint32_t metadata_seq_no;
    uint32_t session_id;
    uint32_t canonical_session_id;
    bool session_restore_pending;

    /* Telemetry snapshot */
    telemetry_t telemetry;

    /* IPC */
    QueueHandle_t ble_connect_result_queue;
} tracker_runtime_state_t;

/**
 * @brief Get mutable reference to runtime state.
 * @note Only call from main FSM task (core 0).
 */
tracker_runtime_state_t *tracker_runtime_state(void);

/**
 * @brief Reset runtime state to defaults (called on boot/reinit).
 */
void tracker_runtime_state_reset(void);

#endif /* STATE_RUNTIME_STATE_H */
```

**TẠO MỚI**: `components/app-core/src/state_runtime_state.c`
```c
#include "state_runtime_state.h"
#include <string.h>
#include "esp_log.h"

static const char *TAG = "runtime_state";

static tracker_runtime_state_t s_runtime = {0};

tracker_runtime_state_t *tracker_runtime_state(void) {
    return &s_runtime;
}

void tracker_runtime_state_reset(void) {
    memset(&s_runtime, 0, sizeof(s_runtime));
    s_runtime.metadata_seq_no = 1U;
    ESP_LOGI(TAG, "Runtime state reset");
}
```

### 2. Cập nhật state_machine_core.c để dùng context struct

Thay thế tất cả global variable access:
```c
// TRƯỚC:
s_state_entered_ms = now_ms;
s_heartbeat_started_ms = util_uptime_ms();
s_runtime_state_hint = APP_STATE_DRIVING;

// SAU:
tracker_runtime_state_t *st = tracker_runtime_state();
st->state_entered_ms = now_ms;
st->heartbeat_started_ms = util_uptime_ms();
st->runtime_state_hint = APP_STATE_DRIVING;
```

Hoặc dùng macro shorthand trong state_machine_core.c:
```c
#define ST tracker_runtime_state()

// Usage:
ST->state_entered_ms = now_ms;
ST->runtime_state_hint = APP_STATE_DRIVING;
```

### 3. Giảm includes

**TRƯỚC** (27 includes trong state_machine_core.c):
```c
#include "adc_reader.h"
#include "command_handler.h"
#include "imu_lis3dsh.h"
#include "modem_lte.h"
#include "mqtt_client.h"
#include "nvs_config.h"
#include "offline_queue.h"
#include "pin_map.h"
#include "power_mgr.h"
#include "rtc_ds3231m.h"
#include "session_mgr.h"
#include "state_machine_internal.h"
#include "state_obd_runtime.h"
#include "state_ota_runtime.h"
#include "state_publish_pipeline.h"
#include "state_runtime_context.h"
#include "state_sleep_controller.h"
#include "state_wake_prelude.h"
#include "telemetry_counters.h"
#include "util.h"
```

**SAU** (~15 includes):
```c
// Core dependencies (giữ):
#include "state_machine_core.h"
#include "state_machine_internal.h"
#include "state_runtime_state.h"      /* NEW */
#include "state_runtime_context.h"
#include "state_publish_pipeline.h"
#include "state_sleep_controller.h"
#include "state_wake_prelude.h"
#include "state_obd_runtime.h"
#include "state_ota_runtime.h"
#include "command_handler.h"
#include "session_mgr.h"
#include "telemetry_counters.h"
#include "util.h"
#include "pin_map.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "esp_log.h"
```

Các driver-specific includes có thể bỏ vì:
- `adc_reader` → access qua `state_runtime_context`
- `imu_lis3dsh` → access qua `state_runtime_context`
- `modem_lte` → access qua `state_runtime_context`
- `mqtt_client` → access qua `state_publish_pipeline`
- `nvs_config` → access qua `state_runtime_context`
- `offline_queue` → access qua `state_publish_pipeline`
- `power_mgr` → access qua `state_runtime_context`
- `rtc_ds3231m` → access qua `state_runtime_context`

### 4. Tách health monitoring

**TẠO MỚI**: `components/app-core/include/state_health_monitor.h`
```c
#ifndef STATE_HEALTH_MONITOR_H
#define STATE_HEALTH_MONITOR_H

#include <stdint.h>
#include <stdbool.h>

/**
 * @brief Check if health snapshot should be logged now.
 * @param now_ms Current uptime in milliseconds.
 * @return true if interval has elapsed since last snapshot.
 */
bool state_machine_should_log_health_snapshot(uint64_t now_ms);

/**
 * @brief Log current health snapshot to ESP_LOG.
 * @param now_ms Current uptime in milliseconds.
 */
void state_machine_log_health_snapshot(uint64_t now_ms);

#endif /* STATE_HEALTH_MONITOR_H */
```

**TẠO MỚI**: `components/app-core/src/state_health_monitor.c`
```c
#include "state_health_monitor.h"
#include "state_runtime_state.h"
#include "state_machine_internal.h"
#include "telemetry_counters.h"
#include "esp_log.h"

static const char *TAG = STATE_MACHINE_TAG;

#define TRACKER_HEALTH_SNAPSHOT_INTERVAL_MS 60000ULL

bool state_machine_should_log_health_snapshot(uint64_t now_ms) {
    tracker_runtime_state_t *st = tracker_runtime_state();
    return (now_ms - st->last_health_snapshot_log_ms) >= TRACKER_HEALTH_SNAPSHOT_INTERVAL_MS;
}

void state_machine_log_health_snapshot(uint64_t now_ms) {
    tracker_runtime_state_t *st = tracker_runtime_state();
    telemetry_counters_t counters;
    telemetry_counters_get(&counters);

    ESP_LOGI(TAG,
        "Health: state=%s mqtt=%s obd=%s gnss=%s "
        "pub=%u/%u fail=%u replay=%u/%u",
        /* ... formatted output ... */
    );

    st->last_health_snapshot_log_ms = now_ms;
}
```

### 5. Tách user LED control

**TẠO MỚI**: `components/app-core/include/state_led_control.h`
```c
#ifndef STATE_LED_CONTROL_H
#define STATE_LED_CONTROL_H

#include <stdint.h>
#include <stdbool.h>
#include "state_machine_core.h"

/**
 * @brief Initialize user LED GPIO.
 */
void state_machine_init_user_led(void);

/**
 * @brief Update LED blink cycle based on current state.
 * @param now_ms Current uptime in milliseconds.
 */
void state_machine_update_user_led_cycle(uint64_t now_ms);

/**
 * @brief Override LED behavior (ON/OFF/NONE).
 */
void state_machine_set_user_led_override(tracker_user_led_override_t mode);

#endif /* STATE_LED_CONTROL_H */
```

**TẠO MỚI**: `components/app-core/src/state_led_control.c`
```c
#include "state_led_control.h"
#include "state_runtime_state.h"
#include "pin_map.h"
#include "util.h"
#include "driver/gpio.h"
#include "esp_log.h"

static const char *TAG = "led_ctrl";

/* LED state moved from state_machine_core.c globals */
static uint64_t s_led_cycle_started_ms = 0;
static tracker_user_led_override_t s_led_override = TRACKER_USER_LED_OVERRIDE_NONE;
static bool s_led_initialized = false;

void state_machine_init_user_led(void) {
    gpio_config_t led_cfg = {
        .pin_bit_mask = (1ULL << PIN_USER_LED),
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };

    esp_err_t err = gpio_config(&led_cfg);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Failed to configure user LED: %s", esp_err_to_name(err));
        return;
    }
    s_led_initialized = true;
    s_led_cycle_started_ms = util_uptime_ms();
}

/* ... implement update_user_led_cycle and set_user_led_override ... */
```

## Success Criteria
- [ ] state_machine_core.c <= 900 lines
- [ ] Includes <= 15
- [ ] Global variables <= 8 (trong state_machine_core.c)
- [ ] state_runtime_state.c/h build và hoạt động
- [ ] state_health_monitor.c/h build và hoạt động
- [ ] state_led_control.c/h build và hoạt động
- [ ] Runtime behavior không đổi (so sánh log output)

## Risk Assessment
- Medium risk: Refactor lớn, có thể phá dependencies
- Mitigation:
  - Giữ nguyên public API trong state_machine_core.h
  - Build sau mỗi file thay đổi
  - Test FSM state transitions kỹ
