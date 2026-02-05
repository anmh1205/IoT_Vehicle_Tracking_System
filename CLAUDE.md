# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IoT Vehicle Tracking System - A full-stack IoT application for real-time vehicle tracking using GPS/OBD2 trackers, MQTT protocol, and real-time monitoring. The main application code is in `/iot-vehicle-tracking-system/`.

## Common Commands

All commands run from `/iot-vehicle-tracking-system/`:

```bash
# Install all dependencies (root, backend, frontend, mqtt-bridge)
npm run install:all

# Development - run both backend & frontend concurrently
npm run dev

# Individual services
npm run dev:backend       # Backend on port 3000
npm run dev:frontend      # Frontend on port 3002
npm run dev:mqtt-bridge   # MQTT Bridge (standalone)

# Build
npm run build             # Build all
npm run build:backend
npm run build:frontend

# Lint
npm run lint              # Lint all
npm run lint:backend
npm run lint:frontend
```

### Backend-specific (`/iot-vehicle-tracking-system/backend/`):

```bash
npm run dev               # tsx watch mode
npm run test              # Run unit tests (Vitest)
npm run test:watch        # Watch mode
npm run test:cov          # Coverage report
npm run typecheck         # TypeScript check
npm run verify            # lint + typecheck + test
```

### MQTT Bridge (`/iot-vehicle-tracking-system/mqtt-bridge/`):

```bash
npm run dev               # tsx watch mode
npm run build             # Build for production
```

### Docker Infrastructure

```bash
# Start only databases for local development
docker-compose up -d postgres victoriametrics victorialogs emqx

# Full stack with Docker
docker-compose up -d --build

# View logs
docker-compose logs -f backend
docker-compose logs -f mqtt-bridge
docker-compose logs -f frontend
```

## Architecture

```
IoT Devices (ESP32 + GPS + OBD2)
         │
         │ MQTT
         ▼
    EMQX Broker (1883)
         │
         ▼
   MQTT Bridge ────────► VictoriaMetrics (time-series)
         │               VictoriaLogs (events/logs)
         │
         ▼
  Express Backend (3000) ──► PostgreSQL (users, vehicles, alerts)
         │
         │ WebSocket (Socket.IO)
         ▼
  Next.js Frontend (3002)
```

### Tech Stack

- **Backend**: Express, TypeScript, Zod, PostgreSQL 16, Socket.IO 4.8, JWT
- **MQTT Bridge**: Standalone service, MQTT 5.x, VictoriaMetrics client, VictoriaLogs client
- **Time-series**: VictoriaMetrics (telemetry), VictoriaLogs (events/logging)
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Zustand, TanStack Query, Leaflet maps, ECharts
- **Infrastructure**: Docker Compose, EMQX broker, Prometheus, Grafana

### Backend Patterns

- Domain-Driven Design: `domain/{feature}/services,repositories,types`
- Layered architecture: Controllers → Services → Repositories
- Path alias: `@/*` maps to `src/*`
- Zod schemas for request/response validation
- JWT authentication with middleware

### Frontend Patterns (Feature-Sliced Architecture)

- Next.js App Router with React Server Components
- Feature modules: `features/{feature}/components,hooks,types,utils`
- Global hooks: `hooks/queries/`, `hooks/mutations/`, `hooks/realtime/`
- Zustand for global state, TanStack Query for server state
- Socket.IO client for real-time telemetry updates
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

Copy `.env.example` to `.env` and configure required variables before running. Key variables:

```bash
# PostgreSQL
POSTGRESQL_HOST=localhost
POSTGRESQL_PORT=5432
POSTGRESQL_DATABASE=vehicle_tracking
POSTGRESQL_USER=postgres
POSTGRESQL_PASSWORD=secret

# VictoriaMetrics & VictoriaLogs
VICTORIAMETRICS_URL=http://localhost:8428
VICTORIALOGS_URL=http://localhost:9428

# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883

# JWT
JWT_SECRET=your-secret-key

# CORS
CORS_ORIGIN=http://localhost:3002
```

## Documentation

Detailed system design documentation is in `/SystemDesign/`:

- `coding-plan/` - Implementation guides for AI agents
  - `00-rewrite-plan.md` - Master plan for project rewrite
  - `02-backend-architecture.md` - Backend structure (Express + DDD)
  - `05-frontend-architecture.md` - Frontend structure (Feature-Sliced)
  - `08-victoriametrics.md` - Time-series database
  - `10-observability.md` - Prometheus, logging, Sentry
  - `12-security.md` - Security implementation
- `iot-vehicle-tracking-report/` - System design docs (Vietnamese)
- `iot-project-template/` - Generic IoT project template

## Reference Projects

- IVM26: `E:\anmh1205\IVM26\` - Reference implementation patterns
- Backup: `iot-vehicle-tracking-system-backup/` - Old NestJS code (for reference only)
