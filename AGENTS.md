# IVTS repository guidance

This repository is the **IoT Vehicle Tracking System**, not a coding-agent template. Its deliverables include ESP32-S3 firmware, MQTT ingestion, backend APIs, a fleet dashboard, a Flutter mobile shell, PostgreSQL, deployment services, and hardware design files.

## Find the authoritative implementation

- Start with [README.md](README.md) or [README.vi.md](README.vi.md) for runtime services and local setup. Consult [docs/system-architecture.md](docs/system-architecture.md) for system boundaries, but verify behavior in current code before changing it.
- \`iot-vehicle-tracking-system-firmware/\`: ESP-IDF, FreeRTOS, firmware components and device/cloud contracts. The \`main/\` app initializes the runtime; \`components/app-core/\` coordinates it; \`domain-*/\`, \`contracts-*/\`, \`adapter-*/\`, and \`shared-kernel/\` have different responsibilities.
- \`iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/\`: MQTT ingress, device authentication, session and telemetry persistence.
- \`iot-vehicle-tracking-system-cloud/Tracking_Backend/\`: Express API, use cases, repositories, realtime and authentication.
- \`iot-vehicle-tracking-system-cloud/Tracking_Frontend/\`: Next.js UI, typed API clients, feature hooks and rendering.
- \`iot-vehicle-tracking-system-cloud/Tracking_Mobile/\`: Flutter WebView shell, native auth bridge, notifications and offline services.
- \`iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL/\`: versioned schema files and migration tooling.
- \`iot-vehicle-tracking-system-cloud/Tracking_*/\` also includes broker, proxy, metrics, logs and deployment services. Hardware sources are under \`iot-vehicle-tracking-system-hardware/\`.
- Architectural and engineering documentation lives in \`docs/\` and the relevant component's \`documents/\`. \`resources/references/template/\` is reference material, **not** IVTS production source of truth.

## Engineering boundaries

**Firmware.** Keep vehicle/session/command/OTA rules in domain or application code, and device-specific I/O in adapters. Ports describe dependencies of core behavior; concrete ESP-IDF, SIM7600, BLE, SD, RTC and NVS interfaces are bound at composition/bootstrap boundaries. Some current dependencies still violate this desired direction: change them incrementally and verify runtime behavior, not by renaming folders. Handle FreeRTOS ownership, task races, resets, partial NVS/SD writes and retry/ACK ordering explicitly.

**Cloud.** Transport controllers validate inputs and map results to HTTP; application services authorize and orchestrate; repositories own SQL and explicit transaction boundaries. Never assume authentication alone grants access to every device, location, trip, alert or export. Enforce the authorized device/vehicle scope in the database query and in asynchronous jobs. MQTT QoS retries, duplicate events, out-of-order sessions and crash recovery must be safe and idempotent.

**Client applications.** Use typed API envelopes with explicit loading/empty/error states. Do not synthesize historical measurements from live device status. Treat WebView native bridge handlers, token storage, origin checks, logout and refresh as one security boundary; the Flutter shell and web frontend must agree on the session lifecycle.

**Database/deployment.** Preserve migration history and report drift, partial schema states and failed operations explicitly. Do not rewrite already-applied migrations casually, expose local default credentials, or run destructive tests against production or an existing user dataset.

Keep functions and files cohesive, without an arbitrary line-count rule. Prefer targeted refactoring with behavior-preserving tests to a wholesale clean-architecture rewrite.

## Tests and build commands

Run commands from the corresponding component directory after installing its prerequisites.

| Component | Checks |
| --- | --- |
| Firmware | Source-level host tests: \`python -m pytest tests -q\`; target build: \`idf.py build\` with the configured ESP-IDF environment |
| Backend | \`npm ci\`, then \`npm run verify\` and \`npm run build\` |
| MQTT Bridge | \`npm ci\`, then \`npm run verify\` and \`npm run build\` |
| Frontend | \`npm ci\`, then \`npm run verify\` (lint, typecheck, tests, build) |
| Flutter Mobile | \`flutter pub get\`, \`flutter analyze\`, \`flutter test\`; verify Android/iOS release builds in their supported environments |
| PostgreSQL | Validate new migrations against both an empty and a populated/upgrade database; check schema **and existing table data** |

A host-only firmware test does not prove an ESP32-S3 build or power-cut durability. Typecheck passing does not prove MQTT/PostgreSQL behavior. For changes crossing device, broker, API and UI boundaries, add contract/integration checks that exercise the real data flow. Report tests not run separately from tests passed.

## Change workflow

- Work on a narrowly scoped branch from the current authoritative base. Do not modify \`main\` directly.
- Identify the actual failing path and the underlying invariant before changing code. Link the relevant GitHub issue, preserve previously accepted behavior and add a focused regression test where practical.
- Review changes for secrets and personal data, auth scope, transaction/retry behavior, performance, and effects across services.
- Open a PR, verify tests against its **final** head, and merge only when the evidence supports the change. Close issues only for completed acceptance scope and clean up merged branches using supported repository controls.
- Keep disposable build/test output outside the repository or in ignored build directories; do not add generated caches, logs, local credentials or \`tmp*\` files to the repository root.

No specific AI agent CLI, local checkpoint format or vendor's orchestration ritual is required to contribute to this repository.
