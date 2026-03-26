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

### P2 - Public Landing Page (Frontend) Complete
- Scope: Add a public-facing landing page at `/` without changing protected dashboard behavior.
- Milestones completed:
  - Root route no longer redirects directly to `/dashboard`.
  - New marketing slice under `Tracking_Frontend/src/features/marketing/`.
  - Local illustration assets added under `Tracking_Frontend/public/landing/`.
  - Middleware updated so `/` and `/landing/*` stay public.
  - Session bootstrap no longer blocks the landing route with an auth loader.

### P2 - Diagram Reference Pack V2 Pilot Complete
- Scope: Independent diagram reference pack under `resources/reports/diagram-reference-packs/diagram-pack-v2` with validate/build/qa/release flow.
- Milestones completed:
  - Added pack manifest/schema/style/sample diagrams/scripts/package-lock for a standalone pipeline.
  - Added a dedicated `build/assets/` export set and wired it into the release artifact.
  - Updated `.github/workflows/diagram-pack-ci.yml` and `.github/workflows/diagram-pack-release.yml` for pack CI/release automation.
  - Fixed Ajv 2020 schema handling, Windows PlantUML path handling, PlantUML PDF fallback via SVG->PDF, empty-artifact gates, and artifact upload hardening.
  - Local validation and independent tester validation passed on final pilot state.
  - Final review accepted the pilot for controlled parallel use.

## Notes
- No remaining open tasks for accessibility remediation.
- Landing page implementation is complete; future work can add real product screenshots or a dedicated contact/demo funnel if needed.
- Thesis baseline sync is complete and limited to `resources/reports/thesis/` final sources, Mermaid sources, exported SVG figures, and the figure generator path fix.
- Diagram pack v2 pilot is complete; next decisions are governance/compliance follow-ups before any broader rollout.
- Related docs synchronized in `docs/project-overview-pdr.md`, `docs/project-changelog.md`, `docs/system-architecture.md`, and `docs/codebase-summary.md` where applicable.
