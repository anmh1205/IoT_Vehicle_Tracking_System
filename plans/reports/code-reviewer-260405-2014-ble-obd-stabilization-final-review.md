## Code Review Summary

### Scope
- Files:
  - `/E/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/ble_obd.c`
  - `/E/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
  - `/E/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/ble_mgr.c`
- Focus: parser hex spaced/compact, semaphore-on-prompt policy, retry log throttling, BLE manager cleanup/reset.

### Findings

#### High
1. **Split-frame parsing bug can produce false OBD error callbacks**
   - File: `/E/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/ble_obd.c:233-244`
   - Impact: If a valid OBD response is fragmented across multiple BLE notifications and prompt (`>`) arrives in final chunk, parser only validates final chunk (no accumulation), causing `ctx->response_cb(-1, ...)` despite valid full-frame response.

2. **Semaphore released on `?` even without prompt, violating transaction-close policy**
   - File: `/E/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/ble_obd.c:219-224`
   - Impact: Request can be unblocked before ELM prompt boundary, re-opening race/interleaving risk the patch intended to remove.

#### Medium
1. **Mixed alphanumeric tokens may still yield accidental hex bytes**
   - File: `/E/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/ble_obd.c:157-173`
   - Impact: Tokens like status text can contribute incidental hex pairs, setting `has_hex=true` and biasing parse path toward error callback on prompt.

#### Low
- No blocking issue found in BLE manager cleanup path under reviewed scenarios.
  - File: `/E/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/ble_mgr.c:619-650`

### Positive
- Retry log throttling is intentionally bounded and avoids per-loop spam.
  - File: `/E/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/state_machine.c:309-320, 336-341`
- BLE init failure path now resets key state and deinitializes stack on sync-timeout path.
  - File: `/E/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/ble_mgr.c:613-650`

### Unresolved Questions
- None.
