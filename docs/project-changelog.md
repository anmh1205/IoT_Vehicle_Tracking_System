# Project Changelog

## 2026-04-24
### Thesis-Anchored Knowledge Base Bootstrap (Completed)
- Added a repo-local knowledge bootstrap under `resources/docs/knowledge-base/` for `IoT_Vehicle_Tracking_System`, organized as source registry, evidence cards, reconciliation output, repo-pack notes, domain notes, and pattern notes.
- The bootstrap uses thesis source files as the design anchor, then reconciles them against current repo truth from README, docs, compose manifests, package manifests, env examples, and selected source contracts.
- Promoted the first official repo-pack for `iot-vehicle-tracking-system`, covering architecture, device-to-cloud and cloud-to-dashboard system flows, MQTT/state-machine/offline-replay/OTA concepts, three source-backed runbooks, a decision note, and an open-questions queue.
- Preserved unresolved drift explicitly in a conflict queue instead of flattening it into the promoted notes; current blockers include local host-port exposure drift, frontend env-template drift, and thesis-era frontend version/docs drift.
- Validation status: documentation implementation only; no live full-stack runtime execution was performed in this batch.

## 2026-04-23
### MQTT Heartbeat Session Debounce + UAT Schema Sync (Completed)
- Hardened `Tracking_MqttBridge` so parked heartbeat `rawdata` snapshots no longer auto-open `device_sessions` when the device is already in a stopped/non-active runtime state; telemetry still updates `last_seen` and latest coordinates without inflating runtime/session stats.
- Added transient heartbeat micro-session cleanup in `Tracking_MqttBridge/src/infrastructure/database.ts` so sessions ended by `status=heartbeat` with `<=1` data point and very short runtime are detached from `event_logs` and removed instead of being kept as false driving sessions.
- Prevented discarded heartbeat micro-sessions from emitting a normal `session ended` realtime event, avoiding downstream consumers/UI from treating a deleted session as a completed run.
- Synced PostgreSQL enum expectations by adding `online` to fresh-bootstrap `device_status_enum` in `init/00-extensions.sql` and to long-lived UAT databases through `scripts/uat-runtime-schema-sync.sql`.
- Validation status: MQTT Bridge typecheck/build passed locally; Backend lint/typecheck/test passed locally; VPS audit confirmed the pre-fix symptom pattern before rollout.

## 2026-04-21
### Allowed-Zone Map UX Refactor (Completed)
- Refactored the operations map allowed-zone flow in `Tracking_Frontend/src/features/map/components/tracking-map.tsx` so allowed-zone rendering/editing now uses a dedicated map layer and docked panel instead of the generic geofence draft/workspace path.
- Updated `Tracking_Frontend/src/features/map/components/map-selected-device-overlay.tsx` to show allowed-zone status and direct create/edit/show/hide actions for the selected device overlay.
- Kept shared allowed-zone data hooks and form payload mapping unchanged in `Tracking_Frontend/src/features/geofences/hooks/use-vehicle-allowed-zone.ts` and `src/features/geofences/lib/allowed-zone-form.ts`; non-map surfaces still use `src/features/geofences/components/allowed-zone-setup-sheet.tsx`.
- Validation status: documentation-only update to reflect an already implemented frontend UX refactor; no new runtime contract changes were documented.

## 2026-04-16
### Dashboard Device Limit Fix + Vietnamese Copy Normalization (Completed)
- Fixed frontend fallback device snapshot loading in `Tracking_Frontend/src/features/dashboard/hooks/use-dashboard-stats.ts` and `Tracking_Frontend/src/features/statistics/hooks/use-statistics.ts` to page through `/api/v1/devices` with `limit=100`, avoiding backend validation failures from `limit=500`.
- Hardened backend device list query parsing in `Tracking_Backend/src/api/validators/device.validator.ts` by clamping `limit` to `100`, so stale clients requesting higher limits no longer receive `400` responses.
- Updated dashboard-facing UI copy from Vietnamese without diacritics to proper Vietnamese with diacritics in `Tracking_Frontend/src/app/dashboard/page.tsx`, `devices/page.tsx`, `drivers/page.tsx`, `vehicles/page.tsx`, and `customers/page.tsx`.
- Validation status: frontend `npm run lint`, `npm run typecheck`, and `npm run build` passed locally.

