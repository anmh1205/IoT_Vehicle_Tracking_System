# Sub-Phase 4A: State Machine & Integration

> **Context:** ~6KB | **Max Files:** 4 | **Est. Time:** 1-2 sessions

## Summary
Implement state machine chính (`state_machine.c`), tích hợp toàn bộ modules (BLE, modem, MQTT, power), viết `main.c` orchestrator, và full-cycle testing. Đây là phase cuối cùng, kết nối tất cả layers lại.

## Tasks
| ID     | Description                              | Files                                                    |
| ------ | ---------------------------------------- | -------------------------------------------------------- |
| FW-050 | State machine logic                      | `main/inc/app_state.h` (update), `main/src/state_machine.c` |
| FW-051 | Main.c orchestrator (app_main)           | `main/main.c`                                            |
| FW-052 | Sleep manager (deep sleep config)        | In `state_machine.c` or `power_mgr.c`                    |
| FW-053 | Full integration test                    | Manual test plan                                          |

## 1. State Machine (`state_machine.c`)

### API
```c
// Initialize state machine with config and driver handles
esp_err_t state_machine_init(const config_t *cfg);

// Run one iteration of the state machine
// Called from main loop or FreeRTOS task
app_state_t state_machine_run(app_state_t current_state);

// Get current telemetry data (aggregated from all sources)
typedef struct {
    gnss_data_t  gnss;
    float        battery_top;
    float        battery_bot;
    uint16_t     vibration;
    bool         ignition;
    int          error_code;
    int32_t      obd_rpm;
    int32_t      obd_speed;
    int32_t      obd_coolant_temp;
    int32_t      obd_fuel_level;
    int32_t      obd_engine_load;
} telemetry_t;

telemetry_t state_machine_get_telemetry(void);
```

### State Transition Logic

```
app_main()
├── nvs_init() + config_load()
├── gpio_init() + adc_init()
├── Read rtc_ctx
│
├── Wake reason:
│   ├── POWERON/RESET -> INIT
│   ├── TIMER        -> HEARTBEAT
│   └── EXT0 (IMU)   -> ALARM
│
└── State Machine Loop:
    ├── INIT
    │   ├── Init all peripherals (ADC, IMU, power_mgr)
    │   ├── power_select_battery()
    │   └── -> CHECK_IGN
    │
    ├── CHECK_IGN
    │   ├── Try BLE OBD2 connect -> read RPM
    │   │   ├── RPM > 0 -> ignition = true
    │   │   └── Connect fail (3x) -> fallback
    │   ├── Fallback: U_batt > 13V -> ignition = true
    │   └── ignition ? DRIVING : PARKED
    │
    ├── DRIVING
    │   ├── BLE active + OBD2 polling (200ms cycle)
    │   ├── Modem LTE + GNSS ON
    │   ├── MQTT connect + publish rawdata (tracking_interval_s)
    │   ├── Charger ON
    │   ├── Monitor IGN continuously
    │   └── IGN OFF -> publish "stopped" status -> PARKED
    │
    ├── PARKED
    │   ├── BLE disconnect + ble_stack_deinit()
    │   ├── Publish "stopped" status (QoS 1)
    │   ├── Modem sleep, GNSS off
    │   ├── Charger OFF
    │   ├── Configure IMU motion interrupt
    │   ├── Configure timer wakeup (heartbeat_interval_s)
    │   └── -> SLEEP
    │
    ├── ALARM
    │   ├── Modem LTE + GNSS ON
    │   ├── Publish event "motion_detected" (QoS 1)
    │   ├── Track continuously (5s interval)
    │   ├── Check IGN: if ON -> DRIVING
    │   ├── Motion stopped (no IMU trigger for 60s) -> PARKED
    │   └── Timeout 5 minutes -> PARKED
    │
    ├── HEARTBEAT
    │   ├── Modem ON, wait GNSS fix (timeout 60s)
    │   ├── Read battery, IMU
    │   ├── Publish 1x rawdata
    │   ├── Check for pending commands
    │   ├── Modem OFF
    │   └── -> SLEEP
    │
    └── SLEEP
        ├── Save rtc_ctx to RTC memory
        ├── BLE deinit (nimble_port_stop/deinit)
        ├── Modem power off
        ├── All GPIO to safe state
        ├── Configure wakeup sources:
        │   ├── EXT0: GPIO21 (IMU motion) -> will goto ALARM
        │   └── Timer: heartbeat_interval_s -> will goto HEARTBEAT
        └── esp_deep_sleep_start()
```

## 2. Main.c Orchestrator

```c
// app_main() flow:
void app_main(void)
{
    // 1. System init
    esp_log_level_set("*", ESP_LOG_INFO);
    nvs_flash_init();

    // 2. Load config from NVS
    config_t cfg;
    config_load(&cfg);

    // 3. Read RTC context (persists across deep sleep)
    // rtc_ctx is RTC_DATA_ATTR, automatically available
    rtc_ctx.boot_count++;

    // 4. Init hardware
    adc_reader_init();
    imu_init();
    power_mgr_init();

    // 5. Determine initial state from wake reason
    esp_sleep_wakeup_cause_t wakeup = esp_sleep_get_wakeup_cause();
    app_state_t state;

    switch (wakeup) {
        case ESP_SLEEP_WAKEUP_TIMER:
            state = APP_STATE_HEARTBEAT;
            break;
        case ESP_SLEEP_WAKEUP_EXT0:
            state = APP_STATE_ALARM;
            break;
        default:  // POWERON, RESET, etc.
            state = APP_STATE_INIT;
            break;
    }

    // 6. State machine init
    state_machine_init(&cfg);

    // 7. Main loop
    while (true) {
        state = state_machine_run(state);

        // SLEEP state exits via esp_deep_sleep_start()
        // Should not reach here after SLEEP
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}
```

