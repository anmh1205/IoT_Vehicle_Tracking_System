# Phase 06 â€” Complete OTA command and safety

## Context links
- Research: `./research/researcher-01-runtime-baseline.md`
- Plan: `./plan.md`
- Key code: `iot-vehicle-tracking-system-firmware/main/src/command_handler.c`, `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`, `iot-vehicle-tracking-system-firmware/main/main.c`

## Overview
- Priority: P2
- Current status: completed
- Brief description: finish OTA runtime behavior so updates are accepted, reported, confirmed, and blocked in unsafe power/sleep windows.

## Key Insights
- OTA command parsing already exists and RTC context already stores pending confirm metadata.
- Main remaining risk is orchestration: OTA can race sleep entry, modem instability, or brownout conditions.
- User scope includes OTA completion, not new deployment architecture.

## Requirements
- Functional: accept valid `ota_update` commands, publish lifecycle status, reboot into new image, confirm or rollback deterministically.
- Functional: block sleep and conflicting low-power transitions while OTA is active or awaiting safe confirmation.
- Functional: OTA start requires a power-safe window in addition to connectivity/runtime readiness.
- Non-functional: failure reasons must be visible over logs/MQTT and survivable across reboot.
- <!-- Updated: Validation Session 1 - power-safe OTA gating --> Power-safe gating is mandatory, not a later hardening option.

## Architecture
- Keep command parsing in `command_handler.c`; keep OTA execution/policy in `state_machine.c`.
- Use RTC-retained metadata only for continuity, not as a substitute for durable safety checks.
- Add explicit OTA state guard around sleep, reboot, and power-saving transitions.

## Related code files
- Modify: `main/src/command_handler.c`
- Modify: `main/src/state_machine.c`
- Modify: `main/main.c`
- Review: `main/inc/app_config.h`
- Create: none
- Delete: none

## Implementation Steps
1. Audit full OTA flow already present: command parse, download, reboot, boot confirm, rollback path, firmware status publish.
2. Define OTA-safe windows and block sleep/park transitions while critical OTA work is active.
3. Ensure boot path distinguishes normal wake from OTA post-update confirmation flow.
4. Validate that MQTT/firmware status publishes are attempted at every important OTA transition.
5. Add power/runtime preconditions for OTA start: minimum connectivity, no forced sleep entry, no ambiguous pending rollback state.
6. Add timeout and rollback reason reporting that survives reboot.
7. Test success, download failure, checksum mismatch, confirm timeout, and manual rollback on real hardware.

## Todo list
- [ ] Freeze OTA state diagram.
- [ ] Add sleep/power guards around OTA.
- [ ] Verify status reporting coverage.
- [ ] Validate confirm and rollback paths.
- [ ] Run real-hardware OTA fault matrix.

## Success Criteria
- OTA update cannot silently race with sleep.
- Success/failure/rollback states are observable over MQTT and logs.
- Confirm timeout leads to deterministic rollback or failure handling, not undefined loop.

## Risk Assessment
- Brownout during OTA can look like firmware regression without proper status breadcrumbs.
- Blocking sleep too broadly can keep parked devices awake indefinitely.
- Partial status publishing may hide where OTA failed.

## Security Considerations
- Preserve SHA-256 verification and bounded command parsing.
- Do not accept malformed OTA URLs, zero sizes, or unsafe force semantics without checks.
- Keep rollback/confirm logic resistant to stale RTC state after unrelated resets.

## Next steps
- Finalize with full field validation, measurement gates, and docs sync in Phase 07.

## Unresolved questions
- What exact power/battery threshold should gate OTA start on this hardware revision?
- Is there already a measurable brownout signal or reset reason path to annotate OTA failures?

