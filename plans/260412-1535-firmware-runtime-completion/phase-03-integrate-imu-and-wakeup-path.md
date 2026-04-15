# Phase 03 â€” Integrate IMU and wakeup path

## Context links
- Research: `./research/researcher-02-hardware-targets.md`
- Plan: `./plan.md`
- Key code: `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`, `iot-vehicle-tracking-system-firmware/main/src/imu_lis3dsh.c`, `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`, `iot-vehicle-tracking-system-firmware/main/main.c`

## Overview
- Priority: P1
- Current status: completed
- Brief description: enable motion-triggered wake on target board and align alarm behavior to the approved cadence.

## Key Insights
- IMU path is currently compiled out via `TRACKER_ENABLE_IMU 0` in `state_machine.c`.
- Research says IMU scope is motion/vibration wake only; no crash detection in scope.
- Real constraint is not just driver logic; wake wiring and RTC-capable interrupt behavior must be proven on hardware.

## Requirements
- Functional: arm IMU for parked-mode motion wake and route ext0 wake to `APP_STATE_ALARM`.
- Functional: publish alarm-related raw data every 3 s while alarm state is active.
- Non-functional: keep false wake rate measurable; keep alarm exit criteria deterministic.

## Architecture
- Use IMU as wake source and motion qualifier only.
- Keep wake source handling in boot/FSM; keep sensor tuning inside IMU module.
- Distinguish three states in docs/logs: spec target, board-proven threshold, unknown-until-measured noise cases.
- <!-- Updated: Validation Session 1 - timer-only fallback before IMU proof --> If ext0 wake is not board-proven yet, allow parked sleep rollout with timer-only fallback and keep IMU wake behind explicit proof gates.

## Related code files
- Modify: `main/src/state_machine.c`
- Modify: `main/src/imu_lis3dsh.c`
- Modify: `main/inc/imu_lis3dsh.h`
- Modify: `main/inc/pin_map.h`
- Review: `main/main.c`
- Create: none
- Delete: none

## Implementation Steps
1. Verify actual target sensor naming, driver path, and wake-capable interrupt pin mapping on current PCB revision.
2. Replace compile-time-disabled IMU runtime with feature initialization driven by config/policy.
3. Define IMU bootstrap, arm, clear-interrupt, and motion-check lifecycle around sleep entry and alarm mode.
4. Change alarm publish cadence from current 5 s to approved 3 s via shared config.
5. Keep alarm exit simple: ignition on -> driving, no motion / timeout -> parked.
6. Add counters/logs for IMU init success, wake count, false wake suspicion, and alarm timeout exits.
7. Require bench and in-vehicle validation for wake trigger latency and repeatability before phase acceptance.

## Todo list
- [ ] Confirm IMU silicon and interrupt wiring on target board.
- [ ] Enable runtime IMU bootstrap path.
- [ ] Centralize alarm cadence to 3 s.
- [ ] Add wake/alarm diagnostics.
- [ ] Validate ext0 wake end-to-end on hardware.

## Success Criteria
- Motion interrupt can wake device from deep sleep on target board.
- Boot routes ext0 wake into `APP_STATE_ALARM` and publishes alarm telemetry at 3 s cadence.
- No crash-detection logic is introduced.

## Risk Assessment
- IMU interrupt may be electrically valid but not RTC-capable for deep sleep wake.
- Threshold/debounce tuning may cause false wakes or missed tamper events.
- Wrong sensor naming drift (`LIS3DH` vs `LIS3DSH`) can create implementation confusion.

## Security Considerations
- Alarm publishing must not flood MQTT due to noisy interrupt storms.
- Wake source handling must resist stale interrupt state causing repeated wake loops.
- Do not expose unsafe remote tuning of IMU thresholds unless bounded and validated.

## Next steps
- Use validated wake behavior to stabilize shared modem/GNSS/MQTT resume path in Phase 04.

## Unresolved questions
- Is the current PCB interrupt line on an RTC wake-capable GPIO for ESP32-S3 deep sleep?
- What motion threshold and latch/clear strategy are acceptable on real vehicles?

