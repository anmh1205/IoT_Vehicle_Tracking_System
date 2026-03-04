# Phase Planning

> "Build the foundation before the walls, the walls before the roof. Every phase unlocks the next."

---

## 1. The 6-Phase Development Order

### Phase Overview

```
Phase 1: Foundation
│   Database schema + Docker infrastructure
│   └── Everything else depends on this
│
Phase 2: Backend Core
│   Auth → Device → IoT → Support modules
│   └── API endpoints that frontend will consume
│
Phase 3: MQTT Bridge + Real-Time Pipeline
│   MQTT subscription → Data processing → Storage
│   └── Can run PARALLEL with Phase 4A
│
Phase 4: Frontend
│   Foundation → Device pages → Domain pages → Dashboard
│   └── Consumes Phase 2 APIs
│
Phase 5: Advanced Features
│   Maps, alerts, analytics, reports, export
│   └── Builds on top of Phase 2-4
│
Phase 6: Mobile
│   Flutter WebView hybrid or React Native
│   └── Wraps Phase 4 frontend
```

---

## 2. Phase Details

### Phase 1: Foundation (Week 1)

```
1A: Database Schema
│   ├── PostgreSQL tables (users, devices, vehicles...)
│   ├── Init scripts in {Prefix}_PostgreSQL/init/
│   ├── Numbered: 01-users.sql, 02-devices.sql, ...
│   └── Deliverable: All tables created on docker-compose up
│
1B: Docker Infrastructure
│   ├── docker-compose.yml for each infrastructure service
│   ├── Shared external network created
│   ├── Volume mounts configured
│   ├── Environment variables documented
│   └── Deliverable: All infra services running with one command per service
│
1C: Project Scaffolding
│   ├── Backend: Express + TypeScript + folder structure
│   ├── Frontend: Next.js + TypeScript + folder structure
│   ├── shared-types/ initialized
│   ├── CLAUDE.md written
│   └── Deliverable: npm run dev works in both Backend and Frontend
```

### Phase 2: Backend Core (Weeks 2-3)

```
2A: Auth Module
│   ├── Session-based or JWT authentication
│   ├── Login, logout, session validation
│   ├── Auth middleware for protected routes
│   └── Prerequisite: Phase 1A (users table)
│
2B: Device Module
│   ├── Device CRUD (register, update, delete)
│   ├── Device status tracking
│   ├── Device-customer assignment
│   └── Prerequisite: Phase 2A (auth middleware)
│
2C: IoT Ingestion Module
│   ├── Telemetry ingestion endpoint (or MQTT handler)
│   ├── Data validation (Zod schemas)
│   ├── Storage to VictoriaMetrics
│   └── Prerequisite: Phase 2B (device exists)
│
2D: Support Modules (parallel)
│   ├── Customer CRUD
│   ├── Vehicle/Machine CRUD
│   ├── Firmware management
│   └── Prerequisite: Phase 2A (auth middleware)
```

### Phase 3: MQTT Bridge (Week 3, parallel with 4A)

```
3A: MQTT Bridge Service
│   ├── Connect to EMQX broker
│   ├── Subscribe to device topics
│   ├── Parse and validate messages
│   ├── Route to VictoriaMetrics / VictoriaLogs
│   └── Prerequisite: Phase 1B (EMQX running)
│
3B: Real-Time Pipeline
│   ├── WebSocket server (Socket.IO)
│   ├── Bridge MQTT events to WebSocket
│   ├── Client subscription management
│   └── Prerequisite: Phase 3A (MQTT connected)
```

### Phase 4: Frontend (Weeks 3-5)

```
4A: Frontend Foundation (can start parallel with Phase 3)
│   ├── Auth pages (login, session management)
│   ├── Layout, navigation, sidebar
│   ├── API client setup (Axios/fetch)
│   ├── State management (Zustand + TanStack Query)
│   └── Prerequisite: Phase 2A (auth API exists)
│
4B: Device Pages
│   ├── Device list, detail, create, edit
│   ├── Device status indicators
│   ├── Real-time status via WebSocket
│   └── Prerequisite: Phase 2B (device API exists)
│
4C: Domain-Specific Pages
│   ├── Vehicle/Machine management pages
│   ├── Domain CRUD interfaces
│   └── Prerequisite: Phase 2D (domain APIs exist)
│
4D: Dashboard
│   ├── System overview cards
│   ├── Real-time statistics
│   ├── Charts (ECharts/Recharts)
│   └── Prerequisite: Phase 4B + 4C (data to display)
```

### Phase 5: Advanced Features (Weeks 5-7)

