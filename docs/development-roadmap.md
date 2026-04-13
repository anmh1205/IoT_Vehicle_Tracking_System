# Development Roadmap

## Phase Status

### P1 - MQTT Device Simulator + VPS Fix-Loop Automation Complete
- Scope: deterministic MQTT device simulator plus bounded local-agent/VPS SSH fix-loop automation under `resources/mock-data/scripts` and `resources/mock-data/simulator-specs`.
- Milestones completed:
  - Added canonical MQTT contract baseline, scenario catalog, and fault-injection policy specs.
  - Added deterministic simulator runner support for seeded publish, dry-run, replay, and publish modes.
  - Added local VPS fix-loop orchestration with allowlisted targeted restart behavior, bounded iterations, and rollback/stop conditions.
  - Added test matrix, checkpoint thresholds, retest gate rules, rollback runbook, operator handover, and stop-conditions policy.
  - Backend and MQTT Bridge impacted validation passed; final code review accepted the scope with only low-medium residual operational risk.

### P1 - Accessibility Remediation (Web + Mobile) Complete
- Scope: Web dashboard (`iot-vehicle-tracking-system-cloud/Tracking_Frontend`) and mobile shell (`iot-vehicle-tracking-system-cloud/Tracking_Mobile`) accessibility hardening.
- Milestones completed:
  - Skip-link and main-content landmarks.
  - Keyboard semantics and pressed-state support.
  - Expanded touch targets for mobile controls.
  - Responsive popover width and status/error live-region handling.
  - Viewport stability updates with `100dvh` for map/content panels.

### P2 - Login Entry Split Layout (Frontend) Complete
- Scope: Route unauthenticated visitors to `/login` and present the split login/landing layout there.
- Milestones completed:
  - Root route now redirects to `/login`.
  - Split login layout implemented in `Tracking_Frontend/src/app/login/page.tsx` and `Tracking_Frontend/src/features/auth/components/login-form.tsx`.
  - The left marketing panel now uses a 3-block composition (hero, highlights, proof labels) sourced from `Tracking_Frontend/src/features/marketing/data/landing-content.ts`.
  - Middleware keeps `/dashboard/*` protected.
  - Session bootstrap no longer blocks the login route with an auth loader.

### P3 - API Response Contract Hard Cutover Complete
- Scope: Standardize backend and frontend on a single API response contract.
- Milestones completed:
  - Success responses now use `{ data, requestId, meta? }`.
  - Error responses now use RFC7807 problem details with `requestId` and `errors[]`.
  - Request ID, error, rate-limit, health, and metrics surfaces are aligned to the new contract.
  - Frontend parsing now unwraps success envelopes and handles the new problem-details shape.
  - Validation, tests, build, and Docker verification passed.

### P2 - Diagram Reference Pack V2 Pilot Complete
- Scope: Independent diagram reference pack under `resources/reports/diagram-reference-packs/diagram-pack-v2` with validate/build/qa/release flow.
- Milestones completed:
  - Added pack manifest/schema/style/sample diagrams/scripts/package-lock for a standalone pipeline.
  - Added a dedicated `build/assets/` export set and wired it into the release artifact.
  - Updated `.github/workflows/diagram-pack-ci.yml` and `.github/workflows/diagram-pack-release.yml` for pack CI/release automation.
  - Fixed Ajv 2020 schema handling, Windows PlantUML path handling, PlantUML PDF fallback via SVG->PDF, empty-artifact gates, and artifact upload hardening.
  - Local validation and independent tester validation passed on final pilot state.
  - Final review accepted the pilot for controlled parallel use.

### P4 - MQTT Canonical Cutover + Legacy Ingest Removal Complete
- Scope: make MQTT the single canonical ingest path for real devices and simulator traffic, and remove legacy `/iot/data` runtime usage.
- Milestones completed:
  - Canonical ingest now flows through MQTT for device and simulator sources.
  - Legacy `/iot/data` runtime routing and OpenAPI exposure were removed.
  - Realtime event names were normalized to colon-style to reduce consumer drift.
  - Token-flow hardening and simulator rollback/race mitigation were applied during the cutover.
  - Validation passed for backend lint/typecheck/test/build, MQTT Bridge typecheck/build, runtime sanity, and review closeout.

### P3 - CI/CD UAT Minimal Rollout In Progress
- Scope: implement IVM26-style minimal CI/CD for Backend/Frontend/MQTT Bridge (GitHub secrets baseline, first-time VPS bootstrap, auto deploy on `push uat` with manual fallback).
- Milestones in progress:
  - Added `workflow_dispatch` manual fallback trigger and `concurrency` guards in UAT workflows to avoid overlapping deploys.
  - Added deploy preflight checks for required secrets and standardized SSH deploy flow.
  - Added reusable VPS deploy scripts `scripts/deploy/bootstrap-vps.sh` and `scripts/deploy/deploy-service.sh`.
  - Added health-gated deploy retries with bounded timeout/interval settings in the deploy script.
  - Added backend image tag policy `uat` + `uat-${github.sha}` for stable rollback and traceable builds.
  - Added rollout checklist and required secret/env mapping in `docs/cicd-required-secrets-and-env.md`.

### P2 - Cloud Geofence and Distance Limits (Backend) Complete
- Scope: cloud-side policy engine for admin boundary, radius, and distance quota on the backend.
- Milestones completed:
  - Policy contract/scope closed in plan and validation log.
  - Backend review covered geofence CRUD, policy evaluator, ingest, and violation repository flow.
  - Policy types, evaluation flow, metrics, and API endpoints are now documented as part of the completed feature set.
