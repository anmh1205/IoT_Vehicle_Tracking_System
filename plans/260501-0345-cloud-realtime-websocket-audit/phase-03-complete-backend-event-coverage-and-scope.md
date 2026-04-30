# Phase 03: Complete backend event coverage and scope

## Context links
- Plan: `plan.md`
- Backend research: `research/researcher-01-backend-mqtt-realtime-report.md`
- Scout: `scout/scout-01-realtime-file-map.md`
- Depends on contract from Phase 01 and payload needs from Phase 02.

## Overview
- Priority: P1 high.
- Status: pending.
- Effort: 4h.
- Close missing backend event coverage and reduce over-broadcast. Keep EventBus RAM-only for now; durable cursor optional later.

## Key Insights
- Backend emits Socket.IO namespaces `/devices`, `/dashboard`, `/notifications`, `/exports`, `/firmware` at `/ws`.
- Hot `device:position/status` mostly broadcast to whole `/devices`; only `command:ack` is room-scoped.
- EventBus is RAM-only; no replay/resume cursor.
- Export page expects `export:progress`, backend emits only `export:ready`.
- Firmware handler persists progress but does not publish realtime progress; backend emits assignment only.
- Dashboard `stats:update` producer appears incomplete.

## Requirements
<!-- Updated: Validation Session 1 - real export progress and system/admin/simulator event coverage -->
- Functional: standardize event envelope; add real `export:progress`; add/align firmware progress events; publish notification updates; scope hot device events to assigned-device rooms; keep dashboard aggregate events minimal.
- Functional: add real event coverage for system/admin/simulator data that currently relies on data-source polling; do not fake heartbeat events just to satisfy UI.
- Non-functional: no full event-sourcing now; avoid DB writes solely for every realtime event; do not break existing REST APIs.
- Classification: critical realtime gap for missing end-to-end events and broad hot broadcasts.

## Architecture
- Event names: `device:position`, `device:status`, `device:session_start`, `device:session_end`, `alert:new`, `notification:new`, `notification:updated`, `stats:update`, `activity:new`, `zone:updated`, `geofence:allowed-zone-updated`, `export:ready`, optional `export:progress`, `firmware:assignment`, `firmware:progress`.
- Payload boundary: event envelope carries identifiers/metadata; payload carries domain state required for cache patch, not full unrelated records.
- Subscription scope: device room `device:{deviceId}` for hot telemetry/session/status; dashboard namespace only aggregate/activity; notifications per authenticated user/role; firmware/export by job/user room if backend has ownership data.
- Auth/permission: server filters by role/access before room join and before user/job scoped emits.
- Idempotency/order: propagate `message_id`, `seq_no`, `boot_id` into normalized `eventId/seqNo/bootId` when available.
- Backpressure: coalesce/throttle high-frequency positions before namespace broadcast if burst risk observed.

## Related code files
- Modify: `Tracking_Backend/src/infrastructure/realtime/event-bus.util.ts`
- Modify: `Tracking_Backend/src/infrastructure/realtime/mqtt-event-listener.ts`
- Modify: `Tracking_Backend/src/infrastructure/realtime/socket-server.util.ts`
- Modify: `Tracking_Backend/src/domain/export/services/export-processing.service.ts`
- Modify: `Tracking_Backend/src/domain/firmware/services/firmware-deploy.service.ts`
- Modify: `Tracking_MqttBridge/src/handlers/firmware.handler.ts`
- Modify: notification services/controllers as needed for `notification:*` events.
- Verify: dashboard stats service, alert CRUD service, geofence/zone services.
- Create/Delete: none unless existing module needs small event contract helper.

## Implementation Steps
1. Freeze event envelope fields and update shared backend event types.
2. Normalize MQTT metadata into `eventId`, `seqNo`, `bootId`, `occurredAt` in listener.
3. Add room-scoped emit path for hot device events; preserve namespace broadcast only if global dashboard requires it.
4. Implement backend `device:join/leave` access checks for room `device:{deviceId}`.
5. Align export events: either remove frontend `export:progress` expectation or add real progress if producer exists; prefer KISS: emit only real progress, otherwise UI listens `export:ready`.
6. Publish firmware progress from MQTT bridge/internal event to backend and `/firmware` namespace.
7. Add notification create/update realtime events from persistence services.
8. Add dashboard aggregate producer only where payload already computed; otherwise let frontend use selective refetch.
9. Add backend tests for event mapping, room scope, and missing event contracts.

## Todo list
- [ ] Define backend event envelope.
- [ ] Normalize MQTT metadata.
- [ ] Scope hot device events to rooms/access.
- [ ] Resolve export progress vs ready contract.
- [ ] Add firmware progress end-to-end.
- [ ] Add notification update events.
- [ ] Verify dashboard aggregate events.
- [ ] Backend typecheck/tests.

## Success Criteria
- Frontend listener event names match backend emitted names.
- Firmware progress reaches `/firmware` clients when persisted.
- Export UI no longer waits for nonexistent event.
- Hot device events are not blindly broadcast to unauthorized clients.
- Existing command ack behavior remains room-scoped.

## Risk Assessment
- Room scoping can hide events from pages expecting all-fleet updates; define all-fleet subscription explicitly.
- Firmware/export ownership may be unclear; prefer authenticated user/job rooms only when data model supports it.
- Adding `stats:update` without complete payload causes wrong dashboard values; use selective refetch instead.

## Security Considerations
- Server-side authorization is mandatory for room joins and user/job scoped emits.
- Never rely on client filtering to protect device telemetry.
- Event payloads must exclude secrets/raw tokens/internal stack traces.

## Next steps
- Phase 04 validates reconnect behavior and burst handling after event coverage lands.
- Unresolved questions: exact per-user device permission source; whether export progress is truly available or should be removed from UI contract.
