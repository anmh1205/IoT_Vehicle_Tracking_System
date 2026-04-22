# Phase 05 - Backend API, Realtime, Metrics, And Logs

## Objective

Expose the normalized model cleanly to web/mobile and observability consumers.

## Primary Areas

- `Tracking_Backend/src/domain/vehicle/services/vehicle-status.service.ts`
- `Tracking_Backend/src/infrastructure/realtime/mqtt-event-listener.ts`
- `Tracking_Backend/src/infrastructure/metrics/app-metrics.ts`
- alert, vehicle, device, and statistics DTO/repository layers

## API Design

- Add normalized state shape to vehicle/device status responses:
  - `ignitionState`
  - `motionState`
  - `vehicleState`
  - `deviceState`
  - `sleepMode`
  - `deviceAlerts`
  - `ecuAlerts`
  - `ecuDtcSummary`
- Preserve legacy compatibility fields temporarily:
  - `status`
  - `online/offline`

## Realtime Design

- Publish state-change events when one of the canonical axes changes.
- Publish alert-change events separately from state-change events.
- Recommended event families:
  - `device:state-updated`
  - `device:alerts-updated`
  - `device:ecu-alerts-updated`

## Metrics

- Add low-cardinality gauges/counters:
  - `devices_by_ignition_state`
  - `devices_by_motion_state`
  - `devices_by_vehicle_state`
  - `devices_by_device_state`
  - `device_alerts_active_total{family,severity}`
  - `ecu_alerts_active_total{family,severity}`
- Do not use raw DTC code as a metric label.

## Logs

- Standardize structured fields:
  - `device_id`
  - `vehicle_state`
  - `device_state`
  - `ignition_state`
  - `motion_state`
  - `alert_source`
  - `alert_family`

## Exit Criteria

- Backend surfaces enough data for quick UI rendering without extra heuristic mapping in frontend
- Metrics and logs reflect separated concepts with no overloaded `running/stopped` semantics
