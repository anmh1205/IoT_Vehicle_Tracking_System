## Code Review Summary

### Scope
- Files:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/socket-server.util.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/components/providers/socket-provider.tsx`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/devices/hooks/use-device-realtime.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/devices/hooks/use-device-position-snapshot.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/trips/hooks/use-trip-live-tracking.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/devices/page.tsx`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/trips/[id]/page.tsx`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/trips/components/trip-preview-dialog.tsx`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/notifications/hooks/use-realtime-events.ts`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/devices/components/device-detail-modal/modal-container.tsx`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/page.tsx`
- LOC: scoped diff `+637/-148`.
- Focus: recent realtime WebSocket audit fixes only.
- Scout findings: reviewed room scoping, device access data flow, notification fanout, reconnect/join races, reference-counted leave, firmware terminal statuses.

### Overall Assessment
The fixes address the main audit requirements: firmware namespace is restricted to admin/root, system-admin dashboard events are room-scoped, device events are room-scoped, frontend consumers join device rooms, frontend room leave is reference-counted, and firmware progress terminal statuses now drive completion/failure UI.

No Critical issue found in the scoped files.

### Critical Issues
None.

### High Priority
1. **Unhandled async failure in `device:join` can produce unhandled rejection and break room subscription reliability**
   - File: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/socket-server.util.ts`
   - Lines: `107-129`
   - Problem: `socket.on('device:join', ...)` calls `void Promise.all(...)` without `.catch()`. `joinDeviceRoom()` awaits `canAccessDevice()`, which performs a database query. If Postgres is temporarily unavailable or the query fails, the Promise rejects outside Socket.IO's sync error path.
   - Impact: depending on Node/runtime unhandled-rejection settings, this can log noisy unhandled rejections or terminate the process. The client also gets no deterministic `device:join_denied`/error response, so `/devices` consumers may wait on room-scoped events they never joined.
   - Suggested fix: wrap join handling in an async IIFE with `.catch()` and emit a deterministic join error, e.g. catch DB failure, log `device:join_failed`, and `socket.emit('device:join_denied', { deviceId, reason: 'access_check_failed' })` or a separate `device:join_error` event. Keep the existing authorization denial path.

### Medium Priority
1. **Notification scoping intentionally broadcasts when device/vehicle cannot be resolved; keep this as explicit security contract**
   - File: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/socket-server.util.ts`
   - Lines: `232-280`
   - Problem: unresolved `deviceId`/`vehicleId` falls back to namespace-wide broadcast.
   - Impact: this matches the stated requirement only for events where no device/vehicle can be resolved. If future alert/notification publishers omit identifiers by mistake, the fallback becomes broad delivery.
   - Suggested fix: add tests or logging assertions for each publisher that should carry `deviceId`/`vehicleId`. For high-sensitivity notification types, prefer fail-closed instead of broadcast when identifier resolution fails.

2. **Firmware page still runs firmware/devices queries before the local role gate returns the restricted UI**
   - File: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/page.tsx`
   - Lines: `46-96`, `246-257`
   - Problem: React hooks execute before `if (!access.canManageFirmware) return ...`, so non-admin/root users still instantiate firmware and device queries. The WebSocket namespace is protected by provider/backend, but REST queries still fire unless each API route blocks them.
   - Impact: not a WebSocket namespace leak by itself, but unnecessary restricted API traffic and noisy 403s for unauthorized users.
   - Suggested fix: set `enabled: access.canManageFirmware` on firmware/devices/deployment queries, or move restricted data hooks into an admin-only child component.

### Low Priority
1. **Room reference keys are not trimmed on the frontend**
   - File: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/components/providers/socket-provider.tsx`
   - Lines: `121-149`
   - Problem: backend trims device IDs; frontend reference-count map uses raw `String(deviceId)`.
   - Impact: unlikely with current data, but mixed inputs like `'TRACKER_001'` and `' TRACKER_001 '` can over-count or under-count locally.
   - Suggested fix: normalize with `.trim()` before map lookup and emit.

### Edge Cases Found by Scout
- Device room access query failure is not caught in `device:join` async path.
- Notification fanout is scoped when `deviceId`/`vehicleId` resolves, but unresolved identifiers still broadcast.
- Reference-counted frontend leave prevents one consumer from leaving another consumer's room; reconnect re-emits joined devices on `/devices` connect.
- Firmware terminal statuses are handled from `firmware:progress`; no dependency on `firmware:complete` remains in scoped frontend page.
- `system-admin:settings` uses `/dashboard` `role:system-admin` room and only admin/root sockets join that room.

### Positive Observations
- Backend namespace guard blocks `/firmware` for non-admin/root before connection completes.
- `/devices` events now emit to `device:{deviceId}` rooms instead of namespace-wide broadcast.
- Frontend consumers moved subscriptions to the correct namespaces.
- Device room join/leave reference counting is simple and appropriate.
- Firmware progress UI handles `completed`, `success`, `failed`, and `stuck_timeout` as terminal states.

### Recommended Actions
1. Add catch/error handling around backend `device:join` Promise path.
2. Gate firmware page data queries with `access.canManageFirmware` or split into admin-only child component.
3. Add regression tests for notification fallback behavior and device join DB-failure behavior.
4. Normalize frontend device room IDs with `.trim()`.

### Metrics
- Type Coverage: not measured in this review.
- Test Coverage: validation reported passed by tester/user; exact percentage not re-measured.
- Linting Issues: validation reported passed by tester/user; exact count not re-measured.

### Unresolved Questions
- Should unresolved `alert:new`/`notification:new` payloads be allowed to broadcast, or should sensitive notification types fail closed when device/vehicle resolution fails?
