# Context links
- Overview plan: `./plan.md`
- OTA hooks: `iot-vehicle-tracking-system-firmware/components/app-core/src/state_ota_runtime.c`
- Sleep controller: `iot-vehicle-tracking-system-firmware/components/app-core/src/state_sleep_controller.c`
- Runtime context: `iot-vehicle-tracking-system-firmware/components/app-core/include/state_runtime_context.h`

# Overview
- Priority: P1
- Current status: pending
- Brief description: wire temporary LED overrides for OTA, sleep blockers, alarm/fault, and ensure they fall back cleanly to base patterns.

# Key Insights
- OTA and sleep blockers already have strong lifecycle boundaries. Use them.
- Not every log warning deserves a LED override. Only operator-meaningful events.
- Fault visibility should be sticky enough to notice, but not require persistent side state if existing flags suffice.

# Requirements
- Functional:
  - OTA start/progress/confirm pending must override base pattern.
  - Alarm must override base pattern immediately.
  - Sleep-blocked state should be visible when device loops awake due to blockers.
  - Repeated runtime fault must override through one generic fault pattern in v1 if a stable signal exists.
  - <!-- Updated: Validation Session 1 - OTA success flash + generic sleep-blocked --> Post-confirm OTA success must flash once, and `sleep blocked` must stay one generic pattern.
- Non-functional:
  - Avoid scattering LED writes across modules.
  - Prefer updating runtime flags or override API, then let service arbitrate.

# Architecture
- Recommended override flow:
  - `state_ota_runtime.c`: set/clear LED-relevant runtime flags around `s_ota_in_progress` and pending-confirm lifecycle.
  - `state_sleep_controller.c`: expose last sleep reject reason as coarse enum/flag if needed.
  - `state_machine_core.c`: pass alarm/runtime detail in snapshot every tick.
- Keep arbitration centralized in `user_led_policy_resolve()`.
- If transient visibility is needed for short events, add `user_led_service_trigger_override(pattern, ttl_ms)` only for rare event edges.

# Related Code Files
- Files to modify:
  - `iot-vehicle-tracking-system-firmware/components/app-core/src/state_ota_runtime.c`
  - `iot-vehicle-tracking-system-firmware/components/app-core/src/state_sleep_controller.c`
  - `iot-vehicle-tracking-system-firmware/components/app-core/include/state_runtime_context.h`
  - `iot-vehicle-tracking-system-firmware/components/app-core/src/state_machine_core.c`
  - `iot-vehicle-tracking-system-firmware/components/app-core/src/state_runtime_context.c`
- Files to create:
  - `iot-vehicle-tracking-system-firmware/components/app-core/include/user-led-policy.h`
  - `iot-vehicle-tracking-system-firmware/components/app-core/src/user-led-policy.c`
- Files to delete:
  - None.

# Implementation Steps
1. Decide which overrides are level-triggered vs edge-triggered.
2. Add coarse LED-relevant flags/enums if current globals are insufficient.
3. Map OTA assigned/in-progress/pending-confirm to one or two patterns max.
4. Map sleep reject reasons to one generic busy pattern.
5. Map repeated OBD/BLE runtime failures to one generic fault pattern if codebase already exposes stable counters/streaks.
6. Add one post-confirm OTA success flash edge after pending-confirm clears.
7. Verify overrides clear automatically and fall back to base without bespoke cleanup.

# Todo List
- [ ] Define override triggers and clear conditions
- [ ] Add minimal runtime fields if needed
- [ ] Centralize arbitration in policy module
- [ ] Verify fallback-to-base rules for all override exits

# Success Criteria
- OTA/alarm/sleep-blocked visibly override base state.
- Override priority is deterministic and documented.
- No direct GPIO writes added outside LED service.

# Risk Assessment
- Risk: event-edge APIs create hidden state bugs.
  - Mitigation: prefer level-triggered policy first; add TTL edge override only where base signals cannot express event.
- Risk: sleep-blocked pattern makes parked device look faulty.
  - Mitigation: use softer busy pulse and only while blocker persists.

# Security Considerations
- Fault/OTA visibility is acceptable physical disclosure; do not encode versions, IDs, or network credentials into pulse counts.
- Ensure override state cannot block sleep or OTA logic; LED remains observer only.

# Next Steps
- Move to validation phase with build, timing, and manual field-observation checks.

# Unresolved questions
- Which existing counter or streak is trustworthy enough to classify the generic repeated-fault override in v1?
