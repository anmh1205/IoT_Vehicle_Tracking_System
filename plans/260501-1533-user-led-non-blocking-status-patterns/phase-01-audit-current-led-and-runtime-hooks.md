# Context links
- Research: `./research/researcher-01-led-state-hooks.md`
- Research: `./research/researcher-02-led-engine-design.md`
- LED pin: `iot-vehicle-tracking-system-firmware/components/platform-board-esp32s3/include/pin_map.h`
- Current LED impl: `iot-vehicle-tracking-system-firmware/components/app-core/src/state_machine_core.c`
- Runtime flags: `iot-vehicle-tracking-system-firmware/components/app-core/include/state_runtime_context.h`
- FSM source of truth: `iot-vehicle-tracking-system-firmware/components/shared-kernel/include/fsm_types.h`

# Overview
- Priority: P2
- Current status: pending
- Brief description: freeze current behavior, enumerate hook points, define minimal data LED service may read.

# Key Insights
- Current LED is fixed-period blink hardcoded in core loop. Good for bring-up, bad for state detail.
- `s_runtime_state_hint` already mirrors lifecycle intent. Reuse it.
- OTA and sleep blockers already have concentrated lifecycle code. Prefer hooks there over scattered polling.
- One LED means policy must compress detail. Too much encoding harms readability.

# Requirements
- Functional:
  - Inventory all app states and useful subsystem hints.
  - Separate base states from temporary overrides.
  - Decide what LED service reads every tick vs what gets latched as event flag.
  - <!-- Updated: Validation Session 1 - v1 generic fault + generic sleep-blocked + init repeat --> Treat repeated OBD/BLE failure as one generic fault override in v1, keep one generic `sleep blocked` pattern, and model `INIT` as repeat-until-stable.
- Non-functional:
  - Zero blocking in LED path.
  - No duplicate state machine.
  - Keep future code review easy.

# Architecture
- Define a tiny `user_led_runtime_snapshot_t` built from existing globals.
- Snapshot fields should stay derived, not own business truth.
- Candidate source buckets:
  - app lifecycle: `s_runtime_state_hint`, `current_state`, `next_state`
  - connectivity/runtime detail: mqtt online, ble inflight, publish status
  - temporary overrides: alarm, OTA active, OTA pending confirm, sleep blocked, fault streak

# Related Code Files
- Files to modify:
  - `iot-vehicle-tracking-system-firmware/components/app-core/include/state_runtime_context.h`
  - `iot-vehicle-tracking-system-firmware/components/app-core/src/state_machine_core.c`
  - `iot-vehicle-tracking-system-firmware/components/app-core/src/state_ota_runtime.c`
  - `iot-vehicle-tracking-system-firmware/components/app-core/src/state_sleep_controller.c`
- Files to create:
  - `iot-vehicle-tracking-system-firmware/components/app-core/include/user-led-service.h`
  - `iot-vehicle-tracking-system-firmware/components/app-core/src/user-led-service.c`
  - `iot-vehicle-tracking-system-firmware/components/app-core/include/user-led-policy.h`
  - `iot-vehicle-tracking-system-firmware/components/app-core/src/user-led-policy.c`
  - `iot-vehicle-tracking-system-firmware/components/app-core/include/user-led-patterns.h`
  - `iot-vehicle-tracking-system-firmware/components/app-core/src/user-led-patterns.c`
- Files to delete:
  - None in first pass.

# Implementation Steps
1. Confirm current LED constants and where they are consumed.
2. Enumerate lifecycle sources already present in runtime context and handlers.
3. Mark each source as base-state, transient override, or noise.
4. Add only missing runtime fields needed for clean LED derivation.
5. Define migration guardrails: same pin, same init ownership, no extra task.

# Todo List
- [ ] Inventory current LED code path and init ownership
- [ ] Inventory state and subsystem hints already exposed
- [ ] Decide minimal snapshot contract
- [ ] Freeze create/modify file list for implementation phase

# Success Criteria
- Clear list of hook points with file-level responsibility.
- Minimal snapshot contract agreed.
- No unnecessary new runtime flags proposed.

# Risk Assessment
- Risk: snapshot grows into duplicate runtime context.
  - Mitigation: allow only LED-specific derived fields.
- Risk: too many signals compete for one LED.
  - Mitigation: compress into base + override model only.

# Security Considerations
- LED exposes device mode physically. Do not encode sensitive credentials/data.
- Error patterns should communicate class, not raw secrets or identifiers.

# Next Steps
- Move to Phase 02 to lock enums, pattern ids, priorities, and sampling rules.
- Use this audit to reject any over-engineered animation/task design.

# Unresolved questions
- None after Validation Session 1.
