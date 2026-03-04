# Phase 8: Test Coverage

**Priority:** 🟢 Thấp
**Status:** Pending
**Estimated effort:** 6-8 hours

## Context

- Vitest configured, only 4 test files exist
- Core services untested: auth session, trips, alerts, geofence, vehicles, telemetry, export
- Need minimum viable coverage for critical paths

## Priority Test Targets

| Service | Why critical | Type |
|---------|-------------|------|
| auth-session.service | Security — login/logout/token validation | Unit |
| trip-crud.service | Business logic — lifecycle + auto-stats | Unit |
| trip-waypoints.service | Data integrity — Haversine, merge logic | Unit |
| violation-crud.service | New feature (Phase 1) | Unit |
| geofence-checker.service | New feature (Phase 2) — algorithms | Unit |
| vehicle-status.service | New feature (Phase 5) — aggregation | Unit |
| error-handler middleware | Error format compliance | Integration |
| rate-limit middleware | Security | Integration |

## Implementation Steps

1. Auth session service tests: login, invalid password, token validation, session expiry
2. Trip service tests: create, start (only from planned), end (with stats mock), lifecycle errors
3. Trip waypoints tests: Haversine accuracy, waypoint merge, empty data handling
4. Geofence checker tests: point-in-circle, point-in-polygon, edge cases (on boundary)
5. Violation service tests: create, acknowledge, list with filters
6. Error handler test: verify response format includes all required fields
7. Run coverage report

## Success Criteria

- [ ] All new services (Phase 1-6) have tests
- [ ] Core auth service tested
- [ ] Geofence algorithms tested with edge cases
- [ ] `npm test` passes
- [ ] Coverage report generated