## 2026-04-12
### Firmware Runtime Completion - Phases 01-06 (Completed in Code, Hardware Validation Pending)
- Centralized runtime timing and policy fields in firmware config/NVS (`tracking`, `heartbeat`, `alarm`, `ignition hold`, `sleep`, `IMU wake`, OTA power gate, ADC ignition threshold) so product-facing cadence no longer depends on scattered literals.
- Added legacy NVS config migration path that preserves identity/credentials and replaces legacy default cadence drift with current runtime defaults.
- Updated command handling so `update_config` only mutates approved runtime knobs with bounded validation and persists only valid config states.
- Reworked FSM runtime behavior: parked heartbeat now publishes `rawdata + status`, alarm cadence follows config, ignition fallback no longer depends on BLE connection, and sleep rejects emit explicit reason logs.
- Added OTA start safety gate (`mqtt connected + minimum battery voltage`) and blocked unsafe OTA windows instead of attempting updates blindly.
- Added timer-only fallback behavior when IMU wake is not enabled/proven and bounded BLE connect impact via reduced connect timeout and longer retry backoff.
- Validation status: local ESP-IDF build command could not run in this environment because `idf.py` is not installed; real-hardware acceptance gates remain tracked in firmware runtime plan Phase 07.

## 2026-04-10
### MQTT Device Simulator and VPS Fix-Loop Automation (Completed)
- Added deterministic MQTT device simulator artifacts under `resources/mock-data/scripts/` and `resources/mock-data/simulator-specs/` for seeded publish, dry-run, replay, and fault-injection workflows.
- Added bounded local-agent/VPS SSH fix-loop automation with allowlisted service restarts, stop conditions, rollback runbook, operator handover, and test matrix checkpoints.
- Validation status: backend typecheck/build passed, backend tests passed after harness fix, MQTT Bridge typecheck/build passed, and final code review accepted the scope with low-medium residual operational risk.

## 2026-04-13
### OTA End-to-End Firmware-Cloud Hardening (Phases 01-04 Completed in Code)
- Backend OTA deploy flow now performs artifact readiness checks (file exists, metadata size/sha validity), device ID validation, active-job dedupe, dispatch failure marking, and derived reconcile status (`in_progress` / `stuck_timeout`) for operator APIs.
- Backend OTA download endpoint now returns deterministic binary headers (`Content-Length`, `Content-Type`, `ETag`, `no-store`, `nosniff`) and uses hardened stream error handling suitable for device OTA clients.
- PostgreSQL firmware log schema now includes OTA ordering/reconcile fields (`status_reason_code`, `first_assigned_at`, `command_dispatched_at`, `last_seen_at`, `last_message_id`, `last_seq_no`, `last_boot_id`, `confirm_timeout_sec`) via `init/05-firmware.sql` + compatibility patch `init/13-ota-hardening.sql`.
- MQTT Bridge firmware handler now enforces duplicate suppression (`message_id`), out-of-order guard (`seq_no`), and terminal-state stickiness, and persists ordering metadata for debug/reconcile.
- Firmware OTA runtime now emits OTA milestone statuses through callback-based reporting and maps OTA failures to stable short error codes (`http_open_failed`, `sha256_mismatch`, `ota_end_failed`, etc.).
- Firmware OTA confirm timeout is now persisted as an absolute deadline and enforced on post-OTA boot (`confirm_timeout_exceeded` path) when trusted time is available.
- Frontend firmware dashboard now reads `summaryStatus`/`stuckReason`/`errorCode` and displays OTA reconcile context without custom local inference.
- Validation status: Backend lint/typecheck/test/build passed; MQTT Bridge typecheck/build passed; Frontend lint/typecheck/build passed. Firmware compile command not executable in this environment because `idf.py` is unavailable.

## 2026-04-09
### Firmware GNSS Observability and Recovery Hardening (Completed)
- Added GNSS query observability for transport failures, parse failures, no-fix streaks, and fix-success streaks in the modem GNSS path.
- Added bounded GNSS self-heal with cooldown so repeated poll failures repower the GNSS engine without thrashing the modem.
- Added GNSS re-arm lifecycle in the tracker state machine so LTE recovery and GNSS fail streaks can re-enable GNSS with cooldown gating.