- Validation status:
  - Backend lint, typecheck, test, and build were reported as passing for the completed scope.
  - Code review captured follow-up hardening items for future maintenance, but they do not block feature completion.

### P2 - Hardware Spec Firmware Thesis Sync In Progress
- Scope: align firmware + thesis final assets with hardware netlist baseline decisions (SIM7600CE-T canonical, LIS3DSH migration, modem control-line model expansion).
- Milestones in progress:
  - Firmware IMU runtime path switched to LIS3DSH naming and WHO_AM_I expectation in `iot-vehicle-tracking-system-firmware/main`.
  - Modem control abstraction expanded with RESET/DTR/STATUS/NET-LIGHT hooks (GPIO_NC placeholders pending final board pin mapping).
  - Thesis final markdown pair and impacted UML sources synced to LIS3DSH + PWR-KEY terminology.
  - Thesis final asset basenames were standardized to canonical names so regenerated figure outputs resolve deterministically after filename normalization.
  - Figure render pipeline executed to regenerate synchronized SVG artifacts.

### Firmware Runtime Hardening Complete
- Scope: SD log store recovery, DS3231M RTC UTC-safe validation, offline queue replay ACK hardening, GNSS observability/recovery, and state machine integration in the firmware runtime.
- Milestones completed:
  - SD log store recovery now handles transient storage faults more cleanly.
  - DS3231M RTC handling keeps time checks UTC-safe for replay and persistence flows.
  - Offline queue replay ACK handling now gates state advancement until completion is confirmed.
  - GNSS polling now carries bounded retry, self-heal, and re-arm lifecycle handling after LTE recovery or repeated fail streaks.
  - Compile validation passed for the completed firmware scope.

### P2 - Firmware GNSS Reliability Observability and Recovery Complete
- Scope: GNSS observability, bounded retry/self-heal, and GNSS re-arm lifecycle after LTE recovery/fail streak.
- Milestones completed:
  - GNSS query diagnostics now distinguish transport fail, parse fail, no-fix, and fix-success streaks.
  - Self-heal repower is bounded by cooldown to avoid modem thrash during repeated poll failures.
  - The tracker state machine re-arms GNSS after LTE recovery or fail-streak thresholds with cooldown gating.

### P2 - Firmware Runtime Completion (Phases 01-06) Complete in Code
- Scope: centralized runtime policy for sleep/wakeup, IMU gate, LTE/GNSS/MQTT cadence contracts, BLE ignition fallback hardening, and OTA safety preconditions.
- Milestones completed:
  - Config/NVS now owns runtime cadence and safety knobs (driving 1s, parked heartbeat 120s, alarm cadence 3s, ignition hold 3s baseline, OTA power gate).
  - State machine now enforces policy-based sleep gating with explicit reject reasons.
  - Alarm + heartbeat runtime contracts are explicit (`alarm raw cadence`, `heartbeat raw + status`).
  - Ignition inference now prioritizes OBD but keeps ADC fallback authoritative when BLE adapter is absent.
  - OTA command flow now validates start safety window before update execution.
- Remaining closure:
  - Phase 07 hardware acceptance (gates A-F) remains in progress and requires real-board measurements.

### P1 - OTA End-to-End Firmware-Cloud Hardening (Phases 01-04 Complete in Code)
- Scope: harden OTA contract from backend deploy/download to MQTT bridge ingest ordering and firmware runtime error mapping.
- Milestones completed:
  - Backend OTA artifact readiness checks added before deploy, plus strict download response headers for device-safe binary fetch.
  - Backend deploy flow now validates device IDs, deduplicates active jobs by device/version, tracks dispatch outcomes, and surfaces derived stuck status for operators.
  - MQTT Bridge firmware ingest now suppresses duplicate `message_id`, rejects out-of-order `seq_no`, and keeps terminal-state sticky against late non-terminal payloads.
  - Firmware OTA executor now emits milestone statuses via callback path and maps failures to stable short error codes.
  - Firmware confirm timeout is now persisted as deadline and enforced on next boot using trusted-time checks.
- Remaining closure:
  - Phase 05 (real VPS + ESP32 loops) needs live infrastructure + hardware execution evidence.
  - Phase 06 release gate still depends on Phase 05 evidence pack.

## Notes
- No remaining open tasks for accessibility remediation.
- Login entry implementation is complete; future work can add richer marketing content or a dedicated contact/demo funnel if needed.
- Thesis baseline sync is complete and limited to `resources/reports/thesis/` final sources, Mermaid sources, exported SVG figures, and the figure generator path fix.
- Diagram pack v2 pilot is complete; next decisions are governance/compliance follow-ups before any broader rollout.
- MQTT canonical cutover is complete for the documented scope; any remaining consumer drift or token lifecycle follow-up should be tracked as separate maintenance work.
- Cloud geofence policy and distance quota implementation is complete; known hardening follow-ups are documented in review notes.
- Thesis readability sync is complete for the final thesis markdown and Mermaid asset set; future edits should keep the same glossary and caption rules.
- Related docs synchronized in `docs/project-overview-pdr.md`, `docs/project-changelog.md`, `docs/system-architecture.md`, and `docs/codebase-summary.md` where applicable.
