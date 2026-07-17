# Phase 02: Replace hot path polling with cache patches

## Context links
- Plan: `plan.md`
- Depends on: `phase-01-fix-socket-namespace-foundation.md`
- Reports: scout + researcher 02.
- Code targets: map, devices, notifications, dashboard, trip active telemetry hooks/pages.

## Overview
- Priority: P1 high.
- Status: pending.
- Effort: 4h.
- Replace avoidable polling/refetch on hot realtime paths with socket-driven store/cache patches. Keep fetch for initial snapshot, pagination/history, error retry, reconnect recovery.

## Key Insights
- Map still polls positions every 2s despite `useMapRealtime` socket reducer.
- Device list invalidates all devices on every position/status, causing refetch storm risk.
- Notifications poll every 30s; dashboard poll 30/60s; trip active telemetry polls.
- Manual refresh/retry is acceptable only as recovery, not normal sync path.

## Requirements
<!-- Updated: Validation Session 1 - convert all web data-source polling, keep UI-only timers -->
- Functional: map updates via `device:position/status`; device list patches affected row; notifications prepend/update unread; dashboard patches aggregates when payload complete; active trip appends telemetry where safe.
- Functional: convert all web data-source polling, including system/admin/simulator hooks, to event-driven updates or reconnect snapshot fallback.
- Non-functional: do not patch filtered/paginated caches incorrectly; use precise invalidation if payload incomplete; avoid complex client event sourcing.
- Non-functional: UI-only timers such as replay animation and batched render flushes are allowed; they are not data-source polling.
- Classification: critical realtime gap for map/devices/notifications plus any remaining web data-source polling; acceptable initial fetch remains.

## Architecture
- Data flow: initial React Query snapshot -> socket event -> targeted Zustand/React Query cache patch -> reconnect snapshot.
- Payload boundaries: patch only fields present in event envelope/payload; never infer missing business state.
- Subscription scope: `/devices` for device hot data, `/notifications` for notifications/alerts, `/dashboard` for stats/activity.
- Idempotency/order: ignore older per-device telemetry using `occurredAt` plus `seqNo` when available; dedupe event IDs.
- Backpressure: map coalesces latest position per device; batch UI updates on animation/timer already in hook, no unlimited queue.

## Related code files
- Modify: `Tracking_Frontend/src/features/map/hooks/use-device-positions.ts`
- Modify: `Tracking_Frontend/src/features/map/hooks/use-map-realtime.ts`
- Modify: `Tracking_Frontend/src/features/devices/hooks/use-device-realtime.ts`
- Modify: `Tracking_Frontend/src/lib/utils/query-invalidation.ts`
- Modify: `Tracking_Frontend/src/features/notifications/hooks/use-notifications.ts`, `use-notification-stats.ts`, realtime event hook.
- Modify: `Tracking_Frontend/src/features/dashboard/hooks/use-dashboard-stats.ts`
- Modify: `Tracking_Frontend/src/app/dashboard/trips/[id]/page.tsx`, trip preview dialog if active live mode.
- Create/Delete: none unless tests need existing test pattern additions.

## Implementation Steps
1. Mark every fetch as: initial snapshot, recovery retry, pagination/history, or avoidable polling.
2. Disable/remove normal 2s map polling; keep initial `useQuery` snapshot and reconnect/error retry path.
3. Patch map store from `device:position/status`; dedupe and drop stale events.
4. Replace device-list broad invalidation with `queryClient.setQueryData` patch for matching device/status; use selective invalidation only for missing row or unknown filters.
5. Replace notification polling only after Phase 03 provides `notification:new/updated`; until then keep selective invalidation or current poll as fallback.
6. Dashboard: consume `stats:update`/`activity:new` if payload exists; otherwise reduce polling or selective refetch only on low-frequency events.
7. Active trip: append telemetry events only after the trip/device correlation is available; keep historical fetch for ended trips.
8. Keep manual refresh buttons labelled/used as retry/recovery.
9. Run frontend typecheck/build and targeted tests.

## Todo list
- [ ] Classify frontend queries and intervals.
- [ ] Remove map 2s normal polling.
- [ ] Add safe map/device cache patching.
- [ ] Add notification cache/count patching.
- [ ] Reduce dashboard/trip polling where event coverage allows.
- [ ] Add dedupe/stale guards.
- [ ] Validate no refetch storm under burst telemetry.

## Success Criteria
- Hot map path uses WebSocket after initial snapshot.
- Device list does not invalidate all devices for every position.
- Notifications update without 30s polling for new/update events.
- Fetch remains for appropriate boundaries only.
- No stale filtered/paginated list corruption.

## Risk Assessment
- Event payload may lack fields needed for full patch; prefer precise invalidation over invented fields.
- React Query cache shape may vary by endpoint; patch only known shapes.
- Removing polling before backend event coverage complete can leave gaps; gate per event readiness.

## Security Considerations
- Do not display events for devices/users not in current authorized snapshot.
- Client-side filtering is not security; backend scoping still needed in Phase 03.
- Avoid logging sensitive payloads in production.

## Next steps
- Phase 03 fills backend events where frontend listeners need complete payloads before removing remaining fallback polling.
- Unresolved questions: map all-fleet vs visible devices; dashboard aggregate payload completeness.
