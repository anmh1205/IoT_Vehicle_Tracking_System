# Context links
- Plan overview: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260503-1501-ecu-simulator-realistic-speed-rpm-gear/plan.md`
- Research validation scenarios: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260503-1501-ecu-simulator-realistic-speed-rpm-gear/research/researcher-02-current-gap-and-pid-impact.md`
- Build target: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-ecu-simulator/ecu-simulator/platformio.ini`

## Overview
- Priority: P2
- Current status: pending
- Brief description: Define the future implementation validation path, rollout guardrails, and trade-offs so realism improvements remain stable, measurable, and bounded in scope.

## Key Insights
- This simulator runs on Uno, so compile size and loop stability matter as much as behavior realism.
- Heavy OBD polling is a real failure mode today because read paths can tick the model.
- Validation should prove consistency, not chase perfect automotive fidelity.

## Requirements
- Functional requirements:
  - Validate ignition transitions, cold idle, launch, shifting, cruise, kickdown, decel, stop, and ignition-off behavior.
  - Validate OBD Mode 01 plus DTC modes still respond correctly.
  - Validate repeated polling does not accelerate counters or distort speed/RPM progression.
- Non-functional requirements:
  - Compile cleanly with PlatformIO for Arduino Uno.
  - Keep runtime stable under prolonged CAN polling and serial command use.
  - Keep logs concise enough for manual analysis.

## Architecture
- Validation layers:
  1. Build validation: `pio run` for `env:uno`.
  2. Manual serial control: `ign on`, `ign off`, timed force commands, status checks.
  3. CAN/OBD scenario polling: repeated requests for RPM, speed, throttle, load, MAF, fuel rate, temps, and DTC modes.
  4. Stability checks: high-frequency polling while watching monotonic counters and absence of tick-on-read behavior.
- Scenario matrix:
  <!-- Updated: Validation Session 1 - selector coverage and state-driven diagnostics -->
  - PRND selector transitions and expected idle/speed/RPM behavior.
  - Cold start idle settle.
  - Brake hold in D at zero speed.
  - Creep with brake release.
  - Light accel through 1-2-3 shifts.
  - 60-80 kph cruise stable in top gear.
  - Kickdown from cruise.
  - Closed-throttle decel to stop with downshifts.
  - Ignition off and restart.

## Related code files
- Files to modify:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-ecu-simulator/ecu-simulator/src/main.cpp`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-ecu-simulator/ecu-simulator/src/ecu-model.cpp`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-ecu-simulator/ecu-simulator/src/obd-can.cpp`
- Files to create:
  - Optional only if implementation needs helper notes under active plan, not runtime code.
- Files to delete:
  - None required.

## Implementation Steps
1. After implementation, run `pio run` in `iot-vehicle-tracking-system-ecu-simulator/ecu-simulator` and fix all compile issues before behavior tuning.
2. Verify serial ignition commands still work and no command path bypasses canonical state.
3. Poll core PIDs in fixed intervals and confirm causal relations: speed up => RPM up in same gear; upshift => RPM drop; kickdown => RPM jump.
4. Poll thermal/electrical PIDs and confirm warm-up/engine-off behavior remains coherent.
5. Poll Mode 03/07/0A and PID 0x01 repeatedly; confirm readiness, MIL, and counters remain stable under load.
6. Run a heavy polling loop and confirm simulation time advances only with `loop()` wall-clock cadence, not with request count.
7. Check long-run monotonicity for runtime, distance, MIL time/distance, and fuel level if fuel burn remains enabled.
8. If code size or file size becomes excessive, cut secondary realism features before cutting canonical state boundaries.

## Todo list
- [ ] Define manual PID polling script/checklist for future implementation pass.
- [ ] Define acceptable RPM/speed/gear sanity ranges for each scenario.
- [ ] Define compile-size and loop-stability acceptance notes.
- [ ] Define rollback rule if added realism causes unstable or contradictory PIDs.

## Success Criteria
- `pio run` passes for Uno target.
- Manual scenario checks show believable AT behavior without contradictory PID clusters.
- Heavy polling does not change state progression beyond normal tick cadence.
- Rollout remains bounded: realism-through-consistency achieved without full physics engine.

## Risk Assessment
- Risk: code size growth exceeds Uno headroom. Mitigation: prefer fixed tables, integer math where practical, and defer nonessential features.
- Risk: tuning takes too long. Mitigation: validate scenario ranges first, fine-tune later.
- Risk: secondary PIDs drift from primary powertrain state. Mitigation: keep all derived values behind snapshot builder formulas tied to canonical state.

## Security Considerations
- Keep serial and CAN interfaces deterministic; ignore unsupported inputs cleanly.
- Avoid adding runtime calibration write commands in first implementation pass.
- Preserve bounded logging to avoid denial-by-serial-noise during stress tests.

## Next steps
- Future implementation pass should execute phases in order and only expand beyond 4AT baseline after all validation checks pass.
- If a later vehicle-specific profile is needed, add alternate config presets without changing the canonical architecture.
