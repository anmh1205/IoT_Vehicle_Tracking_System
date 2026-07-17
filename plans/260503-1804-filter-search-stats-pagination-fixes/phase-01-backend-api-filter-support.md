# Phase 01 — Backend API Filter Support

## Context Links
- Frontend alerts: `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/alerts/page.tsx`
- Backend alerts: `Tracking_Backend/src/domain/alert/types/alert.types.ts`, `repositories/alert.repository.ts`
- Backend violations: `Tracking_Backend/src/domain/violation/repositories/violation.repository.ts`
- Backend maintenance: `Tracking_Backend/src/domain/maintenance/repositories/maintenance.repository.ts`

## Overview
Priority: High  
Status: Planned  
Add only query/filter capability required to make UI server-paginated pages truthful.

## Requirements
<!-- Updated: Validation Session 1 - backend API decisions -->
- Alerts: support UI `source=obd/system` with backend OBD heuristic, not direct DB `source=device|ecu` mapping.
- Violations: support search by `vehicleId` for current search box.
- Maintenance: support bounded search across vehicle and maintenance title.
- Add dedicated stats endpoints for violations and maintenance aggregate cards.
- Preserve existing pagination response shape.

## Implementation Steps
1. Inspect routes/controllers/services for query parsing and validation.
2. Extend list query types with minimal fields:
   - Alerts: `source` or `obdSource`, plus `search` if page has search.
   - Violations: `search`.
   - Maintenance: `search`.
3. Add repository SQL conditions using parameterized queries only.
4. Keep count query and list query using identical `WHERE` clauses.
5. If alert `obd/system` is heuristic, encode same semantics server-side with SQL predicates on `alert_type`, `title`, `message`; do not reuse frontend helper in backend.
6. Add/adjust backend tests for total/count under filters if test structure exists.

## Success Criteria
- `GET /api/alerts?...source=...` total matches returned filtered dataset.
- `GET /api/violations?...search=...` total counts all matching rows, not page subset.
- `GET /api/maintenance?...search=...` total counts all matching rows, not page subset.
- No SQL injection risk: all user input goes through query params array.

## Risk Assessment
- Alert `source` naming collision with DB `source` (`device|ecu`) vs UI source (`obd|system`). Confirm mapping before code.

## Unresolved Questions
- Exact alert source mapping: UI `obd/system` → DB `ecu/device` or content heuristic?
