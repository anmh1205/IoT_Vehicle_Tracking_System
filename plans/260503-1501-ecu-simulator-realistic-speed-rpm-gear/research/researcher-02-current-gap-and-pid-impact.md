# Research Report: current gap and PID impact

- Conducted: 2026-05-03 15:xx Asia/Saigon
- Scope: only `iot-vehicle-tracking-system-ecu-simulator/ecu-simulator/src/*`

## Executive summary
Current simulator is a single synthetic snapshot generator plus CAN responder. It is good enough for static OBD replies, not for realistic automatic-transmission driving dynamics.

Big gap: speed, RPM, throttle, load, MAF, fuel rate are assigned per phase from lookup-ish bands, not derived from shared physics/state. Gear does not exist. Therefore values can look plausible individually but are not causally coupled. Once continuous dynamics are added, many current PIDs and derived counters must move together or downstream logic will see contradictions.

## Current architecture
- `main.cpp`: boot, serial ignition commands, loop orchestration.
- `ecu-model.cpp/.h`: owns all simulated state and behavior.
- `obd-can.cpp/.h`: maps `ecu_snapshot_t` to OBD-II Mode 01/03/07/0A CAN responses.
- Core data contract: `ecu_snapshot_t` with raw values already precomputed for all exposed PIDs.

## What the model does today
- Alternates ignition ON/OFF by random durations.
- During IGN ON, runs a repeating 200 s scripted phase machine: parked -> idle -> urban -> cruise -> highway -> decel.
- For each phase, directly assigns RPM, speed, throttle, load, MAP, temps, timing, MAF, fuel pressure, voltage, fuel rate.
- DTC/readiness come from 3 static profiles.
- Distance/runtime/MIL counters integrate from current speed and engine-running flag.

## Main architectural gaps vs realistic AT simulator
### 1. No powertrain state
Missing internal state that a realistic AT model needs:
- current gear / target gear
- torque-converter slip or clutch lockup state
- accelerator demand vs actual throttle
- brake state
- engine inertia / RPM rate-of-change
- wheel speed / vehicle acceleration
- road load / grade / drag / rolling resistance
- shift schedule / hysteresis / kickdown
- idle control / stall-prevention floor
- engine warmup and soak/cooldown timers beyond direct temp assignment

Impact: no causal chain from driver demand -> torque -> RPM -> gear -> speed.

### 2. Speed-RPM coupling is fake
Current code sets `rpm` and `speed_kph` independently inside each phase bucket. Example problem classes:
- zero speed with elevated throttle/load during parked/idle phases can be okay, but no distinction between park, neutral, drive-with-brake.
- cruise/highway RPM does not depend on gear ratio, final drive, tire circumference, or converter lock.
- decel speed drop and RPM drop are not linked; no engine braking or downshift behavior.
- no transient continuity; phase edges can jump abruptly.

### 3. State machine too coarse
Current `drive_phase_t` is scene scripting, not vehicle state. It lacks:
- launch, hold, coast, brake, shift-in-progress, stop-and-go
- separate ignition state, engine state, transmission state, motion state
- continuous timer/state evolution at sub-phase granularity

### 4. Snapshot is both domain model and transport DTO
`ecu_snapshot_t` mixes:
- internal simulation state
- OBD-ready, encoded business data
- DTC/readiness storage
This makes future coupling harder. Simulator should compute canonical internal state first, then derive OBD snapshot second.

### 5. OBD layer pulls live model on demand
`obd_can.cpp` calls `ecu_model_get()` per request, and `ecu_model_get()` ticks model again. This can make response timing depend on poll/request cadence instead of one authoritative simulation tick. For continuous dynamics, tick ownership should stay in one place.

### 6. DTC/readiness model is static and detached
DTCs, MIL, trims, readiness are profile-driven only. They do not react to warmup, misfire episodes, catalyst monitor completion, fuel trim excursions, etc. Fine for now, but unrealistic once dynamics become richer.

## Current PIDs / derived fields that must stay internally consistent
High-priority coupled set:
- PID 0x0C RPM
- PID 0x0D speed
- PID 0x11 throttle
- PID 0x04 engine load
- PID 0x0B MAP/intake kPa
- PID 0x10 MAF
- PID 0x5E fuel rate
- PID 0x0E timing advance
- PID 0x47 absolute throttle B
- PID 0x4C commanded throttle
- PID 0x03 fuel system status

