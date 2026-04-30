# Researcher 01 Report: Backend + MQTT Realtime

## Current Architecture
- MQTT Bridge publishes internal events with envelope `{ correlation_id, event_type, timestamp, payload }` in `Tracking_MqttBridge/src/publishers/internal-event.publisher.ts:20`.
- Backend subscribes `internal/events/#` and maps `status/data/session/alert/zone/ignition` to in-process realtime events in `Tracking_Backend/src/infrastructure/realtime/mqtt-event-listener.ts:247`.
- Backend EventBus is plain Node `EventEmitter`, RAM-only, no durable replay in `Tracking_Backend/src/infrastructure/realtime/event-bus.util.ts:197`.
- Socket.IO server creates namespaces `dashboard/devices/notifications/exports/firmware` in `Tracking_Backend/src/infrastructure/realtime/socket-server.util.ts:17`.
- Socket auth checks session token and stores user in `socket.data.user` in `Tracking_Backend/src/infrastructure/realtime/socket-auth.middleware.ts:29`.
- Event bridge emits to namespaces in `Tracking_Backend/src/infrastructure/realtime/socket-server.util.ts:100`.

## Confirmed Event Sources
- Raw telemetry -> `device:position` through internal `data` event in `mqtt-event-listener.ts:333`.
- Status -> `device:status` in `mqtt-event-listener.ts:284`.
- Session start/end -> `device:session_start/end` in `mqtt-event-listener.ts:418`.
- Device/OBD alert -> `alert:new` in `mqtt-event-listener.ts:437` and `alert-crud.service.ts:51`.
- Activity -> `activity:new` only when alert is created in `alert-crud.service.ts:64`.
- Zone config mutation -> `zone:updated` in `domain/zone/services/vehicle-zone.service.ts:189`.
- Allowed zone mutation -> `geofence:allowed-zone-updated` in `domain/geofence/services/vehicle-allowed-zone.service.ts:148`.
- Export completion/failure -> `export:ready` in `domain/export/services/export-processing.service.ts:19`.
- Firmware assignment -> `firmware:assignment` in `domain/firmware/services/firmware-deploy.service.ts:313`.

## Critical Realtime Gaps
- RAM-only EventBus means backend restart loses in-flight events and no replay/resume.
- Internal event envelope lacks top-level `eventId`/cursor. Metadata has `message_id`, `seq_no`, `boot_id`, but not normalized across all sources.
- Socket bridge emits device status/position to whole `/devices` namespace, not per-device room. `command:ack` is room-scoped, but hot telemetry is broadcast.
- Socket auth stores user role/access mode but event bridge does not filter by user/device access before broadcast.
- No `stats:update` producer found outside bridge subscriptions; dashboard mostly refetches stats.
- Firmware progress from `Tracking_MqttBridge/src/handlers/firmware.handler.ts` is persisted/logged but not published as internal event; frontend only receives assignment, not OTA progress.
- Frontend listens for `export:progress`, but backend EventBus only defines/emits `export:ready`.
- No server-side reconnect resume: no `resume`, no cursor replay, no delta since timestamp.
- No backpressure strategy for high-frequency `device:position`; raw telemetry can be emitted to namespace directly.

## Acceptable Fetch Boundaries
- Initial snapshot for dashboard/map/device list before socket catches up.
- Historical telemetry, trip replay, pagination/search/filter.
- Export download/list refresh, audit/admin rarely used actions.
- Reconnect recovery when cursor cannot be replayed.

## Recommended Event Model
- Keep colon-style names, but standardize envelope:
  - `eventId`, `eventType`, `occurredAt`, `deviceId?`, `vehicleId?`, `seqNo?`, `bootId?`, `source`, `payload`.
- Hot events:
  - `device:position`, `device:status`, `device:session_start`, `device:session_end`.
  - `alert:new`, `notification:new`, `notification:updated`.
  - `zone:updated`, `zone:state-changed`, `geofence:allowed-zone-updated`, `geofence:allowed-zone-state-changed`.
  - `firmware:progress`, `firmware:assignment`, `export:ready`.
- Scope:
  - device room: `device:{deviceId}` for position/status/session/command.
  - dashboard namespace for aggregate events only.
  - notifications namespace for user-visible alert/notification events.
  - firmware/export by job/user room where possible.

## Reconnect / Ordering / Backpressure
- Phase 1: reconnect triggers authoritative initial snapshot refetch only for active views.
- Phase 2: add lightweight event cursor store if needed; avoid full event-sourcing now.
- Dedupe by `eventId` or `(deviceId, bootId, seqNo, eventType)`.
- Ordering promise should be per-device best-effort only; avoid claiming total order.
- Throttle/merge `device:position` server-side or client-side; keep latest-known-value, never queue unlimited.

## Risks / Tests
- Test namespace auth and access isolation.
- Test frontend receives all namespace events after provider rewrite.
- Test burst telemetry does not refetch storm.
- Test duplicate/out-of-order MQTT metadata does not regress UI state.
- Test firmware progress and export event contracts match frontend listeners.

## Unresolved Questions
- Should backend add durable cursor store now, or snapshot-refetch on reconnect is enough for UAT?
- Is device access filtering required per customer/user now, or only role-level today?
- Do we need native mobile realtime, or WebView frontend realtime is enough?
