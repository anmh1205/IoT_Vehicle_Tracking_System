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

## Public MQTT Entrypoint via Nginx Proxy Manager
The canonical public MQTT domain is `mqtt.thingdock.dev`, served through `tracking-npm`:

| Protocol | Public endpoint | NPM object | Upstream |
|---|---|---|---|
| WSS (browser) | `wss://mqtt.thingdock.dev/mqtt` | Proxy Host `mqtt.thingdock.dev` | `http://tracking-emqx:8083` |
| MQTTS (device) | `mqtts://mqtt.thingdock.dev` | Stream Host (port 8883) | `tracking-emqx:8883` (TCP passthrough) |

- TLS termination for WSS happens at NPM (Let's Encrypt cert `npm-3` covering `*.thingdock.dev` subdomains).
- TLS termination for MQTTS happens at EMQX (NPM forwards raw TCP on 8883 without TLS interception).
- EMQX is internal-only; it does not expose any host ports directly.

## Realtime WebSocket Architecture
- The backend exposes namespace-specific Socket.IO channels for `/dashboard`, `/devices`, `/notifications`, `/exports`, and `/firmware`, all authenticated through the shared socket auth middleware.
- Firmware and system-admin realtime traffic is restricted to admin/root roles, while device and notification delivery is scoped through `device:{deviceId}`, `user:{userId}`, and `role:system-admin` rooms instead of namespace-wide broadcast.
- The frontend `SocketProvider` only instantiates namespaces the current user can access, and `useDeviceRoom` keeps device-room membership reference-counted so multiple features can share one subscription safely.
- Dashboard features now prefer event-driven cache patching and invalidation for device, trip, notification, export, firmware, simulator, and system-status updates, while snapshot fetches remain the boundary fallback for initial load, reconnect, and manual retry.
- Backend producers emit real events for notification, export, firmware, simulator, and system-admin changes so UI surfaces stay in sync without hot-path polling.

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
- Thesis readability sync keeps `resources/reports/thesis/final/` aligned to the same glossary rules used in the documentation set, and its figure generator now relies on canonical basenames so regenerated assets stay deterministic after filename normalization.
- Realtime event names use colon-style contracts end to end so backend emitters and frontend consumers stay aligned.
- Frontend feature code consumes unwrapped data, while transport-level errors stay confined to the API client and parser layer.
- The operations map now has a dedicated allowed-zone presentation path: `Tracking_Frontend/src/features/map/components/tracking-map.tsx` coordinates `map-allowed-zone-layer.tsx` for zone rendering, `map-allowed-zone-panel.tsx` for the docked edit flow, and `map-selected-device-overlay.tsx` for create/edit/show/hide actions tied to the selected vehicle.
- Shared allowed-zone fetch/mutation and payload-shaping logic remains centralized in `Tracking_Frontend/src/features/geofences/hooks/use-vehicle-allowed-zone.ts` and `Tracking_Frontend/src/features/geofences/lib/allowed-zone-form.ts`; non-map pages continue to use `Tracking_Frontend/src/features/geofences/components/allowed-zone-setup-sheet.tsx`.
- The BLE OBD session layer now tracks request/response health via rolling counters and periodic log snapshots in `main/src/ble_obd.c`, but the external OBD command contract remains unchanged.
- The firmware runtime also hardens SD log store recovery, DS3231M RTC UTC validation, offline queue replay ACK handling, and GNSS recovery before the state machine advances device state.
- Firmware runtime policy is now centralized through shared config/NVS for product-facing cadence and safety gates (`tracking`, `parked heartbeat`, `alarm cadence`, `ignition hold`, `sleep enable`, `IMU wake enable`, `OTA minimum battery window`) instead of module-local literals.
- Parked heartbeat wake now publishes both telemetry snapshot (`rawdata`) and runtime visibility (`status`) before returning to sleep when policy allows.
- GNSS queries in `modem_gnss.c` now emit streak-aware observability for transport failure, parse failure, no-fix, and fix-success paths, then perform bounded self-heal repower with cooldown when failures persist.
- The tracker state machine re-arms GNSS after LTE recovery or repeated GNSS poll failures, gating repeat re-arm attempts with cooldown to avoid modem thrash.
- Firmware observability now uses source-side log governance instead of a central logging framework: app-core emits state transition and diagnostic health snapshots, adapters emit redacted stage/recovery/fallback events, and `domain-telemetry` counters aggregate MQTT/LTE/OBD/OTA outcomes.
- Firmware logs intentionally expose stable trace IDs for correlation but redact transport bodies and sensitive config values, using summaries such as `response_len`, `topic_class`, `endpoint_configured`, `apn_configured`, and `fix_valid`.
- The Uno-based ECU simulator under `iot-vehicle-tracking-system-ecu-simulator/ecu-simulator/src/` now follows a state-driven split: `driver-input-profile.*` resolves the repeatable drive cycle, `powertrain-state-model.*` owns drivetrain/runtime state, `diagnostic-state-model.*` owns fault/readiness progression, and `obd-snapshot-builder.*` materializes the PID-facing `ecu_snapshot_t`.
- `main.cpp` remains the tick owner (`poll serial -> ecu_model_tick() -> obd_can_poll()`), `obd-can.cpp` is transport-only, and the ECU model now exposes the latest prebuilt snapshot through a read-only accessor instead of mutating snapshot state inside the CAN transport path.
- Simulator token flow and rollback/race handling were hardened to avoid replaying legacy ingestion behavior during the cutover.
- OTA lifecycle now uses one canonical raw state set end-to-end: `assigned`, `downloading`, `verifying`, `installing`, `rebooting`, `confirming`, `success`, `failed`, `rolled_back`; backend/frontend derive `in_progress` and `stuck_timeout` for operator grouping without mutating firmware-native raw states.
- Backend OTA deploy now treats artifact readiness and command dispatch as explicit preconditions, and firmware download responses are hardened for device fetch semantics (binary-only headers, no session redirect dependency).
- MQTT Bridge OTA ingest now uses metadata-aware reconciliation (`message_id`, `seq_no`, `boot_id`) to block duplicate/out-of-order regressions and keep terminal states sticky.
- Firmware OTA runtime now emits milestone statuses during apply flow and enforces confirm-timeout deadline checks on post-OTA boot when trusted time is available.
- Authoritative driving-session rollout is now partially wired end to end: firmware-facing MQTT payloads carry `local_session_key`, `canonical_session_id`, `boot_id`, and `boundary_event`; the bridge creates/completes `device_sessions` only from firmware boundaries, persists provisional identity/provenance in PostgreSQL, and republishes canonical assignment back to the device on `v1/{device_id}/commands`.
- Backend session DTOs and realtime event contracts now expose both device-reported boundary timestamps (`sessionStart/sessionEnd`) and cloud-observed timestamps (`serverSessionStart/serverSessionEnd`), plus provenance (`boundarySource`, `canonicalSource`, provisional identity) so downstream consumers can distinguish active driving from parked-but-online heartbeat.
- Frontend device status semantics now treat `online` as parked heartbeat visibility instead of a driving-equivalent state, including updated labels and parking-profile hints in device detail surfaces.

## Traceability
- See root redirect and split login entry changes in `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/page.tsx`, `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/login/page.tsx`, `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/auth/components/login-form.tsx`, and `iot-vehicle-tracking-system-cloud/Tracking_Frontend/middleware.ts`.
- See related dashboard accessibility changes in `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/**/*` for controls, layout, and form validation.
- See related mobile changes in `iot-vehicle-tracking-system-cloud/Tracking_Mobile/lib/features/webview/**/*` and `iot-vehicle-tracking-system-cloud/Tracking_Mobile/lib/widgets/**/*` for semantic messaging and loading/error behavior.
