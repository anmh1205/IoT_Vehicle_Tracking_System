# IoT Vehicle Tracking System - Coding Plan

> Hướng dẫn chi tiết cho AI Agent build hệ thống từ IoT Project Template

---

## 🤖 Agent Instructions

### Nguồn Tham Khảo

| Source | Path | Purpose |
|--------|------|---------|
| **Template** | `../IoT_Project_Template/` | Generic IoT architecture |
| **Reference** | `E:\anmh1205\IVM26\` | Existing implementation patterns |
| **This Plan** | `./` | Vehicle Tracking specific |

### Build Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT BUILD WORKFLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: READ Template                                       │
│  ├── IoT_Project_Template/system-design/                     │
│  ├── IoT_Project_Template/coding-plan/                       │
│  └── IoT_Project_Template/coding-plan/config/                │
│                                                              │
│  Step 2: READ This Plan (Vehicle Tracking Specific)          │
│  ├── 01-coding-standards.md (naming, patterns)               │
│  ├── 07-database-schema.md (PostgreSQL)                      │
│  └── Other files per phase                                   │
│                                                              │
│  Step 3: REFERENCE IVM26 Project                             │
│  ├── IVM26_Backend/src/ (Express patterns)                   │
│  └── IVM26_Frontend/src/ (Next.js patterns)                  │
│                                                              │
│  Step 4: IMPLEMENT Following Phases Below                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Implementation Phases

### Phase 1: Project Setup & Database ⭐⭐⭐⭐⭐

**Files to Read:**
- `01-coding-standards.md` - Naming conventions (MUST READ FIRST)
- `07-database-schema.md` - PostgreSQL tables
- `09-docker-deployment.md` - Docker Compose

**Tasks:**

| Step | Task | Output |
|------|------|--------|
| 1.1 | Create backend folder structure | `backend/src/` với domain folders |
| 1.2 | Create frontend folder structure | `frontend/src/` với feature folders |
| 1.3 | Create PostgreSQL migrations | `docker/postgres/init/*.sql` |
| 1.4 | Setup Docker Compose | `docker-compose.yml` |
| 1.5 | Setup environment files | `.env.example` |

**Agent Commands:**
```bash
# Read template first
READ: ../IoT_Project_Template/coding-plan/02-project-structure.md
READ: ../IoT_Project_Template/coding-plan/config/domains.example.ts

# Create project structure
mkdir -p backend/src/{domain,infrastructure,middleware,shared}
mkdir -p frontend/src/{app,features,components,hooks,lib}

# Reference IVM26 for exact patterns
REFERENCE: E:\anmh1205\IVM26\IVM26_Backend\src\
REFERENCE: E:\anmh1205\IVM26\IVM26_Frontend\src\
```

---

### Phase 2: Backend Core ⭐⭐⭐⭐⭐

**Files to Read:**
- `02-backend-architecture.md` - Domain structure
- `03-backend-api-endpoints.md` - REST API design

**Tasks:**

| Step | Task | Domain | Priority |
|------|------|--------|----------|
| 2.1 | Auth domain | `domain/auth/` | 🔴 Critical |
| 2.2 | Device domain | `domain/device/` | 🔴 Critical |
| 2.3 | IoT domain | `domain/iot/` | 🔴 Critical |
| 2.4 | Dashboard domain | `domain/dashboard/` | 🟡 High |
| 2.5 | Middleware | `middleware/` | 🔴 Critical |

**Implementation Order per Domain:**
```
1. {domain}.types.ts      # TypeScript types
2. {domain}.validator.ts  # Zod schemas
3. {domain}.repository.ts # Database queries
4. {domain}.service.ts    # Business logic
5. {domain}.controller.ts # HTTP handlers
6. {domain}.routes.ts     # Express routes
```

**Agent Commands:**
```bash
# Read domain patterns from template
READ: ../IoT_Project_Template/coding-plan/03-backend-domains.md

# Implement in order
IMPLEMENT: domain/auth/ (login, JWT, user management)
IMPLEMENT: domain/device/ (CRUD, sessions, status)
IMPLEMENT: domain/iot/ (data ingestion, public endpoints)

# Reference IVM26 for exact code
REFERENCE: E:\anmh1205\IVM26\IVM26_Backend\src\domain\auth\
REFERENCE: E:\anmh1205\IVM26\IVM26_Backend\src\domain\device\
```

---

### Phase 3: MQTT & Time-Series ⭐⭐⭐⭐

**Files to Read:**
- `04-backend-mqtt-bridge.md` - MQTT integration
- `08-victoriametrics.md` - Time-series database

**Tasks:**

| Step | Task | Output |
|------|------|--------|
| 3.1 | MQTT Client | `mqtt-bridge/mqtt.client.ts` |
| 3.2 | Message Handlers | `mqtt-bridge/handlers/*.ts` |
| 3.3 | Batch Service | `mqtt-bridge/batch/` |
| 3.4 | VictoriaMetrics Client | `infrastructure/victoriametrics/` |
| 3.5 | Socket.IO Setup | `realtime/socket.server.ts` |

**Agent Commands:**
```bash
# Read MQTT patterns
READ: ../IoT_Project_Template/system-design/06-realtime-design.md
READ: ../IoT_Project_Template/coding-plan/config/sensors.example.ts

# Implement MQTT Bridge
IMPLEMENT: mqtt-bridge/index.ts (entry point)
IMPLEMENT: mqtt-bridge/handlers/rawdata.handler.ts
IMPLEMENT: mqtt-bridge/batch/database-batch.service.ts

# Reference IVM26
REFERENCE: E:\anmh1205\IVM26\IVM26_Backend\src\mqtt-bridge\
```

---

### Phase 4: Frontend Core ⭐⭐⭐⭐

**Files to Read:**
- `05-frontend-architecture.md` - Next.js structure
- `06-frontend-features.md` - Feature modules

**Tasks:**

| Step | Task | Feature |
|------|------|---------|
| 4.1 | App Router setup | `app/` layout, pages |
| 4.2 | Auth feature | `features/auth/` |
| 4.3 | Devices feature | `features/devices/` |
| 4.4 | Overview feature | `features/overview/` |
| 4.5 | Shared components | `components/` |

**Implementation Order per Feature:**
```
1. types/{feature}.types.ts    # TypeScript types
2. hooks/use-{feature}.ts      # React Query hooks
3. components/{component}.tsx  # UI components
```

**Agent Commands:**
```bash
# Read frontend patterns
READ: ../IoT_Project_Template/system-design/07-frontend-design.md

# Implement features
IMPLEMENT: features/auth/components/login-form.tsx
IMPLEMENT: features/devices/components/device-list.tsx
IMPLEMENT: features/overview/components/stats-cards.tsx

# Reference IVM26
REFERENCE: E:\anmh1205\IVM26\IVM26_Frontend\src\features\
```

---

### Phase 5: Advanced Features ⭐⭐⭐

**Files to Read:**
- `06-frontend-features.md` - Map, Firmware, Notifications

**Tasks:**

| Step | Task | Priority |
|------|------|----------|
| 5.1 | Map feature (Leaflet) | 🟡 High |
| 5.2 | Firmware feature | 🟡 High |
| 5.3 | Alerts feature | 🟡 High |
| 5.4 | Notifications | 🟢 Medium |
| 5.5 | User management | 🟢 Medium |

---

### Phase 6: Deployment ⭐⭐⭐

**Files to Read:**
- `09-docker-deployment.md` - Docker setup

**Tasks:**

| Step | Task |
|------|------|
| 6.1 | Backend Dockerfile |
| 6.2 | Frontend Dockerfile |
| 6.3 | Nginx configuration |
| 6.4 | Grafana dashboards |
| 6.5 | Production checklist |

---

## 🎯 Vehicle Tracking Domain Config

### Sensors (from Template)

```typescript
// Apply to: config/sensors.ts
export const SENSOR_TYPES = {
  vibration: { name: 'Vibration', unit: 'g', range: [0, 10], alertThreshold: 2.0 },
  speed: { name: 'Speed', unit: 'km/h', range: [0, 200], alertThreshold: 120 },
  latitude: { name: 'Latitude', unit: '°', range: [-90, 90] },
  longitude: { name: 'Longitude', unit: '°', range: [-180, 180] },
  battery_top: { name: 'Battery Top', unit: 'V', range: [3.0, 4.2], alertThreshold: 3.3 },
  battery_bot: { name: 'Battery Bottom', unit: 'V', range: [3.0, 4.2], alertThreshold: 3.3 },
  satellites: { name: 'GPS Satellites', unit: 'count', range: [0, 24] },
  course: { name: 'Course', unit: '°', range: [0, 360] },
};
```

### Domain Entity

```typescript
// Apply to: config/domains.ts
export const DOMAIN_CONFIG = {
  entity: { singular: 'Device', plural: 'Devices', idPrefix: 'TRACKER' },
  session: { enabled: true, name: { singular: 'Session', plural: 'Sessions' } },
  location: { enabled: true, mapProvider: 'leaflet' },
  realtime: { enabled: true, updateInterval: 2000 },
  alertTypes: ['high_vibration', 'low_battery', 'speeding', 'geofence_exit'],
  statusValues: ['running', 'stopped', 'disconnected'],
};
```

### Metrics

```typescript
// Apply to: config/metrics.ts
export const METRICS_CONFIG = {
  prefix: 'device',
  retention: { raw: '30d', hourly: '90d', daily: '1y' },
};
```

---

## 📁 File Index

| File | Content | When to Read |
|------|---------|--------------|
| `01-coding-standards.md` | Naming, patterns, TypeScript | 🔴 Phase 1 (FIRST) |
| `02-backend-architecture.md` | Backend structure | 🔴 Phase 2 |
| `03-backend-api-endpoints.md` | REST API design | 🔴 Phase 2 |
| `04-backend-mqtt-bridge.md` | MQTT integration | 🟡 Phase 3 |
| `05-frontend-architecture.md` | Frontend structure | 🔴 Phase 4 |
| `06-frontend-features.md` | Feature modules | 🔴 Phase 4-5 |
| `07-database-schema.md` | PostgreSQL schema | 🔴 Phase 1 |
| `08-victoriametrics.md` | Time-series DB | 🟡 Phase 3 |
| `09-docker-deployment.md` | Docker Compose | 🟢 Phase 6 |
| `10-observability.md` | Prometheus + Logging + Sentry | 🟡 Phase 3 |
| `11-mobile-strategy.md` | Flutter WebView Hybrid | 🟢 Phase 7 |
| `12-security.md` | Helmet + Rate Limiting + Auth | 🔴 Phase 2 |

---

## ⚠️ Agent Rules

### MUST DO

```
✅ Read 01-coding-standards.md FIRST before any implementation
✅ Read template files before implementing each phase
✅ Reference IVM26 project for exact code patterns
✅ Follow naming conventions strictly (kebab-case files, PascalCase classes)
✅ Use Zod for all validation
✅ Implement domains in order: types → validator → repository → service → controller
✅ Write TypeScript types for everything
```

### MUST NOT

```
❌ Skip reading template/reference files
❌ Hardcode domain-specific values (use config)
❌ Mix naming conventions
❌ Implement features out of phase order
❌ Skip error handling
❌ Use any type in TypeScript
❌ Ignore the existing IVM26 patterns
```

---

## 🔗 Quick Reference

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              IoT Vehicle Tracking Architecture               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐        │
│  │   Mobile    │   │  Frontend   │   │   Devices   │        │
│  │  (Flutter)  │   │  (Next.js)  │   │  (ESP32)    │        │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘        │
│         │ WebView         │ REST/WS         │ MQTT          │
│         └────────┬────────┴────────┬────────┘               │
│                  │                 │                         │
│           ┌──────▼──────┐   ┌──────▼──────┐                 │
│           │   Backend   │   │    EMQX     │                 │
│           │  (Express)  │◄──┤   (MQTT)    │                 │
│           └──────┬──────┘   └─────────────┘                 │
│                  │                                           │
│         ┌────────┼────────┐                                  │
│         │        │        │                                  │
│   ┌─────▼────┐ ┌─▼────────▼───┐ ┌───────────────┐           │
│   │PostgreSQL│ │VictoriaMetrics│ │ VictoriaLogs │           │
│   │  (Data)  │ │ (Time-series) │ │   (Logging)  │           │
│   └──────────┘ └───────────────┘ └───────────────┘           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Backend | Express.js + TypeScript + Zod |
| Frontend | Next.js 16 + React 19 + Tailwind 4 |
| Database | PostgreSQL 16 + VictoriaMetrics |
| Real-time | Socket.IO 4 + MQTT (EMQX) |
| UI | shadcn/ui + TanStack Query + Zustand |

### Development Commands

```bash
# Backend
cd backend && npm run dev          # Start dev server
cd backend && npm run mqtt-bridge  # Run MQTT bridge

# Frontend
cd frontend && npm run dev         # Next.js dev (port 3002)

# Docker
docker-compose up -d               # Start all services
```
