# Project Changelog

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

## Impact
- Improved keyboard navigation, screen reader clarity, and mobile tap reliability.
- Reduced risk of viewport jump/clip issues on mobile map and dashboard pages.
- Added a clear public product entry point without weakening protection around `/dashboard/*`.