## 2026-04-06
### Firmware SD Log Recovery, RTC Validation, and Replay ACK Hardening (Completed)
- Hardened the firmware SD log store recovery path so log writes can recover cleanly after transient storage faults.
- Integrated DS3231M RTC handling with UTC-safe validation to keep firmware time checks consistent across replay and persistence flows.
- Hardened offline queue replay ACK handling and state machine integration so replay completion is confirmed before the device advances state.
- Validation status: compile validation passed for the completed firmware scope.

### Cloud Geofence Policy and Distance Quota (Completed)
- Added backend policy types for `ADMIN_BOUNDARY`, `RADIUS`, and `DISTANCE_QUOTA` with telemetry-driven evaluation in `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/services/policy-evaluator.service.ts`.
- Added policy state persistence, violation creation, and quota-cycle reset tracking so the backend can persist spatial state and distance consumption per vehicle/policy.
- Exposed policy CRUD, policy-state lookup, and violation listing through the geofence API surface in `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/geofence.routes.ts` and `src/api/controllers/geofence.controller.ts`.
- Added policy metrics for evaluation count, evaluation latency, violation count, and quota reset count in `src/infrastructure/metrics/app-metrics.ts`.
- Validation status: backend lint, typecheck, test, and build were reported as passing for the completed scope; code review captured non-blocking hardening follow-ups for later maintenance.

## 2026-04-05
### BLE OBD Diagnostics Counters and Log Instrumentation (Completed)
- Added rolling BLE OBD transaction counters and periodic diagnostic logging in `iot-vehicle-tracking-system-firmware/main/src/ble_obd.c` to track request volume, valid/invalid responses, timeouts, and RX buffer overflows.
- The firmware now emits a periodic health snapshot and logs a final diagnostic summary on disconnect, improving field troubleshooting for BLE OBD sessions without changing the public OBD command contract.

## 2026-04-03
### CI/CD UAT Minimal Rollout (In Progress)
- Added manual fallback trigger `workflow_dispatch` to UAT deploy pipelines for Backend, Frontend, and MQTT Bridge in `.github/workflows/backend-uat.yml`, `.github/workflows/frontend-uat.yml`, and `.github/workflows/mqtt-bridge-uat.yml`.
- Added deploy preflight secret validation and shared SSH deploy flow to make first-time VPS bootstrap idempotent and fail-fast on missing runtime config.
- Added reusable VPS deploy scripts in `scripts/deploy/bootstrap-vps.sh` and `scripts/deploy/deploy-service.sh` to standardize compose validation, first-time `.env` provisioning, per-service redeploy, and optional post-deploy health checks.
- Added CI/CD secret/env reference and rollout checklist in `docs/cicd-required-secrets-and-env.md`.

### Firmware Boot WDT Stabilization (Completed)
- Fixed repeated ESP32-S3 boot resets (`rst:0x8 TG1WDT_SYS_RST`) in firmware startup by switching LIS3DSH I2C bus configuration to synchronous mode in `iot-vehicle-tracking-system-firmware/main/src/imu_lis3dsh.c` (`trans_queue_depth: 4 -> 0`).
- Removed dependency on ESP-IDF I2C asynchronous experimental path during early boot IMU init to reduce watchdog reset risk before state-machine runtime.
- Runtime validation on target hardware is required to confirm sustained boot stability and no WDT reset loop recurrence.

