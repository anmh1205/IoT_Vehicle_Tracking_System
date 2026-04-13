# Cloud/VPS OTA audit

- Conducted: 2026-04-13 12:40 ICT
- Scope: cloud/VPS side only. No implementation.

## Current state
- Repo already documents OTA as a system goal, but current cloud/VPS path looks partial, not production-like end-to-end yet. Docs repeatedly mention remote firmware updates, MQTT backend, realtime dashboard, and deployment-oriented management, but evidence is heavier in architecture/docs than in a clearly proven OTA ops flow (`E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md:31`, `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md:64`, `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/development-roadmap.md:78`).
- Backend/cloud side appears to already have some deployment/device-management concepts. Roadmap/changelog indicate device management, command handling, and firmware-update-related work exists or was planned (`E:/anmh1205/IoT_Vehicle_Tracking_System/docs/development-roadmap.md:78`, `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/project-changelog.md:24`, `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/project-changelog.md:89`).
- Command dispatch likely rides through MQTT-centric services/bridge, not a standalone OTA transport. Codebase docs map backend around MQTT ingestion/realtime responsibilities (`E:/anmh1205/IoT_Vehicle_Tracking_System/docs/codebase-summary.md:52`, `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md:64`).
- Progress ingestion/state persistence exists conceptually, but I did not confirm a full OTA lifecycle pipeline from artifact upload -> device fetch -> progress -> terminal state -> rollback. Within tool budget, proof is insufficient.
- Frontend/UI already has realtime monitoring/dashboard capability, but OTA-specific operator UX still looks under-specified from the files inspected (`E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md:72`, `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/development-roadmap.md:44`).

## Key files
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md` — main architecture references for MQTT, realtime, dashboard, OTA claims (`.../docs/system-architecture.md:31`, `.../docs/system-architecture.md:64`, `.../docs/system-architecture.md:72`).
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/development-roadmap.md` — roadmap status for platform/device/OTA/deployment capabilities (`.../docs/development-roadmap.md:44`, `.../docs/development-roadmap.md:78`).
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/project-changelog.md` — change history around device mgmt / OTA-related work (`.../docs/project-changelog.md:24`, `.../docs/project-changelog.md:89`).
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/codebase-summary.md` — module-level hints for backend/frontend/realtime/MQTT responsibilities (`.../docs/codebase-summary.md:52`).

## VPS validation points
- Artifact hosting/reachability
  - Confirm exact artifact URL shape expected by firmware/cloud now: direct public binary URL, API download endpoint, or reverse-proxied object storage.
  - Validate VPS serves binaries with correct TLS chain, `Content-Length`, `Content-Type`, `Accept-Ranges`, no accidental HTML redirect/login page.
  - Test artifact fetch from real device network path, not just browser/admin machine.
- Auth
  - Verify whether current code assumes public/anonymous artifact download. If firmware only supports plain HTTPS URL, signed headers/cookies will fail.
  - Check if auth applies only to upload/admin actions while download must stay public or query-token based.
- Command dispatch
  - Validate actual MQTT topic naming, QoS, retain policy, command ack semantics, duplicate delivery handling.
  - Confirm backend persists: command issued, device ack, download started, progress %, success/failure, timeout.
- Deployment state
  - Verify cloud has a real OTA state machine, not just generic command logs.
  - Check resume/reconciliation rules when device disconnects mid-update.
- Observability/UI
  - Verify websocket/SSE or polling actually surfaces OTA deployment progress, not only telemetry/location.
  - Check if UI exposes artifact version, checksum, per-device timeline, error reason, retry/rollback.
- Ops hardening
  - Confirm VPS storage path, upload size limits, retention, checksum generation, rollback artifact retention, access logs, and cleanup.

## Confirmed gaps
- No clear proof of hardened artifact distribution policy from current code/docs: checksum/signature validation, signed URL expiry handling, resumable download guarantees, cache/CDN behavior.
- No clear proof of end-to-end OTA deployment state machine covering queued -> dispatched -> downloading -> flashing -> rebooting -> success/failure -> rollback.
- No clear proof of OTA-specific observability: per-deployment logs, stuck-device alerting, correlated artifact access logs, progress history.
- No clear proof frontend already has a dedicated OTA operations surface for upload, staged rollout, cohort targeting, progress drill-down, retry/cancel/rollback.
- No clear proof MQTT bridge/backend reconciles duplicate/out-of-order progress events or reconnect gaps.

## Unresolved questions
- Need implementation-phase inspection of actual backend/frontend source directories to confirm OTA modules; current audit is constrained by tool budget and broad search only.
- Unknown whether VPS artifact hosting currently uses Nginx static files, app-server streaming, object storage, or release assets.
- Unknown whether firmware downloader supports custom auth headers, query-token signed URLs, CA pinning, or resume.
- Unknown whether hidden/incomplete OTA UI screens already exist behind feature flags.
