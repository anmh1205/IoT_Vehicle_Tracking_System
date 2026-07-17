# End-to-End Vehicle State Separation

## Goal

Refactor the platform so vehicle ignition, vehicle motion, device runtime, device-origin alerts, and ECU/OBD-origin alerts are modeled as separate concepts across firmware, MQTT, persistence, backend, metrics/logs, and frontend.

The target behavior is explicit:

- `ignition = ON` and `motion = STATIONARY` means the engine is still on.
- Device runtime state must not be inferred from vehicle motion.
- Device alerts and ECU alerts must be stored and rendered as separate families.
- The operations map and quick device views must show the state model clearly without UI clutter.

## Why This Matters

Current contracts still mix `running/stopped/heartbeat` with multiple meanings:

- engine on/off
- movement/non-movement
- device online/offline
- session start/stop
- parked heartbeat behavior

That coupling causes false interpretations in firmware, bridge, backend, and UI.

## Canonical State Model

### 1. Vehicle ignition axis

- `OFF`
- `ON`
- `UNKNOWN`

### 2. Vehicle motion axis

- `STATIONARY`
- `MOVING`
- `UNKNOWN`

### 3. Derived vehicle state

- `PARKED_OFF` = `ignition OFF` + `stationary`
- `ROLLING_IGN_OFF` = `ignition OFF` + `moving`
- `IDLING_ON` = `ignition ON` + `stationary`
- `MOVING_ON` = `ignition ON` + `moving`
- `UNKNOWN_STATIONARY`
- `UNKNOWN_MOVING`

### 4. Device runtime axis

- `BOOTING`
- `ACTIVE`
- `SLEEP_PREPARE`
- `SLEEPING`
- `WAKING`
- `ALARM`
- `OTA`
- `FAULT`

### 5. Sleep mode axis

- `NONE`
- `FAKE`
- `LIGHT`
- `DEEP`

### 6. Alert families

- `device_alerts[]`: power, connectivity, sensor, runtime, tamper/motion, storage, firmware
- `ecu_alerts[]`: MIL, DTC, unsupported PID, stale ECU data, ECU fault classes

## End-State Contract Principles

1. `ignition_state` is derived from engine/power evidence only.
2. `motion_state` is derived from speed/motion evidence only.
3. `device_state` is firmware runtime state only.
4. `vehicle_state` is derived from `ignition_state + motion_state`.
5. `tracking_enabled` affects publish cadence and UI behavior, not power-state truth.
6. Session logic uses explicit rules, not overloaded `running/stopped`.
7. Old `running/stopped/heartbeat` status paths stay backward-compatible during migration, then get deprecated.

## Cross-Layer Design

### Firmware

- Compute and publish:
  - `ignition_state`
  - `motion_state`
  - `vehicle_state`
  - `device_state`
  - `sleep_mode`
  - `device_alerts`
  - `ecu_alerts`
  - `ecu_dtc_snapshot`
- Stop using ignition as a proxy for movement.
- Keep `fake sleep` and real sleep paths explicit through `sleep_mode`.

### MQTT / MQTT Bridge

- Accept richer state payloads from firmware.
- Normalize compatibility with legacy `status` values during migration.
- Stop using `running/stopped` as the only cached truth.
- Rebuild sessionization rules around explicit vehicle/motion semantics.

### Database

- Store latest normalized state snapshot on device/vehicle runtime tables.
- Add alert-source distinction.
- Persist ECU fault snapshots independently from device health alerts.

### Backend

- Expose normalized state DTOs to web/mobile.
- Emit realtime updates with state families separated.
- Keep metrics/log labels low-cardinality and explicit.

### Frontend

- Surface three compact state chips everywhere relevant:
  - Engine
  - Motion
  - Device
- Present alerts as separate grouped stacks:
  - Device alerts
  - ECU alerts
- Support fast reading on:
  - operations map selected-device bottom card
  - map sidebar list item
  - devices grid/list card
  - device detail sheet/header

## Delivery Strategy

### Phase order

1. Canonical domain model and compatibility plan
2. Firmware state derivation and message contract
3. Persistence and database migration
4. MQTT Bridge normalization and session logic
5. Backend DTOs, realtime, logs, metrics
6. Frontend UX architecture and design tokens
7. Frontend implementation across quick-view and deep-view surfaces
8. Rollout, observability, fallback, and deprecation

### Compatibility policy

- Phase 1-5: dual-read / dual-write where needed
- Old `status` values remain accepted by bridge/backend during migration
- Frontend prefers new model if present, falls back to legacy mapping
- Cutover only after observability confirms parity

## Key Risks

- Session logic regressions if `running/stopped` semantics are removed too early
- UI clutter if all states and alerts are shown without hierarchy
- High-cardinality metrics/logs if alert labels include dynamic DTC values directly
- Alert duplication if device alerts and ECU alerts reuse the same table without source separation

## Definition of Ready

- Canonical enums and DTOs approved
- Legacy compatibility behavior approved
- Quick-view UX spec approved for operations map and device card
- Rollout sequence approved

## Definition of Done

- Firmware publishes separated state model end to end
- Bridge, DB, backend, realtime, metrics, logs, and frontend consume it consistently
- Quick-view UX on operations map is compact, readable, and operator-friendly
- Legacy `running/stopped/heartbeat` dependency removed or fully isolated behind compatibility adapters

## Phase Files

- [phase-01-domain-model-and-compatibility.md](./phase-01-domain-model-and-compatibility.md)
- [phase-02-firmware-state-model-and-payloads.md](./phase-02-firmware-state-model-and-payloads.md)
- [phase-03-storage-schema-and-alert-persistence.md](./phase-03-storage-schema-and-alert-persistence.md)
- [phase-04-mqtt-bridge-and-session-normalization.md](./phase-04-mqtt-bridge-and-session-normalization.md)
- [phase-05-backend-api-realtime-metrics-and-logs.md](./phase-05-backend-api-realtime-metrics-and-logs.md)
- [phase-06-frontend-ux-architecture.md](./phase-06-frontend-ux-architecture.md)
- [phase-07-frontend-implementation-surfaces.md](./phase-07-frontend-implementation-surfaces.md)
- [phase-08-rollout-verification-and-deprecation.md](./phase-08-rollout-verification-and-deprecation.md)

## Supporting Reports

- [reports/ux-spec-operations-map-and-device-quick-views.md](./reports/ux-spec-operations-map-and-device-quick-views.md)