## 2026-04-04
### Hardware Spec Firmware Thesis Sync (In Progress)
- Renamed firmware IMU module from LIS3DH naming to LIS3DSH (`main/src/imu_lis3dsh.c`, `main/inc/imu_lis3dsh.h`, `main/CMakeLists.txt`, `main/src/state_machine.c`, `main/inc/pin_map.h`) and aligned WHO_AM_I check to LIS3DSH (`0x3F`).
- Expanded modem control abstraction in firmware power/modem flow: added placeholders for `RESET`, `SIM-DTR`, `STATUS`, `NET-LIGHT` in `main/inc/pin_map.h`; added `modem_reset_pulse`, `modem_set_dtr`, `modem_read_status`, `modem_read_netlight` in `main/src/power_mgr.c` + `main/inc/power_mgr.h`; integrated DTR + AT reset recovery + status/netlight logging in `main/src/modem_lte.c`.
- Standardized thesis final asset basenames under `resources/reports/thesis/final/` and synced the markdown pair (`resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-readability-draft.md`, `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md`) plus impacted Mermaid UML sources to LIS3DSH terminology and PWR-KEY naming.
- Regenerated thesis figure artifacts via `resources/reports/thesis/final/assets/generate-thesis-report-figures.mjs` (88 SVG outputs rendered) with deterministic basename resolution so regenerated assets stay aligned after filename normalization.

## 2026-03-31
### API Response Contract Hard Cutover (Completed)
- Backend responses now use a hard-cutover success envelope of `{ data, requestId, meta? }`, with `requestId` propagated from the request/response lifecycle instead of being implicit.
- Error responses now serialize as RFC7807 problem details with `type`, `title`, `status`, `detail`, `instance`, `code`, `requestId`, and `errors[]` for validation detail.
- Shared middleware and surface handlers now follow the new contract across error handling, rate limiting, health, and metrics paths so operational endpoints stay consistent.
- Frontend API parsing now unwraps the success envelope and routes the new problem-details shape through the updated error parser.
- Verification passed via validation, tests, build, and Docker checks.

### Login Page Split Layout (Completed)
- Updated the frontend login page to a split layout with a landing/marketing panel on the left and the login form on the right in `Tracking_Frontend/src/features/auth/components/login-form.tsx`.
- Reworked the left panel into a 3-block composition: hero, highlights, and proof labels, with the marketing copy centralized in `Tracking_Frontend/src/features/marketing/data/landing-content.ts`.
- Updated the frontend root route so `/` now redirects to `/login` instead of serving the former public entry.
- Auth flow, session handling, and request/response behavior remain unchanged; these are routing and UI/UX updates only.

## 2026-03-28
### Login Error Path Stabilization (Completed)
- Frontend login now distinguishes `401` authentication failures from network errors and server-side `5xx`, improving user-facing error clarity in `Tracking_Frontend/src/features/auth/components/login-form.tsx`.
- Frontend API interceptor now bypasses refresh flow for `401` responses from `/auth/login`, allowing login form handling to remain authoritative in `Tracking_Frontend/src/lib/api/client.ts`.
- Backend login flow now maps database failures in user lookup/session creation to controlled API errors: `503 AUTH_DB_UNAVAILABLE` for availability/connectivity faults and `500 AUTH_DB_QUERY_FAILED` for query/schema-class faults in `Tracking_Backend/src/domain/auth/services/auth-session.service.ts`.

## 2026-03-27
### Auth Login Error Hardening (Completed)
- Added a guard and defensive error mapping in `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/auth/services/auth-session.service.ts` for password hash verification.
- Impact: when stored credential hash is missing/invalid, login now returns controlled auth failure instead of unhandled internal 500.

## 2026-03-20
### Thesis Baseline Sync (Completed)
- Synced the final thesis markdown sources, Mermaid sources, and exported SVG figures under `resources/reports/thesis/`.
- Fixed the thesis figure generator path resolution so figure output matches the current thesis asset layout in this workspace.
- Scope stayed limited to thesis source and asset baseline alignment; no runtime application modules changed.

### Diagram Reference Pack V2 Pilot (Completed)
- Added the independent pilot pack under `resources/reports/diagram-reference-packs/diagram-pack-v2` with a manifest-driven structure, Mermaid and PlantUML source entries, style assets, baselines, QA gates, and release build outputs.
- Added a dedicated asset export under `resources/reports/diagram-reference-packs/diagram-pack-v2/build/assets/` and included that asset set in the release artifact.
- Added Node-based pack lifecycle scripts in `resources/reports/diagram-reference-packs/diagram-pack-v2/scripts/` and npm commands `pack:validate`, `pack:build`, `pack:qa`, and `pack:release` in the pack `package.json`.
- Added hardened CI/release workflows in `.github/workflows/diagram-pack-ci.yml` and `.github/workflows/diagram-pack-release.yml`, including `actions/upload-artifact@v4` guards with `if-no-files-found: error`.
- Fixed Ajv 2020 schema handling, Windows PlantUML path handling, PlantUML PDF fallback via SVG->PDF, empty-artifact gating, and workflow artifact upload hardening.
- Final local validation and independent tester validation passed for validate, build, QA, and release flows without changing runtime application architecture.

