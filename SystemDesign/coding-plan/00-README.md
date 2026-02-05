# IoT Vehicle Tracking System - Coding Plan

> Hướng dẫn chi tiết cho AI Agent build hệ thống từ IoT Project Template

---

## 📁 Cấu Trúc File (Đã Sắp Xếp Theo Phase)

```
coding-plan/
│
├── 📋 PHASE 0: OVERVIEW & STANDARDS
│   ├── 00-README.md                    ← FILE NÀY
│   ├── 01-rewrite-plan.md              ← Master plan
│   ├── 02-coding-standards.md          ← Naming conventions
│   ├── 03-execution-guide.md           ← AI agent execution guide
│   └── 04-project-structure.md         ← IVM26-style folder structure
│
├── 🗄️ PHASE 1: DATABASE & INFRASTRUCTURE
│   ├── 10-database-postgresql.md       ← PostgreSQL schema
│   ├── 11-database-victoriametrics.md  ← Time-series DB
│   └── 12-docker-infrastructure.md     ← Docker setup
│
├── ⚙️ PHASE 2: BACKEND
│   ├── 20-backend-architecture.md      ← DDD structure
│   ├── 21-backend-api-endpoints.md     ← REST API design
│   ├── 22-backend-mqtt-bridge.md       ← MQTT integration
│   └── 23-backend-security.md          ← Security implementation
│
├── 🎨 PHASE 3: FRONTEND
│   ├── 30-frontend-architecture.md     ← Feature-Sliced architecture
│   ├── 31-frontend-features.md         ← Feature specifications
│   └── 32-frontend-implementation.md   ← Detailed implementation
│
├── 📱 PHASE 4: MOBILE
│   └── 40-mobile-strategy.md           ← Flutter WebView strategy
│
├── 🚀 PHASE 5: DEPLOYMENT & OPS
│   └── 50-observability.md             ← Prometheus + Logging + Sentry
│
└── 📁 config/
    ├── domains.example.ts
    ├── metrics.example.ts
    └── sensors.example.ts
```

---

## 🤖 Agent Instructions

### Nguồn Tham Khảo