Thermal/electrical consistency set:
- PID 0x05 coolant temp
- PID 0x0F intake air temp
- PID 0x46 ambient air temp
- PID 0x5C oil temp
- PID 0x42 control module voltage
- PID 0x0A fuel pressure
- PID 0x33 barometric pressure

Derived counters that depend on motion/engine state staying coherent:
- PID 0x1F run time
- PID 0x21 distance with MIL
- PID 0x31 distance since clear
- PID 0x4D time with MIL
- PID 0x4E time since clear
- PID 0x2F fuel level

Readiness/fault consistency set:
- PID 0x01 monitor status since DTC clear
- Mode 03 stored DTC
- Mode 07 pending DTC
- Mode 0A permanent DTC

## Specific consistency rules to preserve when dynamics become continuous
- Speed 0 + in-drive creeping should imply near-idle RPM, low load, low MAF unless brake-hold/throttle-blip state says otherwise.
- For a fixed gear and locked converter, RPM should scale with speed.
- Upshift should usually reduce RPM at same/near-same throttle and increasing speed.
- Kickdown should raise RPM before/while acceleration rises.
- Fuel rate should track load/RPM, not be an unrelated formula.
- MAF should broadly track RPM * load, with idle/cruise ranges separated.
- Engine-off or ignition-off should zero fuel rate, MAF, fuel-system status, and generally RPM/speed as appropriate.
- Distance counters must integrate from the same vehicle-speed source used for PID 0x0D.
- Fuel level burn-down should derive from integrated fuel rate if realism matters.

## Recommended modularization boundaries
Keep it simple. Split by responsibility, not by every PID.
- `simulation-clock` or authoritative tick owner: one place advances time.
- `powertrain-state`: canonical internal state: ignition, engine, gear, wheel speed, accel, throttle demand, brake, temperatures.
- `drive-scenario` or `driver-input-profile`: target pedal/brake patterns; not direct PID outputs.
- `transmission-model`: gear selection, shift hysteresis, converter lock/slip.
- `engine-model`: idle control, RPM response, load/MAF/fuel/timing estimates.
- `thermal-model`: coolant/oil/intake/ambient evolution.
- `diagnostics-model`: DTC/readiness/MIL logic.
- `obd-snapshot-builder`: derive `ecu_snapshot_t` from canonical state.
- `obd-can`: transport only, no simulation ticking.

## Validation scenarios to run after refactor
1. IGN OFF -> IGN ON cold start -> idle stabilize.
2. Brake-hold in D, zero speed with slight converter slip, then launch.
3. Urban stop-go with 1-2-3 upshifts and downshifts.
4. Steady 60-80 kph cruise: RPM stable and proportional to gear.
5. Kickdown at cruise: throttle jump, downshift, RPM jump, acceleration rise.
6. Highway decel to stop: speed falls smoothly, downshifts occur, idle settles at zero speed.
7. Engine-off coast rule decision: verify whether speed should instantly zero or decay based on intended simulator scope.
8. Long run accounting: runtime, distance, MIL time/distance, fuel usage remain monotonic and coherent.
9. DTC profile activation while driving: MIL/readiness/counters remain consistent.
10. OBD polling under heavy request rate: values should not advance faster than wall-clock tick.

## Bottom line
Current design is fine for canned OBD demos. It is not yet a realistic AT simulator because it has no canonical motion/powertrain state and no causal coupling between speed, RPM, and transmission behavior. First fix is architectural: introduce internal state + derived snapshot boundary, then make high-impact PIDs consistent from that state.

## Unresolved questions
- Should simulator represent PRND selection explicitly, or only moving/non-moving AT behavior?
- Should speed persist during IGN OFF/coast, or is ignition-off always treated as parked?
- How realistic must transmission be: simple ratio table vs converter slip + lockup?
- Are DTC/readiness meant to remain scripted, or become state-driven too?
- Is `ecu_snapshot_t` allowed to change, or must current OBD-facing contract stay backward compatible?
