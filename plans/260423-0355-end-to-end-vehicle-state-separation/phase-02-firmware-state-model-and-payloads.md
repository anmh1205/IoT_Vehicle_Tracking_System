# Phase 02 - Firmware State Model And Payloads

## Objective

Refactor firmware state derivation so ignition, motion, device runtime, device alerts, and ECU alerts are separated before data leaves the board.

## Primary Files

- `iot-vehicle-tracking-system-firmware/main/inc/app_state.h`
- `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
- `iot-vehicle-tracking-system-firmware/main/src/data_formatter.c`
- `iot-vehicle-tracking-system-firmware/main/inc/data_formatter.h`
- `iot-vehicle-tracking-system-firmware/main/src/mqtt_client.c`
- `iot-vehicle-tracking-system-firmware/main/src/ble_obd.c`

## Changes

### State derivation

- Replace overloaded ignition-only state routing with independent derived fields.
- Add a `motion_state` derivation pipeline using:
  - OBD speed
  - GNSS speed
  - IMU support only as assist, not source of truth for vehicle movement
- Keep `ignition_state` independent from motion.
- Keep `device_state` owned by FSM.

### Runtime FSM clarification

- Rename or document `APP_STATE_DRIVING` as device-active runtime rather than vehicle-moving runtime.
- Preserve fake/light/deep sleep branches, but always publish explicit `sleep_mode`.

### Alert production

- Introduce `device_alerts[]` for:
  - low battery
  - LTE loss
  - MQTT loss
  - GNSS stale
  - OBD link lost
  - watchdog/runtime faults
- Introduce `ecu_alerts[]` for:
  - MIL on
  - DTC present
  - stale ECU sample
  - PID unsupported / PID invalid

### Payload contract

- Extend raw telemetry payload with a `state` block:
  - `ignition_state`
  - `motion_state`
  - `vehicle_state`
  - `device_state`
  - `sleep_mode`
  - `data_quality`
- Extend payload with:
  - `device_alerts`
  - `ecu_alerts`
  - `ecu_dtc`
- Keep legacy fields during migration:
  - `ignition`
  - `status`
  - legacy signal fields

## Guardrails

- Do not use `tracking_enabled` to decide ignition truth.
- Do not use OBD transport liveness alone as long-lived engine-on truth.
- DTC codes must not be collapsed into generic device alerts.

## Exit Criteria

- Firmware can publish `IDLING_ON` distinctly from `MOVING_ON`
- Firmware can publish `device_state = ACTIVE` while `motion_state = STATIONARY`
- Firmware payload remains backward-compatible for bridge ingestion
