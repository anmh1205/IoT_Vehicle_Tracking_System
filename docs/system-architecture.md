# System Architecture (Frontend Public + Dashboard + Mobile UI Layer)

## Public Entry and Protected Dashboard
The frontend now has a split between:

1. **Root route (`/`)**
   - Implemented in `Tracking_Frontend/src/app/page.tsx`.
   - Redirects visitors to `/login`.

2. **Login route (`/login`)**
   - Acts as the unauthenticated entry point.
   - Uses a split-screen presentation: landing content on the left and the login form on the right.

3. **Protected operational dashboard (`/dashboard/*`)**
   - Keeps the existing authenticated workflow and route tree.
   - Still relies on `session_token` middleware checks before access.

## UI Layer Accessibility Architecture
The completed remediation spans two UI layers:

1. **Next.js Web UI (`iot-vehicle-tracking-system-cloud/Tracking_Frontend`)**
   - Added top-level skip-link in `src/app/layout.tsx`.
   - Introduced a `main-content` anchor target in layout/dashboard shells for keyboard focus flow.
   - Improved keyboard support for card-based and map-control interactions.
   - Added explicit labels and pressed states for action toggles and icon buttons.
   - Increased key mobile hit targets and made notification popovers responsive in width.
   - Standardized height containers to `100dvh` for mobile-viewport stability.

2. **Flutter Shell (`iot-vehicle-tracking-system-cloud/Tracking_Mobile`)**
   - Wrapped loading/error surfaces in Flutter semantic widgets with live-region behavior.
   - Updated status copy to user locale (Vietnamese).
   - Kept retry/loading actions in clear, touchable controls.

## Integration Notes
- No new backend contracts were added for the HTTP transport layer beyond the standardized response/error shapes.
- Web root `/` now redirects to `/login`, while the protected dashboard shell remains under `/dashboard/*`.
- Mobile and dashboard continue to share the same operational capability set; accessibility is implemented per platform conventions.
- The API layer now assumes success envelopes and RFC7807 problem details across shared middleware, health, metrics, and rate-limit surfaces.
- MQTT is the canonical ingest path for both real devices and simulator traffic, and `/iot/data` is no longer part of the runtime architecture.
- Thesis readability sync keeps `resources/reports/thesis/final/` aligned to the same glossary rules used in the documentation set.
- Realtime event names use colon-style contracts end to end so backend emitters and frontend consumers stay aligned.
- Frontend feature code consumes unwrapped data, while transport-level errors stay confined to the API client and parser layer.
- The BLE OBD session layer now tracks request/response health via rolling counters and periodic log snapshots in `main/src/ble_obd.c`, but the external OBD command contract remains unchanged.
- Simulator token flow and rollback/race handling were hardened to avoid replaying legacy ingestion behavior during the cutover.

## Traceability
- See root redirect and split login entry changes in `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/page.tsx`, `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/login/page.tsx`, `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/auth/components/login-form.tsx`, and `iot-vehicle-tracking-system-cloud/Tracking_Frontend/middleware.ts`.
- See related dashboard accessibility changes in `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/**/*` for controls, layout, and form validation.
- See related mobile changes in `iot-vehicle-tracking-system-cloud/Tracking_Mobile/lib/features/webview/**/*` and `iot-vehicle-tracking-system-cloud/Tracking_Mobile/lib/widgets/**/*` for semantic messaging and loading/error behavior.
