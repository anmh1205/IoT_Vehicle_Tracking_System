# Phase 01 - Domain Model And Compatibility

## Objective

Freeze the canonical state taxonomy and define how legacy fields map into the new model without breaking runtime ingestion.

## Work Items

- Define shared enums for:
  - `ignition_state`
  - `motion_state`
  - `vehicle_state`
  - `device_state`
  - `sleep_mode`
  - `alert_source`
  - `alert_severity`
- Define canonical derivation rules and precedence.
- Define backward-compatible mapping from legacy status:
  - `running`
  - `stopped`
  - `heartbeat`
  - `online`
  - `offline`
- Define contract boundary between:
  - vehicle truth
  - device runtime truth
  - alert truth

## Decision Rules

- Legacy `running` maps to:
  - `device_state = ACTIVE`
  - `ignition_state = ON` only if explicit fields are absent
  - `motion_state = UNKNOWN` unless raw evidence exists
- Legacy `stopped` maps to:
  - `device_state = ACTIVE` or `SLEEP_PREPARE` depending on source path
  - not automatically `ignition_state = OFF`
- Legacy `heartbeat` maps to:
  - parked keepalive behavior only
  - not a canonical state value in the new model

## Touchpoints

- Firmware shared structs in `main/inc/app_state.h`
- MQTT payload validators/types in `Tracking_MqttBridge/src/types` and `src/validators`
- Backend DTOs and response mappers
- Frontend status hooks and rendering helpers

## Deliverables

- Canonical enum matrix
- Legacy compatibility matrix
- Transition rules document inside implementation PR notes

## Exit Criteria

- No layer is allowed to interpret `running = moving` by default
- No layer is allowed to interpret `stopped = ignition off` by default
- Compatibility rules are explicit enough to support partial rollout
