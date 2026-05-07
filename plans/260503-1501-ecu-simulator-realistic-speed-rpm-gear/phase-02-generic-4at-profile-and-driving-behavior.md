# Context links
- Research baseline: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260503-1501-ecu-simulator-realistic-speed-rpm-gear/research/researcher-01-at-dynamics-model.md`
- Gap analysis: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260503-1501-ecu-simulator-realistic-speed-rpm-gear/research/researcher-02-current-gap-and-pid-impact.md`
- Code contract: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-ecu-simulator/ecu-simulator/src/ecu-model.h`

## Overview
- Priority: P2
- Current status: pending
- Brief description: Define one generic, configurable automatic-transmission profile and the simple behavior rules needed to make the simulator feel like a common small/mid gasoline sedan.

## Key Insights
- No specific car profile yet; generic consistency matters more than exact OEM numbers.
- A 4AT baseline is enough to look believable and easier to tune than a pseudo-modern 6AT.
- Full realism should come from linked states, hysteresis, and smoothing, not detailed torque maps.
- D-only logic is enough for first pass; full PRNDL exposure can remain internal-ready but not required on external interface now.

## Requirements
- Functional requirements:
  - Model ignition off/on and engine-running transition.
  - Model cold-start idle settle and warm-up drift toward hot idle.
  - Model brake hold, idle creep, launch, steady acceleration, upshift/downshift, kickdown, cruise, decel, and stop.
  - Keep speed, RPM, and gear linked through gear ratios, final drive surrogate, tire factor, and slip.
- Non-functional requirements:
  - All calibration should be table/constant driven for easy tuning.
  - Defaults must be generic and readable.
  - No floating-point-heavy or high-order physics needed unless unavoidable.

## Architecture
<!-- Updated: Validation Session 1 - PRND scope, ignition-off behavior, simulator-owned speed -->
- Validation Session 1 decisions:
  - Scope is full `PRND` behavior in v1.
  - `ign off` returns the simulator to parked quickly; no engine-off coasting model in v1.
  - `speed` is simulator-owned canonical state, not externally driven by default.
- Recommended canonical profile: generic 4AT small/mid gasoline sedan.
- Core config block:
  - `gear_ratios[4] = {2.85, 1.55, 1.00, 0.70}`
  - `final_drive = 4.10`
  - `tire_circumference_m = 2.00`
  - `idle_rpm_cold = 1150`, `idle_rpm_hot = 750`, `redline_rpm = 6200`
  - `shift_inhibit_ms = 800`
  - `creep_target_kph = 7`
  - `converter_slip_base/gain/decay/min/max`
  - `closed_throttle_drag_by_gear[]`
  - `warmup_rate` or `warmup_tau`
  - `upshift_table[gear][throttle_band]`, `downshift_table[gear][throttle_band]`
- State rules:
  - Ignition OFF: engine stopped, speed decays to zero within simulator-owned stop logic, fuel/MAF zero.
  - Ignition ON + cold start: RPM starts high, settles as coolant surrogate rises.
  - D + brake hold + low throttle: speed 0, RPM slightly above free idle due to converter load.
  - D + brake released + low throttle: creep raises speed toward low target.
  - Launch: throttle demand increases speed target and wheel-linked RPM, gear stays 1st until threshold.
  - Cruise: low slip above lock-like threshold, RPM nearly proportional to speed.
  - Decel: throttle near zero, drag rises, slip reduces, lower gears hold longer.
  - Stop: speed reaches 0, RPM settles near loaded idle in D or free idle in P/N.

## Related code files
- Files to modify:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-ecu-simulator/ecu-simulator/src/ecu-model.cpp`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-ecu-simulator/ecu-simulator/src/ecu-model.h`
- Files to create:
  - `.../src/powertrain-config.h`
  - `.../src/driver-input-profile.h/.cpp`
  - `.../src/transmission-model.h/.cpp`
  - Optional: `.../src/engine-model.h/.cpp`
- Files to delete:
  - None required.

## Implementation Steps
1. Add a generic config struct containing gear ratios, final drive surrogate, tire factor, idle/redline, shift tables, slip params, drag params, and warm-up params.
2. Replace coarse `drive_phase_t` buckets with a smaller set of scenario intents: ignition-off, cold-idle, brake-hold, creep, accel, cruise, decel, stop.
3. Model selector minimally as internal `P/N/D`; first implementation can keep scenario logic mostly in `D` plus ignition-off parking behavior.
4. Compute wheel-linked engine RPM from `speed`, `gear_ratio`, `final_drive`, and `tire_circumference`.
5. Add converter slip estimate as a function of throttle, speed, and mode; clamp and reduce strongly in cruise.
6. Set `rpm_target = max(idle_target_rpm, wheel_linked_rpm + slip_rpm)` in drive states; use free-rev rule in P/N.
7. Apply 1st-order smoothing to RPM and speed changes so phase edges disappear.
8. Use throttle-band shift tables with hysteresis and inhibit timer; add kickdown only when projected downshift RPM stays below safe limit.
9. Derive a lightweight speed model from scenario demand + creep + drag + brake, not full longitudinal physics.
10. Keep all constants in one profile block so later vehicle-specific tuning is additive, not structural.

## Todo list
- [ ] Lock generic 4AT default profile values.
- [ ] Confirm internal selector scope: P/N/D only for v1 realism pass.
- [ ] Confirm ignition-off behavior: immediate parking decay vs true coast not needed.
- [ ] Confirm shift schedule tables and kickdown threshold ranges.

## Success Criteria
- At fixed gear, increasing speed increases RPM predictably.
- Upshift drops RPM; downshift/kickdown raises RPM.
- Brake-hold, creep, launch, cruise, decel, and stop each have distinct believable PID signatures.
- All critical calibration points are adjustable from one config boundary.

## Risk Assessment
- Risk: generic calibration feels wrong at one scenario edge. Mitigation: centralize constants and validate with scenario table before overhauling formulas.
- Risk: using speed as simulator-owned state may still feel scripted. Mitigation: use demand + drag + smoothing, not direct phase assignment.
- Risk: adding PRNDL now expands scope. Mitigation: keep D-first, P/N internal-ready only.

## Security Considerations
- No external security change.
- Keep serial command surface limited; avoid adding runtime tuning commands in first pass.
- Avoid exposing internal debug-only state on CAN unless explicitly needed later.

## Next steps
- Phase 03 maps these behavior rules into authoritative tick ownership, snapshot derivation, and per-file refactor boundaries.
- Phase 04 validates that the chosen 4AT behavior remains stable under compile and heavy polling conditions.
