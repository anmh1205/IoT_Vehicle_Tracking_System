# Phase 03 — Realtime and alert behavior

## Context Links
- `./phase-02-backend-runtime-and-api.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/services/policy-evaluator.service.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/**/*`

## Overview
- Priority: P1
- Status: pending
- Brief: Use new allowed-zone runtime truth for evaluation, with extensible but non-spam default alerting.

## Key Insights
- Boundary decision and notification dispatch must be separated.
- v1 only needs a small state machine and dedupe fields, not a full rule engine.
- Realtime UI should expose current membership state and last change, not raw policy internals.

## Requirements
### Functional
- Evaluate incoming telemetry against active allowed zone.
- Persist current membership state and transition time.
- Emit alert only on meaningful transition by default.
- Push realtime updates for zone status changes and zone config changes.

### Non-functional
- Low-cardinality metrics.
- Debounced notifications.
- Safe behavior for stale/noisy GPS.

## Architecture
### Evaluation state machine
- `unknown` → no trustworthy decision yet
- `inside` → point inside circle
- `outside` → point outside circle beyond tolerance
- `suspect` → stale telemetry / weak accuracy / transient edge case

### Default anti-spam policy
- Fire on `inside -> outside` transition.
- Keep recovery event on `outside -> inside` disabled by default in v1.
- Do not re-fire same state until `suppression_until` expires.
- Add simple hysteresis near circle edge to reduce GPS jitter.
<!-- Updated: Validation Session 1 - recovery alert stays off by default -->

### Extensibility without overbuilding
Store alert config as minimal structured fields on zone or related config object:
- `alert_mode`: `transition_only` default
- future-safe values: `transition_and_recovery`, `periodic_while_outside`, `silent`
- `cooldown_sec`
This avoids hardcoding one future mode while keeping v1 logic small.

### Realtime contract
Emit canonical colon-style events, e.g.:
- `geofence:allowed-zone-updated`
- `geofence:allowed-zone-state-changed`
Payload should include vehicle id, active zone summary, current membership state, last changed at.

## Related Code Files
### Likely modify
- `Tracking_Backend/src/domain/geofence/services/policy-evaluator.service.ts`
- `Tracking_Backend/src/domain/geofence/repositories/vehicle-policy-state.repository.ts`
- `Tracking_Backend/src/domain/geofence/repositories/vehicle-policy-violation.repository.ts`
- `Tracking_Backend/src/infrastructure/realtime/event-bus.util.ts`
- `Tracking_Backend/src/infrastructure/realtime/mqtt-event-listener.ts`
- `Tracking_Frontend/src/lib/realtime/**/*`

## Implementation Steps
1. Split legacy evaluator responsibilities from new allowed-zone evaluator.
2. Implement circle membership calculation with tolerance/hysteresis.
3. Persist state transition fields on allowed-zone row or companion state table.
4. Emit alert records/notifications only when dedupe rules allow.
5. Add realtime events for config changes and membership changes.
6. Expose latest state in vehicle/device-facing read APIs.

## Todo List
- [ ] Add evaluator for active allowed zone
- [ ] Add transition persistence and cooldown logic
- [ ] Add minimal alert-mode config support
- [ ] Add realtime event payloads and subscriptions

## Success Criteria
- Outside alerts do not spam on every telemetry message.
- UI can render current status from backend state directly.
- Future alert modes can be added without reworking API shape.

## Risk Assessment
- GPS jitter can cause flapping near boundary.
- Realtime consumers may still listen to legacy event names or payloads.

## Security Considerations
- Realtime payloads should contain only operationally necessary data.
- Avoid disclosing precise location change history beyond authorized scopes.

## Next Steps
- Build shared frontend setup and display flows on top of this contract.

## Unresolved questions
- None after validation; recovery alert stays off by default in v1.
