# Project Overview & PDR

## Current Scope
- UI/UX accessibility remediation for dashboard web and mobile surfaces has been completed.
- The frontend now also exposes a public landing page at `/` so the system can be presented before login, while dashboard flows remain protected.

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

## Completed Public Landing Page Items
- Replaced the root redirect in `Tracking_Frontend/src/app/page.tsx` with a public marketing route.
- Added a dedicated marketing slice in `Tracking_Frontend/src/features/marketing/` for header, hero, feature, proof, and system-flow sections.
- Added local illustration assets in `Tracking_Frontend/public/landing/`.
- Updated `Tracking_Frontend/middleware.ts` so `/` and `/landing/*` remain public while protected dashboard routes still redirect to `/login` without a session.
- Updated `Tracking_Frontend/src/components/auth/session-guard.tsx` so the landing page does not block on an auth bootstrap spinner.

## Acceptance Notes
- A screen-reader user can jump to main content from the top of each page.
- Repetitive status/error text is announced in an assertive or polite live region pattern where applicable.
- Interactive map/list actions remain keyboard reachable and have clear accessible names.
- Primary touch controls meet larger target size requirements for mobile usability.
- Unauthenticated users can see the public landing page immediately.

## Constraints / Scope Notes
- No backend API contract changes were introduced.
- Dashboard auth behavior remains protected by the existing session-cookie flow.
- Landing page content is mapped to modules already present in the codebase; no fake customer proof or synthetic metrics were introduced.
