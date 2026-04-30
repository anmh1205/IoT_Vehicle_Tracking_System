# Phase 02 — Local rate gates, counters, and health snapshot

## Context links

- Research: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260501-0038-firmware-log-monitor-governance/research/researcher-01-firmware-logging-best-practices.md`
- Audit: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260501-0038-firmware-log-monitor-governance/scout/scout-01-firmware-log-audit.md`
- Existing counters: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/domain-telemetry/include/telemetry_counters.h`
- Shared kernel CMake: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/shared-kernel/CMakeLists.txt`

## Overview

- Priority: P2
- Status: Pending
- Goal: add the smallest local mechanism for rate-limited logs and aggregate health snapshots. Avoid a new framework or shared helper in first pass.

## Key Insights

- ESP-IDF has no native log rate limiter; source-side gating needed.
- Existing `telemetry_counters` already tracks SD/MQTT diagnostics; extend it before creating new metric subsystem.
- Validation chose local per-module gates for first pass, not shared helper.
- Keep gates sync/non-blocking, no heap, no logging from ISR/tick/idle.
- <!-- Updated: Validation Session 1 - use local per-module gates and 1-5m diagnostic snapshots. -->

## Requirements

- Functional:
  - Provide a simple rate-gate pattern: first event logs immediately, repeats only after interval or every N occurrences.
  - Provide suppression count in next emitted log: `suppressed=N`.
  - Extend counters for MQTT publish, LTE recovery, OBD quality, OTA HTTP outcomes if needed.
  - Add low-rate health snapshot emitter at existing app-core safe point.
- Non-functional:
  - No dynamic allocation in helper.
  - No task/thread unless already required. Prefer caller-owned state structs.
  - Keep production file size manageable; modularize only if a touched C file grows too much.

## Architecture

- Chosen option: local static gates per module for first pass.
  - Each hotspot owns minimal state: `last_log_ms`, `repeat_count`, `suppressed_count` for that repeated condition.
  - Caller uses existing monotonic uptime source and logs with normal `ESP_LOG*`.
  - Pros: no new shared abstraction, easy to tune per LTE/queue/MQTT/OBD path.
  - Cons: some duplicated logic; keep it tiny and local.
- Do not create shared `log_rate_gate` helper in this implementation unless local duplication becomes clearly harmful after code review.
- Scope stays source-side gating + counters, not message formatting framework.

## Related code files

- Create: none for rate gate in first pass; use local per-module state.
- Modify only if future review reverses helper decision: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/shared-kernel/CMakeLists.txt` — not expected now.
- Modify: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/domain-telemetry/include/telemetry_counters.h` — extend counters for planned observability.
- Modify: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/domain-telemetry/src/telemetry_counters.c` — implement counter increments/get snapshot.
- Modify: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/app-core/src/state_machine_core.c` — emit health snapshot at safe periodic point.
- Modify: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/app-core/src/state_publish_pipeline.c` — update publish counters.
- Delete: none.

## Implementation Steps

1. Inspect existing `util_uptime_ms()` and confirm monotonic uptime source safe for local log gates.
2. Add local static gate state only in modules with repeated warnings:
   - Track last emitted time, repeat count, suppressed count.
   - Emit first occurrence, then interval/every-N repeat with `suppressed=N`.
   - Do not wrap ESP_LOG macros.
3. Extend `telemetry_counters_t` minimally:
   - MQTT: `mqtt_publish_ok`, `mqtt_publish_fail`, `mqtt_publish_fallback`.
   - LTE: `lte_recovery_start`, `lte_recovery_success`, `lte_recovery_fail`.
   - Queue: keep existing, add `queue_depth_high_water` only if depth already available cheaply.
   - OBD: `obd_read_ok`, `obd_timeout`, `obd_invalid_response`.
   - OTA: `ota_http_start`, `ota_http_success`, `ota_http_fail`.
4. Add counter increment helpers only where used. Avoid speculative fields.
5. Add snapshot log in app-core normal task path:
   - interval: 1-5 min when diagnostic/profile config enables it.
   - event-trigger: before deep sleep, after major recovery, or high fault burst.
   - format: `health snapshot uptime_s=... mqtt_ok=... mqtt_fail=... queue_retry=... lte_recovery=... obd_timeout=...`.
6. Keep snapshot INFO; keep detailed repeated faults WARN with rate gate.
7. Do not export logs remotely in this phase.

## Todo list

- [ ] Use local per-module gates for repeated warnings in first pass.
- [ ] Extend counters only for fields used by Phase 03.
- [ ] Add snapshot location and interval constant.
- [ ] Ensure no helper logs by itself.
- [ ] Ensure all changes compile with ESP-IDF.

## Success Criteria

- Repeated warning paths can include `suppressed=N` via local gates.
- Counters support reducing noisy per-event success logs while Broader INFO remains available for useful lifecycle/success context.
- Snapshot gives enough health state to debug MQTT/queue/LTE/OBD/OTA without raw payloads.
- No heap allocation, no background task, no ISR logging.

## Risk Assessment

- Risk: local gates duplicate logic across modules. Mitigation: keep each gate tiny; only extract helper if code review finds harmful duplication.
- Risk: counters race in multi-task paths. Mitigation: if used by multiple tasks, wrap increments with critical section or document single-writer; choose based on actual call sites.
- Risk: snapshot line too long. Mitigation: compact counters, split into two lines only if necessary.

## Security Considerations

- Snapshot must not include GPS lat/lng, auth token, raw MQTT payload, OTA URL, IMEI/IMSI.
- Error strings from modem/HTTP must be sanitized if they can contain commands or URLs.
- Stable IDs such as boot/message/job IDs may remain visible for traceability; still redact secrets, URLs, payloads, coordinates, IMEI/IMSI.

## Next steps

- Apply local gates/counters to hotspots in Phase 03.
- Validate compile and binary size in Phase 04.
- If code review finds local gates too duplicated, record a follow-up helper refactor; do not add it preemptively.
