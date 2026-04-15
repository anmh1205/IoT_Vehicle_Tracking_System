# Phase 04 â€” Stabilize LTE, GNSS, MQTT runtime

## Context links
- Research: `./research/researcher-01-runtime-baseline.md`, `./research/researcher-02-hardware-targets.md`
- Plan: `./plan.md`
- Key code: `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`, `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`, `iot-vehicle-tracking-system-firmware/main/src/modem_gnss.c`, `iot-vehicle-tracking-system-firmware/main/src/mqtt_client.c`

## Overview
- Priority: P1
- Current status: completed
- Brief description: make SIM7600, GNSS, and MQTT behave predictably across driving, parked heartbeat, alarm wake, and recovery cases.

## Key Insights
- SIM7600 is canonical and couples LTE + GNSS lifecycle.
- `state_machine_prepare_sleep` already tears down BLE, GNSS, LTE in a rough order, but board-proven sequencing is still missing.
- GNSS recovery and LTE recovery can fight each other if reset/self-heal policies are too aggressive.

## Requirements
- Functional: driving mode must read/publish every 1 s.
- Functional: heartbeat wake must publish `rawdata` + `status`, then return to sleep if policy allows.
- Functional: MQTT commands and OTA actions must stay responsive while runtime is awake.
- Non-functional: recovery logic must avoid modem thrash and preserve observability.
- <!-- Updated: Validation Session 1 - heartbeat payload contract --> Parked heartbeat payload contract is fixed as rawdata plus status, not an open choice.

## Architecture
- Treat modem as shared resource with ordered states: wake/connect, attach, GNSS on-demand, publish, quiesce, sleep.
- Keep GNSS power/query policy subordinate to modem readiness.
- Keep MQTT online/offline queue behavior explicit around sleep and reconnect.

## Related code files
- Modify: `main/src/state_machine.c`
- Modify: `main/src/modem_lte.c`
- Modify: `main/src/modem_gnss.c`
- Modify: `main/src/mqtt_client.c`
- Review: `main/src/offline_queue.c`
- Review: `main/src/session_mgr.c`
- Create: none
- Delete: none

## Implementation Steps
1. Map exact modem wake/sleep/connect/disconnect sequence needed for driving, heartbeat, and alarm paths.
2. Align driving raw publish cadence to shared 1 s config and keep heartbeats separate from driving raw cadence.
3. Decide whether heartbeat wake publishes rawdata, status, or both; implement one explicit contract and keep it consistent.
4. Audit GNSS start/query/stop flow so no-fix recovery and LTE recovery use coordinated backoff.
5. Ensure MQTT reconnect, offline queue replay, and command callback activation survive wake cycles.
6. Replace hidden timing assumptions with config-backed cadence where behavior is product-facing.
7. Add field diagnostics for attach time, GNSS no-fix streak, MQTT reconnect count, and publish latency.

## Todo list
- [ ] Freeze modem lifecycle per runtime state.
- [ ] Align driving publish to 1 s.
- [ ] Normalize heartbeat wake publish contract.
- [ ] Coordinate GNSS and LTE recovery backoff.
- [ ] Add runtime health counters/logs.

## Success Criteria
- In driving mode, telemetry read/publish occurs every 1 s on real hardware.
- Heartbeat wake runs once per 120 s parked interval and returns to sleep without livelock.
- LTE loss, GNSS fail streaks, and MQTT reconnects recover without modem thrash.

## Risk Assessment
- Shared modem resets can break both GNSS and MQTT continuity.
- Tight 1 s cadence may expose blocking calls or queue pressure not visible at 10 s cadence.
- Publish contract drift between `rawdata`, `status`, and `events` can create backend ambiguity.

## Security Considerations
- MQTT reconnect must preserve per-device topic boundaries and existing auth model.
- OTA/status command traffic must not be dropped silently during reconnect churn.
- Do not weaken TLS/auth assumptions if secure MQTT is later enabled.

## Next steps
- Once core modem/runtime path is stable, harden BLE OBD absence and IGN fallback in Phase 05.

## Unresolved questions
- What exact heartbeat payload contract does backend expect during parked wake?
- Should GNSS remain powered during brief alarm windows, or always cold-start on wake?

