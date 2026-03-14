# System Architecture (Frontend + Mobile UI Layer)

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
- Web and mobile share the same route-based dashboard behavior; accessibility is implemented per platform conventions.

## Traceability
- See related frontend changes in `iot-vehicle-tracking-system/Tracking_Frontend/src/**/*` for controls, layout, and form validation.
- See related mobile changes in `iot-vehicle-tracking-system/Tracking_Mobile/lib/features/webview/**/*` and `iot-vehicle-tracking-system/Tracking_Mobile/lib/widgets/**/*` for semantic messaging and loading/error behavior.