| Source | Path | Purpose |
|--------|------|---------|
| **Template** | `../iot-project-template/` | Generic IoT architecture |
| **Reference** | `E:\anmh1205\IVM26\` | Existing implementation patterns |
| **Backup** | `../../iot-vehicle-tracking-system-backup/` | Old NestJS code (reference only) |
| **This Plan** | `./` | Vehicle Tracking specific |

### Build Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT BUILD WORKFLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: READ Phase 0 Files (MANDATORY FIRST)               │
│  ├── 01-rewrite-plan.md (master plan)                       │
│  ├── 02-coding-standards.md (naming, patterns)              │
│  └── 03-execution-guide.md (step-by-step)                   │
│                                                              │
│  Step 2: READ Phase Files Per Implementation Phase          │
│  ├── Phase 1: 10-*, 11-*, 12-* (Database & Docker)          │
│  ├── Phase 2: 20-*, 21-*, 22-*, 23-* (Backend)              │
│  ├── Phase 3: 30-*, 31-*, 32-* (Frontend)                   │
│  ├── Phase 4: 40-* (Mobile)                                 │
│  └── Phase 5: 50-* (Deployment)                             │
│                                                              │
│  Step 3: REFERENCE IVM26 Project                            │
│  ├── IVM26_Backend/src/ (Express patterns)                  │
│  └── IVM26_Frontend/src/ (Next.js patterns)                 │
│                                                              │
│  Step 4: IMPLEMENT Following Phases Below                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Implementation Phases

### Phase 1: Database & Infrastructure ⭐⭐⭐⭐⭐

**Files to Read:**
- `02-coding-standards.md` - Naming conventions (MUST READ FIRST)
- `10-database-postgresql.md` - PostgreSQL tables
- `11-database-victoriametrics.md` - Time-series database
- `12-docker-infrastructure.md` - Docker Compose

**Tasks:**

| Step | Task | Output |
|------|------|--------|
| 1.1 | Create backend folder structure | `Tracking_Backend/src/` với domain folders |
| 1.2 | Create frontend folder structure | `Tracking_Frontend/src/` với feature folders |
| 1.3 | Create PostgreSQL migrations | `Tracking_PostgreSQL/init/*.sql` |
| 1.4 | Setup Docker Compose per service | Mỗi folder có `docker-compose.yml` riêng |
| 1.5 | Setup environment files | `.env.example` trong mỗi service |

**Agent Commands:**
```bash
# Read template first
READ: ../iot-project-template/system-design/04-database-design.md
READ: ./config/domains.example.ts

# Create project structure (IVM26 pattern)
mkdir -p Tracking_Backend/src/{domain,infrastructure,middleware,shared}
mkdir -p Tracking_Frontend/src/{app,features,components,hooks,lib}
mkdir -p Tracking_MqttBridge/src/{handlers,batch,cache}
mkdir -p Tracking_PostgreSQL/init
mkdir -p Tracking_EMQX/etc
mkdir -p Tracking_VictoriaMetrics
mkdir -p Tracking_VictoriaLogs
mkdir -p Tracking_Grafana/provisioning/{datasources,dashboards}
mkdir -p Tracking_Data/{Tracking_PostgreSQL/data,Tracking_EMQX,Tracking_VictoriaMetrics,Tracking_VictoriaLogs}

# Reference IVM26 for exact patterns
REFERENCE: E:\anmh1205\IVM26\IVM26_Backend\src\
REFERENCE: E:\anmh1205\IVM26\IVM26_Frontend\src\
```

---

### Phase 2: Backend Core ⭐⭐⭐⭐⭐

**Files to Read:**
- `20-backend-architecture.md` - Domain structure
- `21-backend-api-endpoints.md` - REST API design
- `22-backend-mqtt-bridge.md` - MQTT integration
- `23-backend-security.md` - Security (Helmet, Rate Limiting, Auth)

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
READ: ../iot-project-template/system-design/05-api-design.md

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
- `22-backend-mqtt-bridge.md` - MQTT integration
- `11-database-victoriametrics.md` - Time-series database

**Tasks:**

| Step | Task | Output |
|------|------|--------|
| 3.1 | MQTT Client | `Tracking_MqttBridge/src/mqtt.client.ts` |
| 3.2 | Message Handlers | `Tracking_MqttBridge/src/handlers/*.ts` |
| 3.3 | Batch Service | `Tracking_MqttBridge/src/batch/` |
| 3.4 | VictoriaMetrics Client | `Tracking_Backend/src/infrastructure/victoriametrics/` |
| 3.5 | Socket.IO Setup | `Tracking_Backend/src/realtime/socket.server.ts` |

**Agent Commands:**
```bash
# Read MQTT patterns
READ: ../iot-project-template/system-design/06-realtime-design.md
READ: ./config/sensors.example.ts

# Implement MQTT Bridge
IMPLEMENT: Tracking_MqttBridge/src/index.ts (entry point)
IMPLEMENT: Tracking_MqttBridge/src/handlers/rawdata.handler.ts
IMPLEMENT: Tracking_MqttBridge/src/batch/database-batch.service.ts

# Reference IVM26
REFERENCE: E:\anmh1205\IVM26\IVM26_Backend\src\mqtt-bridge\
```

---

### Phase 4: Frontend Core ⭐⭐⭐⭐

**Files to Read:**
- `30-frontend-architecture.md` - Next.js structure
- `31-frontend-features.md` - Feature modules
- `32-frontend-implementation.md` - Detailed implementation plan

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
READ: ../iot-project-template/system-design/07-frontend-design.md

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
- `31-frontend-features.md` - Map, Firmware, Notifications
- `32-frontend-implementation.md` - Detailed implementation

**Tasks:**

| Step | Task | Priority |
|------|------|----------|
| 5.1 | Map feature (Leaflet) | 🟡 High |
| 5.2 | Firmware feature | 🟡 High |
| 5.3 | Alerts feature | 🟡 High |
| 5.4 | Notifications | 🟢 Medium |
| 5.5 | User management | 🟢 Medium |

---

### Phase 6: Mobile ⭐⭐⭐

**Files to Read:**
- `40-mobile-strategy.md` - Flutter WebView Hybrid

**Tasks:**

| Step | Task |
|------|------|
| 6.1 | Flutter project setup |
| 6.2 | WebView integration |
| 6.3 | Native features (GPS, Push) |
| 6.4 | App store preparation |

---

### Phase 7: Deployment & Ops ⭐⭐⭐

**Files to Read:**
- `12-docker-infrastructure.md` - Docker setup
- `50-observability.md` - Monitoring

**Tasks:**

| Step | Task |
|------|------|
| 7.1 | Backend Dockerfile |
| 7.2 | Frontend Dockerfile |
| 7.3 | Nginx configuration |
| 7.4 | Grafana dashboards |
| 7.5 | Production checklist |

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

## 📁 File Index (Quick Reference)

| File | Content | Phase |
|------|---------|-------|
| `00-README.md` | This index file | - |
| `01-rewrite-plan.md` | Master rewrite plan | 🔴 Read First |
| `02-coding-standards.md` | Naming, patterns, TypeScript | 🔴 Read First |
| `03-execution-guide.md` | Step-by-step AI guide | 🔴 Read First |
| `10-database-postgresql.md` | PostgreSQL schema | Phase 1 |
| `11-database-victoriametrics.md` | Time-series DB | Phase 1 |
| `12-docker-infrastructure.md` | Docker Compose | Phase 1 |
| `20-backend-architecture.md` | Backend DDD structure | Phase 2 |
| `21-backend-api-endpoints.md` | REST API design | Phase 2 |
| `22-backend-mqtt-bridge.md` | MQTT integration | Phase 2-3 |
| `23-backend-security.md` | Security implementation | Phase 2 |
| `30-frontend-architecture.md` | Frontend structure | Phase 4 |
| `31-frontend-features.md` | Feature modules | Phase 4-5 |
| `32-frontend-implementation.md` | Detailed frontend guide | Phase 4-5 |
| `40-mobile-strategy.md` | Flutter WebView Hybrid | Phase 6 |
| `50-observability.md` | Prometheus + Logging + Sentry | Phase 7 |

---

## ⚠️ Agent Rules

### MUST DO

```
✅ Read 02-coding-standards.md FIRST before any implementation
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

### Development Commands (IVM26 Pattern)

```bash
# Create docker network first
docker network create tracking-network

# Start infrastructure (from each folder)
cd Tracking_PostgreSQL && docker-compose up -d
cd Tracking_EMQX && docker-compose up -d
cd Tracking_VictoriaMetrics && docker-compose up -d
cd Tracking_VictoriaLogs && docker-compose up -d

# Backend
cd Tracking_Backend && npm run dev          # Start dev server

# MQTT Bridge
cd Tracking_MqttBridge && npm run dev       # Run MQTT bridge

# Frontend
cd Tracking_Frontend && npm run dev         # Next.js dev (port 3002)
```
