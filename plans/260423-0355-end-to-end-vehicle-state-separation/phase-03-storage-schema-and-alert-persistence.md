# Phase 03 - Storage Schema And Alert Persistence

## Objective

Persist the separated state model and alert families cleanly in PostgreSQL without losing compatibility with existing dashboards and statistics.

## Schema Strategy

### Device/vehicle latest-state storage

- Extend latest runtime projection with:
  - `ignition_state`
  - `motion_state`
  - `vehicle_state`
  - `device_state`
  - `sleep_mode`
  - `state_updated_at`
  - `motion_confidence`
  - `last_ecu_sample_at`

### Alert storage

- Existing operator alert table stays canonical for visible alert feed.
- Add source/family metadata:
  - `alert_source`: `DEVICE`, `ECU`, `SYSTEM`
  - `alert_family`
  - `alert_code`
  - `severity`
  - `is_active`
- Avoid exploding rows for every repeated payload if alert is already active.

### ECU fault persistence

- Add DTC snapshot storage:
  - device id
  - observed at
  - stored DTC list
  - pending DTC list
  - permanent DTC list
  - MIL bit
- Keep DTC values queryable for device detail and maintenance workflows.

## Migration Approach

- Add new nullable columns first.
- Backfill compatibility projections from legacy statuses where possible.
- Keep old `current_status` during transition.
- Only deprecate old columns after frontend/backend have fully switched.

## Touchpoints

- Bridge SQL helpers in `Tracking_MqttBridge/src/infrastructure/database.ts`
- Backend repositories under `Tracking_Backend/src/domain/**/repositories`
- PostgreSQL migration scripts in service-owned schema folders

## Exit Criteria

- Latest state can be queried without reconstructing it from raw MQTT status strings
- Device alerts and ECU alerts can be filtered separately
- Legacy screens still function during dual-write window
