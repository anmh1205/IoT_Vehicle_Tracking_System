# Context links
- Docs: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/codebase-summary.md`, `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/code-standards.md`, `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md`, `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/project-overview-pdr.md`
- Research: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260503-1501-ecu-simulator-realistic-speed-rpm-gear/research/researcher-01-at-dynamics-model.md`, `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260503-1501-ecu-simulator-realistic-speed-rpm-gear/research/researcher-02-current-gap-and-pid-impact.md`
- Code: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-ecu-simulator/ecu-simulator/src/main.cpp`, `.../src/ecu-model.cpp`, `.../src/ecu-model.h`, `.../src/obd-can.cpp`

## Overview
- Priority: P2
- Current status: pending
- Brief description: Replace the current scripted phase snapshot generator with a simple canonical AT simulation architecture that keeps speed, RPM, gear, and derived PIDs coherent.

## Key Insights
- Current model is scene-scripted, not state-driven; `rpm`, `speed_kph`, `throttle_pct`, `engine_load_pct`, `maf`, and `fuel_rate` are assigned independently by phase.
- `ecu_snapshot_t` is useful as outward DTO, but too broad to remain the only internal state.
- `ecu_model_get()` calling `ecu_model_tick()` is the most dangerous current boundary because poll rate can distort simulation time.
- Uno target means no full vehicle physics; realism must come from causal coupling and smoothing, not detail overload.
- 4AT gives best KISS/YAGNI trade-off for a generic sedan without committing to a vehicle-specific calibration.

## Requirements
- Functional requirements:
  - Produce believable linkage among vehicle speed, engine RPM, and selected gear.
  - Preserve existing OBD response role through `ecu_snapshot_t` or a backward-compatible equivalent.
  - Keep ignition force commands working.
  - Support cold idle, brake hold, creep, launch, upshift/downshift, kickdown, cruise, decel, and stop.
- Non-functional requirements:
  - Keep module responsibilities clear and testable.
  - Stay lightweight for Arduino Uno memory/CPU budget.
  - Keep implementation maintainable and under file-size guidance via modularization.

## Architecture
<!-- Updated: Validation Session 1 - selector scope and diagnostics realism expanded -->
- Validation Session 1 decisions:
  - Scope is full `PRND` selector behavior in v1.
  - Diagnostics/readiness should be designed as more state-driven, not mostly scripted.
- Canonical internal model layers:
  1. Simulation clock/tick owner: one wall-clock-driven update path in `main.cpp`.
  2. Driver/scenario state: throttle demand, brake demand, selector state, ignition state, scenario timers.
  3. Powertrain state: gear, shift timer, wheel speed, engine RPM, converter slip estimate, engine running state.
  4. Thermal/electrical state: coolant, oil, intake air, voltage, fuel pressure.
  5. Diagnostics/counters state: runtime, distance, MIL timers, DTC buckets, readiness bytes.
  6. Snapshot builder: derive `ecu_snapshot_t` from canonical state.
  7. CAN transport: encode snapshot into Mode 01/03/07/0A only.
- Proposed file boundaries:
  - `ecu-model.cpp`: orchestration only, or thin façade.
  - New focused modules under `src/`: powertrain, driver profile, snapshot builder, diagnostics/counters, optional thermal model.
  - `obd-can.cpp`: no model mutation, no tick ownership.

## Related code files
- Files to modify:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-ecu-simulator/ecu-simulator/src/main.cpp`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-ecu-simulator/ecu-simulator/src/ecu-model.cpp`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-ecu-simulator/ecu-simulator/src/ecu-model.h`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-ecu-simulator/ecu-simulator/src/obd-can.cpp`
- Files to create:
  - `.../src/powertrain-state.h/.cpp`
  - `.../src/driver-input-profile.h/.cpp`
  - `.../src/obd-snapshot-builder.h/.cpp`
  - `.../src/simulation-counters.h/.cpp`
  - Optional if needed: `.../src/thermal-state.h/.cpp`
- Files to delete:
  - None required.

## Implementation Steps
1. Freeze current boundaries: document that `main.cpp` is the only authoritative place allowed to advance simulation.
2. Define internal structs for ignition, selector, driver demand, gear state, shift state, speed state, RPM state, thermal state, and counters.
3. Keep `ecu_snapshot_t` as outward snapshot contract; do not use it as the mutable source of truth for future dynamics.
4. Refactor `ecu_model_get()` into a pure accessor returning latest snapshot only.
5. Move CAN-facing PID encoding to consume the latest snapshot without any hidden state mutation.
6. Split `ecu-model.cpp` so each concern stays below the project’s file-size target and is readable on future passes.
7. Preserve existing serial ignition commands by mapping them to canonical ignition state transitions, not direct snapshot edits.

## Todo list
- [ ] Approve 4AT baseline as canonical default profile.
- [ ] Approve internal-state-first architecture.
- [ ] Approve transport-only role for `obd-can`.
- [ ] Approve modular split plan for `ecu-model.cpp`.

## Success Criteria
- Future implementation has one tick owner only.
- Internal state can explain every high-priority driving PID.
- `obd_can` can answer repeated CAN requests without advancing simulation.
- Planned file layout is small enough to fit repo standards and future maintenance.

## Risk Assessment
- Risk: too many micro-modules for a tiny firmware app. Mitigation: limit first refactor to 3-5 focused modules max.
- Risk: changing internal state may accidentally break OBD fields. Mitigation: keep snapshot builder explicit and backward-compatible.
- Risk: over-modeling physics on Uno. Mitigation: keep table/rule-based formulas and 1st-order smoothing only.

## Security Considerations
- No auth/network expansion in scope.
- Avoid debug logging that floods serial during heavy polling.
- Keep transport behavior deterministic; malformed CAN requests should continue to fail closed by ignoring unsupported PIDs/modes.

## Next steps
- Phase 02 defines the actual generic 4AT calibration and behavior rules the new architecture will implement.
- Phase 03 translates this architecture into file-level refactor and PID derivation rules.
