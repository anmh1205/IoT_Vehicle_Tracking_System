# Project Overview & PDR

## Current Scope
The UI/UX accessibility remediation for dashboard web and mobile surfaces has been completed in the frontend and Flutter app.

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

## Acceptance Notes
- A screen-reader user can jump to main content from the top of each page.
- Repetitive status/error text is announced in an assertive or polite live region pattern where applicable.
- Interactive map/list actions remain keyboard reachable and have clear accessible names.
- Primary touch controls meet larger target size requirements for mobile usability.

## Constraints / Scope Notes
- Scope remains UI/UX remediation only; no backend API contract changes were introduced.
- No functional feature behavior for auth/data pipelines changed.