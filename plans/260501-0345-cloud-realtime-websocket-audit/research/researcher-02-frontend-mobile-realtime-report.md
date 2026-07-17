# Researcher 02 Report: Frontend + Mobile Realtime Gaps

## Current Architecture
- Frontend creates one Socket.IO client in `Tracking_Frontend/src/components/providers/socket-provider.tsx:24`.
- It uses `transports: ['websocket']`, reconnection enabled, but connects one namespace only in `socket-provider.tsx:26`.
- Backend emits to `/devices`, `/dashboard`, `/notifications`, `/exports`, `/firmware`, while frontend subscription hook ignores its `namespace` option in `src/hooks/use-realtime-subscription.ts:4`.
- Global realtime handling mostly invalidates React Query cache in `src/features/notifications/hooks/use-realtime-events.ts:21` and `src/lib/utils/query-invalidation.ts:3`.
- Map has a real socket-driven reducer path: `useMapRealtime` listens `device:position/status` and batches store updates in `src/features/map/hooks/use-map-realtime.ts:129`.

## Critical Realtime Gaps
- **Namespace mismatch:** frontend has one socket; backend emits to namespace-specific sockets. If `NEXT_PUBLIC_WS_URL` is base URL, most events are never received.
- `useRealtimeSubscription` has `namespace?: string` but does not use it, so callers cannot select `/devices`, `/dashboard`, etc.
- `joinDeviceRoom` emits on the single socket in `socket-provider.tsx:50`; backend only handles `device:join` inside `/devices` namespace.
- `useDevicePositions` polls map positions every 2s in `src/features/map/hooks/use-device-positions.ts:70`, despite `useMapRealtime` existing.
- Device list invalidates all devices on every `device:position` in `src/features/devices/hooks/use-device-realtime.ts:19`, causing refetch storm risk.
- Dashboard stats/activity still poll: 60s and 30s in `src/features/dashboard/hooks/use-dashboard-stats.ts:455`.
- Notifications list/stats poll every 30s in `src/features/notifications/hooks/use-notifications.ts:15` and `use-notification-stats.ts:5`.
- Trip detail/preview telemetry polls every 30s while active in `src/app/dashboard/trips/[id]/page.tsx:66` and `src/features/trips/components/trip-preview-dialog.tsx:74`.
- System status/admin/simulator polling exists, but likely acceptable or lower priority because admin/ops rare/non-device realtime.
- `exports/page.tsx` listens for `export:progress` in `src/app/dashboard/exports/page.tsx:187`, but backend does not define/emit it.
- Mobile has `WS_URL` config in `Tracking_Mobile/lib/core/config/app_config.dart:18`, but no native socket client found; mobile mainly hosts WebView.

## Manual Refresh / Retry Points
- Dashboard error retry calls every query `refetch()` in `src/app/dashboard/page.tsx:90`.
- Map error retry calls `positionsQuery.refetch()` in `src/app/dashboard/map/page.tsx:63`.
- Devices error retry calls `devicesQuery.refetch()` in `src/app/dashboard/devices/page.tsx:80`.
- Notifications list exposes `onRefresh={() => notificationsQuery.refetch()}` in `src/app/dashboard/notifications/page.tsx:100`.
- Trip error retry refetches telemetry in `src/app/dashboard/trips/[id]/page.tsx:208`.
- These are acceptable as error recovery buttons, but not as normal data-sync path.

## Acceptable Fetch Boundaries
- Initial query snapshot for every page.
- Pagination/search/filter lists: notifications, alerts, devices, vehicles, admin.
- Historical telemetry/trip replay after trip ended.
- Exports list/download and admin/system status polling if operator-only.
- Error retry and reconnect fallback.

## Recommended Client Strategy
- Replace single-socket context with namespace-aware sockets: `dashboard`, `devices`, `notifications`, `exports`, `firmware`.
- Make `useRealtimeSubscription({ namespace, event })` bind to the right namespace; default should be explicit, not hidden.
- Use patch-first for hot data:
  - map positions/status -> update Zustand store directly.
  - device list/status -> patch matching rows, not invalidate full list on every position.
  - notifications -> prepend/update unread count from event payload.
  - dashboard counters -> patch counters if payload complete; otherwise selective invalidate.
- Keep invalidation for low-frequency or payload-incomplete events.
- On reconnect, refetch active view snapshots once, then resume live updates.
- Deduplicate by metadata `message_id` or `(deviceId, bootId, seqNo, event)` in client reducer.

## Priority Classification
- Critical: namespace-aware frontend socket provider/subscription.
- Critical: remove 2s map polling as normal path; keep initial snapshot/fallback only.
- High: device list status patch instead of full invalidation per position.
- High: notification list/stats live update instead of 30s polling.
- Medium: dashboard stats/activity live patches; aggregate events may need backend producers.
- Medium: trip active telemetry event-driven append/resync; replay timer is UI-only and acceptable.
- Low/Acceptable: system-status/system-admin/simulator polling unless user expects ops realtime.

## Risks / Tests
- Event payload shape may not contain enough fields to patch cache safely.
- Multi-namespace sockets increase connection count; monitor `/ws-health`.
- Over-patching React Query lists can cause stale filters/pages; patch only visible page or invalidate precise queries.
- Test namespace connection/auth, reconnect, room join/leave, duplicate event suppression, and no polling on hot paths.

## Unresolved Questions
- Should `NEXT_PUBLIC_WS_URL` stay base URL plus namespace in code, or env per namespace?
- Should map subscribe to all device positions or only active fleet/visible devices?
- Should mobile get native socket later, or rely on WebView for this plan?
