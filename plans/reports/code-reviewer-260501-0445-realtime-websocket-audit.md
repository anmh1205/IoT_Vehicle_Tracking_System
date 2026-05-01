## Code Review Summary

### Scope
- Work context: `E:/anmh1205/IoT_Vehicle_Tracking_System`
- Files reviewed: cloud backend/frontend/MQTT bridge changed files only.
- Excluded per request: firmware changes, deleted `resources/*`, `NUL`, generated coverage output.
- Focus: Socket.IO `/ws`, namespaces, device room authorization, frontend namespace routing, polling removal, reconnect snapshot fallback, realtime producers.
- Validation basis: user-reported backend verify/test:cov/build, MQTT bridge verify/build, frontend lint/typecheck/test placeholder/build, Docker healthy, `/login` and `/ws-health` smoke.

### Overall Assessment
Realtime direction is mostly correct: Socket.IO path and namespaces are explicit, device hot events are no longer broadcast globally, `user:{id}` rooms protect export events, and MQTT firmware progress is wired end-to-end. Main regressions are on the frontend join model: several consumers now listen on `/devices` but never join authorized `device:{deviceId}` rooms, while polling was removed. Security is also incomplete at namespace/event level: all authenticated clients connect to `/firmware` and `/dashboard`, and some sensitive events are broadcast to entire namespaces.

### Critical Issues
None found in scoped diff.

### High Priority

1. **Room-scoped device events break consumers that never join rooms**
   - Paths:
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/devices/hooks/use-device-realtime.ts`
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/devices/hooks/use-device-position-snapshot.ts`
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/trips/hooks/use-trip-live-tracking.ts`
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/notifications/hooks/use-realtime-events.ts`
   - Evidence:
     - Backend now emits `device:status`, `device:position`, `device:session_start`, `device:session_end` only to `device:{deviceId}` in `socket-server.util.ts` lines 159-193.
     - Only `use-device-positions.ts` calls `joinDeviceRoom`/`leaveDeviceRoom`.
     - Device list, device snapshot, trip live tracking, command/session notification hooks subscribe to `/devices` but do not join any room.
   - Impact:
     - Device list and single-device snapshot do not update unless another mounted component happened to join the room.
     - Active trip telemetry polling was removed, so live trip pages/previews can go stale.
     - Command/session realtime side effects can silently stop.
   - Fix:
     - Add a shared hook such as `useDeviceRoom(deviceId, enabled)` and call it from all single-device/trip consumers.
     - For list/map views, join visible/authorized device IDs from the snapshot.
     - For trip live tracking, pass the trip/device public ID into `useTripLiveTracking` and join that room before relying on `device:position`.
     - If a consumer truly needs fleet-wide events, add an explicit backend-authorized fleet room for root/admin/all users instead of relying on namespace broadcast.

2. **Firmware/system-admin realtime namespaces lack server-side authorization**
   - Paths:
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/socket-server.util.ts`
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/components/providers/socket-provider.tsx`
   - Evidence:
     - `attachNamespaceHandlers` applies only `socketAuthMiddleware` to every namespace; no role/capability checks for `/firmware`, `/dashboard`, or admin-related events.
     - `SocketProvider` creates sockets for all five namespaces for every authenticated user.
     - `firmware:assignment`, `firmware:progress`, `system-admin:settings`, `simulator:status` are broadcast to whole namespaces.
   - Impact:
     - Any authenticated user can manually subscribe to firmware deployment progress and system-admin setting change metadata.
     - Frontend route guards do not protect the WebSocket transport.
   - Fix:
     - Add namespace-level authorization middleware or event-specific rooms:
       - `/firmware`: root/admin or firmware permission.
       - `system-admin:settings`: root/admin only, preferably `admin:{id}`/role room.
       - Dashboard operational events: verify intended audience.
     - Do not auto-connect sensitive namespaces from `SocketProvider`; lazy-connect by feature/page if possible.

### Medium Priority

1. **Notification events leak cross-user/device context**
   - Paths:
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/alert/services/alert-crud.service.ts`
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/socket-server.util.ts`
   - Evidence:
     - `createAlert` publishes `notification:new` with alert title/message/reference/device/vehicle data.
     - `socket-server.util.ts` emits `notification:new` to all clients in `/notifications`.
   - Impact:
     - Device-restricted users can receive notification metadata for devices they may not be allowed to access.
   - Fix:
     - Route alert/notification events to authorized target users or authorized device rooms.
     - For global system notifications, send a sanitized global payload and keep device-specific details behind user/device-scoped delivery.

