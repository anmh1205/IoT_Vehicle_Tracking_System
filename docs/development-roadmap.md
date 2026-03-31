# Development Roadmap

## Phase Status

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

## Notes
- No remaining open tasks for accessibility remediation.
- Login entry implementation is complete; future work can add richer marketing content or a dedicated contact/demo funnel if needed.
- Thesis baseline sync is complete and limited to `resources/reports/thesis/` final sources, Mermaid sources, exported SVG figures, and the figure generator path fix.
- Diagram pack v2 pilot is complete; next decisions are governance/compliance follow-ups before any broader rollout.
- MQTT canonical cutover is complete for the documented scope; any remaining consumer drift or token lifecycle follow-up should be tracked as separate maintenance work.
- Related docs synchronized in `docs/project-overview-pdr.md`, `docs/project-changelog.md`, `docs/system-architecture.md`, and `docs/codebase-summary.md` where applicable.
