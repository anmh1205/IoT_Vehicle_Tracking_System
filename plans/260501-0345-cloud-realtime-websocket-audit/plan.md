---
title: "Cloud Realtime WebSocket Audit Plan"
description: "Plan WebSocket-first fixes for cloud realtime gaps while keeping fetch only where it is the right boundary."
status: pending
priority: P2
effort: 22h
branch: uat
tags: [backend, frontend, realtime, websocket]
created: 2026-05-01
---

# Cloud Realtime WebSocket Audit Plan

Mục tiêu: sửa các đường dữ liệu cloud chưa realtime thật: namespace socket sai, polling hot path, refetch/invalidate quá rộng, backend thiếu event end-to-end. Không xoá fetch mù quáng; giữ fetch đúng boundary.

## Nguồn đã dùng
- `scout/scout-01-realtime-file-map.md`
- `research/researcher-01-backend-mqtt-realtime-report.md`
- `research/researcher-02-frontend-mobile-realtime-report.md`
- README/docs đã review: `README.md`, `docs/codebase-summary.md`, `docs/code-standards.md`, `docs/system-architecture.md`, `docs/project-overview-pdr.md`

## Phases
| Phase | Status | Progress | Effort | Link |
|---|---:|---:|---:|---|
| 01 Fix socket namespace foundation | pending | 0% | 3h | [phase-01](phase-01-fix-socket-namespace-foundation.md) |
| 02 Replace hot path polling with cache patches | pending | 0% | 6h | [phase-02](phase-02-replace-hot-path-polling-with-cache-patches.md) |
| 03 Complete backend event coverage and scope | pending | 0% | 6h | [phase-03](phase-03-complete-backend-event-coverage-and-scope.md) |
| 04 Reconnect, resync, backpressure, tests | pending | 0% | 4h | [phase-04](phase-04-reconnect-resync-backpressure-and-tests.md) |
| 05 Docs and rollout | pending | 0% | 3h | [phase-05](phase-05-docs-and-rollout.md) |

## Classification
- Critical realtime gap: namespace-aware frontend sockets; map 2s polling; device-list full invalidation on hot events; missing export/firmware progress events; room/access scoping for hot device events.
- Acceptable fetch: page snapshot, reconnect recovery, pagination/search/filter, history/trip replay after end, export download/list, explicit error retry.
- In scope after validation: convert all web data-source polling to real event-driven updates or snapshot fallback. UI-only timers for replay animation/batched render are not data-source polling.
- Intentionally non-realtime for now: native mobile socket client; mobile WebView inherits web realtime behavior.

## Event model baseline
- Namespaces: `/devices`, `/dashboard`, `/notifications`, `/exports`, `/firmware`, Socket.IO path `/ws`.
- Event envelope: `eventId`, `eventType`, `occurredAt`, `deviceId?`, `vehicleId?`, `seqNo?`, `bootId?`, `source`, `payload`.
- Hot events: `device:position`, `device:status`, `device:session_start`, `device:session_end`, `alert:new`, `notification:new`, `notification:updated`, `zone:*`, `geofence:*`, `export:progress`, `export:ready`, `firmware:assignment`, `firmware:progress`.
- Reconnect: active-view snapshot refetch; durable cursor/replay deferred.
- Ordering/idempotency: per-device best effort; dedupe by `eventId` or `(deviceId, bootId, seqNo, eventType)`.
- Backpressure: coalesce/throttle hot positions; never unlimited queues.

## Dependencies
- Phase 02 depends on Phase 01 for existing hot events; domains missing events stay gated until Phase 03.
- Phase 03 can run after Phase 01 contract is frozen; it unblocks frontend patches needing new payloads.
- Phase 04 depends on event model + hot path changes.
- Phase 05 depends on validation evidence.

## Validation
- Frontend receives events from all namespaces after auth.
- Map normal path has no 2s polling; updates via socket patch + initial/reconnect snapshot only.
- Device/notification/dashboard/system/admin/simulator data-source polling is converted or gated by real event coverage.
- Backend emits matching export/firmware events and scoped device rooms.
- Tests cover namespace auth, reconnect resync, duplicate/out-of-order event handling, burst telemetry, and no residual data-source polling except approved boundaries.

## Open implementation follow-ups
- Exact repository/service source for assigned-device access filtering must be verified before room join enforcement.
- Event source design for system/admin/simulator must avoid fake heartbeat events; if no real source exists, build real backend event emission at mutation/health-change boundary.