## 2026-03-15
### Public Landing Page Rollout (Completed)
- Replaced the root redirect with a public landing page in `Tracking_Frontend/src/app/page.tsx`.
- Added marketing-focused frontend components in `Tracking_Frontend/src/features/marketing/` to render hero, feature, proof, and system-flow sections.
- Added local SVG illustration assets in `Tracking_Frontend/public/landing/` for the hero and supporting visual blocks.
- Updated `Tracking_Frontend/middleware.ts` so `/` and `/landing/*` remain public while dashboard routes continue to require a session cookie.
- Updated `Tracking_Frontend/src/components/auth/session-guard.tsx` so the landing route does not wait on the authenticated bootstrap spinner.

## 2026-03-13
### UI/UX Accessibility Remediation (Completed)
- Added keyboard skip link to jump to main content in root layout (`Tracking_Frontend/src/app/layout.tsx`).
- Added `main-content` landmarks to dashboard/login flows (`Tracking_Frontend/src/app/dashboard/layout.tsx`, `Tracking_Frontend/src/app/login/page.tsx`).
- Added accessible labels and live announcement behavior for login validation/errors (`Tracking_Frontend/src/features/auth/components/login-form.tsx`).
- Enhanced map/device interaction components for keyboard support, visible focus/pressed states, and icon semantics (`Tracking_Frontend/src/features/map/components/map-controls.tsx`, `src/features/devices/components/device-card.tsx`).
- Increased mobile touch targets on frequent action controls (`src/components/ui/sidebar.tsx`, `src/features/system-admin/components/data-table/pagination.tsx`, `src/features/map/components/mobile-device-drawer.tsx`, etc.).
- Made notification popover width responsive to viewport (`src/features/notifications/components/notification-dropdown.tsx`) and improved button labels/announcement context (`notification-badge.tsx`).
- Stabilized layout on mobile browsers with `100dvh` in key content containers (`src/app/dashboard/map/page.tsx`, `src/components/layout/PageContainer.tsx`).
- Updated Flutter WebView error/loading accessibility semantics and Vietnamese status strings (`Tracking_Mobile/lib/features/webview/webview_screen.dart`, `Tracking_Mobile/lib/widgets/error_view.dart`, `Tracking_Mobile/lib/widgets/loading_indicator.dart`).

## 2026-04-01
### Thesis Readability Sync (Completed)
- Normalized the final thesis markdown sources and Mermaid labels under `resources/reports/thesis/final/` to keep prose, captions, and diagram labels easier to read.
- Regenerated the exported SVG figures after the Mermaid source update so the rendered artifact set stays in sync.
- Kept runtime application code untouched; the change was limited to thesis assets and directly related documentation.

### MQTT Canonical Cutover + Runtime Cleanup (Completed)
- MQTT is now the canonical ingest path for both real devices and simulator traffic.
- Legacy `/iot/data` runtime routing was removed, and the OpenAPI surface no longer advertises that endpoint.
- Realtime events were normalized to colon-style names so backend emitters, listeners, and consumers share one contract.
- Simulator rollback/race mitigation and token-flow hardening were applied as part of the canonical cutover, with follow-up review notes captured for any remaining legacy drift.
- Validation passed for backend lint/typecheck/test/build, MQTT Bridge typecheck/build, plus runtime sanity and code review closeout on the completed scope.

## Impact
- Improved keyboard navigation, screen reader clarity, and mobile tap reliability.
- Reduced risk of viewport jump/clip issues on mobile map and dashboard pages.
- Added a clear public product entry point without weakening protection around `/dashboard/*`.
- Simplified ingest architecture by making MQTT the only canonical runtime path for telemetry and simulator data.
