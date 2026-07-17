# Scout Report

## Relevant Files
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/geofence.routes.ts` — geofence/policy/state/violation API surface.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/geofence.controller.ts` — request handling for geofence and policy flows.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/validators/geofence.validator.ts` — generic geofence and vehicle-policy validation.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/services/geofence-crud.service.ts` — CRUD + vehicle assignment behavior.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/services/vehicle-policy-crud.service.ts` — multi-policy CRUD model.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/services/policy-evaluator.service.ts` — per-vehicle policy evaluation.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/repositories/geofence.repository.ts` — `geofences` + `geofence_vehicles` persistence.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/repositories/vehicle-policy.repository.ts` — `vehicle_policies` persistence.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/repositories/vehicle-policy-state.repository.ts` — persisted evaluation state.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/repositories/vehicle-policy-violation.repository.ts` — violation persistence.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/operations/geofences/page.tsx` — current CRUD/binder page.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/geofences/components/geofence-form.tsx` — generic geofence form.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/geofences/components/geofence-map-editor.tsx` — map-based center editing.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/map/components/tracking-map.tsx` — operational map entry and draft flow.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/map/components/map-geofence-workspace.tsx` — geofence workspace on map.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/lib/api/geofences.ts` — geofence API client.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/geofences/hooks/use-geofences.ts` — frontend hook layer.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/devices/components/device-detail-modal.tsx` — current device detail modal, missing geofence setup entry.

## Main mismatches
- Current backend model supports reusable geofences and many-to-many vehicle binding, not one active zone per vehicle.
- Current backend also supports multiple policy types (`ADMIN_BOUNDARY`, `RADIUS`, `DISTANCE_QUOTA`) and multiple active policies per vehicle.
- Current frontend mental model is generic geofence management, then vehicle binding, not direct per-vehicle allowed-zone setup.
- Current map flow partially supports center picking, but device detail modal does not expose the same setup flow.
- Current UI still carries polygon/rectangle and manual lat/lon oriented complexity beyond the operational need.

## Unresolved Questions
- Which table/API becomes the new runtime source of truth.
- How legacy policy data should be migrated or retired.
- How much alert configurability belongs in v1 versus deferred advanced settings.
