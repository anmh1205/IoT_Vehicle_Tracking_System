# Phase 07 â€” Field validation and doc sync

## Context links
- Research: `./research/researcher-01-runtime-baseline.md`, `./research/researcher-02-hardware-targets.md`
- Plan: `./plan.md`
- Docs to update after proof: `docs/system-architecture.md`, `docs/codebase-summary.md`, `docs/project-changelog.md`, `docs/development-roadmap.md`

## Overview
- Priority: P1
- Current status: in_progress
- Brief description: prove runtime on real hardware, record measured limits, then sync project docs to evidence.

## Key Insights
- Research explicitly says plan must separate spec target, board-proven behavior, and unknown-until-measured items.
- Whole-device parked current, IMU wake path, ADC IGN fallback, and battery sag behavior are not yet board-proven.
- Validation on real hardware is mandatory, not optional cleanup.

## Requirements
- Functional: run acceptance tests on target ESP32-S3 tracker hardware, not simulator-only.
- Functional: capture pass/fail evidence for sleep, wake, LTE, GNSS, MQTT, BLE OBD, OTA, and power-path behavior.
- Non-functional: docs must reflect measured reality, not thesis-only claims.

## Architecture
- Use acceptance gates instead of broad â€œit worksâ€ claims.
- Maintain three evidence buckets in docs/reporting: spec target, board-proven, unknown/open.
- Keep documentation updates minimal and factual once measurements are complete.

## Related code files
- Modify after validation: `docs/system-architecture.md`
- Modify after validation: `docs/codebase-summary.md`
- Modify after validation: `docs/project-changelog.md`
- Modify after validation: `docs/development-roadmap.md`
- Review runtime logs/artifacts from firmware test sessions
- Create: none in this phase plan scope
- Delete: none

## Implementation Steps
1. Build a real-hardware validation matrix covering driving, parked, alarm wake, timer wake, OTA, BLE absence, GNSS failure, and power-loss cases.
2. Define explicit measurements: parked current, wake latency, LTE attach time, GNSS reacquisition, 1 s publish stability, 3 s alarm cadence, 120 s heartbeat cadence.
3. Run tests on at least the target board plus multiple vehicle/adapter sessions where BLE OBD matters.
4. Record failures by category: firmware logic, board wiring, modem/network, external adapter, unknown.
5. Validate timer-only parked sleep fallback separately from IMU wake proof; do not collapse them into one acceptance claim.
6. Only after evidence, update docs with board-proven behavior and remaining limits.
7. Mark unresolved hardware gaps clearly instead of hiding them behind optimistic language.

<!-- Updated: Validation Session 1 - separate timer fallback from IMU proof -->
## Todo list
- [x] Recover reliable bootloader entry for flash cycle by switching validation path to `COM6` (CP210x).
- [x] Stabilize bootloader entry on `COM6` after recent sync regression (`No serial data received` during flash).
- [x] Define acceptance matrix and instrumentation.
- [ ] Measure parked current and wake latency.
- [x] Validate LTE/GNSS/MQTT multi-cycle runtime.
- [x] Validate BLE OBD matrix and IGN fallback.
- [ ] Validate OTA success/failure paths on hardware.
- [ ] Sync docs to measured evidence.

## Latest runtime update (2026-04-13)
- MQTT AT path now passes end-to-end in field loop:
  - device runtime shows `mqtt=1` with LTE/GNSS/BLE healthy in same window
  - offline queue replay confirms broker publish success:
    - `OFFLINE_QUEUE: replay publish ok ... topic=v1/TRACKER_001/rawdata`
- Server-side verification completed via `vps-control`:
  - EMQX client `TRACKER_001` connected with `username=device`
  - EMQX trace (`trace_t53_2026-04-13.log`) captured real publish packet:
    - topic `v1/TRACKER_001/rawdata`
    - payload from `TRACKER_001` with `auth_token=TRACKER_001_Anmh1205`
- Evidence files:
  - `iot-vehicle-tracking-system-firmware/documents/test-logs/com6-monitor-session53.log`
  - `iot-vehicle-tracking-system-firmware/documents/test-logs/com6-monitor-session52.log`
  - `iot-vehicle-tracking-system-firmware/documents/test-logs/com6-monitor-session51.log`
- Remaining phase work is now narrowed to:
  - explicit parked-current / wake-latency measurements
  - OTA-path closure evidence
  - documentation sync in `/docs`.

## Success Criteria
- Acceptance gates A-F from `plan.md` are all explicitly passed or failed with evidence.
- Docs distinguish spec target vs board-proven behavior vs unknown items.
- Remaining gaps are small, concrete, and implementation-ready; no speculative redesign is introduced.

## Risk Assessment
- Hardware-only failures may block closure even if firmware logic is correct.
- Limited vehicle/adapter coverage can leave BLE conclusions too optimistic.
- Measuring only MCU current instead of whole-device current would invalidate low-power claims.

## Security Considerations
- Do not publish secrets in validation logs or screenshots.
- OTA validation should use trusted artifacts and controlled network conditions.
- Field logs should preserve device identity hygiene if shared outside the team.

## Next steps
- If all gates pass, implementation can proceed phase-by-phase under this plan.
- If gates fail, create targeted follow-up fixes instead of expanding scope.

## Unresolved questions
- What exact instruments and harness are available for current and wake-latency measurement?
- How many vehicles/adapters are realistically available for BLE OBD validation?
- Is `COM5` failure a board wiring/path issue or a temporary USB/UART bridge issue now that `COM6` is stable?

