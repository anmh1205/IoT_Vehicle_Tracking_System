# Firmware Validation Campaign 2026-04-24

## Session
- Firmware dir: `iot-vehicle-tracking-system-firmware`
- Board / port: ESP32-S3 on `COM5`
- Raw log: `iot-vehicle-tracking-system-firmware/documents/test-logs/com5-monitor-latest.log`
- Environment: current UAT/default bench
- Worktree note: firmware OTA split files were already untracked/dirty before this loop; only additive edits were applied there

## Iteration Log
| Iteration | Build | Flash | Monitor | Scenario | Result | Evidence |
|---|---|---|---|---|---|---|
| I0 | pass | pass | stable | Baseline boot + live runtime + backend artifact `26` OTA | fail | `HTTPSSL enable rejected` then `HTTP status=702 body_len=0` |
| I1 | pass | pass | stable then unstable | Removed `AT+HTTPSSL=1`, changed `SSLCFG` syntax to quoted form, reran artifact `26` | fail | `HTTPPARA SSLCFG failed` |
| I2 | pass | pass | stable then unstable | Reverted `SSLCFG` quoting, kept `AT+HTTPSSL=1` removed, reran artifact `26` | fail | `HTTP transport status=702 (unknown_error) body_len=0` |
| I3 | n/a | n/a | unstable | Direct MQTT `ota_update` to artifact `26` with `?encoding=hex` | fail | same `HTTP transport status=702 (unknown_error)` |
| I4 | n/a | n/a | unstable | Direct MQTT `ota_update` to `https://api.thingdock.dev/health` | fail | same `HTTP transport status=702 (unknown_error)` |
| I5 | n/a | n/a | unstable | Direct MQTT `ota_update` to `https://example.com/` | transport pass | `HTTPREAD transfer mode=binary wire_len=64`, then `OTA image has invalid magic byte` |
| I6 | n/a | n/a | stable | Direct MQTT command path prove-out to real broker | pass | `request_location` and `enable_tracking` reached board on `v1/TRACKER_001/commands` |
| I7 | n/a | n/a | stable | Sleep attempt via direct MQTT `update_config` + parked flow | blocked | repeated `Sleep blocked reason=ignition_on`; code path traces to OBD live ignition |
| I8 | n/a | n/a | stable | Forced reconnect by hijacking broker client ID `TRACKER_001` | partial pass | repeated `+CMQTTCONNLOST`, reconnect attempts, command resubscribe; offline depth stayed `0` in this cadence window |
| I9 | pass | pass | stable | Added SD diag observability for offline queue link/depth/enqueue | pass | boot/runtime stable after flash; new queue markers available |
| I10 | pass | pass | unstable | Aggressive reconnect stress with `tracking_interval_s=1` | fail | disconnect during publish exposed recoverable MQTT input/publish path still emitting `E` markers |
| I11 | pass | pass | unstable | Rerun after downgrading recoverable `CMQTTTOPIC`/`CMQTTPAYLOAD`/input failures | partial fix | offline fallback now visible: `mqtt rawdata live publish failed err=ESP_FAIL fallback=offline_queue` + `OFFLINE_QUEUE: enqueue ... depth=1` |
| I12 | pass | pass | unstable | Final rerun after downgrading more recoverable MQTT logs | fail | `CMQTTSUB failed` still appears during reconnect/subscribe race after forced disconnect; clean replay recovery window not yet achieved |

## What Changed In Firmware
- `main/src/util_ota_update.c`
  stop sending undocumented `AT+HTTPSSL=1`
  log that OTA HTTPS is using URL scheme + `SSLCFG`
  log modem transport error names for `7xx` HTTPACTION results
- `main/src/util_ota_http.c`
  add mapping for SIM7600 HTTP transport error codes
- `main/inc/util_internal.h`
  export helper for HTTP transport error names
- `main/src/offline_queue.c`
  add SD diag markers for link transitions, queue watermarks, and enqueue visibility during offline fallback
- `main/src/mqtt_urc_parser.c`
  treat disconnect-during-input as recoverable warning path instead of double-reporting an `E` log
- `main/src/mqtt_publish.c`
  downgrade recoverable `CMQTTTOPIC` / `CMQTTPAYLOAD` / `CMQTTPUB` caller failures to warning path before upper-layer offline fallback
  command subscribe path still needs more work because `CMQTTSUB` race remains under forced duplicate-client disconnect

