# Scout Report: Cloud Realtime File Map

## Relevant Files

### Backend / Realtime Core
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/index.ts` - app bootstrap, WebSocket server, MQTT event listener wiring. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/socket-server.util.ts` - Socket.IO setup, namespaces, event bus to socket bridge, health/metrics. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/event-bus.util.ts` - canonical colon-style realtime event contracts and in-process bus. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/mqtt-event-listener.ts` - consumes internal MQTT events and publishes backend realtime events. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/socket-auth.middleware.ts` - socket handshake/session auth. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/health.ts` - WS connections and event emission health snapshot. Priority: Medium.

### Backend API / Domain Candidates
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/telemetry.controller.ts` - telemetry/raw data reads likely still fetch-driven. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/device.controller.ts` - device list/status API surface. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/vehicle.controller.ts` - vehicle CRUD/status API surface. Priority: Medium.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/alert.controller.ts` - alert reads/acknowledgement may need realtime invalidation/events. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/notification.controller.ts` - notification reads/mutations may need socket updates. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/statistics.controller.ts` - dashboard/statistics snapshots may remain fetch-only. Priority: Medium.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/system.controller.ts` - system status likely snapshot/admin refresh. Priority: Medium.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/firmware.controller.ts` - OTA progress/assignment realtime scope. Priority: Medium.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/system/services/system-status.service.ts` - runtime health aggregation. Priority: Medium.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/dashboard/services/dashboard-stats.service.ts` - dashboard aggregates. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/notification/services/notification.service.ts` - notification persistence/update events. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/firmware/services/firmware-deploy.service.ts` - firmware lifecycle events. Priority: Medium.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/services/vehicle-allowed-zone.service.ts` - allowed-zone mutation/event contract. Priority: Medium.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/vehicle/services/vehicle-status.service.ts` - vehicle status derivation. Priority: High.

### MQTT Bridge
- `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/index.ts` - MQTT route bootstrap and handlers. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/handlers/rawdata.handler.ts` - telemetry/rawdata ingest, persistence, geofence, internal event publish. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/handlers/status.handler.ts` - device status/session lifecycle and internal events. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/handlers/event.handler.ts` - device events/alerts and internal events. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/publishers/internal-event.publisher.ts` - internal MQTT event publisher. Priority: High.

### Frontend / Realtime Core
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/components/providers/socket-provider.tsx` - socket client/provider, auth token, device join/leave. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/notifications/hooks/use-realtime-events.ts` - event listener to query invalidation/notifications. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/lib/utils/query-invalidation.ts` - centralized React Query invalidation by event domain. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/components/providers/query-provider.tsx` - React Query defaults. Priority: Medium.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/hooks/use-device-status-realtime.ts` - timer-based status hook, not pure socket. Priority: Medium.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/map/hooks/use-map-realtime.ts` - map update/buffer timer behavior. Priority: Medium.

### Frontend Pages with Manual Refresh / Refetch Signals
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/page.tsx` - dashboard manual `refetch()`. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/map/page.tsx` - map manual refresh. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/devices/page.tsx` - devices manual refetch. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/notifications/page.tsx` - notifications manual refresh. Priority: High.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/trips/[id]/page.tsx` - interval/refetch live preview. Priority: High.

### Mobile
- `iot-vehicle-tracking-system-cloud/Tracking_Mobile/lib/core/config/app_config.dart` - `WS_URL` config and validation. Priority: Medium.
- `iot-vehicle-tracking-system-cloud/Tracking_Mobile/lib/features/offline/sync_service.dart` - connectivity/offline sync, not active realtime. Priority: Low.
- `iot-vehicle-tracking-system-cloud/Tracking_Mobile/lib/core/services/connectivity_service.dart` - connectivity hooks for reconnect/resync. Priority: Low.

## Patterns
- Backend uses Socket.IO namespaces: `/dashboard`, `/devices`, `/notifications`, `/exports`, `/firmware`.
- Realtime contract uses colon-style names: `device:*`, `stats:update`, `alert:new`, `zone:*`, `geofence:*`, `export:ready`, `firmware:*`.
- MQTT Bridge publishes internal MQTT events; backend listener bridges them to Socket.IO.
- Frontend has socket provider, but React Query invalidation/refetch remains the dominant UI data update strategy.
- Several hooks/pages named realtime still use timer, buffer, manual `refetch`, or manual refresh buttons.

## Gaps
- Need verify which backend services emit `publishEvent(...)` outside MQTT listener.
- Need verify if frontend socket listeners update cache directly or only invalidate/fetch.
- Need classify fetch use: acceptable initial snapshot/history/export/admin vs avoidable refresh/refetch.
- Need decide mobile scope: native socket service now, or defer because current shell likely consumes web dashboard.

## Unresolved Questions
- Should realtime scope cover mobile native now, or only ensure WebView/dashboard receives realtime updates?
- Should system-status/admin pages be realtime or acceptable manual refresh because low-frequency/operator-only?
