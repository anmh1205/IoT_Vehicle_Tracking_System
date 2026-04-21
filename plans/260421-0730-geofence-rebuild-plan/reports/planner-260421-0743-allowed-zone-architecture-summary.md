# Allowed-zone architecture summary

## Problem
Current geofence implementation is wrong for business intent. It is generic, many-to-many, policy-driven. Ops needs direct per-vehicle setup.

## Recommendation
- New runtime truth: `vehicle_allowed_zones`.
- Exactly 1 active circle zone per vehicle.
- Shared upsert/read API for map and device modal.
- Shared compact setup sheet in frontend.
- Extensible alert config with `transition_only` default and cooldown-based dedupe.

## Why this is simpler
- Removes binder workflow from main user journey.
- Stops leaking generic polygon/rectangle/policy complexity into an ops task.
- Keeps legacy policy engine for other scopes without forcing it into this feature.

## Migration
- Backfill compatible active radius policies.
- Keep legacy tables as compatibility/history during transition.
- New evaluator reads allowed-zone runtime truth first.

## Main risks
- Conflicting legacy active radius policies.
- Stale telemetry for current-position center source.
- GPS jitter causing alert flapping without hysteresis.

## Unresolved questions
- None blocking.
