# Backend geofence redesign research

## Recommendation
- Runtime source of truth should be exactly one `vehicle_allowed_zone` record per vehicle.
- Zone type should be fixed to `circle` for this feature.
- Persist `vehicle_id`, `center_lat`, `center_lon`, `radius_m`, `center_source`, `status`, version/history metadata, and audit fields.

## Migration direction
- Current runtime model is optimized for reusable multi-policy and many-to-many geofence binding.
- Add the per-vehicle allowed-zone model as the new runtime truth.
- Migrate active `RADIUS` policies into the new model where possible.
- Keep legacy `vehicle_policies`, `vehicle_policy_state`, and `vehicle_policy_violation` as compatibility/history during transition.
- Treat `ADMIN_BOUNDARY`, polygons, rectangles, and multi-geofence bindings as legacy or separate future scope.

## Alert/state design
- Use minimal state machine: `unknown -> inside -> outside -> suspect`.
- Emit default alert only on state transition or after explicit debounce/hysteresis rules.
- Persist `last_state`, `last_fired_at`, `dedupe_key`, `suppression_until`.
- Keep notification channels/extensibility separate from boundary decision logic.

## Key risks
- Legacy data conflicts when one vehicle currently maps to multiple active policies.
- Replay or noisy telemetry can spam alerts if transition logic is not stateful.
- API/UI compatibility drift during migration.
- "Use current vehicle position" must snapshot a precise telemetry point.

## Unresolved questions
- Whether zone replacement should overwrite in place or create a new version.
- Whether history/effective time windows are required in v1.
- Whether both entry points should call one shared upsert endpoint.
