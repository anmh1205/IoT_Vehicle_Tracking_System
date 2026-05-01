# Context links
- Overview plan: `./plan.md`
- Core loop file: `iot-vehicle-tracking-system-firmware/components/app-core/src/state_machine_core.c`
- Runtime context: `iot-vehicle-tracking-system-firmware/components/app-core/include/state_runtime_context.h`
- FSM states: `iot-vehicle-tracking-system-firmware/components/shared-kernel/include/fsm_types.h`

# Overview
- Priority: P1
- Current status: pending
- Brief description: replace hardcoded blink code with LED service calls from existing FSM lifecycle without adding a new loop/task.

# Key Insights
- `state_machine_core_run()` already executes often enough for non-blocking LED tick.
- LED init belongs near core init because pin ownership is currently there.
- Migration must preserve boot safety: if service init fails or pin absent, firmware keeps running.
- Core file should end with orchestration only, not pattern timing logic.

# Requirements
- Functional:
  - Initialize LED service once in core init.
  - Build snapshot and tick every loop iteration.
  - Remove old hardcoded blink timing path.
- Non-functional:
  - No behavior regression for pin setup and active-low support.
  - Core loop stays readable.
  - No blocking calls in tick path.

# Architecture
- `state_machine_core_init()`
  - call `user_led_service_init(PIN_USER_LED, TRACKER_USER_LED_ACTIVE_LEVEL)`
- `state_machine_core_run()`
  - after `next_state` is known, build LED snapshot from authoritative runtime flags
  - call `user_led_service_tick(now_ms, &snapshot)`
- `state_runtime_context_reset()`
  - reset only LED-specific derived flags if any were added
- Old helpers `state_machine_set_user_led()` and `state_machine_update_user_led()` removed after service lands

# Related Code Files
- Files to modify:
  - `iot-vehicle-tracking-system-firmware/components/app-core/src/state_machine_core.c`
  - `iot-vehicle-tracking-system-firmware/components/app-core/include/state_runtime_context.h`
  - `iot-vehicle-tracking-system-firmware/components/app-core/src/state_runtime_context.c`
- Files to create:
  - `iot-vehicle-tracking-system-firmware/components/app-core/include/user-led-service.h`
  - `iot-vehicle-tracking-system-firmware/components/app-core/src/user-led-service.c`
- Files to delete:
  - None; remove legacy functions in-place.

# Implementation Steps
1. Add service header include to core file.
2. Add `user_led_service_init()` in core init after runtime reset, before loop use.
3. Build snapshot helper near core loop to keep switch body small.
4. Move LED tick to after `next_state` resolution so pattern reflects latest decision.
5. Remove legacy blink constants only when no longer referenced.
6. Keep fallback no-op if LED pin is `GPIO_NUM_NC`.

# Todo List
- [ ] Add init hook
- [ ] Add snapshot builder helper
- [ ] Add per-loop tick hook
- [ ] Remove legacy blink helpers/constants if dead

# Success Criteria
- `state_machine_core.c` no longer owns pattern timing.
- LED still works with same hardware pin.
- Loop remains single-threaded and non-blocking.

# Risk Assessment
- Risk: low loop frequency makes some patterns look uneven.
  - Mitigation: choose patterns tolerant to loop jitter; avoid ultra-short pulses.
- Risk: snapshot built before transitions misrepresents state.
  - Mitigation: tick after `next_state` is finalized and use both current/next if needed.

# Security Considerations
- Keep LED tick no-op on invalid pin/config, avoid panic due to GPIO setup failure in field.
- Do not let LED service mutate control-plane state.

# Next Steps
- Wire event overrides from OTA and sleep flows in Phase 04.
- Only then trim old constants and finalize migration.

# Migration steps from current implementation
1. Introduce service files with same physical pin semantics.
2. Call service init from core init while old constants remain untouched.
3. Replace `state_machine_update_user_led()` call in `state_machine_core_run()` with `user_led_service_tick()`.
4. Remove `state_machine_set_user_led()` and `state_machine_update_user_led()`.
5. Delete obsolete blink timing constants if new pattern table fully owns timing.
6. Rebuild firmware and verify boot/loop/sleep behavior unchanged except LED semantics.

# Unresolved questions
- Should tick happen before logging, or after logging, to keep timestamps aligned with visible transitions?