## Validation Log

### Session 1 — 2026-05-01
**Trigger:** Initial plan validation after creating cloud realtime WebSocket audit plan.
**Questions asked:** 6

#### Questions & Answers

1. **[Security/Scope]** Realtime device events nên được phân quyền/scoping thế nào trong lần triển khai này?
   - Options: Role + assigned devices (Recommended) | Role-only tạm thời | Full per-tenant ACL
   - **Answer:** Role + assigned devices (Recommended)
   - **Rationale:** Quyết định này chi phối backend room join, emit scope, và tránh broadcast telemetry sang user không được phép xem.

2. **[Architecture/Scope]** Map live tracking nên subscribe phạm vi thiết bị nào?
   - Options: Assigned fleet (Recommended) | Visible devices only | All devices global
   - **Answer:** Assigned fleet (Recommended)
   - **Rationale:** Map cần realtime đủ rộng cho đội xe user được phân quyền, nhưng không all-global để tránh tải và rủi ro dữ liệu.

3. **[Architecture/Reliability]** Reconnect/resync nên làm tới mức nào cho UAT hiện tại?
   - Options: Snapshot fallback (Recommended) | Durable cursor now | Live-only
   - **Answer:** Snapshot fallback (Recommended)
   - **Rationale:** Giữ KISS cho UAT: reconnect refetch snapshot active view một lần, chưa thêm event store/cursor replay.

4. **[Scope/Mobile]** Mobile realtime scope nên xử lý thế nào trong plan này?
   - Options: WebView inherits web (Recommended) | Add native socket now | Defer mobile entirely
   - **Answer:** WebView inherits web (Recommended)
   - **Rationale:** Mobile hiện chủ yếu host WebView; sửa frontend socket đúng sẽ áp dụng cho mobile mà không mở rộng sang native socket service.

5. **[Contract/Backend]** Với `export:progress` đang được frontend lắng nghe nhưng backend chưa phát, nên xử lý contract thế nào?
   - Options: Remove progress listener (Recommended) | Add real progress now | Keep as future hook
   - **Answer:** Add real progress now
   - **Rationale:** Backend phải phát progress thật nếu UI lắng nghe; không được giữ event giả hoặc listener không có producer.

6. **[Scope/Polling]** System/admin/simulator polling 30-60s nên được phân loại thế nào trong lần này?
   - Options: Intentionally non-realtime (Recommended) | Convert system status | Convert all polling
   - **Answer:** Convert all polling
   - **Rationale:** Scope mở rộng: mọi data-source polling web cần được thay bằng event-driven update hoặc snapshot fallback; cần phân biệt với UI-only timers.

#### Confirmed Decisions
- Device scope: role + assigned devices — backend phải kiểm quyền trước khi join/emit device room.
- Map scope: assigned fleet — client subscribe đội xe được phép xem, không all-global.
- Reconnect: snapshot fallback — chưa làm durable cursor/replay trong UAT.
- Mobile: WebView inherits web — native socket để future roadmap.
- Export progress: add real progress now — frontend/backend contract phải khớp event thật.
- Polling: convert all web data-source polling — system/admin/simulator cũng vào scope, UI animation timers không tính.

#### Action Items
- [ ] Xác định source of truth cho assigned-device access trước khi enforce room join.
- [ ] Tăng effort estimate cho Phase 02/03/04/05 vì `Convert all polling` mở rộng scope.
- [ ] Thêm real `export:progress` producer; không dùng event giả.
- [ ] Bổ sung event sources cho system/admin/simulator hoặc mutation/health-change boundaries thật.
- [ ] Thêm kiểm tra không còn data-source polling ngoài approved boundaries.

#### Impact on Phases
- Phase 01: requirements/security phải ghi rõ role + assigned devices và assigned-fleet map subscription.
- Phase 02: mở scope từ hot paths sang toàn bộ web data-source polling; giữ UI-only timers.
- Phase 03: phải thêm real `export:progress` và event coverage cho system/admin/simulator nếu đang poll.
- Phase 04: test thêm no residual data-source polling, reconnect snapshot cho ops/admin views.
- Phase 05: docs phải nói mobile WebView inherits web, native socket future; không còn phân loại system/admin/simulator là intentionally non-realtime.