```
5A: Maps
│   ├── Leaflet/Mapbox integration
│   ├── Real-time device positions
│   ├── Geofence visualization
│   └── Prerequisite: Phase 4B (device pages)
│
5B: Alerts
│   ├── Alert rule configuration
│   ├── Alert history and acknowledgment
│   ├── Real-time alert notifications
│   └── Prerequisite: Phase 3B (real-time pipeline)
│
5C: Analytics
│   ├── Time-series charts
│   ├── Historical data queries
│   ├── Trend analysis
│   └── Prerequisite: Phase 3A (data in VictoriaMetrics)
│
5D: Reports and Export
│   ├── PDF/CSV generation
│   ├── Scheduled reports
│   ├── Data export endpoints
│   └── Prerequisite: Phase 5C (analytics data)
```

### Phase 6: Mobile (Week 8+)

```
6A: Mobile Shell
│   ├── Flutter or React Native project
│   ├── WebView wrapping frontend
│   ├── Native navigation
│   └── Prerequisite: Phase 4 complete
│
6B: Native Features
│   ├── Push notifications
│   ├── Offline mode
│   ├── Native sensors (if needed)
│   └── Prerequisite: Phase 6A
```

---

## 3. Parallel Execution Opportunities

### What Can Run in Parallel

```
Timeline:
│
Week 1:  [Phase 1A]──[Phase 1B]──[Phase 1C]
         (sequential, each depends on previous)
│
Week 2:  [Phase 2A]──[Phase 2B]──┬──[Phase 2C]
                                  └──[Phase 2D] (parallel)
│
Week 3:  [Phase 3A]──[Phase 3B]    (parallel with 4A)
         [Phase 4A]────────────
│
Week 4:  [Phase 4B]──[Phase 4C]──[Phase 4D]
│
Week 5+: [Phase 5A]  [Phase 5B]  [Phase 5C]  (parallel)
│
Week 7+: [Phase 5D]
│
Week 8+: [Phase 6A]──[Phase 6B]
```

### Multi-Agent Parallel Execution

```
Agent assignments (if using multiple AI agents):
│
├── Agent 1 (Backend): Phase 2A → 2B → 2C → 2D
├── Agent 2 (Infra):   Phase 1A → 1B → 3A → 3B
├── Agent 3 (Frontend): Waits for 2A → Phase 4A → 4B → 4C → 4D
└── Agent 4 (Advanced): Waits for 3B → Phase 5A → 5B → 5C → 5D
```

---

## 4. Decision Trees

### When to Skip a Phase

```
Can I skip Phase 3 (MQTT Bridge)?
│
├── Do devices send data via MQTT?
│   ├── YES → Cannot skip
│   └── NO → Devices use HTTP/REST?
│       ├── YES → Skip Phase 3, ingest via REST in Phase 2C
│       └── NO → What protocol? Adapt Phase 3 accordingly
│
Can I skip Phase 6 (Mobile)?
│
├── Do users need a mobile app?
│   ├── YES → Is the web app mobile-responsive?
│   │   ├── YES → Phase 6 can be deferred
│   │   └── NO → Phase 6 is needed
│   └── NO → Skip Phase 6 entirely
│
Can I reorder Phase 4 before Phase 2?
│
├── NO → Frontend needs API endpoints to consume
│   └── Exception: Can build static UI mockups without APIs
│       └── But functional pages need Phase 2 APIs
```

### When to Add Sub-Phases

```
Is a phase taking more than 1 week?
│
├── YES → Split into sub-phases
│   ├── Phase 2 → 2A, 2B, 2C, 2D
│   └── Phase 4 → 4A, 4B, 4C, 4D
│
└── NO → Keep as single phase
    └── Phase 1 can often stay as one unit
```

---

## 5. Phase Completion Criteria

### Definition of Done Per Phase

| Phase | Done When |
|-------|-----------|
| **1A** | `docker-compose up` creates all tables, no SQL errors |
| **1B** | All infra services healthy, network connected |
| **1C** | `npm run dev` works, TypeScript compiles, folder structure matches spec |
| **2A** | Login/logout works, protected routes reject unauthenticated requests |
| **2B** | Device CRUD works via API, all endpoints tested |
| **2C** | Telemetry payload accepted, stored in VictoriaMetrics, queryable |
| **3A** | MQTT messages from broker processed and stored |
| **3B** | WebSocket clients receive real-time updates |
| **4A** | Login page works, navigation renders, API calls succeed |
| **4D** | Dashboard shows live data, charts render |
| **5B** | Alert triggers in real-time, notification delivered |
| **6A** | Mobile app opens, WebView loads frontend correctly |

---

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Start with frontend | No APIs to consume, mock hell | Build backend first (Phase 2) |
| Skip database design | Schema changes cascade everywhere | Phase 1A is non-negotiable |
| Build everything in parallel | Dependencies not met, integration chaos | Follow phase dependencies |
| No completion criteria | "It works on my machine" | Define Done per phase |
| Monolithic Phase 2 | Too large, no checkpoints | Split into 2A, 2B, 2C, 2D |
| Phase 6 before Phase 4 | Mobile wraps a frontend that does not exist | Frontend first, mobile wraps it |

---

> **Rule:** A phase is not done until its completion criteria are met. Moving to the next phase with broken foundations creates exponential rework.
