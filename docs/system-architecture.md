# System Architecture (Frontend Public + Dashboard + Mobile UI Layer)

## Public Marketing Layer
The frontend now has a split between:

1. **Public landing route (`/`)**
   - Implemented in `Tracking_Frontend/src/app/page.tsx`.
   - Uses dedicated marketing components from `Tracking_Frontend/src/features/marketing/**/*`.
   - Serves illustration assets from `Tracking_Frontend/public/landing/*`.
   - Remains public through `Tracking_Frontend/middleware.ts`.

2. **Protected operational dashboard (`/dashboard/*`)**
   - Keeps the existing authenticated workflow and route tree.
   - Still relies on `session_token` middleware checks before access.

3. **Login route (`/login`)**
   - Continues to act as the auth entry point for protected flows.

## UI Layer Accessibility Architecture
The completed remediation spans two UI layers:

1. **Next.js Web UI (`iot-vehicle-tracking-system/Tracking_Frontend`)**
   - Added top-level skip-link in `src/app/layout.tsx`.
   - Introduced a `main-content` anchor target in layout/dashboard shells for keyboard focus flow.
   - Improved keyboard support for card-based and map-control interactions.
   - Added explicit labels and pressed states for action toggles and icon buttons.
   - Increased key mobile hit targets and made notification popovers responsive in width.
   - Standardized height containers to `100dvh` for mobile-viewport stability.

2. **Flutter Shell (`iot-vehicle-tracking-system/Tracking_Mobile`)**
   - Wrapped loading/error surfaces in Flutter semantic widgets with live-region behavior.
   - Updated status copy to user locale (Vietnamese).
   - Kept retry/loading actions in clear, touchable controls.

## Integration Notes
- No new backend contracts were added.
- Web now has a public marketing shell at `/` and a protected dashboard shell at `/dashboard/*`.
- `SessionGuard` skips auth loading on the landing route only, so visitors can see the page immediately while internal pages keep their auth bootstrap.
- Mobile and dashboard continue to share the same operational capability set; accessibility is implemented per platform conventions.

## Traceability
- See marketing/public entry changes in `iot-vehicle-tracking-system/Tracking_Frontend/src/app/page.tsx`, `iot-vehicle-tracking-system/Tracking_Frontend/src/features/marketing/**/*`, `iot-vehicle-tracking-system/Tracking_Frontend/public/landing/*`, and `iot-vehicle-tracking-system/Tracking_Frontend/middleware.ts`.
- See related dashboard accessibility changes in `iot-vehicle-tracking-system/Tracking_Frontend/src/**/*` for controls, layout, and form validation.
- See related mobile changes in `iot-vehicle-tracking-system/Tracking_Mobile/lib/features/webview/**/*` and `iot-vehicle-tracking-system/Tracking_Mobile/lib/widgets/**/*` for semantic messaging and loading/error behavior.
