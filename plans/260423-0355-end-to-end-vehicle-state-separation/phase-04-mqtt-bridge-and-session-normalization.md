# Phase 04 - MQTT Bridge And Session Normalization

## Objective

Make MQTT Bridge the compatibility and normalization layer that translates rich firmware state into stable persistence, realtime, and session behavior.

## Primary Files

- `Tracking_MqttBridge/src/types/payload.types.ts`
- `Tracking_MqttBridge/src/validators/payload.validator.ts`
- `Tracking_MqttBridge/src/cache/device-state.cache.ts`
- `Tracking_MqttBridge/src/handlers/status.handler.ts`
- `Tracking_MqttBridge/src/handlers/rawdata.handler.ts`
- `Tracking_MqttBridge/src/infrastructure/database.ts`
- `Tracking_MqttBridge/src/infrastructure/victorialogs.ts`

## Changes

### Payload ingestion

- Accept new state/alert blocks.
- Keep validator compatibility with old firmware payloads.
- Normalize bridge-internal state snapshot from either:
  - new canonical fields
  - legacy fallback mapping

### Cache redesign

- Replace single `status` cache string with richer runtime cache:
  - `deviceState`
  - `ignitionState`
  - `motionState`
  - `vehicleState`
  - `sleepMode`
  - `activeSessionId`
  - `lastSeenAt`

### Session rules

- Session opening/closing must be based on approved business rule:
  - recommended: ignition/session active begins on engine-on or explicit trip-start
  - movement contributes telemetry classification, not raw engine power truth
- Heartbeat keepalive must stop being a semantic substitute for `stopped`.
- Parked keepalives should update last-seen and latest snapshot without forcing wrong session or runtime transitions.

### Realtime event model

- Emit normalized state change events with explicit payload families.
- Avoid deriving realtime UI status from cache-only heuristics.

## Logging

- Add structured logs for:
  - state normalization path (`canonical` vs `legacy-fallback`)
  - session open/continue/end reason
  - device alert activation/clear
  - ECU alert activation/clear
- Keep DTC codes out of low-cardinality labels; log them in payload body only.

## Exit Criteria

- Bridge no longer depends on `running/stopped` as the only internal truth
- Parked active-engine states survive ingestion without being flattened into `stopped`
- Realtime and persistence share the same normalized snapshot model
