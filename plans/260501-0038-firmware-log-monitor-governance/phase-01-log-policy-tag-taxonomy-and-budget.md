# Phase 01 — Log policy, tag taxonomy, and budget

## Context links

- Research: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260501-0038-firmware-log-monitor-governance/research/researcher-01-firmware-logging-best-practices.md`
- Audit: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260501-0038-firmware-log-monitor-governance/scout/scout-01-firmware-log-audit.md`
- Standards: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/code-standards.md`
- Architecture: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md`

## Overview

- Priority: P2
- Status: Complete
- Goal: define the concrete firmware-wide logging contract before touching code. Decide tags, levels, field format, forbidden fields, and per-module log budget.

## Key Insights

- ESP-IDF supports module tags and compile-time trimming via `LOG_LOCAL_LEVEL`.
- Current logs are useful but hotspots can flood during LTE faults, SD queue replay, OBD churn, and rawdata publish.
- Logging policy must protect timing-sensitive paths and serial bandwidth.
- Existing GNSS rule: separate transport failures, parse failures, no-fix streaks, fix-success streaks.
- <!-- Updated: Validation Session 1 - production chooses Broader INFO with explicit anti-spam budget. -->
- <!-- Updated: Validation Session 2 - scope is toàn firmware and deliverable includes concrete log standard. -->

## Requirements

- Functional:
  - Define stable tags: `state`, `lte`, `mqtt`, `queue`, `obd`, `ota`, `gnss`, `power` or match existing component tags where already stable.
  - Define allowed event classes: transition, fault, retry milestone, recovery start/done, health snapshot, one-time config summary.
  - Define fields: `state=`, `from=`, `to=`, `reason=`, `err=`, `retry=`, `dwell_ms=`, `topic=`, `seq=`, `depth=`, `dropped=`, `duration_ms=`.
  - Define demotion rules for repeated success logs and per-message rawdata metadata.
- Non-functional:
  - No log spam in loops >1 Hz.
  - No secrets, auth token, raw payloads, full coordinates, IMEI/IMSI by default.
  - Keep policy small enough to implement in existing files.

## Architecture

- Policy lives as a concrete developer-facing standard in the plan and later in docs, not as runtime config.
- Each module keeps its own ESP-IDF `TAG`; log statements use structured key-value text.
- Baseline log standard:

| Area | Tag target | INFO | WARN/ERROR | DEBUG/Diag |
|---|---|---|---|---|
| State/power | `state`, `power` | transition, boot config, sleep/wake decision | blocked transition, unsafe power condition | loop internals |
| LTE/GNSS | `lte`, `gnss` | recovery lifecycle, fix streak summary | transport/parse/no-fix/retry milestones | AT/protocol detail |
| MQTT/publish | `mqtt` | low-rate publish/session summary | publish failure/fallback/stage error | per-message metadata |
| Queue/storage | `queue` | depth/replay summary | data loss, corrupt record, quota/mount fail | per-record replay/enqueue |
| OBD/BLE | `obd` | connect/disconnect/quality summary | invalid response bursts/timeouts | scan candidates/raw frames |
| OTA | `ota` | stage milestones | failed stage/status/reason | HTTP protocol detail |

- Standard field order for new/changed logs: `event=... state=... reason=... err=... retry=... duration_ms=... seq=... boot_id=... job_id=... suppressed=...`.
- Budget is enforced by code-level decisions:
  - Transition logs: once per state change.
  - Fault logs: first occurrence + locally rate-limited repeats.
  - Health logs: 1-5m diagnostic/profile cadence plus threshold/boundary triggers.
  - Debug logs: compile-time/debug-build only.

## Related code files

- Modify: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/app-core/src/state_machine_core.c` — align state transition/reason log semantics.
- Modify: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/adapter-modem-sim7600-at/src/modem_lte_fsm.c` — align LTE retry/recovery log budget.
- Modify: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/domain-storage/src/offline_queue.c` — define queue/replay budget.
- Modify: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/app-core/src/state_publish_pipeline.c` — demote per-publish metadata.
- Modify: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/adapter-ble-obd-nimble/src/ble_obd.c` — define OBD scan/quality log budget.
- Modify: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/domain-ota/src/util_ota_update.c` — add OTA HTTP lifecycle events.
- Modify: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/adapter-mqtt-sim7600-at/src/mqtt_publish.c` — add publish attribution fields.
- Create: none in this phase.
- Delete: none.

## Implementation Steps

1. Draft a small table in implementation PR description or docs with columns: module, default level, event class, rate limit, forbidden fields.
2. Set release defaults conceptually:
   - INFO: Broader lifecycle/success context is allowed for state transitions, recovery start/done, OTA milestones, low-rate publish summaries, and diagnostic health snapshots.
   - WARN: policy blocks, protocol failures, retry milestones, fallback to offline queue.
   - ERROR: unrecoverable failures or data loss.
   - DEBUG: high-rate per-message metadata, per-candidate scan, raw protocol diagnostics.
3. Define initial budgets:
   - State transition: every transition, no periodic heartbeat unless changed.
   - LTE waiting/retry: first + every Nth retry or >=30s interval.
   - Offline queue: enqueue/replay summary every 30-60s or threshold, not every record in normal release.
   - MQTT publish: per failure at WARN with rate-limit by topic; success via counters/snapshot.
   - OTA: one log per stage, failures always with reason/status.
4. Confirm logs use key-value fields, avoid prose-only messages for new/changed lines.
5. Mark ambiguous production UART policy as unresolved until product decision.

## Todo list

- [x] Approve tag taxonomy and levels.
- [x] Approve forbidden-field list.
- [x] Approve initial log budgets per hotspot.
- [x] Decide what remains INFO in release build.

## Success Criteria

- Junior dev can classify any new firmware log as allowed/demote/remove.
- No planned log prints secrets/raw payloads/full coordinates.
- Hotspot budget exists before code changes.
- Policy supports ESP-IDF compile-time trimming and tag-level filtering.

## Risk Assessment

- Risk: too much demotion hides field issues. Mitigation: keep health snapshot and WARN on faults.
- Risk: inconsistent tags across modules. Mitigation: keep existing tags if stable, only standardize new ones.
- Risk: policy becomes heavy process. Mitigation: one-page table only.

## Security Considerations

- Never log auth token, MQTT credentials, OTA URL with signed query, raw cloud payload.
- Avoid full identifiers; use short boot/message IDs already used, or redact/hash if needed.
- Stable IDs such as boot/message/job IDs may be logged for traceability.
- Coordinates only as coarse validity/fix/age by default, not lat/lng.

## Next steps

- Feed policy into Phase 02 helper/counter design.
- Feed budget into Phase 03 module edits.
- Carry unresolved production level decision into implementation kickoff.
