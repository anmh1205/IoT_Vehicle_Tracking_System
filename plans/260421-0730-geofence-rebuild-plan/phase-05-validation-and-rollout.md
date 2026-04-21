# Phase 05 — Validation and rollout

## Context Links
- `./phase-02-backend-runtime-and-api.md`
- `./phase-03-realtime-and-alert-behavior.md`
- `./phase-04-frontend-shared-setup-flow.md`

## Overview
- Priority: P1
- Status: pending
- Brief: Prove the new one-zone flow works, migrate safely, then retire legacy path.

## Key Insights
- Migration correctness matters more than edge visual polish.
- Test matrix must cover stale telemetry, conflicting legacy data, and alert dedupe.
- Rollout should prefer additive cutover, then UI cleanup.

## Requirements
### Functional
- Validate migration/backfill behavior.
- Validate API contracts, access control, and replacement semantics.
- Validate map + device modal end-to-end flows.
- Validate realtime state updates and alert dedupe.

### Non-functional
- No broken legacy reads during transition.
- Clear rollback path.

## Architecture
### Test strategy
Backend:
- repository tests for active-row uniqueness and replace flow
- service tests for center snapshot resolution, stale-telemetry warning handling, and migration conflict handling
<!-- Updated: Validation Session 1 - rollout validation must cover stale telemetry warning path -->
- evaluator tests for inside/outside/suspect transitions and cooldown
- API tests for validation and auth

Frontend:
- hook tests for DTO mapping/error states
- component tests for setup sheet validation and alert-mode collapse
- interaction tests for map-pick and device-modal entry consistency

Integration/UAT:
- migrate sample legacy data
- set zone from current vehicle position
- replace zone from map click
- verify outside alert fires once, not every telemetry tick
- verify realtime card/map badge updates

### Rollout plan
1. Ship backend additive model behind feature flag if needed.
2. Run migration report in staging/UAT.
3. Enable frontend shared flow for selected roles.
4. Monitor alert volume and evaluator state transitions.
5. Retire legacy write paths.
6. Remove obsolete binder-centric UX after confidence window.

## Related Code Files
### Likely modify
- `Tracking_Backend/src/domain/trip/services/__tests__/*` if telemetry helpers are reused
- `Tracking_Backend/src/domain/geofence/services/__tests__/*`
- `Tracking_Frontend/src/features/geofences/hooks/*`
- `Tracking_Frontend/src/features/map/components/*`
- test configs and fixtures for backend/frontend

## Implementation Steps
1. Define fixture matrix for legacy policy migration cases.
2. Add backend unit/integration coverage.
3. Add frontend interaction coverage.
4. Run lint/typecheck/build/test for backend and frontend.
5. Perform UAT checklist with real telemetry-like samples.
6. Remove or lock hidden legacy write affordances.

## Todo List
- [ ] Build migration fixture matrix
- [ ] Add backend tests
- [ ] Add frontend tests
- [ ] Define rollout/rollback checklist
- [ ] Validate alert volume in UAT

## Success Criteria
- All tests for new runtime/API/UI path pass.
- Migration conflicts are reported, not silently mangled.
- Ops can roll back to legacy read path if rollout uncovers blocker.

## Risk Assessment
- Hidden frontend references to generic geofence DTOs can break after API pivot.
- Real GPS noise may differ from test fixtures.

## Security Considerations
- Include authorization regression tests.
- Ensure migration tooling is restricted to admin/ops execution path.

## Next Steps
- Update docs once rollout path is finalized.

## Unresolved questions
- None blocking; rollout flag can be dropped if team chooses one-step cutover after UAT confidence.
