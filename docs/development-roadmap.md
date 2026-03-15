# Development Roadmap

## Phase Status

### P1 - Accessibility Remediation (Web + Mobile) Complete
- Scope: Web dashboard (`iot-vehicle-tracking-system/Tracking_Frontend`) and mobile shell (`iot-vehicle-tracking-system/Tracking_Mobile`) accessibility hardening.
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

## Notes
- No remaining open tasks for accessibility remediation.
- Landing page implementation is complete; future work can add real product screenshots or a dedicated contact/demo funnel if needed.
- Related docs synchronized in `docs/project-overview-pdr.md`, `docs/project-changelog.md`, `docs/system-architecture.md`, and `docs/codebase-summary.md`.
