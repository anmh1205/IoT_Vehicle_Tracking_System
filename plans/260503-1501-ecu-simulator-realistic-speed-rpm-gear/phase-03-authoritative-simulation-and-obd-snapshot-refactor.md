# Context links
- Gap report: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260503-1501-ecu-simulator-realistic-speed-rpm-gear/research/researcher-02-current-gap-and-pid-impact.md`
- Source files: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-ecu-simulator/ecu-simulator/src/main.cpp`, `.../src/ecu-model.cpp`, `.../src/ecu-model.h`, `.../src/obd-can.cpp`, `.../src/obd-can.h`
- Platform target: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-ecu-simulator/ecu-simulator/platformio.ini`

## Overview
- Priority: P2
- Current status: pending
- Brief description: Refactor simulation ownership so one authoritative tick updates internal powertrain state and then derives a coherent OBD snapshot consumed by CAN transport without side effects.

## Key Insights
- `main.cpp` already has the correct top-level loop order; it just needs model accessors to stop ticking internally.
- `ecu_snapshot_t` should remain outward-facing, but internal state must be richer than the snapshot.
- PID consistency is more important than making every absolute number perfect.
- `ecu-model.cpp` is already large enough that future implementation should split it before or during the realism refactor.

## Requirements
- Functional requirements:
  - Keep one authoritative simulation tick.
  - Keep CAN/OBD replies available for current supported PIDs and DTC modes.
  - Derive high-priority PID fields from canonical internal state.
  - Keep counters and readiness/DTC outputs monotonic and coherent.
- Non-functional requirements:
  - No hidden state mutation on read paths.
  - Keep transport encoding separate from simulation logic.
  - Keep memory usage predictable for Uno.

## Architecture
<!-- Updated: Validation Session 1 - simulator-owned speed and state-driven diagnostics -->
- Validation Session 1 decisions:
  - `speed` remains simulator-owned and must advance only from the authoritative simulation tick.
  - Full `PRND` selector behavior is in scope for v1 state modeling.
  - DTC/readiness should move toward a more state-driven model instead of mostly scripted buckets.
- Target call flow:
  1. `loop()` polls serial commands.
  2. `ecu_model_tick()` advances canonical state from elapsed time.
  3. Snapshot builder materializes latest `ecu_snapshot_t`.
  4. `obd_can_poll()` reads last snapshot and encodes response only.
- Proposed internal API shape:
  - `ecu_model_tick()` mutates state and refreshes cached snapshot.
  - `ecu_model_get_snapshot()` or current `ecu_model_get()` becomes pure accessor.
  - Optional helpers expose ignition state/timer without touching simulation.
- PID derivation strategy:
  - Primary state: ignition, engine_running, selector, gear, shift timer, throttle_demand, throttle_actual, brake, speed_kph_f, rpm_f, coolant, oil, intake air, voltage.
  - Derived OBD values:
    - RPM from smoothed engine speed.
    - Speed from canonical vehicle speed.
    - Throttle/commanded throttle/abs throttle from demand/actual relationship.
    - Engine load from normalized RPM + throttle/load surrogate.
    - MAP from load + throttle + idle vacuum heuristic.
    - MAF from RPM * load heuristic with idle/cruise clamps.
    - Fuel rate from RPM/load/engine_running heuristic; zero when engine off.
    - Timing advance from state bucket: idle, accel, cruise, decel.
    - Thermal/electrical values from warm-up and engine-running status.
    - Counters from same canonical speed and MIL state used everywhere else.
  - DTC/readiness strategy for v1:
    - Keep existing profile buckets scripted.
    - Keep readiness bytes partly profile-driven but ensure engine-off/engine-on flags stay coherent.

## Related code files
- Files to modify:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-ecu-simulator/ecu-simulator/src/main.cpp`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-ecu-simulator/ecu-simulator/src/ecu-model.cpp`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-ecu-simulator/ecu-simulator/src/ecu-model.h`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-ecu-simulator/ecu-simulator/src/obd-can.cpp`
- Files to create:
  - `.../src/transmission-model.h/.cpp`
  - `.../src/engine-state-model.h/.cpp`
  - `.../src/obd-snapshot-builder.h/.cpp`
  - `.../src/simulation-counters.h/.cpp`
- Files to delete:
  - None required.

## Implementation Steps
1. Introduce canonical internal structs in `ecu-model` boundary and stop writing business logic directly into `ecu_snapshot_t`.
2. Convert current phase-driven direct assignment into a driver-demand/scenario layer that feeds the powertrain layer.
3. Add floating or fixed-point internal values for speed/RPM smoothing; quantize only when snapshot is built.
4. Refactor `ecu_model_get()` so it returns the latest cached snapshot without calling `ecu_model_tick()`.
5. Update `obd-can.cpp` to use only the last snapshot; remove all accidental tick ownership from request handling.
6. Build a dedicated snapshot builder that maps canonical state into every supported Mode 01 PID field and DTC bucket.
7. Keep counters (`run time`, `distance`, `MIL time`, `MIL distance`, `fuel level burn-down if retained`) sourced from one canonical update path.
8. Split `ecu-model.cpp` into focused modules if line count grows past guidance during implementation; prefer engine/transmission/snapshot/counters separation.
9. Keep public header small: outward DTOs + façade APIs only.

## Todo list
- [ ] Freeze pure-accessor contract for snapshot reads.
- [ ] Freeze high-priority PID derivation rules.
- [ ] Freeze DTC/readiness v1 strategy: scripted profiles, coherent flags.
- [ ] Freeze modular split list before implementation.

## Success Criteria
- OBD polling frequency no longer changes simulator progression.
- High-priority PIDs read as one coherent story in each driving scenario.
- `main.cpp` owns sequencing; `obd-can.cpp` only transports.
- File-level design is small enough to implement without recreating a monolith.

## Risk Assessment
- Risk: changing getter semantics can break existing assumptions. Mitigation: preserve function names if useful, but change semantics and update all callers in one pass.
- Risk: snapshot derivation becomes duplicated. Mitigation: one builder only; no per-PID ad hoc formulas outside it.
- Risk: over-tuning low-value PIDs. Mitigation: prioritize coupled set first, leave secondary cosmetic realism simple.

## Security Considerations
- Keep CAN parser strict; do not widen accepted request shapes unnecessarily.
- Avoid dynamic allocation in hot path to reduce instability.
- Keep serial logging bounded so heavy CAN traffic cannot cause timing degradation or noisy leakage.

## Next steps
- Phase 04 defines validation scenarios proving the refactor behaves correctly under compile checks, serial control, CAN requests, and long/heavy polling.