## 3. Sleep Manager

### Deep Sleep Configuration
```c
// Wakeup sources (configured before esp_deep_sleep_start):
//
// 1. EXT0 wakeup (IMU motion interrupt)
//    esp_sleep_enable_ext0_wakeup(PIN_LIS3DH_INT, 1);  // HIGH level trigger
//
// 2. Timer wakeup (heartbeat)
//    esp_sleep_enable_timer_wakeup(heartbeat_interval_s * 1000000ULL);
//
// GPIO state before sleep:
//    - All outputs: LOW (minimize current)
//    - CHARGER_EN: LOW
//    - POWER_MUX_SEL: 1 (backup battery)
//    - MODEM_PWRKEY: LOW
//
// Expected deep sleep current: < 5 mA
// (ESP32-S3 deep sleep: ~7 uA, plus LIS3DH: ~6 uA, plus LVD circuit)
```

### RTC Context Save/Restore
```c
// Before SLEEP:
rtc_ctx.last_state = current_state;
rtc_ctx.last_heartbeat_ts = (uint32_t)(esp_timer_get_time() / 1000000);
rtc_ctx.ign_last_known = telemetry.ignition;
rtc_ctx.last_battery_v = telemetry.battery_top;
// ble_mac already saved during BLE connect

// After WAKEUP:
// rtc_ctx is automatically available (RTC_DATA_ATTR)
// Use rtc_ctx.ble_mac for direct BLE connect (skip scan)
// Use rtc_ctx.last_state for context
```

## 4. FreeRTOS Task Architecture

| Task | Stack | Priority | Purpose |
|------|-------|----------|---------|
| `main` (app_main) | 8192 | 1 | State machine loop |
| `obd_task` | 4096 | 5 | BLE OBD2 polling (Phase 2A) |
| `mqtt_task` | 4096 | 4 | MQTT event handling (internal to esp_mqtt) |
| `at_task` | 2048 | 6 | AT command UART RX (Phase 2C) |

### Inter-Task Communication
```c
// State Machine -> MQTT: xQueue for publish requests
//   telemetry_t -> data_format_rawdata() -> mqtt_publish()
//
// MQTT -> State Machine: xQueue for server commands
//   command_handler_process() -> update config / trigger action
//
// OBD Task -> State Machine: shared struct (mutex protected)
//   obd_data_t updated by obd_task, read by state machine
//
// IMU: interrupt-driven, no task needed
//   GPIO ISR sets event group bit -> state machine checks
```

## 5. Error Handling Strategy

| Error | Action | Recovery |
|-------|--------|----------|
| BLE connect fail (3x) | Fallback to U_batt for IGN | Continue without OBD2 |
| Modem init fail | Retry 3x with hard reset | Publish cached when recovered |
| GNSS no fix (60s) | Send data with lat=0, lon=0 | Try again next cycle |
| MQTT connect fail | Buffer to NVS (max 10) | Auto-reconnect by esp_mqtt |
| Low battery (<12V) | Switch to backup, send alert | Hysteresis at 12.2V |
| Stack overflow | Monitor `uxTaskGetStackHighWaterMark()` | Increase stack size |
| Watchdog | `esp_task_wdt_add()` on main task | Auto-reset if stuck |

## 6. Optimization Targets

| Metric | Target | How to Measure |
|--------|--------|----------------|
| BLE reconnect | < 3s (MAC cache) | Log timestamp diff |
| GNSS TTFF | < 15s (warm start) | Log first fix time |
| MQTT reconnect | < 5s (persistent session) | Log reconnect event |
| Deep sleep current | < 5 mA | Multimeter on battery line |
| Driving current | 250-400 mA | Multimeter average |
| Boot to first publish | < 30s (DRIVING) | Log timestamp |

## Dependencies
- ✅ Phase 1A done (config, pin_map, util)
- ✅ Phase 2A done (BLE OBD2 APIs)
- ✅ Phase 2B done (ADC, IMU, power_mgr)
- ✅ Phase 2C done (modem AT, LTE, GNSS)
- ✅ Phase 3A done (MQTT client, data formatter, command handler)

## Verification
- [ ] `idf.py build` — compiles without errors
- [ ] **INIT -> CHECK_IGN**: peripherals init OK, IGN detection works
- [ ] **DRIVING mode**: OBD2 polling + GNSS + MQTT publish at tracking_interval
- [ ] **DRIVING -> PARKED**: IGN off detected, status "stopped" published
- [ ] **PARKED -> SLEEP**: deep sleep entered, current < 5 mA
- [ ] **SLEEP -> HEARTBEAT**: timer wakeup, heartbeat published, back to sleep
- [ ] **SLEEP -> ALARM**: IMU motion wakeup, event published, tracking starts
- [ ] **ALARM -> PARKED**: motion stopped, back to sleep
- [ ] **Full cycle**: INIT->DRIVING->PARKED->SLEEP->HEARTBEAT->SLEEP (10+ minutes)
- [ ] **Data integrity**: bridge processes all rawdata without validation errors
- [ ] **Command handling**: `request_location` from server triggers immediate publish
- [ ] **Power**: measure current in each state with multimeter

## Full Spec Reference
- [00-firmware-architecture.md](../../00-firmware-architecture.md) — Section 5 (State Machine)
- [firmware-development-plan.md](../../../../design-reports/firmware-development-plan.md) — Phase 5, 6
