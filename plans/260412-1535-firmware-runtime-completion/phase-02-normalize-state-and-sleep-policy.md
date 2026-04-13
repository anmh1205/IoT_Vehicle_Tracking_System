# Phase 02 â€” Normalize state and sleep policy

## Context links
- Research: `./research/researcher-01-runtime-baseline.md`, `./research/researcher-02-hardware-targets.md`
- Plan: `./plan.md`
- Key code: `iot-vehicle-tracking-system-firmware/main/main.c`, `iot-vehicle-tracking-system-firmware/main/inc/app_state.h`, `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`, `iot-vehicle-tracking-system-firmware/main/src/util.c`, `iot-vehicle-tracking-system-firmware/main/src/power_mgr.c`

## Overview
- Priority: P1
- Current status: completed
- Brief description: make state transitions deterministic and move sleep from hard-disabled bring-up mode to policy-controlled behavior.

## Key Insights
- Sleep is hard-disabled at boot in `main/main.c`.
- FSM already models `PARKED`, `ALARM`, `HEARTBEAT`, `SLEEP`, but current transitions still mix bring-up assumptions and hardcoded timing.
- Deep-sleep entry order already exists in `state_machine_prepare_sleep`, so main gap is policy, gating, and reject visibility.

## Requirements
- Functional: encode exact semantics for driving, parked, alarm, heartbeat, and sleep-entry.
- Functional: enforce approved policy: IGN OFF hold 3 s then sleep, parked heartbeat 120 s.
- Non-functional: log why sleep is rejected or bypassed; field validation must distinguish policy block vs hardware failure.

## Architecture
- Keep one FSM owner in `state_machine.c`.
- Convert sleep enable from unconditional boot override to a guarded policy decision derived from config + runtime readiness.
- Separate `can_sleep_now` checks from `prepare_sleep` side effects.

## Related code files
- Modify: `main/main.c`
- Modify: `main/inc/app_state.h`
- Modify: `main/src/state_machine.c`
- Modify: `main/src/util.c`
- Modify: `main/inc/util.h`
- Modify: `main/src/power_mgr.c`
- Create: none
- Delete: none

## Implementation Steps
1. Document target transition table for all FSM states, including wake causes and OTA override behavior.
2. Replace fixed `util_set_sleep_enabled(false)` boot gate with an explicit runtime policy source.
3. Extract sleep-entry predicate covering network/OTA/session constraints and hardware readiness.
4. Replace `TRACKER_IGNITION_OFF_DRAIN_FIXED_MS` usage with shared config while keeping the same 3 s target.
5. Ensure `PARKED -> SLEEP`, `HEARTBEAT -> SLEEP`, and `ALARM -> PARKED/DRIVING` transitions are single-path and easy to audit.
6. Add structured logs/counters for sleep blocked, sleep entered, timer wake, IMU wake, and fallback-to-check-ign cases.
7. Keep deep-sleep preparation side effects only inside the final accepted sleep path.

## Todo list
- [ ] Freeze FSM transition spec.
- [ ] Remove unconditional boot sleep disable.
- [ ] Centralize sleep eligibility checks.
- [ ] Align IGN OFF delay and heartbeat cadence to config.
- [ ] Add reject-reason logging.

## Success Criteria
- Device can enter `APP_STATE_SLEEP` by policy, not by source edit.
- `IGN OFF -> parked -> sleep` path takes 3 s hold on real hardware unless blocked for a logged reason.
- Wake cause at next boot routes correctly to `HEARTBEAT` or `ALARM`.

## Risk Assessment
- Enabling sleep too early can hide modem/IMU defects behind reset loops.
- Poorly ordered teardown can lose final MQTT status or corrupt OTA confirmation flow.
- Ambiguous state ownership can reintroduce duplicated policy across modules.

## Security Considerations
- OTA pending-confirm and command-processing windows must block unsafe sleep.
- Do not allow remote commands to force sleep while critical work is active.
- Preserve enough logs/status to diagnose unexpected wake or repeated reboot cycles.

## Next steps
- Once sleep policy is deterministic, wire real IMU wake in Phase 03.
- Feed stable wake states into modem/GNSS/MQTT sequencing in Phase 04.

## Unresolved questions
- Which runtime conditions must block sleep besides OTA: MQTT offline queue flush, modem registration, BLE session teardown?

