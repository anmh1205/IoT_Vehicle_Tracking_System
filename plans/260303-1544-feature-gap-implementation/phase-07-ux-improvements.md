# Phase 7: UX Improvements

**Priority:** 🟢 Thấp
**Status:** Pending
**Estimated effort:** 2-3 hours

## Items

### 7A: Browser Desktop Notifications for Alerts

- Use `Notification API` when new alert arrives via WebSocket
- Request permission on first visit
- Show alert type, vehicle, severity in notification

**Modify:**
- `Tracking_Frontend/src/components/providers/realtime-provider.tsx`
- `Tracking_Frontend/src/features/alerts/` — add notification trigger

### 7B: Trip Live Tracking via WebSocket (replace polling)

- Currently: trip detail page polls telemetry every 10s for in_progress trips
- Better: WebSocket push new GPS points as they arrive
- Backend: emit trip waypoint events on Socket.IO `/dashboard` namespace

**Modify:**
- `Tracking_Backend/src/infrastructure/realtime/` — emit trip GPS updates
- `Tracking_Frontend/src/app/dashboard/trips/[id]/page.tsx` — subscribe to WS instead of polling

### 7C: Batch Operations

- Assign multiple vehicles to geofence at once (already supported in API)
- Frontend: add multi-select checkbox in vehicle list for bulk operations

**Modify:**
- `Tracking_Frontend/src/features/geofences/` — multi-vehicle selector

### 7D: Loading States & Skeletons

- Verify all pages have proper loading/skeleton states
- Add where missing (likely trips, violations pages)

## Success Criteria

- [ ] Desktop notification pops up on new alert
- [ ] Trip in_progress updates map without polling
- [ ] Geofence can be assigned to multiple vehicles via UI
- [ ] All data pages show skeletons while loading