2. **Firmware page expects `firmware:complete`, but backend only emits `firmware:progress`**
   - Paths:
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/page.tsx`
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/socket-server.util.ts`
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/mqtt-event-listener.ts`
   - Evidence:
     - Frontend registers `firmware:complete` handler and invalidates deployment summary only there.
     - Backend bridge emits `firmware:progress` for all firmware statuses; no `firmware:complete` producer found.
   - Impact:
     - Deployment summary can stay stale after success/failure even though progress events arrive.
   - Fix:
     - Treat terminal `firmware:progress.status` values (`success`, `completed`, `failed`, `rolled_back`, `stuck_timeout`) as completion and invalidate `['firmware-deployments-summary']`.
     - Or emit a documented `firmware:complete` event from backend and keep payload schema aligned.

3. **Removed polling leaves no discovery path for newly visible devices**
   - Path: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/map/hooks/use-device-positions.ts`
   - Evidence:
     - Initial `device-positions` query joins rooms for devices present in the snapshot.
     - `refetchInterval: 2_000` was removed.
     - Refresh fallback is only on `/devices` reconnect.
   - Impact:
     - A newly assigned/created device will not be joined or displayed until reconnect or another invalidation happens.
   - Fix:
     - Add an authorized low-frequency discovery refresh, or subscribe to a non-hot `device:list-changed`/assignment event that invalidates `device-positions` and joins new devices.

4. **Socket connect fan-out causes repeated DB auth and room authorization load**
   - Paths:
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/components/providers/socket-provider.tsx`
     - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/socket-server.util.ts`
   - Evidence:
     - Provider creates sockets for five namespaces per authenticated user.
     - Each namespace runs DB-backed session lookup via auth middleware.
     - Device reconnect rejoins all remembered device IDs, up to 500 DB checks per socket.
   - Impact:
     - Acceptable in small deployments, but reconnection storms can amplify DB load.
   - Fix:
     - Lazy-connect namespaces when first subscribed.
     - Cache per-socket authorized device IDs for session lifetime.
     - Add throttling/backoff or server-side rate limiting for `device:join`.

### Edge Cases Found by Scout
- Frontend listeners moved to `/devices` but most call sites do not join `device:{deviceId}`.
- Reconnect snapshot fallback exists for map/simulator/system status, but not for trip telemetry or device snapshot unless room joins are added.
- Producer/consumer mismatch: `firmware:complete` consumer has no scoped producer.
- Namespace-only auth is too coarse for firmware/admin events.
- New-device discovery is not covered after hot polling removal.

### Positive Observations
- Device hot events are no longer broadcast to the whole `/devices` namespace.
- `device:join` uses parameterized SQL and supports `deviceAccessMode=all`/root/admin/user access.
- Export progress/ready uses `user:{id}` routing, avoiding cross-user export leakage.
- MQTT bridge firmware event path is straightforward and avoids frontend mock polling.
- `useRealtimeSubscription` now respects namespaces with a narrow union type.

### Recommended Actions
1. Fix all `/devices` consumers to join required rooms before relying on realtime; restore minimal fallback polling where no room key is available.
2. Add server-side namespace/event authorization for firmware and admin/system events.
3. Scope `notification:new` and alert-derived notification delivery to authorized users/devices.
4. Align firmware terminal event contract: handle terminal `firmware:progress` or emit `firmware:complete`.
5. Add a low-frequency/new-device discovery trigger after removing map polling.
6. Add focused tests for: unauthorized device join denied, authorized room receives event, non-joined socket does not receive event, trip/device hooks join rooms, firmware terminal progress invalidates summary, restricted user cannot subscribe to firmware/admin events.

### Metrics
- Type Coverage: not measured in this review.
- Test Coverage: not measured directly; user reported backend `test:cov` passed.
- Linting Issues: not measured directly; user reported frontend lint/typecheck passed.

### Unresolved Questions
- Is `/dashboard` intended for every authenticated user, or only root/admin/operator roles?
- Should firmware progress be visible to all authenticated users, only admins, or users with access to the affected device?
- What event should represent device assignment/list changes so map/device lists can discover newly visible devices without hot polling?