## Findings
- Local backend command API is not authoritative for this bench device.
- Proof: local `POST /api/v1/devices/TRACKER_001/command` stores `sent` locally but does not reach the board because firmware is live on external broker `mqtt.thingdock.dev`, not local `tracking-emqx`.
- Direct MQTT to `mqtts://mqtt.thingdock.dev:8883` is the correct control path for bench validation.
- Proof: direct publishes to `v1/TRACKER_001/commands` reached firmware and triggered `request_location`, `enable_tracking`, and `update_config`.
- Current sleep failure is explained by bench state, not by a firmware bypass requirement.
- Proof: code + log show `ignition_next = rpm_ignition || adc_ignition || obd_live_ignition`; current bench keeps `obd_live_ignition=1`, so sleep gates on `ignition_on`.
- Forced duplicate-client reconnect testing now proves real disconnect detection and offline enqueue on bench.
- Proof: under `tracking_interval_s=1`, log shows `mqtt rawdata live publish failed err=ESP_FAIL fallback=offline_queue` followed by `OFFLINE_QUEUE: enqueue seq=19184 ... depth=1`.
- Forced duplicate-client reconnect testing still exposes an open firmware race in reconnect/subscribe recovery.
- Proof: after reconnect attempt, log still reaches `+CMQTTSUB: 0,11` / `CMQTTSUB failed`; because that window is still unstable, replay-after-reconnect is not closed yet.
- OTA fail is no longer ambiguous.
- Current SIM7600 OTA HTTP stack can do HTTPS in general.
- Proof: `https://example.com/` reached `HTTPREAD` and failed only when ESP-IDF OTA parser saw HTML, not because HTTPS transport failed.
- Current SIM7600 OTA HTTP stack cannot complete HTTPS GET to `api.thingdock.dev` on this bench.
- Proof:
  - firmware artifact route fails
  - hex route fails
  - `/health` on same host fails
  - all three fail before readable body, always `HTTPACTION` transport `702`
- Host-side desktop checks still return `200 OK` for the same backend routes.
- Conclusion: OTA is blocked by `api.thingdock.dev` host/edge compatibility with SIM7600 HTTP(S), not by generic ESP32 OTA logic and not by binary-vs-hex response mode.

## Acceptance Matrix
| Feature group | Status | Evidence / note |
|---|---|---|
| Boot and startup stability | pass | multiple post-flash monitor windows stable: 300 s earlier session, then 120 s, 60 s in this turn |
| LTE and modem bring-up | pass (core) | live runtime stayed online across repeated windows; forced disconnect also re-enters connect path repeatedly |
| MQTT online behavior | partial | direct command path proven; forced duplicate-client reconnect still unstable because subscribe recovery hits `CMQTTSUB: 0,11` race |
| GNSS | pass (core) | repeated valid-fix logs during this turn |
| OTA | blocked | `api.thingdock.dev` HTTPS incompatible with SIM7600 HTTP(S) path on current bench |
| Sleep / wake / low-power coordination | blocked by bench state | repeated `Sleep blocked reason=ignition_on`; current OBD live ignition prevents parked sleep entry |
| IMU wake | blocked by bench state | cannot close IMU wake acceptance until bench can actually enter parked/sleep path again |
| OBD BLE | partial | BLE OBD live path is active and influences ignition; dedicated disconnect/reconnect scenario still not rerun in isolation |
| SD logging / offline queue / replay | partial | offline enqueue is now proven on real disconnect; replay-after-reconnect still not closed because reconnect/subscribe race remains unstable |

## Current Campaign Status
- Campaign is not done.
- Hard blocker remains in OTA.
- Additional firmware blocker is now identified in MQTT reconnect recovery under forced duplicate-client disconnect.
- Full checklist still not closed because:
  - OTA origin for `api.thingdock.dev` is still incompatible with SIM7600 HTTP(S)
  - current bench keeps logical ignition on via OBD live, so sleep/wake + IMU wake cannot be closed
  - offline queue replay cannot be marked pass until `CMQTTSUB` reconnect race is fixed and a clean recovery window is captured

## Recommended Next Move
1. Fix MQTT reconnect/subscribe race first.
2. Best immediate target: understand why reconnect path reaches `+CMQTTSUB: 0,11` under duplicate-client disconnect churn even after session reconnect succeeds.
3. After that fix, rerun the same `tracking_interval_s=1` broker-hijack scenario until the sequence is clean: disconnect -> enqueue -> reconnect -> subscribe -> replay -> command receive.
4. In parallel, backend/edge side still needs a SIM7600-compatible OTA origin for `api.thingdock.dev`.
5. Once MQTT reconnect recovery and OTA origin are both clean, rerun sleep / IMU / OBD / SD mixed regression on a bench condition that can actually drop ignition false.

## Unresolved Questions
- What exact `api.thingdock.dev` TLS / edge behavior trips SIM7600 into HTTP transport `702` while `example.com` works?
- Is there a SIM7600-compatible alternate OTA hostname / origin behind the backend that bypasses the current edge profile?
- Why does forced duplicate-client reconnect still reach `+CMQTTSUB: 0,11` after reconnect, and is the failure caused by modem session state lag or subscribe timing inside the current FSM wake prelude?
- After the subscribe race is fixed, will queued rawdata `seq=19184` replay cleanly on the next stable online window, or is there a second replay issue behind the same instability?
