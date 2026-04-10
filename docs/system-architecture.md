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
- The API layer now assumes success envelopes and RFC7807 problem details across shared middleware, health, metrics, policy, and rate-limit surfaces.
- MQTT is the canonical ingest path for both real devices and simulator traffic, and `/iot/data` is no longer part of the runtime architecture.
- The simulator/fix-loop tooling lives outside runtime services in `resources/mock-data/scripts/` and `resources/mock-data/simulator-specs/`; it covers deterministic publish/replay, fault injection, targeted restart allowlists, checkpoint thresholds, rollback steps, and stop conditions.
- UAT deployment workflows use `workflow_dispatch` plus `concurrency` guards so the same environment is not deployed twice in parallel.
- Backend UAT images are published with both a mutable `uat` tag and an immutable `uat-${github.sha}` tag to balance promotion speed and rollback traceability.
- Health-gated deploy scripts retry with bounded attempts/intervals and fail after dumping tail logs, while notification steps stay non-blocking with `continue-on-error: true`.
- Cloud geofence policy evaluation runs server-side in `Tracking_Backend/src/domain/geofence/services/policy-evaluator.service.ts`, using policy state and violation repositories to persist decisions.
- Policy types are evaluated as a matrix: `ADMIN_BOUNDARY` for strict polygon checks, `RADIUS` for center/radius checks, and `DISTANCE_QUOTA` for cycle-based distance accumulation.
- The evaluator emits policy metrics for evaluation count, evaluation latency, violation count, and quota reset count through `src/infrastructure/metrics/app-metrics.ts`.
- API surface for policy management is exposed under `src/api/routes/geofence.routes.ts` with policy CRUD, state lookup, and violation listing endpoints.
- Thesis readability sync keeps `resources/reports/thesis/final/` aligned to the same glossary rules used in the documentation set.
- Realtime event names use colon-style contracts end to end so backend emitters and frontend consumers stay aligned.
- Frontend feature code consumes unwrapped data, while transport-level errors stay confined to the API client and parser layer.
- The BLE OBD session layer now tracks request/response health via rolling counters and periodic log snapshots in `main/src/ble_obd.c`, but the external OBD command contract remains unchanged.
- The firmware runtime also hardens SD log store recovery, DS3231M RTC UTC validation, offline queue replay ACK handling, and GNSS recovery before the state machine advances device state.
- GNSS queries in `modem_gnss.c` now emit streak-aware observability for transport failure, parse failure, no-fix, and fix-success paths, then perform bounded self-heal repower with cooldown when failures persist.
- The tracker state machine re-arms GNSS after LTE recovery or repeated GNSS poll failures, gating repeat re-arm attempts with cooldown to avoid modem thrash.
- Simulator token flow and rollback/race handling were hardened to avoid replaying legacy ingestion behavior during the cutover.

## Traceability
- See root redirect and split login entry changes in `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/page.tsx`, `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/login/page.tsx`, `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/auth/components/login-form.tsx`, and `iot-vehicle-tracking-system-cloud/Tracking_Frontend/middleware.ts`.
- See related dashboard accessibility changes in `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/**/*` for controls, layout, and form validation.
- See related mobile changes in `iot-vehicle-tracking-system-cloud/Tracking_Mobile/lib/features/webview/**/*` and `iot-vehicle-tracking-system-cloud/Tracking_Mobile/lib/widgets/**/*` for semantic messaging and loading/error behavior.
