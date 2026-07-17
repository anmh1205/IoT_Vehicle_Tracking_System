# Phase 01 — Align domain model and migration

## Context Links
- `./plan.md`
- `./scout/scout-report.md`
- `./research/researcher-backend-geofence-report.md`
- `./research/researcher-ux-geofence-report.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/**/*`

## Overview
- Priority: P1
- Status: pending
- Brief: Replace wrong mental model first. One vehicle = one active allowed zone. Circle only.

## Key Insights
- Current `geofences` + `geofence_vehicles` + `vehicle_policies` model optimizes reuse, not direct ops control.
- Reusing the current policy abstraction for this feature keeps many-to-many leakage in API and UI.
- Minimal new bounded context is cheaper than trying to bend generic geofence CRUD.

## Requirements
### Functional
- Each vehicle has at most one active allowed movement zone.
- Allowed zone type in v1 is only `circle`.
- Center source must support `vehicle_position` and `map_pick`.
- Existing active zone must be replaceable from the same flow.

### Non-functional
- Clear source of truth.
- Backward-compatible rollout during migration.
- Small surface area, minimal schema changes, auditable writes.

## Architecture
- Introduce a dedicated runtime aggregate: `VehicleAllowedZone`.
- Keep legacy policy engine available for old features (`ADMIN_BOUNDARY`, `DISTANCE_QUOTA`, generic geofence history).
- New aggregate owns:
  - zone geometry: center/radius
  - lifecycle: active/inactive/replaced
  - source metadata: center source, snapshot timestamp
  - evaluation state: last known inside/outside status, suppression fields
- Use one active row per vehicle and overwrite that row in place on replace, while writing audit metadata for who changed it and when.
<!-- Updated: Validation Session 1 - replacement history uses overwrite-in-place, not append-only rows -->

## Related Code Files
### Likely modify
- `Tracking_Backend/src/api/routes/geofence.routes.ts`
- `Tracking_Backend/src/api/controllers/geofence.controller.ts`
- `Tracking_Backend/src/api/validators/geofence.validator.ts`
- `Tracking_Backend/src/domain/geofence/services/policy-evaluator.service.ts`
- `Tracking_Backend/src/domain/geofence/repositories/vehicle-policy.repository.ts`
- `Tracking_Backend/src/domain/geofence/repositories/vehicle-policy-state.repository.ts`
- `Tracking_Frontend/src/app/dashboard/operations/geofences/page.tsx`
- `Tracking_Frontend/src/features/geofences/components/geofence-form.tsx`
- `Tracking_Frontend/src/features/geofences/components/geofence-vehicle-binder.tsx`

### Likely create
- `Tracking_Backend/src/domain/geofence/repositories/vehicle-allowed-zone.repository.ts`
- `Tracking_Backend/src/domain/geofence/services/vehicle-allowed-zone.service.ts`
- `Tracking_Backend/src/domain/geofence/services/vehicle-allowed-zone-evaluator.service.ts`
- DB migration for `vehicle_allowed_zones`

### Likely delete or retire from this feature path
- Generic binder-centric frontend flow pieces from operations geofence page.

## Implementation Steps
1. Define canonical entity fields and enum values.
2. Decide compatibility rules: legacy radius policy import, legacy reads, legacy writes freeze.
3. Add DB constraints: one active row per vehicle, positive radius, valid lat/lon.
4. Decide API contract names around “allowed zone”, not generic “policy”.
5. Document replacement semantics: new row inserted, old row marked `replaced_at` and inactive.
6. Mark legacy model responsibilities still supported vs explicitly out of scope.

## Todo List
- [ ] Finalize entity schema and states
- [ ] Finalize migration rules from active radius policies
- [ ] Define legacy coexistence window
- [ ] Define API naming and response DTOs

## Success Criteria
- Team can point to one table/service as runtime truth.
- No endpoint in v1 allows multiple active zones per vehicle.
- Migration rules are deterministic for conflicting legacy data.

## Risk Assessment
- Vehicles with multiple active radius policies need deterministic winner selection.
- Hidden dependencies may still read legacy state tables.

## Security Considerations
- Enforce per-vehicle authorization on read/write.
- Keep audit metadata for who replaced zone and when.

## Next Steps
- Feed finalized schema into backend/API phase.

## Unresolved questions
- None after validation; replacement semantics are overwrite-in-place with audit metadata.
