# Phase 01: Fix socket namespace foundation

## Context links
- Plan: `plan.md`
- Scout: `scout/scout-01-realtime-file-map.md`
- Backend research: `research/researcher-01-backend-mqtt-realtime-report.md`
- Frontend/mobile research: `research/researcher-02-frontend-mobile-realtime-report.md`
- Code targets: `Tracking_Frontend/src/components/providers/socket-provider.tsx`, `Tracking_Frontend/src/hooks/use-realtime-subscription.ts`, `Tracking_Backend/src/infrastructure/realtime/socket-server.util.ts`, `socket-auth.middleware.ts`

## Overview
- Priority: P1 critical.
- Status: pending.
- Effort: 3h.
- Fix nền tảng để frontend thật sự nhận event từ namespace backend đang emit: `/devices`, `/dashboard`, `/notifications`, `/exports`, `/firmware` tại path `/ws`.

## Key Insights
- Frontend hiện tạo một base socket; `useRealtimeSubscription` nhận `namespace` nhưng bỏ qua.
- Backend emit theo namespace, nên nhiều event không đến client.
- `joinDeviceRoom` đang emit trên socket sai nếu không ở `/devices`.
- Socket auth đã có session token; cần tái dùng nhất quán cho mọi namespace.

## Requirements
<!-- Updated: Validation Session 1 - role + assigned-device scope, assigned-fleet map subscription -->
- Functional: tạo provider/registry namespace-aware; subscription chọn đúng namespace; join/leave device room chỉ qua `/devices`; expose connection status per namespace.
- Functional: device room join/emit phải theo role + assigned devices; map subscribe assigned fleet, không all-global.
- Non-functional: không nhân đôi auth code; không thêm env per namespace nếu base URL đủ; không làm native mobile socket trong phase này.
- Classification: critical realtime gap.

## Architecture
- Client socket manager nhận `NEXT_PUBLIC_WS_URL` base, nối namespace bằng Socket.IO URL/path `/ws`.
- Mỗi namespace dùng cùng auth token + reconnect options.
- Hook API: `useRealtimeSubscription({ namespace, event, handler, enabled })` bind đúng socket.
- Auth/permission: backend middleware áp dụng cho tất cả namespace; client không tự bypass quyền.
- Reconnect/resync: chỉ phát signal `reconnected(namespace)`; snapshot fallback xử lý ở Phase 04.

## Related code files
- Modify: `Tracking_Frontend/src/components/providers/socket-provider.tsx`
- Modify: `Tracking_Frontend/src/hooks/use-realtime-subscription.ts`
- Modify: call sites under `Tracking_Frontend/src/features/**` and `src/app/dashboard/**` that pass/listen realtime events.
- Verify only: `Tracking_Backend/src/infrastructure/realtime/socket-server.util.ts`, `socket-auth.middleware.ts`.
- Create: avoid unless existing structure cannot host small helper; if needed, one focused socket namespace helper under existing provider area.
- Delete: none planned.

## Implementation Steps
1. Inventory current frontend realtime subscribers and intended namespace per event.
2. Refactor socket provider to manage known namespaces: `devices`, `dashboard`, `notifications`, `exports`, `firmware`.
3. Ensure all sockets use `path: '/ws'`, websocket transport, same auth token, same reconnect policy.
4. Update `useRealtimeSubscription` to bind/unbind listener on requested namespace socket; default explicit namespace, avoid silent base fallback.
5. Move `device:join`/`device:leave` to `/devices`; keep room naming aligned with backend and enforce assigned-device access before joining.
6. Add assigned-fleet subscription flow for map without subscribing all global devices.
7. Add lightweight diagnostics/logs for namespace connect/disconnect in dev only.
7. Update frontend call sites to pass correct namespace.
8. Compile/typecheck frontend.

## Todo list
- [ ] Map event-to-namespace matrix.
- [ ] Implement namespace socket registry in provider.
- [ ] Fix subscription hook namespace behavior.
- [ ] Fix device room join/leave path.
- [ ] Update all call sites.
- [ ] Typecheck/build frontend.

## Success Criteria
- Client connects to all required namespaces after auth.
- `device:position`, `stats:update`, `notification:*`, `export:*`, `firmware:*` listeners attach to expected namespace.
- No listener leaks after component unmount.
- Existing manual retry buttons still work as error recovery.

## Risk Assessment
- More sockets per client may increase connection count; monitor `/ws-health`.
- Token refresh/session expiry can desync namespace sockets; centralize auth refresh behavior.
- Event handlers may start firing and reveal stale payload assumptions; handle in later phases.

## Security Considerations
- Do not move token into query string if current auth header/auth payload is safer.
- Preserve backend session middleware for every namespace.
- Do not subscribe user to device room until backend confirms access model.

## Next steps
- Phase 02 uses working namespace subscriptions to remove hot path polling and broad refetches.
- Unresolved questions: env base URL vs per namespace; per-device access filtering timing.
