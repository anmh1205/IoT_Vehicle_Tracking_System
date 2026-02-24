# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IoT Vehicle Tracking System - A full-stack IoT application for real-time vehicle tracking using GPS/OBD2 trackers, MQTT protocol, and real-time monitoring. The project follows **IVM26 Pattern**: flat structure with `Tracking_` prefix naming and per-service Docker Compose.

## Project Structure (IVM26 Pattern)

```
IoT_Vehicle_Tracking_System/           # Git root
│
├── iot-vehicle-tracking-system/       # All services (IVM26 flat inside)
│   ├── Tracking_Backend/              # Express + TypeScript API
│   ├── Tracking_Frontend/             # Next.js 15 Web App
│   ├── Tracking_MqttBridge/           # MQTT Bridge (standalone service)
│   ├── Tracking_Mobile/               # Flutter WebView (Phase 2)
│   │
│   ├── Tracking_PostgreSQL/           # PostgreSQL + init/ SQL scripts
│   ├── Tracking_EMQX/                 # EMQX MQTT Broker + etc/ config
│   ├── Tracking_VictoriaMetrics/      # Time-series Database
│   ├── Tracking_VictoriaLogs/         # Logging Database
│   ├── Tracking_Grafana/              # Monitoring Dashboards
│   ├── Tracking_NPM/                  # Nginx Proxy Manager
│   │
│   └── Tracking_Data/                 # Persistent runtime data (gitignored)
│
├── resources/                         # Documentation, coding plans, references
├── .claude/                           # Claude Code agents & config
└── CLAUDE.md                          # This file
```

> **Principle:** Each service has its own `docker-compose.yml` and `docker-compose.uat.yml`. All services share the `tracking-network` Docker network.

## Common Commands

Commands run from **each service directory** individually:

### Backend (`iot-vehicle-tracking-system/Tracking_Backend/`):

```bash
npm install               # Install dependencies
npm run dev               # tsx watch mode (port 3000)
npm run test              # Run unit tests (Vitest)
npm run test:watch        # Watch mode
npm run test:cov          # Coverage report
npm run typecheck         # TypeScript check
npm run verify            # lint + typecheck + test
```

### Frontend (`iot-vehicle-tracking-system/Tracking_Frontend/`):

```bash
npm install               # Install dependencies
npm run dev               # Next.js dev server (port 3002)
npm run build             # Production build
npm run lint              # ESLint check
```

### MQTT Bridge (`iot-vehicle-tracking-system/Tracking_MqttBridge/`):

```bash
npm install               # Install dependencies
npm run dev               # tsx watch mode
npm run build             # Build for production
```

### Docker Infrastructure

```bash
# Create shared network (first time only)
docker network create tracking-network

# Start infrastructure services (from iot-vehicle-tracking-system/)
cd iot-vehicle-tracking-system/Tracking_PostgreSQL && docker-compose up -d && cd ../..
cd iot-vehicle-tracking-system/Tracking_EMQX && docker-compose up -d && cd ../..
cd iot-vehicle-tracking-system/Tracking_VictoriaMetrics && docker-compose up -d && cd ../..
cd iot-vehicle-tracking-system/Tracking_VictoriaLogs && docker-compose up -d && cd ../..

# Start application services with Docker
cd iot-vehicle-tracking-system/Tracking_Backend && docker-compose up -d --build && cd ../..
cd iot-vehicle-tracking-system/Tracking_Frontend && docker-compose up -d --build && cd ../..
cd iot-vehicle-tracking-system/Tracking_MqttBridge && docker-compose up -d --build && cd ../..

# View logs
cd iot-vehicle-tracking-system/Tracking_Backend && docker-compose logs -f
```

## Architecture

```
IoT Devices (ESP32 + GPS + OBD2)
         │
         │ MQTT (TLS in production)
         ▼
    EMQX Broker (1883) ──── ACL per device
         │
         ▼
   Tracking_MqttBridge ──► VictoriaMetrics (time-series)
         │                  VictoriaLogs (events/logs)
         │
         ▼
  Tracking_Backend (3000) ──► PostgreSQL (users, vehicles, alerts)
         │
         │ WebSocket (Socket.IO)
         ▼
  Tracking_Frontend (3002)
```

