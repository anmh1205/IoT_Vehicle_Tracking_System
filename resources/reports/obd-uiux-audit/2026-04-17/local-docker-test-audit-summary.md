# Local Docker Test + Audit Summary (2026-04-17)

## Scope
- Run local quality gates for cloud modules.
- Stabilize Docker runtime for local audit.
- Seed mock data with consistent domain relationships.
- Re-audit UI flow and capture screenshot evidence.

## Code Quality Gates
- `Tracking_Backend`
  - `npm run verify`: PASS
  - `npm run build`: PASS
  - Unit tests: 9 files, 79 tests PASS
- `Tracking_MqttBridge`
  - `npm run verify`: PASS
  - `npm run build`: PASS
- `Tracking_Frontend`
  - `npm run lint`: PASS
  - `npm run typecheck`: PASS
  - `npm run build`: PASS

## Docker Runtime Status
- Local stack status at end of audit:
  - `tracking-backend`: healthy
  - `tracking-frontend`: healthy
  - `tracking-mqtt-bridge`: healthy
  - `tracking-postgres`: healthy
  - `tracking-grafana`: healthy
  - `tracking-emqx`, `tracking-victoriametrics`, `tracking-victorialogs`: healthy

## Fixes Applied

### 1. Grafana restart loop fixed
- Root cause: bind-mounted data directory not writable by Grafana runtime user.
- Applied fix:
  - File: `iot-vehicle-tracking-system-cloud/Tracking_Grafana/docker-compose.yml`
  - Change: set Grafana container user to `root` for local Docker (`user: "0"`).
- Verification:
  - `tracking-grafana` moved from restart loop to healthy.
  - `GET http://localhost:4002/api/health` returns valid JSON (`database: ok`).

### 2. Local mock-data seeding completed
- Added idempotent seed script:
  - `iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL/scripts/seed-local-audit-mock-data.sql`
- Data model seeded with linked entities:
  - customers -> vehicles -> devices
  - geofences -> geofence_vehicles
  - policies -> policy_state -> policy_audit_logs
  - trips -> alerts -> violations
  - maintenance, device_sessions, event_logs, user_device_access
- Post-seed table counts:
  - `users`: 2
  - `customers`: 3
  - `devices`: 4
  - `vehicles`: 4
  - `drivers`: 3
  - `geofences`: 3
  - `geofence_vehicles`: 5
  - `vehicle_policies`: 2
  - `vehicle_policy_state`: 2
  - `trips`: 5
  - `alerts`: 9
  - `violations`: 3
  - `maintenance`: 6
  - `event_logs`: 6
  - `device_sessions`: 8
  - `user_device_access`: 3

## API Smoke Audit (Authenticated via Backend)
- Login: `POST http://localhost:4000/api/v1/auth/login` -> 200
- Module list endpoints -> 200 and non-empty totals:
  - `/customers`, `/drivers`, `/devices`, `/vehicles`, `/trips`
  - `/alerts`, `/maintenance`, `/geofences`, `/violations`

## UI Audit Evidence (Post-Seed)
- Network capture:
  - `resources/reports/obd-uiux-audit/2026-04-17/local-playwright-network-api.log`
  - Result: scripted navigation calls to backend API observed with 200 status in sampled flow.
- Screenshots captured:
  - `resources/reports/obd-uiux-audit/2026-04-17/local-dashboard-command.png`
  - `resources/reports/obd-uiux-audit/2026-04-17/local-dashboard-fleet-devices.png`
  - `resources/reports/obd-uiux-audit/2026-04-17/local-dashboard-customers.png`
  - `resources/reports/obd-uiux-audit/2026-04-17/local-dashboard-drivers.png`
  - `resources/reports/obd-uiux-audit/2026-04-17/local-dashboard-trips.png`
  - `resources/reports/obd-uiux-audit/2026-04-17/local-dashboard-geofences.png`
  - `resources/reports/obd-uiux-audit/2026-04-17/local-dashboard-maintenance.png`
  - `resources/reports/obd-uiux-audit/2026-04-17/local-dashboard-alerts.png`
  - `resources/reports/obd-uiux-audit/2026-04-17/local-dashboard-violations.png`
  - `resources/reports/obd-uiux-audit/2026-04-17/local-dashboard-map.png`

## Residual Risk
- Host-level frontend proxy path still returns 500 for direct proxy probes:
  - `GET http://localhost:4001/api/v1/health` -> 500
  - `POST http://localhost:4001/api/v1/auth/login` -> 500
- Current mitigation in frontend client path works for browser flow:
  - UI requests route directly to backend base (`http://localhost:4000/api/v1`) and complete login + module navigation successfully.

## Unresolved Questions
1. Should the `localhost:4001/api/*` proxy be fully repaired now, or keep direct backend base as the local-dev strategy?
2. Should the Grafana local fix stay as `user: "0"` or be replaced with a named volume approach before UAT/prod hardening?
