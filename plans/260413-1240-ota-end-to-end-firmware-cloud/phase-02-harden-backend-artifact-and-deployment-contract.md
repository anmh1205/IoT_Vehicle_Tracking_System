# Phase 02 — Harden backend artifact and deployment contract

## Context links
- Parent plan: `./plan.md`
- Depends on: `./phase-01-audit-contract-and-uat-baseline.md`
- Backend files:
  - `.../Tracking_Backend/src/api/routes/firmware.routes.ts`
  - `.../Tracking_Backend/src/api/controllers/firmware.controller.ts`
  - `.../Tracking_Backend/src/domain/firmware/services/firmware-deploy.service.ts`
  - `.../Tracking_Backend/src/config/env.ts`

## Overview
- Date: 2026-04-13
- Description: Make backend OTA artifact serving and deployment lifecycle safe enough for a real UAT device.
- Priority: P1
- Implementation status: completed
- Review status: in_progress

## Key Insights
- Current deploy service already emits `ota_update` with `jobId`, `version`, `url`, `size`, `sha256`, `force`, `confirmTimeoutSec`.
- Current download route streams artifact and is mounted before auth middleware via `attachUserIfAvailable`. Good for device access; dangerous if semantics stay implicit.
- Current backend likely lacks hard semantics for stuck jobs, reassignment, duplicate dispatch, or deploy reconciliation.
- KISS: keep one OTA URL shape: `GET /api/v1/firmware/:id/download`. Do not add object storage unless VPS/static serving is proven necessary.

## Requirements
- Make OTA download contract explicit and stable.
- Ensure endpoint always returns real binary with correct `Content-Length`, `Content-Type`, no HTML/login redirect, and deterministic headers.
- Ensure deploy API validates firmware readiness and device readiness inputs before sending commands.
- Ensure deployment rows can represent non-terminal, terminal, and stuck states.
- Ensure backend can reconcile stale deployments and surface operator-visible reasons.

## Architecture
- Backend remains OTA control plane and artifact host pointer owner.
- Firmware artifact storage stays local filesystem unless Phase 05 proves VPS throughput/ops require change.
- Deployment lifecycle should remain DB-backed; command dispatch is write-through to MQTT.
- Minimal lifecycle model:
  - assigned
  - in_progress (derived from downloading/verifying/installing/rebooting/confirming or preserved raw state + normalized group)
  - success
  - failed
  - rolled_back
  - stuck_timeout
- Prefer preserving raw firmware state while deriving operator grouping in service/query layer.

## Related code files
- Primary files to modify later:
  - `.../Tracking_Backend/src/api/routes/firmware.routes.ts`
  - `.../Tracking_Backend/src/api/controllers/firmware.controller.ts`
  - `.../Tracking_Backend/src/domain/firmware/services/firmware-deploy.service.ts`
  - `.../Tracking_Backend/src/config/env.ts`
- Likely adjacent backend files to inspect/update later:
  - firmware repository/entity/migration files under `src/domain/firmware/**`
  - device command service under `src/domain/device/services/device-command.service.ts`
  - realtime publisher files if OTA-specific events are emitted

## Implementation Steps
1. Make `FIRMWARE_PUBLIC_BASE_URL` mandatory in production/UAT deploy path and fail fast with clear error.
2. Harden download controller behavior:
   - deterministic binary headers
   - explicit not-found vs stream failure errors
   - optional `Accept-Ranges` only if range requests are truly supported
   - no auth redirect or HTML body on device path
3. Add artifact readiness checks before deploy:
   - file exists
   - size matches stored metadata
   - sha256 exists
   - firmware record not soft-broken/incomplete
4. Harden deploy service:
   - dedupe duplicate active deployment for same device + target version
   - validate device IDs list and maybe current state compatibility
   - store dispatch timestamp
   - preserve `jobId` uniqueness
5. Add reconciliation rules for stuck deployments:
   - assignment with no firmware event after window
   - in-progress with no update after window
   - confirm timeout exceeded after reboot window
6. Expose deployment query shape the frontend can trust without custom inference.
7. Emit consistent realtime events if backend owns UI push.

## Todo list
- [x] Make artifact download contract explicit
- [x] Harden deploy preconditions and dedupe
- [x] Add stuck/timeout reconciliation plan
- [x] Normalize deployment response shape for frontend
- [x] Define backend-owned error messages for operators

## Success Criteria
- A real device can fetch OTA binary from VPS via backend URL with valid TLS and exact binary content.
- Deploy API rejects broken artifact/runtime preconditions early.
- Duplicate deploy clicks do not create ambiguous active jobs.
- Stuck deployments can be identified without raw log spelunking.

## Risk Assessment
- Risk: “public” download route leaks broader than intended.
  - Mitigation: keep route opaque by firmware ID, TLS-only, scoped artifact directory, no directory listing, no session dependency.
- Risk: overdesign deployment state machine in backend.
  - Mitigation: keep raw firmware states; add only minimal derived stuck/terminal helpers.

## Security Considerations
- No device OTA path should rely on cookies, browser redirects, or admin bearer tokens.
- Preserve HTTPS-only artifact URLs.
- Log deploy actions with operator identity and target devices.
- Do not expose storage filesystem internals in API errors.

## Next steps
- Phase 03 hardens MQTT Bridge persistence and reconciliation so backend/UI trust the incoming status stream.
