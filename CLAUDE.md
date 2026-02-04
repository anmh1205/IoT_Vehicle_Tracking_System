# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IoT Vehicle Tracking System - A full-stack IoT application for real-time vehicle tracking using GPS/OBD2 trackers, MQTT protocol, and real-time monitoring. The main application code is in `/iot-vehicle-tracking-system/`.

## Common Commands

All commands run from `/iot-vehicle-tracking-system/`:

```bash
# Install all dependencies (root, backend, frontend)
npm run install:all

# Development - run both backend & frontend concurrently
npm run dev

# Individual services
npm run dev:backend    # Backend on port 4000
npm run dev:frontend   # Frontend on port 4001

# Build
npm run build          # Build both
npm run build:backend
npm run build:frontend

# Lint
npm run lint           # Lint both
npm run lint:backend
npm run lint:frontend
```

### Backend-specific (`/iot-vehicle-tracking-system/backend/`):

```bash
npm run test              # Run unit tests
npm run test -- src/auth/auth.service.spec.ts  # Run single test file
npm run test:watch        # Watch mode
npm run test:cov          # Coverage report
npm run test:e2e          # E2E tests
npm run format            # Prettier formatting
npm run typeorm           # TypeORM CLI for migrations
```

### Docker Infrastructure

```bash
# Start only databases for local development
docker-compose up -d postgres influxdb emqx

# Full stack with Docker
docker-compose up -d --build

# View logs
docker-compose logs -f backend
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
  NestJS Backend (4000) ──► PostgreSQL (users, vehicles, alerts)
         │                  InfluxDB (GPS telemetry, sensor data)
         │
         │ WebSocket (Socket.IO)
         ▼
  Next.js Frontend (4001)
```

### Tech Stack

- **Backend**: NestJS 10, TypeORM, PostgreSQL 16, InfluxDB 2.7, MQTT 5.3, Socket.IO 4.7, JWT/Passport
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Zustand, TanStack Query, Leaflet maps, ECharts
- **Infrastructure**: Docker Compose, EMQX broker, Nginx Proxy Manager

### Backend Patterns

- Layered architecture: Controllers → Services → Repositories
- Module-based structure with feature modules (auth, vehicles, alerts, telemetry)
- Path alias: `@/*` maps to `src/*`
- DTOs with class-validator for request/response validation
- JWT authentication with guards

### Frontend Patterns

- Next.js App Router with React Server Components
- Zustand for global state, TanStack Query for server state
- Socket.IO client for real-time telemetry updates
- Radix UI + shadcn/ui component patterns

### Data Strategy

- **PostgreSQL**: Relational data (users, vehicles, alerts, settings)
- **InfluxDB**: Time-series data (GPS coordinates, OBD2 readings, sensor telemetry)

## Service URLs (Development)

- Frontend: http://localhost:4001
- Backend API: http://localhost:4000
- Swagger Docs: http://localhost:4000/api
- InfluxDB UI: http://localhost:8086
- EMQX Dashboard: http://localhost:18083
- Nginx Proxy Manager: http://localhost:81

## Environment Setup

Copy `.env.example` to `.env` and configure required variables before running. Key variables include database credentials, JWT secrets, MQTT broker settings, and InfluxDB tokens.

## Documentation

Detailed system design documentation is in `/SystemDesign/iot-vehicle-tracking-report/` (Vietnamese). Key sections:
- `04-server/backend/` - API server design, database schemas
- `04-server/frontend/` - Web application design patterns
- `04-server/part-08-docker-deployment.md` - Deployment guide

Reference implementations with code review lessons are in `/Example/IVM26_Dashboard/`.
