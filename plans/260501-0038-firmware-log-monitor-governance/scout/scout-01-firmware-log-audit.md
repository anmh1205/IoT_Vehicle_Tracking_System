# Firmware Log Audit — Log Monitor Governance

**Scope:** `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware`  
**Focus:** logging patterns, hotspots, spam risks, observability gaps, candidate modules for governance changes

## 1) Executive summary
- Firmware logging is already fairly structured: most runtime flow uses `ESP_LOGI/W` with key-value-ish fields.
- The biggest spam risks are:
  - state-machine heartbeat / sleep / wake transitions
  - LTE modem FSM polling/retry paths
  - offline queue enqueue/replay/mount retry paths
  - BLE OBD scan/transaction diagnostics
- Observability is missing in a few important places: OTA HTTP flow, publish pipeline outcome attribution, and some aggregate counters for state/retry behavior.

## 2) Current logging patterns

### `components/app-core/src/state_machine_core.c`
- Strong lifecycle logs at INFO:
  - boot metadata init
  - runtime config dump
  - RTC health
  - LED init
  - sleep accepted
- WARN used for policy blocks:
  - OTA blocked
  - sleep blocked
  - IMU wake disabled
  - stale OBD / heartbeat fallback conditions
- Several logs are already rate-limited by time windows, which is good.

### `components/adapter-modem-sim7600-at/src/modem_lte_fsm.c`
- FSM transitions logged at INFO.
- Modem bring-up failures logged at WARN.
- Retry/diagnostic polling logs are periodic, but can still become noisy during poor network or SIM faults.
- Good use of state-specific messages, but many repeated “not ready / waiting / timeout” messages are still human-readable spam candidates.

### `components/domain-storage/src/offline_queue.c`
- Uses INFO/WARN heavily when SD logging or replay is active.
- Enqueue and replay logs include sequence, type, criticality, online/offline, and storage metadata.
- Diagnostic build flags can make this very chatty:
  - enqueue logs
  - link transition logs
  - mount retry logs
  - replay success/failure logs
- This is the clearest hotspot for log volume under network/SD instability.

### `components/adapter-ble-obd-nimble/src/ble_obd.c`
- INFO logs on adapter discovery and connection path.
- WARN logs for invalid OBD responses, but only periodically after thresholds.
- DEBUG periodic diagnostics exist, which is good.
- Spam risk is moderate-to-high during scan/connection churn and malformed ELM327 responses.

### `components/app-core/src/state_publish_pipeline.c`
- Logs every publish with metadata (`mid`, `seq`, `boot`, `ts`).
- Logs fallback from live MQTT to offline queue.
- Useful, but can be repetitive for high-frequency rawdata and status publishes.

### `components/adapter-mqtt-sim7600-at/src/mqtt_publish.c`
- Mostly thin error logging:
  - publish topic/payload validation
  - CMQTTTOPIC / CMQTTPAYLOAD / CMQTTPUB failures
  - subscription success
- Good for errors, but lacks richer observability for publish latency, retry reason, and topic-level success rates.

### `components/domain-ota/src/util_ota_http.c`
- Almost no runtime logs around HTTP action lifecycle.
- This is an observability gap for OTA download failures, URC handling, status-code mapping, and timeout diagnosis.

### `components/platform-hal-esp-idf/src/tracker-runtime-ports.c`
- Single validation INFO log.
- Low volume; low risk.

## 3) Hot spots and spam risks
1. **Heartbeat / state machine loops**
   - `state_machine_core.c` can emit repeated status/warning logs during wake/heartbeat/sleep oscillation.
2. **LTE modem bring-up**
   - `modem_lte_fsm.c` polls and retries across many states; repeated warnings during RDY/AT/CPIN/CEREG issues are likely noisy.
3. **Offline queue replay**
   - `offline_queue.c` is the biggest likely log flood source during connectivity loss + SD instability.
4. **BLE OBD transaction churn**
   - `ble_obd.c` can emit logs per candidate device and per invalid response burst.
5. **Publish pipeline**
   - `state_publish_pipeline.c` logs every payload metadata path; high-frequency rawdata can overwhelm UART logs.

## 4) Missing observability points
- **OTA HTTP flow**
  - No clear logs for HTTP action wait, URC result, status-code classification, or failure reason.
- **MQTT publish outcome**
  - Need per-topic success/failure counters and latency/retry attribution.
- **Offline queue health**
  - Depth/quota/replay lag are only partially visible and often behind diag flags.
- **Modem recovery metrics**
  - Recovery attempts, backoff progression, and state dwell time are not surfaced clearly.
- **BLE OBD quality metrics**
  - Need counts for timeout, invalid payload class, scan rejection reasons, and connection success/failure by adapter type.
- **State transition reasons**
  - Current logs show what state changed, but often not the policy reason that caused it.

## 5) Files/modules likely needing governance changes
Priority candidates:
1. `components/domain-storage/src/offline_queue.c`
2. `components/adapter-modem-sim7600-at/src/modem_lte_fsm.c`
3. `components/app-core/src/state_machine_core.c`
4. `components/app-core/src/state_publish_pipeline.c`
5. `components/adapter-ble-obd-nimble/src/ble_obd.c`
6. `components/domain-ota/src/util_ota_http.c`
7. `components/adapter-mqtt-sim7600-at/src/mqtt_publish.c`

## 6) Recommended governance direction
- Demote repetitive success-path logs to DEBUG where possible.
- Keep WARN/ERROR for policy blocks, protocol failures, and state changes that need operator action.
- Add rate limiting or “log on change” semantics to polling loops.
- Prefer structured fields (`reason=`, `state=`, `seq=`, `topic=`, `err=`) over prose-only messages.
- Add counters/metrics for repeated conditions so INFO logs can be reduced safely.

## 7) Open questions
- Which logs must remain visible on UART in production?
- Should `CONFIG_TRACKER_SD_DIAG_ENABLE` stay off by default in release builds?
- What is the target log budget during modem recovery and offline replay?
- Do we want topic-level publish metrics exported only in diagnostics, or always on?
