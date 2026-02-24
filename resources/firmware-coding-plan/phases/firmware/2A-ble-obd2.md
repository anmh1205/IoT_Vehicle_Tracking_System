# Sub-Phase 2A: BLE OBD2

> **Context:** ~6KB | **Max Files:** 10 | **Est. Time:** 1-2 sessions
> **Source:** Adapt from `resources/example/esp32-obd2-meter/`

## Summary
Adapt BLE OBD2 stack từ reference project (esp32-obd2-meter). Bao gồm BLE init, manager, OBD2 protocol layer. Thay đổi chính: thêm ELM327 init, MAC filter, disconnect API, bỏ abort(), cleanup cho deep sleep.

## Tasks
| ID     | Description                          | Files                                         | Source        |
| ------ | ------------------------------------ | --------------------------------------------- | ------------- |
| FW-010 | BLE stack init + deinit              | `main/inc/ble_init.h`, `main/src/ble_init.c`  | Copy (84 LOC) |
| FW-011 | BLE address utility                  | `main/inc/ble_util.h`, `main/src/ble_util.c`  | Copy (25 LOC) |
| FW-012 | OBD PID config types                 | `main/inc/obd.h`                              | Extract from reference `main.c` |
| FW-013 | BLE manager (scan, connect, GATT)    | `main/inc/ble_mgr.h`, `main/src/ble_mgr.c`   | Adapt (648 LOC) |
| FW-014 | BLE OBD2 protocol + ELM327 init      | `main/inc/ble_obd.h`, `main/src/ble_obd.c`   | Adapt (289 LOC) |
| FW-015 | OBD PID conversion functions         | In `main/main.c` or separate `obd_conv.c`     | Extract from reference |

## GATT Service Target (vgate iCar Pro)
```
Service UUID: 0x18f0
├── TX: 0x2af1 (write)   — send commands
└── RX: 0x2af0 (notify)  — receive responses
```

## Changes from Reference (7 items)

| # | Issue in Reference | Solution for Tracker |
|---|-------------------|---------------------|
| 1 | **No ELM327 init** | Add `ble_obd_elm327_init()`: ATZ -> ATE0 -> ATL0 -> ATS0 -> ATSP0 |
| 2 | **Filter accepts any device** | Filter by NVS MAC or device name "vgate" |
| 3 | **No disconnect API** | `ble_obd_disconnect()` -> `ble_gap_terminate()` + free resources |
| 4 | **`abort()` on NULL** | Replace with `ESP_RETURN_ON_ERROR` + log, no crash |
| 5 | **Static singleton** | Keep (NimBLE limitation) |
| 6 | **No BLE stack cleanup** | `nimble_port_stop()` + `nimble_port_deinit()` before deep sleep |
| 7 | **Simulator available** | Use `sim/adv_gatt.py` for testing without real adapter |

## Connection Strategy
```
Wake up -> Read MAC from NVS/RTC
  ├── Has MAC -> direct connect (1-3s)
  │            └── Fail? -> full scan fallback
  ├── No MAC -> scan UUID 0x18f0 (3-10s)
  │              └── Found -> save MAC -> connect
  ├── Connected -> ELM327 init -> PID polling (200ms cycle)
  └── 3x fail -> fallback: read U_batt for IGN detection
```

## OBD2 PIDs
| PID  | Name     | Bytes | Conversion       | Purpose                |
| ---- | -------- | ----- | ---------------- | ---------------------- |
| 0x0C | RPM      | 2     | (A*256+B)/4      | Detect IGN (RPM>0)     |
| 0x0D | Speed    | 1     | A km/h           | Telemetry              |
| 0x05 | Coolant  | 1     | A-40 C           | Telemetry              |
| 0x2F | Fuel     | 1     | A*100/255 %      | Telemetry              |
| 0x04 | Load     | 1     | A*100/255 %      | Telemetry              |

## Key APIs

### ble_init.h
```c
esp_err_t ble_stack_init(void);
esp_err_t ble_stack_deinit(void);  // NEW: for deep sleep
```

### ble_mgr.h
```c
// Scan and connect to OBD2 device
ble_obd_ctx_t *ble_obd_connect(ble_obd_response_cb_t cb, void *usr_ctx);
bool ble_obd_is_connected(ble_obd_ctx_t *ctx);
esp_err_t ble_obd_disconnect(ble_obd_ctx_t *ctx);  // NEW

// RXTX: send OBD request and wait for response via callback
int ble_obd_rxtx(ble_obd_ctx_t *ctx, uint8_t mode, uint8_t pid, uint32_t timeout_ms);
```

### ble_obd.h
```c
esp_err_t ble_obd_elm327_init(ble_obd_ctx_t *ctx);  // NEW: ATZ->ATE0->ATL0->ATS0->ATSP0
```

### obd.h
```c
typedef int (*obd_conv_fn_t)(int32_t *value, uint8_t const *data, size_t len);

typedef struct {
    uint8_t      pid;
    size_t       len;
    const char  *name;
    const char  *unit;
    obd_conv_fn_t conversion;
} obd_pid_cfg_t;
```

## FreeRTOS Task
```c
// obd_task: runs BLE polling in background
// Stack: 4096 bytes, Priority: 5
// Period: 200ms per PID request
// Polls all 5 PIDs in round-robin
```

## Dependencies
- ✅ Phase 1A done (pin_map.h, util.h, app_config.h)
- ⚠️ Independent from Phase 2B, 2C (can run in parallel)
- ➡️ Phase 4A (State Machine) needs BLE OBD2 APIs

## Verification
- [ ] `idf.py build` — compiles without errors
- [ ] BLE scan finds vgate iCar Pro (or `sim/adv_gatt.py` simulator)
- [ ] ELM327 init sequence completes: ATZ -> ATE0 -> ATL0 -> ATS0 -> ATSP0
- [ ] PID polling returns valid RPM, Speed values
- [ ] `ble_obd_disconnect()` cleanly disconnects without crash
- [ ] `ble_stack_deinit()` runs without memory leak (check heap)

## Full Spec Reference
- [00-firmware-architecture.md](../../00-firmware-architecture.md) — Section 11 (OBD2 PIDs)
- [firmware-development-plan.md](../../../../design-reports/firmware-development-plan.md) — Phase 2
- [esp32-obd2-meter/main/](../../../../example/esp32-obd2-meter/main/) — Reference source code
