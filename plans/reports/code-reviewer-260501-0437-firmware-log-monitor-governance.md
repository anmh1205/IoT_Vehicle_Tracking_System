# Code Review: Firmware Log Monitor Governance

## Scope
- Plan: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260501-0038-firmware-log-monitor-governance/plan.md`
- Focus: ESP-IDF firmware log governance/counters/redaction hotspots.
- Validation evidence reviewed: user-reported `idf.py reconfigure build size` pass; fresh static checks here found security/policy issues below.
- Scout edge cases: raw AT response reintroduced in MQTT result errors; field-validation secrets/config persisted in `sdkconfig`; diff whitespace/CRLF risk; health snapshots only compile under field-validation profile.

## Overall Assessment
Not safe to ship as-is. Functional structure is mostly simple and build reportedly passes, but there are two release blockers: committed credential/config leakage and raw modem response logging in MQTT error paths. The implementation also leaves plan/status artifacts stale.

## Blockers

### 1. Credential committed in firmware sdkconfig
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/sdkconfig:622-628`
- `CONFIG_TRACKER_FIELD_VALIDATION_MQTT_PASSWORD="Anmh1205"` is present in tracked config, with field-validation mode enabled.
- Impact: secret disclosure; build artifact embeds credential; production/CI can accidentally run with validation profile (`KEEP_AWAKE`, username/password override).
- Fix: remove the concrete password from tracked config, rotate the exposed credential, move local credentials to untracked/local config or environment-specific provisioning. Also verify historical log files because static scan found the same credential in existing monitor logs.

### 2. MQTT AT result helper still logs raw modem response
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/adapter-mqtt-sim7600-at/src/mqtt_urc_parser.c:151`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/adapter-mqtt-sim7600-at/src/mqtt_urc_parser.c:165`
- The log format includes `raw="%s"`. Callers include MQTT lifecycle/connect/publish flows (`mqtt_session.c:55`, `mqtt_session.c:429`, `mqtt_publish.c:91`). SIM7600 responses can include echoed commands or URCs; existing test logs prove connect commands can expose server/user/password.
- Impact: violates stated redaction policy; leaks broker endpoint, username/password, topics, payload fragments, or command content during failures.
- Fix: log only prefix, parsed error code, response length, and booleans such as `parsed`/`has_prefix`; never print raw response.

## Non-blocking Concerns

### 1. `git diff --check` fails on firmware diff
- Fresh command: `git -c core.autocrlf=false diff --check -- "iot-vehicle-tracking-system-firmware"` returned exit code 2.
- Example: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/adapter-ble-obd-nimble/src/ble_obd.c:1` onward reports trailing whitespace/CRLF in the added diff.
- Impact: pre-commit/CI policy may fail even though ESP-IDF build passes.
- Fix: normalize changed firmware files line endings/whitespace before merge.

### 2. Plan/status handoff is stale
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260501-0038-firmware-log-monitor-governance/plan.md:4-25` still marks plan and phases as `pending` / `0%` despite completed implementation and validation.
- `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260501-0038-firmware-log-monitor-governance/plan.md:129-132` still lists unresolved questions that the implementation effectively answered only partly.
- Impact: governance evidence is inconsistent; future agents may repeat or misread work.
- Fix: update plan phase statuses, validation notes, and unresolved questions after blockers are fixed.

### 3. Health snapshot profile coupling should be explicit
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/app-core/src/state_machine_core.c:60`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/app-core/src/state_machine_core.c:234-270`
- Snapshot interval is hard-coded to 60s and compiled only under `CONFIG_TRACKER_FIELD_VALIDATION_MODE`. This matches dense diagnostic behavior, but creates pressure to enable field-validation mode to get health logs, which also toggles unrelated behavior and currently embeds credentials in `sdkconfig`.
- Impact: operational logging and validation overrides are coupled.
- Fix: after release blockers, consider a separate non-secret diagnostic log Kconfig or document that health snapshots are lab-only.

### 4. Counter documentation is outdated
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/domain-telemetry/include/telemetry_counters.h:5-8`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/domain-telemetry/src/telemetry_counters.c:8-11`
- Comments still describe SD queue/replay only, while counters now cover MQTT/LTE/OBD/OTA.
- Impact: minor maintainability drift.
- Fix: rename comments to runtime telemetry/log-governance counters.

## Positive Observations
- Counter implementation uses a `portMUX_TYPE` critical section and returns snapshots by value, which is simple and low-overhead for ESP32.
- GNSS logging is redacted to response length / `has_ok` / `has_fix`, avoiding coordinates.
- MQTT RX dispatch logs topic class/lengths and body length, not full topic or payload.
- Offline replay logs topic class instead of topic string.
- Build dependency additions for `domain-telemetry` are local and understandable; reported full build/size passed.

## Safe to Ship?
No. Fix blockers first: remove/rotate committed credential and remove raw MQTT AT response logging. After that, rerun ESP-IDF build plus static redaction scan and `git diff --check`.

## Metrics
- Build: user-reported pass, not rerun in this review.
- Static security scan: failed due `sdkconfig` credential and raw MQTT response logs.
- Policy scan: `git diff --check` failed.
- Test coverage: not measured.

## Unresolved Questions
- Should health snapshots be tied to a new diagnostic-only Kconfig instead of `TRACKER_FIELD_VALIDATION_MODE`?
- Should existing firmware monitor logs containing the exposed credential be purged/rotated as part of this same release hardening?