### Tech Stack

- **Backend**: Express, TypeScript, Zod, PostgreSQL 16, Socket.IO 4.8, Session-based auth (database-backed tokens)
- **MQTT Bridge**: Standalone service (`Tracking_MqttBridge/`), MQTT 5.x, own logger/pool/config
- **Time-series**: VictoriaMetrics (telemetry), VictoriaLogs (events/logging)
- **Frontend**: Next.js 15, React 19, Tailwind CSS 4, Zustand, TanStack Query, Leaflet maps, ECharts
- **Infrastructure**: Per-service Docker Compose, EMQX broker, Prometheus, Grafana

### Backend Patterns

- Domain-Driven Design: `domain/{feature}/services,repositories,types`
- Layered architecture: Controllers → Services → Repositories
- Path alias: `@/*` maps to `src/*`
- Zod schemas for request/response validation
- Session-based authentication with database-backed tokens (SHA-256 hashed)
- Request-ID correlation middleware on all requests

### Frontend Patterns (Feature-Sliced Architecture)

- Next.js App Router with React Server Components
- Feature modules: `features/{feature}/components,hooks,types,utils`
- Feature hooks in `features/{name}/hooks/`, global `hooks/` only for cross-cutting
- Zustand for global state (token in memory only, NOT persisted to localStorage)
- TanStack Query for server state (polling disabled when WebSocket connected)
- Socket.IO client for real-time telemetry (NO direct MQTT client in frontend)
- Radix UI + shadcn/ui component patterns

### Data Strategy

- **PostgreSQL**: Relational data (users, vehicles, customers, trips, alerts, geofences)
- **VictoriaMetrics**: Time-series data (GPS coordinates, OBD2 readings, sensor telemetry)
- **VictoriaLogs**: Event logs, device events, audit trail

## Service URLs (Development)

- Frontend: http://localhost:3002
- Backend API: http://localhost:3000
- Swagger Docs: http://localhost:3000/api-docs
- VictoriaMetrics: http://localhost:8428
- VictoriaLogs: http://localhost:9428
- EMQX Dashboard: http://localhost:18083
- Grafana: http://localhost:3001

## Environment Setup

### Default Credentials (Development)

| Service | Username | Password | URL |
|---------|----------|----------|-----|
| **Web App** | `admin` | `Admin@2026` | http://localhost:3002 |
| **EMQX Dashboard** | `admin` | `emqx_dev_2026` | http://localhost:18083 |
| **PostgreSQL** | `postgres` | `tracking_dev_2026` | localhost:5432 |

> **⚠️ CHANGE ALL PASSWORDS before deploying to production!**

Copy `.env.example` to `.env` in each service directory and configure required variables. Key variables:

```bash
# PostgreSQL
POSTGRESQL_HOST=localhost
POSTGRESQL_PORT=5432
POSTGRESQL_DATABASE=vehicle_tracking
POSTGRESQL_USER=postgres
POSTGRESQL_PASSWORD=           # REQUIRED - no default

# VictoriaMetrics & VictoriaLogs
VICTORIAMETRICS_URL=http://localhost:8428
VICTORIALOGS_URL=http://localhost:9428

# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883

# Session Auth (NOT JWT)
SESSION_SECRET=                # REQUIRED - min 32 chars, no default

# CORS
CORS_ORIGIN=http://localhost:3002
```

> **Security:** No default password fallbacks. All secrets are REQUIRED and fail loudly if missing.

## Documentation

Detailed documentation is in `/resources/`:

