# Phase 02 — Backend runtime and API

## Context Links
- `./phase-01-align-domain-and-migration.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/geofence.routes.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/geofence.controller.ts`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/validators/geofence.validator.ts`

## Overview
- Priority: P1
- Status: pending
- Brief: Add minimal backend slice for allowed-zone CRUD and runtime lookup.

## Key Insights
- Both frontend entry points should call one shared upsert endpoint.
- Generic geofence CRUD should not remain the write path for this feature.
- Validation must reject any non-circle payloads for the new feature path.

## Requirements
### Functional
- Get current allowed zone by vehicle.
- Upsert/replace current allowed zone for a vehicle.
- Preview center from latest telemetry when user chooses current position.
- List migration/compatibility status for operations if needed.

### Non-functional
- Shared success envelope.
- RFC7807 validation and conflict errors.
- Transactional replace behavior.

## Architecture
### Data model
Recommended columns for `vehicle_allowed_zones`:
- `id`
- `vehicle_id`
- `zone_type` fixed to `circle`
- `center_lat`, `center_lon`
- `radius_m`
- `center_source` = `vehicle_position` | `map_pick`
- `center_snapshot_at` nullable
- `status` = `active` | `disabled`
- `last_membership_state` = `unknown` | `inside` | `outside` | `suspect`
- `last_membership_changed_at`
- `last_alerted_state`
- `last_alerted_at`
- `suppression_until`
- audit fields
- optional warning metadata when `vehicle_position` uses stale/latest-known telemetry
<!-- Updated: Validation Session 1 - overwrite active row in place and allow stale telemetry save with warning -->

### Service layer
- `vehicle-allowed-zone.service.ts`
  - `getActiveByVehicleId`
  - `replaceActiveZone`
  - `disableZone`
  - `resolveCenterSnapshot`
- `vehicle-allowed-zone.repository.ts`
  - active lookup, append insert, deactivate old row, transition-state updates

### API surface
Keep under geofence namespace to minimize churn, but use explicit allowed-zone paths:
- `GET /api/v1/geofences/vehicles/:vehicleId/allowed-zone`
- `PUT /api/v1/geofences/vehicles/:vehicleId/allowed-zone`
- `DELETE /api/v1/geofences/vehicles/:vehicleId/allowed-zone`
- optional `POST /api/v1/geofences/vehicles/:vehicleId/allowed-zone/preview-center`

### Migration strategy
- Migration script scans active legacy `RADIUS` policies.
- For each vehicle:
  - if exactly one active compatible radius policy, create active allowed-zone row
  - if many active compatible policies, choose deterministic winner by newest explicit assignment and log conflict report for manual review
  - if non-radius-only setup, do not auto-migrate
- During coexistence, evaluator reads new allowed-zone first; falls back to legacy only if migration feature flag disabled.

## Related Code Files
### Likely modify
- `Tracking_Backend/src/api/routes/geofence.routes.ts`
- `Tracking_Backend/src/api/controllers/geofence.controller.ts`
- `Tracking_Backend/src/api/validators/geofence.validator.ts`
- `Tracking_Backend/src/domain/geofence/services/geofence-list.service.ts`
- `Tracking_Backend/src/domain/geofence/services/vehicle-policy-crud.service.ts`
- backend DB migration/index files

## Implementation Steps
1. Add migration and repository for new table.
2. Add DTO/validator for fixed circle payload.
3. Implement transactional replace flow.
4. Add telemetry snapshot resolver for `vehicle_position` center source.
5. Expose read/write endpoints with envelope + problem details.
6. Add migration command/report for legacy active radius policies.
7. Gate new runtime path behind explicit rollout flag if needed.

## Todo List
- [ ] Add schema and constraints
- [ ] Add repository/service/controller/validator
- [ ] Add center snapshot resolution logic
- [ ] Add migration script/report
- [ ] Add feature-flag or phased switch if rollout requires it

## Success Criteria
- Backend can serve one active zone per vehicle with deterministic replace.
- Requests from map and modal can use the same contract.
- Legacy migration can run without data loss.

## Risk Assessment
- Snapshotting current vehicle position may fail when telemetry is stale.
- Existing frontend geofence API client may assume generic geofence DTOs.

## Security Considerations
- Validate vehicle access before zone read/write.
- Validate lat/lon/radius bounds server-side.
- Avoid exposing internal migration conflict details to unauthorized users.

## Next Steps
- Connect evaluator and alerts to the new runtime source.

## Unresolved questions
- None; route placement under `/geofences` is acceptable for v1 to reduce API churn.
