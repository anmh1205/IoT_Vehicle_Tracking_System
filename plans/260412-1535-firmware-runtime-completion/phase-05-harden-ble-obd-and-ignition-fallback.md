# Phase 05 â€” Harden BLE OBD and ignition fallback

## Context links
- Research: `./research/researcher-02-hardware-targets.md`
- Plan: `./plan.md`
- Key code: `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`, `iot-vehicle-tracking-system-firmware/main/src/ble_mgr.c`, `iot-vehicle-tracking-system-firmware/main/src/ble_obd.c`, `iot-vehicle-tracking-system-firmware/main/src/adc_reader.c`

## Overview
- Priority: P2
- Current status: completed
- Brief description: make runtime tolerant of missing/slow external OBD adapter and preserve ignition inference when BLE OBD is unavailable.

## Key Insights
- BLE OBD depends on external vgate-class adapter and vehicle support; absence is normal, not exceptional.
- Current FSM already treats BLE connectivity as ignition-related input, but fallback behavior is not proven.
- Research requires diagnostics counters and ADC-based fallback instead of assuming permanent BLE availability.

## Requirements
- Functional: device must continue core tracking when BLE OBD is absent, delayed, unsupported, or disconnected.
- Functional: ignition inference must fall back to ADC/other existing board signal when BLE cannot prove ignition.
- Non-functional: keep BLE retries bounded so they do not starve LTE/GNSS/MQTT runtime.
- <!-- Updated: Validation Session 1 - ADC fallback is mandatory --> ADC ignition fallback is mandatory scope in this phase, not optional observation work.

## Architecture
- Separate three concerns: BLE transport health, OBD PID usefulness, ignition truth source.
- Use BLE OBD as preferred enrichment source, not single point of truth for sleep/driving policy.
- Keep fallback simple: if BLE unavailable, use validated board-side ignition heuristic already supported by hardware/runtime.

## Related code files
- Modify: `main/src/state_machine.c`
- Modify: `main/src/ble_obd.c`
- Modify: `main/src/ble_mgr.c`
- Modify: `main/src/adc_reader.c`
- Review: `main/inc/app_state.h`
- Create: none
- Delete: none

## Implementation Steps
1. Define ignition source precedence: BLE OBD proof, ADC fallback, last-known state only if explicitly bounded.
2. Audit BLE connect/retry behavior so long scans/connect attempts do not block 1 s driving loop.
3. Add adapter absence and repeated failure counters for field triage.
4. Keep OBD PID polling opportunistic; do not let slow PID round-trips delay publish cadence.
5. Implement/finish ADC ignition fallback path if partially present; tune only enough for real board behavior.
6. Validate across multiple sessions: adapter present, adapter absent, disconnect during drive, unsupported vehicle.

## Todo list
- [ ] Freeze ignition source precedence.
- [ ] Bound BLE retry impact on runtime loop.
- [ ] Add BLE/OBD diagnostics counters.
- [ ] Validate ADC fallback behavior.
- [ ] Field-test adapter absence and reconnect cases.

## Success Criteria
- Device continues 1 s driving telemetry without BLE adapter.
- Sleep/driving decision does not depend solely on BLE connection state.
- BLE reconnect issues are visible via counters/logs and do not collapse the main runtime loop.

## Risk Assessment
- ADC fallback may be noisy or board-specific.
- BLE scans/connects can monopolize time budget and degrade modem servicing.
- Vehicle/PID variability may look like firmware bug without diagnostics separation.

## Security Considerations
- BLE address preference and pairing flow must not accept arbitrary devices without intended filtering.
- Fallback logic must avoid spoofable transient states causing false driving/sleep transitions.
- Diagnostic data should not leak secrets; keep it operational only.

## Next steps
- Feed stable runtime and fallback behavior into OTA safety gating in Phase 06.

## Unresolved questions
- Is ADC-based ignition fallback already implemented but unused, or still missing critical logic?
- What minimum BLE health metrics are needed for field support without overcomplicating telemetry?

