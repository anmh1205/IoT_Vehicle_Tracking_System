# Project Changelog

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
- Synced thesis final markdown pair (`resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-readability-draft.md`, `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md`) and impacted Mermaid UML sources to LIS3DSH terminology plus PWR-KEY naming.
- Regenerated thesis figure artifacts via `resources/reports/thesis/final/assets/generate-thesis-report-figures.mjs` (88 SVG outputs rendered) to keep source and rendered assets consistent.

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
