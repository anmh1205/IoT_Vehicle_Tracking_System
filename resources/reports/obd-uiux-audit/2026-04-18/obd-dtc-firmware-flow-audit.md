# OBD DTC Firmware Flow Audit

Date: 2026-04-18
Target: `TRACKER_001` on `COM6`, UAT cloud

## Scope

- Verify firmware executes OBD diagnostic flow `0101`, `03`, `07`, `0A`.
- Fake ECU may return no DTC; absence of DTC is acceptable.
- Confirm failure in diagnostic steps does not block `wake -> publish MQTT -> sleep`.
- Audit live UAT UI/API rendering when diagnostics exist but DTC/sample payload is incomplete.

## Firmware Evidence

- Serial log: `iot-vehicle-tracking-system-firmware/documents/test-logs/com6-monitor-dtc-phase-3.log`
- Observed sequence on device:
  - `mode=0x01 pid=1 state=stopped`
  - `mode=0x03 pid=-1 state=stopped`
  - `mode=0x07 pid=-1 state=stopped`
  - `mode=0x0A pid=-1 state=stopped`
  - heartbeat publish still executed
  - sleep accepted still executed

## Cloud / UI Evidence

- Live UI screenshot: `resources/reports/obd-uiux-audit/2026-04-18/cloud-device-detail-modal-dtc-flow-audit.png`
- Live raw-data screenshot: `resources/reports/obd-uiux-audit/2026-04-18/cloud-device-raw-data-obd-stopped-live.png`
- Live API health: `https://api.thingdock.dev/health` returned `200 OK`.
- Live frontend: `https://thingdock.dev` returned redirect to `/login`.

## Findings

1. Firmware flow is correct for fake ECU.
   - DTC modes are sent even when ECU reports `stopped`.
   - Diagnostic failure does not block MQTT publish or sleep.
2. Live UAT receives diagnostics payload with:
   - `ble_obd_connected=true`
   - `elm_ready=true`
   - `ecu_state=stopped`
   - empty DTC buckets
3. UI bug found during audit:
   - `sample_age_ms` sentinel `4294967295` was rendered directly in summary/detail views.

## Fix

- MQTT Bridge now normalizes sentinel `sample_age_ms` out of metrics and normalized diagnostic snapshots.
- Frontend modal now treats sentinel `sample_age_ms` as unavailable and renders `-` instead of `4294967295`.
- Raw JSON payload remains untouched for audit fidelity.

## Unresolved Questions

- `vps-control` local env is missing `VPS_HOST`, so SSH-based post-deploy inspection could not be used in this audit round.
