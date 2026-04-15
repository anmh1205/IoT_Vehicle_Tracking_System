# Phase 01 â€” Centralize runtime config

## Context links
- Research: `./research/researcher-01-runtime-baseline.md`, `./research/researcher-02-hardware-targets.md`
- Plan: `./plan.md`
- Key code: `iot-vehicle-tracking-system-firmware/main/inc/app_config.h`, `iot-vehicle-tracking-system-firmware/main/src/nvs_config.c`, `iot-vehicle-tracking-system-firmware/main/src/command_handler.c`, `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`, `iot-vehicle-tracking-system-firmware/main/main.c`

## Overview
- Priority: P1
- Current status: completed
- Brief description: make shared config the single authority for runtime feature flags and timing policy.

## Key Insights
- Current defaults already live in NVS/config, but product timing still leaks through module-local macros.
- Known drift: tracking default 10 s, heartbeat 900 s, IGN OFF hold 3000 ms, alarm raw publish 5000 ms.
- User-approved target must override leftovers: driving 1 s, alarm 3 s, sleep heartbeat 120 s, IGN OFF hold 3 s.

## Requirements
- Functional: add explicit config fields for every runtime cadence and sleep policy gate used by product behavior.
- Functional: persist/load through NVS and allow command updates only for approved mutable fields.
- Non-functional: no duplicated timing authority; invalid or missing config must self-heal to safe defaults.

## Architecture
- Extend `config_t` with runtime timing and feature-policy fields.
- Keep compile-time macros only for engineering constants, not product timing.
- Route boot defaults -> NVS load -> command update -> state machine read from one shared struct.

## Related code files
- Modify: `main/inc/app_config.h`
- Modify: `main/src/nvs_config.c`
- Modify: `main/src/command_handler.c`
- Modify: `main/src/state_machine.c`
- Modify: `main/main.c`
- Likely review only: `main/inc/command_handler.h`, `main/inc/util.h`
- Create: none
- Delete: none

## Implementation Steps
1. Inventory product-facing timing and feature gates currently hardcoded in FSM, sleep path, alarm path, MQTT cadence, OTA guard flow.
2. Add missing fields to `config_t`; prefer names matching behavior, not module internals.
3. Set built-in defaults to approved baseline: tracking 1 s, heartbeat 120 s, alarm 3 s, IGN OFF hold 3 s.
4. Tighten config validation bounds so zero or out-of-range values cannot arm unsafe runtime behavior.
5. Update NVS load/save migration path so old blobs are repaired cleanly.
6. Update command parser so only intended runtime knobs remain remotely mutable; reject unsafe or unsupported fields.
7. Replace runtime reads of product timing literals with shared config reads.

## Todo list
- [ ] Map every timing literal used by runtime behavior.
- [ ] Define final shared config schema.
- [ ] Migrate NVS defaults and validation.
- [ ] Normalize command-update bounds.
- [ ] Remove duplicated timing authority from runtime flow.

## Success Criteria
- Every product timing used by runtime flow is traceable to `config_t` or an explicit immutable engineering constant.
- Default runtime boots with approved values without manual NVS edits.
- No conflict remains between config defaults and FSM-local publish/sleep cadence.

## Risk Assessment
- NVS blob size change can invalidate old stored config; must include migration/fallback path.
- Overexposing config mutability can let cloud commands put device into unstable cadence.
- Missing one module-local literal will preserve hidden drift.

## Security Considerations
- Keep secrets (`auth_token`, MQTT creds) separate from runtime-tuning logic when auditing updates.
- Reject remote config values outside bounded safe ranges.
- Do not allow remote commands to disable safety-critical timing validation.

## Next steps
- Feed normalized config into Phase 02 FSM and sleep policy work.
- Freeze a config field matrix for validation logs and test scripts.

## Unresolved questions
- Which new fields must be remotely mutable vs boot-only?
- Should sleep enable itself also live in config, or remain a guarded bring-up switch until hardware proof exists?

