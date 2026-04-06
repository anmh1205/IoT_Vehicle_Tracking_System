# Project Overview & PDR

## Current Scope
- UI/UX accessibility remediation for dashboard web and mobile surfaces has been completed.
- The frontend now also exposes a public landing page at `/` so the system can be presented before login, while dashboard flows remain protected.
- The backend/frontend API contract is standardized around a success envelope and RFC7807 problem-details error shape.
- MQTT is the canonical ingest path for both real devices and simulator traffic, and legacy `/iot/data` runtime usage has been removed.
- Cloud geofence policy and distance quota support is implemented on the backend with admin boundary, radius, and distance quota policy types.
- Thesis readability sync on 2026-04-01 kept the final thesis markdown, Mermaid sources, and exported SVG figures aligned to a shared glossary without touching runtime code.

## API Contract Objectives
- Keep success payloads consistent for all operational endpoints via `{ data, requestId, meta? }`.
- Keep failures machine-readable and request-scoped via RFC7807 fields plus `requestId` and `errors[]`.
- Ensure middleware, health, metrics, policy, and rate-limit paths remain aligned with the same contract.
- Keep frontend parsing logic tolerant of the envelope without leaking transport details into feature code.
- Treat MQTT topic naming, realtime event names, and policy evaluation contracts as canonical alongside HTTP response shapes.

## Completed Remediation Items
- Skip-link navigation in `Tracking_Frontend/src/app/layout.tsx` and matching main-content landmark in dashboard/login pages.
- Accessible form labels, `aria-label`/`aria-live` behavior for login form validation and announcements in `Tracking_Frontend/src/features/auth/components/login-form.tsx`.
- Keyboard operability and pressed-state signaling for toggleable controls in `Tracking_Frontend/src/features/map/components/map-controls.tsx`.
- Touch-target sizing improvements for frequent actions on mobile/tablet in multiple dashboard components and map controls.
- Popover/content responsive width updates for notification panel in `Tracking_Frontend/src/features/notifications/components/notification-dropdown.tsx`.
- Stable viewport height usage (`100dvh`) in core layout containers (`Tracking_Frontend/src/app/dashboard/map/page.tsx`, `Tracking_Frontend/src/components/layout/PageContainer.tsx`, `Tracking_Frontend/src/components/ui/sidebar.tsx`).
- Flutter semantics and Vietnamese status/alerts in:
  - `Tracking_Mobile/lib/features/webview/webview_screen.dart`
  - `Tracking_Mobile/lib/widgets/error_view.dart`
  - `Tracking_Mobile/lib/widgets/loading_indicator.dart`

## Completed Login Entry Items
- Replaced the root route in `Tracking_Frontend/src/app/page.tsx` so `/` now redirects to `/login`.
- Kept the unauthenticated login experience as a split landing/form layout in `Tracking_Frontend/src/app/login/page.tsx` and `Tracking_Frontend/src/features/auth/components/login-form.tsx`.
- Updated `Tracking_Frontend/middleware.ts` so protected dashboard routes still redirect to `/login` without a session.
- Updated `Tracking_Frontend/src/components/auth/session-guard.tsx` so the login page does not block on an auth bootstrap spinner.

## Completed MQTT Cutover Items
- Standardized device and simulator ingestion onto MQTT as the only canonical runtime path.
- Removed `/iot/data` from the runtime API surface and documented it as legacy/non-canonical.
- Normalized realtime event names to colon-style so backend producers and frontend consumers share one contract.
- Hardened simulator token flow and rollback/race handling as part of the canonical ingest migration.

## Completed Cloud Policy Items
- Added backend policy types for `ADMIN_BOUNDARY`, `RADIUS`, and `DISTANCE_QUOTA`.
- Implemented evaluation flow for telemetry ingest, policy state update, violation creation, and quota-cycle reset.
- Exposed policy CRUD, policy-state lookup, and policy-violation listing under the geofence API surface.
- Added policy metrics for evaluation count, evaluation latency, violation count, and quota reset count.

## Acceptance Notes
- A screen-reader user can jump to main content from the top of each page.
- Repetitive status/error text is announced in an assertive or polite live region pattern where applicable.
- Interactive map/list actions remain keyboard reachable and have clear accessible names.
- Primary touch controls meet larger target size requirements for mobile usability.
- Unauthenticated users can see the public landing page immediately.
- Policy evaluation now supports admin boundary, radius, and distance quota decisions with persisted state and violation traces.

## Constraints / Scope Notes
- No backend HTTP envelope changes were introduced beyond the standardized response contract.
- Dashboard auth behavior remains protected by the existing session-cookie flow.
- Landing page content is mapped to modules already present in the codebase; no fake customer proof or synthetic metrics were introduced.
- Any remaining legacy event-name consumers or token lifecycle cleanup should be treated as follow-up maintenance, not as blockers for the canonical MQTT cutover.
