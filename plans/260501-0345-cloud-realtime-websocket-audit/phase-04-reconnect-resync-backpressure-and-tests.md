# Phase 04: Reconnect, resync, backpressure, and tests

## Context links
- Plan: `plan.md`
- Depends on: Phase 01 namespace foundation, Phase 02 cache patches, Phase 03 event coverage.
- Reports: backend and frontend realtime research.

## Overview
- Priority: P2 medium-high.
- Status: pending.
- Effort: 3h.
- Make realtime robust under reconnect, duplicate/out-of-order events, and telemetry bursts. Validate with tests. Do not build durable replay unless UAT proves snapshot fallback insufficient.

## Key Insights
- EventBus is RAM-only; no replay/resume cursor.
- Durable cursor is extra complexity; start with reconnect snapshot fallback.
- Hot telemetry can burst; current broad invalidation/polling risks load spikes.
- Ordering should be per-device best-effort, not global total order.

## Requirements
<!-- Updated: Validation Session 1 - snapshot fallback plus no residual data-source polling tests -->
- Functional: active view snapshot refetch on reconnect; dedupe events; drop stale per-device updates; coalesce high-frequency positions; tests for namespace/event flow.
- Functional: verify no residual web data-source polling outside approved boundaries; include ops/admin views in reconnect snapshot checks.
- Non-functional: bounded memory; no unbounded queues; no fake mocks just to pass; compile/build must pass.
- Classification: reconnect snapshot = acceptable fetch; durable cursor = optional later phase.

## Architecture
- Reconnect/resync strategy: on socket reconnect, each mounted feature triggers one authoritative snapshot refetch for its active query scope, then resumes live patches.
- Idempotency/order: maintain small in-memory recent event ID set and per-device last `(seqNo, occurredAt)` where available.
- Backpressure: client keeps latest position per device per flush window; server may throttle/coalesce if metrics show burst pressure.
- Error retry: user retry buttons remain explicit recovery fetches.
- Observability: `/ws-health` and connection/event counters confirm namespace connections and emissions.

## Related code files
- Modify: frontend socket provider/realtime hooks from Phase 01.
- Modify: frontend map/device/notification/dashboard hooks from Phase 02.
- Modify: backend socket health/metrics if gaps found.
- Tests: backend realtime/socket tests, frontend hook/cache tests where test harness exists.
- Create/Delete: only test files following existing test structure.

## Implementation Steps
1. Add shared reconnect signal from namespace sockets.
2. In each hot feature, refetch only active snapshot once per reconnect; debounce to avoid multi-query storm.
3. Add event dedupe utility scoped to runtime memory; bounded LRU/TTL.
4. Add stale guards for per-device `seqNo/occurredAt`.
5. Ensure map batching flushes latest value per device only.
6. Add tests: namespace connection/auth, subscription cleanup, reconnect snapshot, duplicate event suppression, out-of-order drop, burst map update no refetch storm.
7. Run backend lint/typecheck/test/build and frontend lint/typecheck/build.
8. Run Docker/service validation after code changes per repo workflow when implementing.

## Todo list
- [ ] Define reconnect callback contract.
- [ ] Add active-view snapshot fallback.
- [ ] Add bounded dedupe/stale guards.
- [ ] Verify hot update coalescing.
- [ ] Add backend realtime tests.
- [ ] Add frontend realtime/cache tests.
- [ ] Validate `/ws-health` and build outputs.

## Success Criteria
- Temporary disconnect does not permanently stale UI.
- Reconnect causes one scoped snapshot fetch, not broad app-wide storm.
- Duplicate/out-of-order telemetry does not regress map/device state.
- Burst telemetry does not create unlimited queue or full-list refetch loop.
- All relevant compile/test commands pass during implementation.

## Risk Assessment
- Dedupe state can grow if not bounded; enforce TTL/size.
- Snapshot refetch may be too broad if keyed poorly; scope by active route/query.
- Tests around sockets can be flaky; prefer deterministic unit/integration boundaries.

## Security Considerations
- Reconnect must re-authenticate with current session token.
- Do not reuse stale token after logout.
- Snapshot fallback must use normal REST authorization.

## Next steps
- Phase 05 documents event model, accepted fetch boundaries, rollout checks.
- Unresolved questions: whether durable cursor/replay becomes required after UAT telemetry loss testing.
