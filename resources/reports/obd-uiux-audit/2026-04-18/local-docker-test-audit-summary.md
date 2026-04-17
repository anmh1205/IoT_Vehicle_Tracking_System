# Local Docker Continuous Audit Summary (2026-04-18)

## Scope
- Validate local Docker runtime for cloud stack (`backend`, `frontend`, `mqtt-bridge`, `postgres`, observability).
- Simulate firmware-like telemetry flow from simulator -> MQTT -> bridge -> backend.
- Re-check UI screenshots against API state and fix parity issues immediately.

## Runtime Baseline
- Branch: `uat`
- Audit window: 2026-04-18 (ICT, UTC+07)
- Containers verified healthy during run:
  - `tracking-backend`
  - `tracking-frontend`
  - `tracking-mqtt-bridge`
  - `tracking-postgres`
  - `tracking-emqx`, `tracking-victoriametrics`, `tracking-victorialogs`, `tracking-grafana`

## Firmware-Style Simulation Validation
- Re-seeded local mock dataset with domain-linked records:
  - script: `iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL/scripts/seed-local-audit-mock-data.sql`
- Started simulator for 3 devices (`TRACKER_001`, `MOCK-OBD-002`, `sim-uat-001`) with 2s interval.
- Verified bridge/backend behavior from logs:
  - No `Invalid rawdata payload` regression detected.
  - Continuous event ingestion observed on `mqtt-bridge` and alert creation on `tracking-backend`.
- Snapshot contract checks (`ui-api-audit-snapshot.json`) confirm:
  - simulator state retained (`running: true`, `paused: true` for frozen audit capture)
  - all simulated coordinates finite and in valid lat/lon range.

## UI/API Parity Audit + Fix
### Issue found
- `Alerts Queue` summary cards used current page rows (`limit=50`) instead of server total (`pagination.total`), causing mismatch when total alerts > page size.

### Fix applied
- File updated:
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/alerts/page.tsx`
- Change:
  - Added summary count queries (`page=1, limit=1`) for total/active/acknowledged/critical.
  - Summary cards now use server totals for `source=all` mode.
  - Kept row-based fallback for local source filters (`obd/system`).

### Verification after fix
- Frontend checks:
  - `npm run lint`: PASS
  - `npm run typecheck`: PASS
- Docker frontend rebuilt/restarted successfully.
- Re-opened queue page confirms parity:
  - UI card `Tổng cảnh báo` matches footer `Server: ...` count.

## Captured Snapshot (Frozen Audit State)
From `resources/reports/obd-uiux-audit/2026-04-18/ui-api-audit-snapshot.json` at `2026-04-18T02:20:04+07:00`:
- Simulator: `running=true`, `paused=true`, `ticks=378`, `sentPoints=1134`
- Devices: total `4`, running `3`, stopped `0`, disconnected `1`
- Alerts: total `327`
- Maintenance: total `6` (`scheduled=2`, `in_progress=2`, `completed=2`)
- Map: positions `4`, geofences `3`
- Firmware: total `21`
- Metrics: CPU `27.25`, memory `19.05`, disk `10.84`, activeConnections `3`

## Evidence Artifacts
- API snapshot:
  - `resources/reports/obd-uiux-audit/2026-04-18/ui-api-audit-snapshot.json`
- UI screenshots:
  - `resources/reports/obd-uiux-audit/2026-04-18/ui-fleet-devices.png`
  - `resources/reports/obd-uiux-audit/2026-04-18/ui-operations-map.png`
  - `resources/reports/obd-uiux-audit/2026-04-18/ui-attention-queue.png`
  - `resources/reports/obd-uiux-audit/2026-04-18/ui-attention-maintenance.png`
  - `resources/reports/obd-uiux-audit/2026-04-18/ui-platform-firmware.png`
  - `resources/reports/obd-uiux-audit/2026-04-18/ui-platform-system-status.png`

## Unresolved Questions
- None.