- `cloud-coding-plan/` - Cloud system implementation guides for AI agents
  - `00-README.md` - Master index with multi-agent orchestration
  - `01-rewrite-plan.md` - Master plan for project rewrite
  - `02-coding-standards.md` - Naming conventions from IVM26
  - `03-execution-guide.md` - AI agent execution guide
  - `04-project-structure.md` - Project structure (IVM26 Pattern)
  - `10-database-postgresql.md` - PostgreSQL schema
  - `11-database-victoriametrics.md` - Time-series database
  - `12-docker-infrastructure.md` - Docker setup (per-service)
  - `20-backend-architecture.md` - Backend structure (Express + DDD)
  - `21-backend-api-endpoints.md` - REST API design (plural URLs)
  - `22-backend-mqtt-bridge.md` - MQTT Bridge (standalone Tracking_MqttBridge/)
  - `23-backend-security.md` - Security (session tokens, MQTT ACL)
  - `24-websocket-events.md` - WebSocket event contract (Socket.IO)
  - `30-frontend-architecture.md` - Frontend structure (Feature-Sliced)
  - `31-frontend-features.md` - Feature specifications
  - `32-frontend-implementation.md` - Detailed frontend guide
  - `40-mobile-strategy.md` - Flutter WebView Hybrid
  - `50-observability.md` - Prometheus, logging, Sentry
  - `60-agent-orchestration.md` - Agent orchestration & phasing
  - `99-plan-review-and-improvements.md` - Multi-agent review results
- `firmware-coding-plan/` - ESP32-S3 firmware coding plan (8A-8F sub-phases)
- `enhance/` - Frontend UI enhancement plans (EH-0 to EH-5)
- `design-reports/` - System design reports & original plans
  - `iot-vehicle-tracking-report/` - System design docs (Vietnamese)
  - `firmware-development-plan.md` - Firmware development plan
  - `cloud-system-audit-report.md` - Cloud system audit
- `example/` - Reference code (esp32-obd2-meter)
- `template/` - Generic IoT project template

## Agent Teams Context (Multi-Agent Work)

For multi-agent orchestration, **use compact context files** instead of full spec files:

```bash
# Compact context files (~3-8KB each) - USE THESE
phases/phase-1-foundation/1A-db-schema.md
phases/phase-1-foundation/1B-docker-infra.md
phases/phase-2-backend/2A-auth-module.md
phases/phase-2-backend/2B-device-module.md
...

# Full spec files (20-40KB each) - AVOID reading entirely
20-backend-architecture.md
21-backend-api-endpoints.md
...
```

**Key resources:**
- Context templates: `resources/cloud-coding-plan/config/context-templates.md`
- Agent orchestration: `resources/cloud-coding-plan/60-agent-orchestration.md`
- Task tracking: `.tracking/` directory (COMPLETED.md, CURRENT_TASKS.md)

**Rules:**
1. Read compact context file FIRST before any implementation
2. Max 6 main files per session
3. Log progress to `.tracking/` when context > 70%

### Compaction Rules (BẮT BUỘC)

Khi context bị compact (tự động hoặc `/compact`), **luôn giữ lại:**
- Danh sách files đã sửa và đường dẫn đầy đủ
- Task ID hiện tại và sub-phase đang thực hiện
- Test commands đã sử dụng và kết quả pass/fail
- Error messages đang được investigate (nếu có)
- API contracts hoặc type signatures quan trọng đang dùng

**Compact có hướng dẫn (khuyến nghị):**
```
/compact Giữ lại: task IDs, files đã sửa, test results, error messages
```

### Subagent Guidelines

- **Foreground subagent** (mặc định): Chặn main conversation, dùng khi cần Q&A
- **Background subagent** ("run in background"): Chạy song song, dùng cho research/test
- **Nghiên cứu trước**: Luôn explore code hiện có trước khi implement
- **Resume**: Có thể resume subagent với context cũ bằng "Continue that [task]"


## Reference Projects

- IVM26: `E:\anmh1205\IVM26\` - Reference implementation patterns (optional, if available)
- Backup: `iot-vehicle-tracking-system-backup/` - Old NestJS code (for reference only)

> **Note:** Reference paths are optional. The project can be built without them using the documentation in `resources/`.
