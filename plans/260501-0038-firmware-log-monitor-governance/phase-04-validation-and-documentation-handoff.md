# Phase 04 — Validation and documentation handoff

## Context links

- Plan: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260501-0038-firmware-log-monitor-governance/plan.md`
- Phase 03 implementation scope: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260501-0038-firmware-log-monitor-governance/phase-03-apply-governance-to-firmware-hotspots.md`
- Development rules: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/code-standards.md`
- Firmware root: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware`

## Overview

- Priority: P2
- Status: Complete
- Goal: validate compile/static health, scan firmware-wide log compliance, and document logging policy after implementation. Build/static/docs handoff completed; hardware runtime scenarios remain recommended.

## Key Insights

- Firmware log changes can break compile via missing includes/CMake deps even if behavior is simple.
- Log changes can affect timing and binary size; validate size and noisy loops.
- Documentation should be updated only after real implementation is complete.
- Validation allows stable trace IDs but still forbids secrets, raw payloads, full coordinates, IMEI/IMSI, and URLs.
- <!-- Updated: Validation Session 1 - static review should allow stable IDs and block sensitive fields. -->

## Requirements

- Functional:
  - Firmware builds with ESP-IDF.
  - No syntax errors in C/CMake.
  - New/changed logs respect forbidden fields.
  - Whole firmware `ESP_LOG*` scan has no obvious policy violations left in hotspot scope.
  - High-risk flows have manual validation checklist.
- Non-functional:
  - No fake test shortcuts.
  - No production code in plan phase.
  - Docs reflect actual implementation only.

## Architecture

- Validation is layered:
  - Build validation: ESP-IDF compile/reconfigure/size.
  - Static review: grep for forbidden payload/token/coordinate logs in touched files.
  - Runtime scenario checklist: normal drive, LTE loss/recovery, offline queue replay, OBD failure, OTA failure.
  - Docs handoff: update docs/changelog after tests pass.

## Related code files

- Modify after implementation only: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/code-standards.md` — add firmware logging policy if not already covered.
- Modify after implementation only: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md` — mention firmware observability flow if materially changed.
- Modify after implementation only: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/project-changelog.md` — record logging governance change.
- Modify after implementation only: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/development-roadmap.md` — update progress if milestone changes.
- Create: none.
- Delete: none.

## Implementation Steps

1. Compile validation commands to run after code changes:
   - `cd E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware && idf.py reconfigure`
   - `cd E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware && idf.py build`
   - `cd E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware && idf.py size`
2. Static review checklist:
   - Search whole firmware components for `ESP_LOG*` and classify obvious policy violations.
   - Search touched files for `payload`, `token`, `auth`, `lat`, `lng`, `imei`, `imsi`, `url` in `ESP_LOG*` lines.
   - Allow stable IDs such as boot/message/job IDs for traceability.
   - Confirm raw payload logs are absent or behind explicit diagnostic guard with redaction.
   - Confirm repeated loops use DEBUG/rate gate/counter.
3. Runtime scenario checklist for tester/field validation:
   - Normal boot + drive: state transition logs visible, no repeated heartbeat spam.
   - MQTT connected publish: successes mostly silent/counted, no per-rawdata INFO flood.
   - MQTT/LTE loss: recovery lifecycle and queue health visible with `suppressed=` on repeats.
   - SD queue replay: summary shows depth/retry/drop/quota, not every record in release.
   - BLE OBD noisy adapter: invalid/timeout warnings rate-limited, quality counters in snapshot.
   - OTA HTTP failure: stage/status/reason visible, URL/token redacted.
4. Documentation handoff after validation:
   - Add a concise firmware logging policy to docs.
   - Update changelog with behavior, not implementation trivia.
   - Note any compile-time `LOG_LOCAL_LEVEL` or diagnostic flag changes.
5. Code review handoff:
   - Ask reviewer to focus on noise, forbidden fields, timing-sensitive contexts, and over-abstraction.

## Todo list

- [x] Run `idf.py reconfigure` after implementation.
- [x] Run `idf.py build` after implementation.
- [x] Run `idf.py size` after implementation.
- [x] Review forbidden fields in `ESP_LOG*` calls.
- [ ] Execute runtime scenario checklist or simulator/bench equivalent.
- [x] Update docs/changelog after validation.
- [x] Request code review after tests pass.

## Success Criteria

- Firmware build passes.
- No new CMake/include errors.
- No secrets/raw payloads/full coordinates/IMEI/IMSI/URLs in logs; stable trace IDs allowed.
- Log volume reduced in known hotspots while preserving state/fault/recovery visibility.
- Documentation matches final code.

## Risk Assessment

- Risk: ESP-IDF not installed on runner/dev PC. Mitigation: record command output/blocker; validate in configured firmware environment.
- Risk: static search misses formatted sensitive fields. Mitigation: manual review all changed `ESP_LOG*` calls.
- Risk: runtime checklist cannot run without hardware. Mitigation: document unverified hardware scenarios and use simulator where available.

## Security Considerations

- Treat UART logs as leakable.
- Do not document examples containing real IDs/tokens/coordinates.
- If diagnostic build allows raw protocol logs, require explicit build flag and redaction note.

## Next steps

- Implementation agent follows phases 01-03.
- Tester agent runs compile/static/runtime checklist.
- Code-reviewer checks YAGNI/KISS/DRY, spam budget, security.
- Docs-manager updates docs only after validated implementation.
