# IoT Vehicle Tracking System

Real-time IoT fleet tracking monorepo: device firmware, MQTT ingestion, backend API, web dashboard, mobile shell, and observability stack.

Language: English | [Tiếng Việt](README.vi.md)

**Last validated:** 2026-03-24
**Primary deployment branch:** `uat` (runtime services)
**Deployment model:** per-service Docker Compose + shared external network `tracking-network`

---

## Table of Contents
- [Project Overview](#project-overview)
- [Who This Repository Is For](#who-this-repository-is-for)
- [Quick Start](#quick-start)
- [System Architecture (Image-Free)](#system-architecture-image-free)
- [Data Flow and MQTT Contract](#data-flow-and-mqtt-contract)
- [Service Catalog](#service-catalog)
- [Ports and Interfaces](#ports-and-interfaces)
- [Environment Configuration](#environment-configuration)
- [Startup Order and Dependencies](#startup-order-and-dependencies)
- [Local Development Workflows](#local-development-workflows)
- [Quality Gates (CI Parity)](#quality-gates-ci-parity)
- [CI/CD Workflows](#cicd-workflows)
- [Observability](#observability)
- [Firmware and Hardware Context](#firmware-and-hardware-context)
- [Troubleshooting](#troubleshooting)
- [Security Baseline](#security-baseline)
- [Documentation Map](#documentation-map)
- [Contributing Notes](#contributing-notes)

---

## Project Overview

This repository hosts a complete IoT vehicle tracking platform with these core domains:

- **Device side**: ESP32-S3 firmware, LTE/GNSS modem orchestration, OBD2 BLE integration, IMU-based wake logic.
- **Ingestion side**: EMQX broker + MQTT Bridge processing and routing.
- **Application side**: Backend API/WebSocket + Frontend dashboard + Mobile shell.
- **Operations side**: PostgreSQL, VictoriaMetrics, VictoriaLogs, Grafana, optional Nginx Proxy Manager.

The runtime is intentionally split into independent services so each service can be deployed/scaled independently.

---

## Who This Repository Is For

- **Backend/Platform engineers**: API, MQTT ingestion, storage, CI/CD pipelines.
- **Frontend engineers**: dashboard, auth/session behavior, realtime UI.
- **Mobile engineers**: Flutter shell and mobile runtime integration.
- **Embedded/IoT engineers**: firmware architecture and hardware integration.
- **Ops/SRE**: compose deployment, monitoring, runtime diagnostics.

---

## Quick Start

### Path A — Run full stack locally (recommended)

#### 1) Create shared Docker network
```bash
docker network create tracking-network
```

#### 2) Prepare environment files
Copy/prepare these files:
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/.env`
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/.env`
- `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/.env`
- `iot-vehicle-tracking-system-cloud/Tracking_EMQX/.env`
- `iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL/.env`
- `iot-vehicle-tracking-system-cloud/Tracking_Grafana/.env`
- `iot-vehicle-tracking-system-cloud/Tracking_Mobile/.env` (for mobile flow)

Templates are available at corresponding `.env.example` files where present.

#### 3) Start infrastructure services first
```bash
docker compose -f iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL/docker-compose.yml up -d
docker compose -f iot-vehicle-tracking-system-cloud/Tracking_EMQX/docker-compose.yml up -d
docker compose -f iot-vehicle-tracking-system-cloud/Tracking_VictoriaMetrics/docker-compose.yml up -d
docker compose -f iot-vehicle-tracking-system-cloud/Tracking_VictoriaLogs/docker-compose.yml up -d
docker compose -f iot-vehicle-tracking-system-cloud/Tracking_Grafana/docker-compose.yml up -d
```

#### 4) Start application services
```bash
docker compose -f iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/docker-compose.yml up -d
docker compose -f iot-vehicle-tracking-system-cloud/Tracking_Backend/docker-compose.yml up -d
docker compose -f iot-vehicle-tracking-system-cloud/Tracking_Frontend/docker-compose.yml up -d
```

#### 5) Validate runtime
- Frontend: http://localhost:4001
- Backend health: http://localhost:4000/health
- Backend WS health: http://localhost:4000/ws-health
- API docs: http://localhost:4000/api-docs
- Grafana: http://localhost:4002
- EMQX dashboard: http://localhost:18083

---

### Path B — Develop a single service

If you only need one service in watch mode, keep infra on Docker and run app service locally.

Backend:
```bash
cd iot-vehicle-tracking-system-cloud/Tracking_Backend
npm ci
npm run dev
```

Frontend:
```bash
cd iot-vehicle-tracking-system-cloud/Tracking_Frontend
npm ci
npm run dev
```

MQTT Bridge:
```bash
cd iot-vehicle-tracking-system-cloud/Tracking_MqttBridge
npm ci
npm run dev
```

Mobile:
```bash
cd iot-vehicle-tracking-system-cloud/Tracking_Mobile
flutter pub get
flutter test
flutter run
```

---

### Path C — Verify CI parity before push

Backend:
```bash
cd iot-vehicle-tracking-system-cloud/Tracking_Backend
npm run lint
npm run typecheck
npm run test
npm run build
```

Frontend:
```bash
cd iot-vehicle-tracking-system-cloud/Tracking_Frontend
npm run lint
npm run typecheck
npm run build
```

MQTT Bridge:
```bash
cd iot-vehicle-tracking-system-cloud/Tracking_MqttBridge
npm run typecheck
npm run build
```

Mobile:
```bash
cd iot-vehicle-tracking-system-cloud/Tracking_Mobile
flutter test
flutter build apk --release --target-platform android-arm64
flutter build appbundle --release
```

---

## System Architecture (Image-Free)

```text
+----------------+        MQTT         +----------------+
|  IoT Devices   | ------------------> |      EMQX      |
+----------------+                     +----------------+
                                               |
                                               v
                                       +---------------------+
                                       | Tracking_MqttBridge |
                                       +---------------------+
                                        |         |         |
                                        v         v         v
                                 +-----------+ +-----------------+ +--------------+
                                 | PostgreSQL| | VictoriaMetrics | | VictoriaLogs |
                                 +-----------+ +-----------------+ +--------------+
                                      \             |                    |
                                       \            |                    |
                                        v           v                    v
                               +-----------------------------------------------+
                               | Tracking_Backend (REST + Realtime + OpenAPI) |
                               +-----------------------------------------------+
                                      |                         |
                                      v                         v
                           +----------------------+    +------------------+
                           | Tracking_Frontend    |    | Tracking_Mobile  |
                           +----------------------+    +------------------+

Grafana visualizes VictoriaMetrics and VictoriaLogs.
```

---

## Data Flow and MQTT Contract

### End-to-end flow
1. Device publishes telemetry/events/status/firmware to EMQX.
2. MQTT Bridge subscribes and routes data to storage pipelines.
3. Backend serves APIs and pushes realtime updates to clients.
4. Frontend and Mobile consume backend APIs/realtime channels.
5. Metrics/logs are stored in Victoria stack and visualized in Grafana.

### MQTT topic contract

| Topic | Direction | QoS | Purpose |
|---|---|---|---|
| `v1/{device_id}/rawdata` | Device -> Server | 0 | High-frequency telemetry (loss-tolerant) |
| `v1/{device_id}/status` | Device -> Server | 1 | Heartbeat / session state |
| `v1/{device_id}/events` | Device -> Server | 1 | Alerts and critical events |
| `v1/{device_id}/firmware` | Device -> Server | 1 | OTA progress and results |
| `v1/{device_id}/commands` | Server -> Device | 1 | Remote commands/config updates |

Canonical `v1/{device_id}/rawdata.data` fields:
- `vibration`, `vehicle_battery`, `device_battery`
- `latitude`, `longitude`, `speed`, `course`
- `satellites`, `ignition`, `error_code`

### Remote command examples

| Command | Purpose | Typical fields |
|---|---|---|
| `update_config` | Update runtime config | `heartbeat_interval_s`, `tracking_interval_s` |
| `ota_update` | Trigger OTA update | `jobId`, `version`, `url`, `size`, `sha256`, `force`, `confirmTimeoutSec` |

---

## Service Catalog

| Service | Path | Runtime | Main role | Local run command |
|---|---|---|---|---|
| Backend | `iot-vehicle-tracking-system-cloud/Tracking_Backend` | Node.js + Express + TS | REST, realtime, docs, health, metrics | `npm run dev` |
| Frontend | `iot-vehicle-tracking-system-cloud/Tracking_Frontend` | Next.js + React + TS | Dashboard + landing | `npm run dev` |
| MQTT Bridge | `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge` | Node.js + TS | MQTT ingest + routing | `npm run dev` |
| Mobile | `iot-vehicle-tracking-system-cloud/Tracking_Mobile` | Flutter | Mobile shell | `flutter run` |
| EMQX | `iot-vehicle-tracking-system-cloud/Tracking_EMQX` | Docker image | MQTT broker | `docker compose up -d` |
| PostgreSQL | `iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL` | Docker image | Relational DB | `docker compose up -d` |
| VictoriaMetrics | `iot-vehicle-tracking-system-cloud/Tracking_VictoriaMetrics` | Docker image | Metrics store | `docker compose up -d` |
| VictoriaLogs | `iot-vehicle-tracking-system-cloud/Tracking_VictoriaLogs` | Docker image | Log store | `docker compose up -d` |
| Grafana | `iot-vehicle-tracking-system-cloud/Tracking_Grafana` | Docker image | Dashboards | `docker compose up -d` |
| NPM (optional) | `iot-vehicle-tracking-system-cloud/Tracking_NPM` | Docker image | Reverse proxy manager | `docker compose --profile production up -d` |

---

## Ports and Interfaces

| Component | Host Port(s) | Notes |
|---|---|---|
| Frontend | `4001` | Next.js UI |
| Backend API | `4000` | `/health`, `/ws-health`, `/api-docs`, `/metrics`, `/api/v1/*` |
| PostgreSQL | `5432` | DB access |
| EMQX MQTT | `1883`, `8883` | MQTT / MQTTS |
| EMQX WebSocket | `8083`, `8084` | WS / WSS |
| EMQX Dashboard | `18083` | Broker admin UI |
| Grafana | `4002` | Monitoring dashboards |
| VictoriaMetrics | `8428` | Metrics endpoint |
| VictoriaLogs | `9428` | Logs endpoint |
| NPM (optional) | `80`, `81`, `443` | Reverse proxy + admin |

---

## Environment Configuration

### Minimum required secrets

#### Backend (`Tracking_Backend/.env`)
Required:
- `POSTGRESQL_PASSWORD`
- `MQTT_PASSWORD`
- `SESSION_SECRET`

Production-required:
- `METRICS_PASSWORD`

#### Frontend (`Tracking_Frontend/.env`)
Required by source code:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`

Note:
- Source currently reads `NEXT_PUBLIC_API_URL` (API rewrite) and `NEXT_PUBLIC_WS_URL` (socket provider).

#### MQTT Bridge (`Tracking_MqttBridge/.env`)
Required:
- `MQTT_PASSWORD`
- `POSTGRESQL_PASSWORD`

#### EMQX (`Tracking_EMQX/.env`)
Required:
- `EMQX_DASHBOARD__DEFAULT_PASSWORD`
- `EMQX_NODE__COOKIE`

#### PostgreSQL (`Tracking_PostgreSQL/.env`)
Required:
- `POSTGRES_PASSWORD`

Important:
- Files in `Tracking_PostgreSQL/init/` are mounted into `docker-entrypoint-initdb.d`, so they run only when the Postgres data volume is created the first time.
- When a running environment already has data and a new `init/*.sql` file is added later, apply it with:

```bash
node iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL/scripts/apply-init-migrations.js
```

Useful options:
- `--dry-run`: show what would be executed or baselined
- `--target 13-device-commands.sql`: apply or baseline one file only
- `--mode docker|direct`: force Docker `psql` or local `psql`

#### Grafana (`Tracking_Grafana/.env`)
Required:
- `GRAFANA_PASSWORD`

#### Mobile (`Tracking_Mobile/.env`)
Key variables:
- `WEB_APP_URL`
- `API_BASE_URL`
- `WS_URL`
- `FIREBASE_PROJECT_ID` (optional)

Important:
- `Tracking_Mobile/.env.example` defaults to runtime ports (`4000/4001`); adjust only if your local environment uses custom ports.

---

## Startup Order and Dependencies

Recommended startup order:
1. **Network**: create `tracking-network`
2. **Storage/Broker**: PostgreSQL, EMQX, VictoriaMetrics, VictoriaLogs
3. **Visualization**: Grafana
4. **Ingestion**: MQTT Bridge
5. **Application**: Backend
6. **Clients**: Frontend / Mobile

Why this order:
- MQTT Bridge and Backend depend on broker/database/storage availability.
- Frontend and Mobile are useful only after API/realtime endpoints are live.

---

## Local Development Workflows

### Backend
```bash
cd iot-vehicle-tracking-system-cloud/Tracking_Backend
npm ci
npm run dev
```

Common commands:
```bash
npm run lint
npm run typecheck
npm run test
npm run test:cov
npm run build
npm run verify
```

### Frontend
```bash
cd iot-vehicle-tracking-system-cloud/Tracking_Frontend
npm ci
npm run dev
```

Common commands:
```bash
npm run lint
npm run typecheck
npm run build
```

### MQTT Bridge
```bash
cd iot-vehicle-tracking-system-cloud/Tracking_MqttBridge
npm ci
npm run dev
```

Common commands:
```bash
npm run typecheck
npm run build
npm run verify
```

### Mobile
```bash
cd iot-vehicle-tracking-system-cloud/Tracking_Mobile
flutter pub get
flutter test
flutter run
```

---

## Quality Gates (CI Parity)

Before pushing service changes:

- Backend: lint + typecheck + test + build
- Frontend: lint + typecheck + build
- MQTT Bridge: typecheck + build
- Mobile: test + release artifacts (for release workflows)

This mirrors the quality sections in UAT workflows.

---

## CI/CD Workflows

### Runtime/UAT workflows (primarily `uat` push with path filters)

| Area | Workflow file | Trigger model |
|---|---|---|
| Backend | [.github/workflows/backend-uat.yml](.github/workflows/backend-uat.yml) | `push: uat` + path filter |
| Frontend | [.github/workflows/frontend-uat.yml](.github/workflows/frontend-uat.yml) | `push: uat` + path filter |
| MQTT Bridge | [.github/workflows/mqtt-bridge-uat.yml](.github/workflows/mqtt-bridge-uat.yml) | `push: uat` + path filter |
| Mobile | [.github/workflows/mobile-uat.yml](.github/workflows/mobile-uat.yml) | `push: uat` + path filter |
| EMQX | [.github/workflows/emqx-uat.yml](.github/workflows/emqx-uat.yml) | `push: uat` + path filter |
| PostgreSQL | [.github/workflows/postgresql-uat.yml](.github/workflows/postgresql-uat.yml) | `push: uat` + path filter |
| Grafana | [.github/workflows/grafana-uat.yml](.github/workflows/grafana-uat.yml) | `push: uat` + path filter |
| VictoriaMetrics | [.github/workflows/victoria-metrics-uat.yml](.github/workflows/victoria-metrics-uat.yml) | `push: uat` + path filter |
| VictoriaLogs | [.github/workflows/victoria-logs-uat.yml](.github/workflows/victoria-logs-uat.yml) | `push: uat` + path filter |
| NPM | [.github/workflows/npm-uat.yml](.github/workflows/npm-uat.yml) | `push: uat` + path filter |

### Docs/artifact workflows (different trigger model)

| Area | Workflow file | Trigger model |
|---|---|---|
| Diagram Pack CI | [.github/workflows/diagram-pack-ci.yml](.github/workflows/diagram-pack-ci.yml) | `pull_request` + `push` (`feature/system-coding`, `uat`) |
| Diagram Pack Release | [.github/workflows/diagram-pack-release.yml](.github/workflows/diagram-pack-release.yml) | `workflow_dispatch` + `push: main` |

---

## Observability

- Backend exposes:
  - `/health`
  - `/ws-health`
  - `/metrics`
- Grafana provisioning path:
  - `iot-vehicle-tracking-system-cloud/Tracking_Grafana/provisioning`
- Victoria retention from compose defaults:
  - VictoriaMetrics: `30d`
  - VictoriaLogs: `7d`

Operational note:
- Keep Grafana and Victoria services up before deep diagnostics; otherwise telemetry/log queries can look like app failure.

---

## Firmware and Hardware Context

As documented in the thesis draft and aligned with current project assets:

- **MCU**: ESP32-S3 as central controller.
- **Cellular + GNSS**: SIM7600CE-T (integrated LTE + GNSS), driven via AT command flow.
- **IMU**: LIS3DH for motion-triggered wake patterns.
- **OBD2 integration**: BLE adapter flow (vgate iCar Pro class).

Relevant operational behaviors:
- Layered MQTT QoS policy (QoS 0 for high-frequency telemetry, QoS 1 for critical events/commands).
- Remote config via `update_config` on command topic.
- OTA command flow via `ota_update` payload contract.

---

## Troubleshooting

| Symptom | Likely cause | What to check |
|---|---|---|
| Services cannot resolve each other | `tracking-network` missing | `docker network ls` then create network |
| Frontend cannot reach backend | Wrong frontend env keys | Ensure `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` |
| Backend exits on startup | Missing required secrets | Check DB/MQTT/session values in backend `.env` |
| MQTT Bridge receives no data | Broker auth/topic issue | Verify EMQX creds and topic ACL/pattern |
| EMQX dashboard login fails | Wrong broker env credentials | Recheck `Tracking_EMQX/.env` |
| Grafana login fails | Wrong Grafana env credentials | Recheck `Tracking_Grafana/.env` |
| Metrics/log panels empty | Victoria services not ready | Check `8428`, `9428` health and container state |
| Mobile cannot connect to API | Mobile env ports mismatch | Align `API_BASE_URL`/`WS_URL` with backend port 4000 |

---

## Security Baseline

- Never commit `.env` or secret values.
- Use strong credentials for DB, broker, dashboards.
- In production:
  - prefer TLS MQTT (`8883`)
  - avoid unnecessary public port exposure
  - enforce topic-level ACL so each device can only access its own topic scope (`v1/{device_id}/...`)
- Keep session/auth secrets rotated and non-default.

---

## Documentation Map

Core docs:
- [docs/project-overview-pdr.md](docs/project-overview-pdr.md)
- [docs/system-architecture.md](docs/system-architecture.md)
- [docs/codebase-summary.md](docs/codebase-summary.md)
- [docs/development-roadmap.md](docs/development-roadmap.md)
- [docs/project-changelog.md](docs/project-changelog.md)
- [docs/code-standards.md](docs/code-standards.md)

Extended technical reference:
- `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-readability-draft.md`

---

## Contributing Notes

- Keep changes scoped to the service you modify.
- Run local quality gates before push.
- If your change impacts architecture/flow, update docs under [docs/](docs/).
- If your change touches deployment behavior, ensure relevant workflow and compose files stay consistent.

---

If needed, you can maintain a bilingual companion (`README.vi.md`) while keeping this file as the canonical technical onboarding document.
