## Code Review Summary

### Scope
- Work context: `E:/anmh1205/IoT_Vehicle_Tracking_System`
- Files: cloud backend/frontend/MQTT bridge changed files only.
- Excluded: firmware changes, deleted debate resources, untracked `NUL`, generated coverage.
- LOC: ~958 additions / 139 deletions in scoped cloud diff, including backend coverage dependency lockfile.
- Focus: Socket.IO `/ws`, namespaces, device/user room scoping, frontend namespace-aware hooks, polling removal, realtime producers.
- Validation basis: user-reported backend verify/test:cov/build, MQTT bridge verify/build, frontend lint/typecheck/build, Docker health, HTTP smoke.

### Overall Assessment
Implementation is directionally correct for the audit goal: `/ws` path remains, five namespaces exist, hot device events are room-scoped, export events use `user:{id}`, frontend subscriptions are namespace-aware, and `refetchInterval` is absent from frontend `src` TS/TSX. Main regressions are frontend room joins and incomplete server-side event authorization.

### Critical Issues
None found in scoped diff.

### High Priority

1. **Room-scoped device events now break consumers that never join `device:{deviceId}`**
   - Paths:
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/devices/hooks/use-device-realtime.ts`
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/devices/hooks/use-device-position-snapshot.ts`
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/trips/hooks/use-trip-live-tracking.ts`
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/notifications/hooks/use-realtime-events.ts`
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/devices/components/device-detail-modal/modal-container.tsx`
   - Evidence: backend emits `device:status`, `device:position`, `device:session_start`, `device:session_end` only to `device:{deviceId}`. Only `use-device-positions.ts` joins/leaves device rooms. Device detail modal also omits `namespace: 'devices'`, so it subscribes to default `/dashboard`.
   - Impact: device list, device snapshot, trip live tracking, session/command invalidations, and device detail refresh can silently stop once polling/broadcasting is removed.
   - Fix: add shared `useDeviceRoom(deviceId, enabled)` and call it from every single-device/trip/detail consumer; list/map views should join visible authorized device IDs. Add `namespace: 'devices'` to modal device-event subscriptions.

2. **Firmware/system-admin realtime events are only authenticated, not authorized**
   - Paths:
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/socket-server.util.ts`
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/components/providers/socket-provider.tsx`
   - Evidence: all namespaces use the same `socketAuthMiddleware`; provider connects all authenticated users to `/dashboard`, `/firmware`, `/exports`, `/notifications`, `/devices`. `firmware:assignment`, `firmware:progress`, `system-admin:settings`, `simulator:status` broadcast namespace-wide.
   - Impact: any authenticated user can subscribe manually to firmware deployment progress and admin setting-change metadata. Frontend route guards do not protect WebSocket transport.
   - Fix: add namespace/event authorization or role rooms. At minimum gate `/firmware` and `system-admin:settings` to intended roles, and avoid eager-connecting sensitive namespaces.

### Medium Priority

1. **`notification:new` leaks alert context namespace-wide**
   - Paths:
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/alert/services/alert-crud.service.ts`
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/socket-server.util.ts`
   - Evidence: `createAlert` publishes `notification:new` with alert title/message/device/vehicle fields; bridge emits it to all clients in `/notifications`.
   - Impact: device-restricted users can receive metadata for alerts outside their access scope.
   - Fix: publish per target user, or route through authorized device/user rooms. Keep only sanitized truly-global notification payloads broadcast.

2. **Firmware terminal contract mismatch**
   - Paths:
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/page.tsx`
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/mqtt-event-listener.ts`
   - Evidence: frontend listens for `firmware:complete`, but no producer exists; backend emits only `firmware:progress`.
   - Impact: deployment summary invalidation on terminal status may not happen.
   - Fix: handle terminal `firmware:progress.status` values client-side, or emit documented `firmware:complete` server-side.

3. **New-device discovery after polling removal is incomplete**
   - Path: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/map/hooks/use-device-positions.ts`
   - Evidence: map joins rooms only from initial/reconnect snapshot; no `refetchInterval` remains.
   - Impact: newly assigned/created devices may not appear/join until reconnect/manual invalidation.
   - Fix: add authorized low-frequency discovery refresh or a `device:list-changed`/assignment event to invalidate the snapshot.

### Low Priority
- Five eager Socket.IO namespace connections per authenticated user amplify auth DB lookups and reconnect room-join checks. Consider lazy namespace connection if scale becomes a problem.
- `MAX_DEVICE_ROOM_JOINS = 500` limits one join payload, but reconnect can still trigger up to 500 DB checks per user socket; cache authorized IDs per socket/session if needed.

### Edge Cases Found by Scout
- Most `/devices` listeners do not join `device:{deviceId}` after backend made hot events room-scoped.
- Default namespace in `useRealtimeSubscription` can hide missing `namespace: 'devices'` at call sites.
- Reconnect snapshot fallback exists for map, but not for trip/device detail flows unless rooms are joined.
- Firmware consumer expects `firmware:complete`; producer emits `firmware:progress` only.
- Namespace-level auth is too coarse for firmware/admin/system events.

### Positive Observations
- Socket.IO path remains `path: '/ws'`.
- Namespaces are explicit: `/devices`, `/dashboard`, `/notifications`, `/exports`, `/firmware`.
- Hot device events are no longer broadcast to the entire `/devices` namespace.
- Device room join authorization uses parameterized SQL and supports root/admin/`deviceAccessMode=all`/`user_device_access`.
- Export progress and ready events route through `user:{user_id}`.
- `refetchInterval` was not found under frontend `src` TS/TSX.
- Real producers exist for export progress, firmware progress, simulator status, system-admin settings, `notification:new`, and `notification:updated`.

### Recommended Actions
1. Fix all `/devices` consumers to join required rooms; add missing `namespace: 'devices'` in device detail modal.
2. Add server-side authorization for `/firmware` and admin/system events; do not rely on frontend guards.
3. Scope `notification:new` to authorized users/devices.
4. Align firmware terminal event contract.
5. Add discovery trigger for newly visible devices after polling removal.
6. Add focused realtime tests for authorized join, denied join, non-joined socket no delivery, joined socket delivery, restricted namespace access, and firmware terminal handling.

### Metrics
- Type Coverage: not measured in this review.
- Test Coverage: not measured directly; user reported backend `test:cov` passed.
- Linting Issues: not measured directly; user reported frontend lint/typecheck passed.

### Unresolved Questions
- Is `/dashboard` intended for all authenticated roles, or only selected roles?
- Should firmware progress be visible to all authenticated users, admins only, or users with access to affected devices?
- Which event should represent device assignment/list changes for discovery without hot polling?
