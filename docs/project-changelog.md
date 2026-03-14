# Project Changelog

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

## Impact
- Improved keyboard navigation, screen reader clarity, and mobile tap reliability.
- Reduced risk of viewport jump/clip issues on mobile map and dashboard pages.