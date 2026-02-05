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

## 🤖 Claude Code Multi-Agent Orchestration

> Hướng dẫn phân bổ sub-agent và tracking tiến độ công việc

### Agent Distribution Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CLAUDE CODE AGENT ORCHESTRATION                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    ORCHESTRATOR (Main Agent)                     │    │
│  │  - Nhận task từ user                                            │    │
│  │  - Phân tích scope & dependencies                               │    │
│  │  - Phân bổ task cho sub-agents                                  │    │
│  │  - Track progress trong .tracking/ folder                       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│         ┌────────────────────┼────────────────────┐                     │
│         │                    │                    │                     │
│         ▼                    ▼                    ▼                     │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐             │
│  │  Backend    │      │  Frontend   │      │  Database   │             │
│  │  Specialist │      │  Specialist │      │  Architect  │             │
│  └─────────────┘      └─────────────┘      └─────────────┘             │
│         │                    │                    │                     │
│         ▼                    ▼                    ▼                     │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐             │
│  │   MQTT/IoT  │      │   Mobile    │      │   DevOps    │             │
│  │  Specialist │      │  Developer  │      │  Engineer   │             │
│  └─────────────┘      └─────────────┘      └─────────────┘             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Sub-Agent Assignment Matrix

| Phase | Primary Agent | Support Agents | Độc lập/Phụ thuộc |
|-------|---------------|----------------|-------------------|
| Phase 1: Database | `database-architect` | `devops-engineer` | ✅ Độc lập |
| Phase 2: Backend | `backend-specialist` | `security-auditor` | ⚠️ Phụ thuộc Phase 1 |
| Phase 3: MQTT | `backend-specialist` | `debugger` | ⚠️ Phụ thuộc Phase 2 |
| Phase 4: Frontend | `frontend-specialist` | `test-engineer` | ⚠️ Phụ thuộc Phase 2 |
| Phase 5: Advanced | `frontend-specialist` | `backend-specialist` | ⚠️ Phụ thuộc Phase 4 |
| Phase 6: Mobile | `mobile-developer` | `frontend-specialist` | ⚠️ Phụ thuộc Phase 4 |
| Phase 7: Deploy | `devops-engineer` | `security-auditor` | ⚠️ Phụ thuộc All |

### Parallel Execution Rules

```
✅ CÓ THỂ CHẠY SONG SONG:
├── Backend API (không liên quan DB schema) + Frontend UI components
├── Unit tests + Documentation
├── Multiple independent features trong cùng một layer
└── Security audit + Performance profiling

❌ KHÔNG ĐƯỢC CHẠY SONG SONG:
├── Database migration + Backend code phụ thuộc schema mới
├── Backend API changes + Frontend code gọi API đó
├── Cùng một file hoặc module
└── Tasks có shared state hoặc dependencies
```

---

## 📁 Task Tracking System

### Folder Structure

```
.tracking/
├── PROGRESS.md              # Tổng quan tiến độ project
├── CURRENT_TASKS.md         # Tasks đang được thực hiện
├── COMPLETED.md             # Tasks đã hoàn thành
├── BLOCKED.md               # Tasks bị block và lý do
│
├── agents/                  # Task assignments per agent
│   ├── backend.md           # Backend specialist tasks
│   ├── frontend.md          # Frontend specialist tasks
│   ├── database.md          # Database architect tasks
│   ├── devops.md            # DevOps engineer tasks
│   └── mobile.md            # Mobile developer tasks
│
└── phases/                  # Progress per phase
    ├── phase-1-database.md
    ├── phase-2-backend.md
    ├── phase-3-mqtt.md
    ├── phase-4-frontend.md
    ├── phase-5-advanced.md
    ├── phase-6-mobile.md
    └── phase-7-deploy.md
```

### Task Status Format

```markdown
## Task: [TASK_ID] - [Task Name]

| Field | Value |
|-------|-------|
| **Status** | 🔴 Pending / 🟡 In Progress / 🟢 Completed / ⚫ Blocked |
| **Agent** | backend-specialist / frontend-specialist / etc. |
| **Phase** | Phase 2: Backend |
| **Priority** | 🔴 Critical / 🟡 High / 🟢 Medium / ⚪ Low |
| **Dependencies** | [TASK_ID_1], [TASK_ID_2] |
| **Blocked By** | [TASK_ID] hoặc "None" |
| **Started** | 2025-01-15 10:30 |
| **Completed** | 2025-01-15 12:45 |

### Description
[Mô tả chi tiết task]

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

### Files Modified
- `path/to/file1.ts`
- `path/to/file2.ts`

### Notes
[Ghi chú của agent khi thực hiện]
```

### PROGRESS.md Template

```markdown
# Project Progress - IoT Vehicle Tracking System

> Last Updated: [TIMESTAMP]

## 📊 Overall Progress

| Phase | Status | Progress | Agent |
|-------|--------|----------|-------|
| Phase 1: Database | 🟢 Completed | 100% | database-architect |
| Phase 2: Backend | 🟡 In Progress | 65% | backend-specialist |
| Phase 3: MQTT | 🔴 Pending | 0% | - |
| Phase 4: Frontend | 🟡 In Progress | 30% | frontend-specialist |
| Phase 5: Advanced | 🔴 Pending | 0% | - |
| Phase 6: Mobile | 🔴 Pending | 0% | - |
| Phase 7: Deploy | 🔴 Pending | 0% | - |

## 🏃 Currently Active Agents

| Agent | Current Task | Started | ETA |
|-------|--------------|---------|-----|
| backend-specialist | AUTH-003: JWT Middleware | 10:30 | 11:30 |
| frontend-specialist | FE-012: Login Form | 10:45 | 12:00 |

## 🚫 Blocked Tasks

| Task | Blocked By | Reason |
|------|------------|--------|
| BE-015 | DB-003 | Waiting for users table migration |

## ✅ Recently Completed

| Task | Agent | Completed |
|------|-------|-----------|
| DB-001: PostgreSQL Schema | database-architect | 09:30 |
| DB-002: Docker Compose | devops-engineer | 10:00 |
```

### CURRENT_TASKS.md Template

```markdown
# Currently Active Tasks

> ⚠️ Mỗi agent chỉ nên có TỐI ĐA 1 task "In Progress" tại một thời điểm

## 🟡 In Progress

### [BE-003] Implement Auth Service
- **Agent:** backend-specialist
- **Phase:** Phase 2: Backend
- **Started:** 2025-01-15 10:30
- **Dependencies:** DB-001 ✅, DB-002 ✅
- **Files:**
  - `backend/src/domain/auth/auth.service.ts`
  - `backend/src/domain/auth/auth.controller.ts`

### [FE-012] Create Login Form Component
- **Agent:** frontend-specialist
- **Phase:** Phase 4: Frontend
- **Started:** 2025-01-15 10:45
- **Dependencies:** BE-003 (partial - only needs types)
- **Files:**
  - `frontend/src/features/auth/components/login-form.tsx`
  - `frontend/src/features/auth/hooks/use-auth.ts`

## 📋 Queue (Ready to Start)

| Task ID | Name | Agent | Dependencies |
|---------|------|-------|--------------|
| BE-004 | Device Repository | backend-specialist | BE-003 |
| FE-013 | Auth Context | frontend-specialist | FE-012 |
```

---

## 🔄 Agent Coordination Protocol

### Before Starting a Task

```
1. CHECK .tracking/CURRENT_TASKS.md
   └── Đảm bảo không có agent khác đang làm cùng task/file

2. CHECK Dependencies
   └── Tất cả dependencies phải ở trạng thái ✅ Completed

3. UPDATE .tracking/CURRENT_TASKS.md
   └── Thêm task vào section "In Progress"

4. UPDATE .tracking/agents/{agent}.md
   └── Log task assignment

5. START Implementation
```

### After Completing a Task

```
1. UPDATE .tracking/CURRENT_TASKS.md
   └── Move task từ "In Progress" → Remove

2. UPDATE .tracking/COMPLETED.md
   └── Thêm task với timestamp và files modified

3. UPDATE .tracking/PROGRESS.md
   └── Update phase progress percentage

4. CHECK .tracking/BLOCKED.md
   └── Nếu có tasks đang chờ task này → Notify/Unblock

5. UPDATE .tracking/agents/{agent}.md
   └── Log completion
```

### Conflict Resolution

```
Khi phát hiện conflict:

1. STOP immediately
2. CHECK .tracking/CURRENT_TASKS.md
3. IDENTIFY conflicting agent/task
4. OPTIONS:
   a. Wait for other agent to complete
   b. Coordinate to split the work
   c. Escalate to orchestrator for resolution
5. LOG conflict in .tracking/BLOCKED.md
```

---

## 🛡️ Sub-Agent Safety Rules

### File Locking Convention

```markdown
Trong CURRENT_TASKS.md, list các files đang được edit:

## 🔒 Locked Files

| File | Agent | Task | Since |
|------|-------|------|-------|
| `backend/src/domain/auth/*` | backend-specialist | BE-003 | 10:30 |
| `frontend/src/features/auth/*` | frontend-specialist | FE-012 | 10:45 |

⚠️ Agents KHÔNG ĐƯỢC edit files trong locked list của agent khác
```

### Communication via Tracking Files

```markdown
Agents communicate qua .tracking/ files:

1. Cần API từ backend?
   → Check .tracking/agents/backend.md xem API đã ready chưa

2. Cần types/interfaces?
   → Check shared types trong completed tasks

3. Bị block?
   → Log trong .tracking/BLOCKED.md với reason

4. Cần coordinate?
   → Add note trong CURRENT_TASKS.md với @mention
```

### Handoff Protocol

```markdown
Khi một agent hoàn thành task mà agent khác đang chờ:

1. COMPLETE task với đầy đủ documentation
2. UPDATE exports/types nếu cần
3. ADD entry trong COMPLETED.md với:
   - API endpoints created
   - Types exported
   - Example usage
4. NOTIFY bằng cách update BLOCKED.md (remove block)
```

---

## 🔧 Tool Scoping Matrix

> Mỗi agent chỉ được access các tools/files trong scope của mình

### Agent Tool Permissions

| Agent | ✅ Allowed | ❌ Forbidden |
|-------|-----------|-------------|
| `database-architect` | SQL files, migrations, Docker (DB only) | Application code, Frontend |
| `backend-specialist` | `backend/src/**/*`, npm test (backend) | `frontend/**/*`, DB schema changes |
| `frontend-specialist` | `frontend/src/**/*`, styling, npm test (frontend) | `backend/**/*` (chỉ đọc types) |
| `mobile-developer` | Flutter/mobile code, native features | Backend/Frontend source |
| `devops-engineer` | Docker, CI/CD, infrastructure | Application business logic |
| `security-auditor` | Read all, security configs | Write application code |
| `test-engineer` | Test files, test configs | Production code (chỉ đọc) |

### File Access Rules

```
┌─────────────────────────────────────────────────────────────────┐
│  TOOL SCOPING - Scope tools ONLY to agents that need them       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  backend-specialist:                                             │
│  ├── ✅ Read/Write: backend/src/**/*                            │
│  ├── ✅ Read: frontend/src/**/types/*.ts (shared types only)    │
│  ├── ✅ Execute: npm run test, npm run lint (backend)           │
│  ├── ❌ Write: frontend/src/**/*                                 │
│  └── ❌ Execute: Database migrations (request từ DB architect)  │
│                                                                  │
│  frontend-specialist:                                            │
│  ├── ✅ Read/Write: frontend/src/**/*                           │
│  ├── ✅ Read: backend/src/**/types/*.ts (API types only)        │
│  ├── ✅ Execute: npm run test, npm run lint (frontend)          │
│  ├── ❌ Write: backend/src/**/*                                  │
│  └── ❌ Execute: Backend services                                │
│                                                                  │
│  database-architect:                                             │
│  ├── ✅ Read/Write: **/migrations/*, **/init/*.sql              │
│  ├── ✅ Read/Write: docker-compose.yml (database services)      │
│  ├── ❌ Write: Application source code                           │
│  └── ❌ Execute: npm scripts                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧠 Memory Isolation Rules

> Không share toàn bộ context cho tất cả agents - mỗi agent chỉ nhận context liên quan

### Context Distribution Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│  ❌ WRONG: All agents receive ALL context (100k tokens)          │
│     → Token overload, slower responses, confused reasoning       │
│                                                                  │
│  ✅ RIGHT: Each agent receives SCOPED context                    │
│     → Focused, efficient, clear decision making                  │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Context Templates

```markdown
## backend-specialist Context (Spawn Template)

You are working on IoT Vehicle Tracking Backend.

### Required Reading:
- SystemDesign/coding-plan/20-backend-architecture.md
- SystemDesign/coding-plan/21-backend-api-endpoints.md
- .tracking/phases/phase-2-backend.md
- .tracking/CURRENT_TASKS.md (check locked files)

### Reference:
- E:\anmh1205\IVM26\IVM26_Backend\src\ (patterns)

### Your Scope:
- backend/src/**/* (Read/Write)
- Shared types only from frontend

### DO NOT:
- Read frontend implementation details
- Modify database schemas without coordination
- Access files outside your scope
```

```markdown
## frontend-specialist Context (Spawn Template)

You are working on IoT Vehicle Tracking Frontend.

### Required Reading:
- SystemDesign/coding-plan/30-frontend-architecture.md
- SystemDesign/coding-plan/31-frontend-features.md
- .tracking/phases/phase-4-frontend.md
- .tracking/CURRENT_TASKS.md (check locked files)

### Reference:
- E:\anmh1205\IVM26\IVM26_Frontend\src\ (patterns)

### Your Scope:
- frontend/src/**/* (Read/Write)
- backend/src/**/types/*.ts (Read only - API types)

### DO NOT:
- Read backend implementation details
- Modify backend code
- Access database directly
```

---

## ⏱️ Termination Conditions

> Agents có thể loop vô hạn nếu không có điều kiện dừng rõ ràng

### Per-Task Limits

| Condition | Limit | Action When Exceeded |
|-----------|-------|---------------------|
| Max iterations per task | 10 | STOP, report to orchestrator |
| Max time per task | 30 minutes | STOP, checkpoint progress |
| Max file changes | 20 files | STOP, request approval |
| Max retries on same error | 3 | STOP, escalate |
| Same file edited repeatedly | 5 times | STOP, review approach |

### Success Criteria (Define BEFORE starting)

```markdown
## Task Completion Criteria Template

### [TASK_ID] - [Task Name]

**Exit Conditions (ALL must be true):**
- [ ] Code compiles without errors
- [ ] All existing tests still pass
- [ ] New tests written and passing
- [ ] No lint errors
- [ ] Acceptance criteria met (see below)

**Acceptance Criteria:**
- [ ] [Specific criterion 1]
- [ ] [Specific criterion 2]

**Automatic Stop Triggers:**
- Error repeats 3+ times
- Circular dependency detected
- Agent requests non-scoped tool
- Human checkpoint required
```

### Human Checkpoints

```
┌─────────────────────────────────────────────────────────────────┐
│  MANDATORY HUMAN CHECKPOINTS                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔴 ALWAYS require approval:                                     │
│  ├── Database schema changes                                    │
│  ├── Security-related changes                                   │
│  ├── Breaking API changes                                       │
│  ├── Deleting files/code                                        │
│  └── Changes to >10 files                                       │
│                                                                  │
│  🟡 Report progress after:                                       │
│  ├── Every 5 tasks completed                                    │
│  ├── Phase milestone reached                                    │
│  └── Blocked for >10 minutes                                    │
│                                                                  │
│  🟢 Can proceed autonomously:                                    │
│  ├── Single file edits within scope                             │
│  ├── Adding new files (not modifying existing)                  │
│  └── Running tests/lint                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Verification Checklist

> Mỗi task PHẢI pass checklist trước khi đánh dấu COMPLETED

### Task Completion Checklist

```markdown
## Before Marking Task as COMPLETED

### 1. Code Quality
- [ ] Code compiles without errors (`npm run typecheck`)
- [ ] No TypeScript `any` types (unless explicitly justified)
- [ ] Follows 02-coding-standards.md conventions
- [ ] No hardcoded values (use config files)
- [ ] Path aliases used (`@/*` not `../../../`)

### 2. Testing
- [ ] Unit tests written for new code
- [ ] All unit tests pass (`npm run test`)
- [ ] Integration tests (if applicable)
- [ ] Manual testing completed

### 3. Security (for auth/API tasks)
- [ ] No secrets in code
- [ ] Input validation with Zod
- [ ] SQL injection safe (parameterized queries)
- [ ] XSS safe (frontend - sanitized outputs)

### 4. Documentation
- [ ] Types exported for shared use
- [ ] API endpoints documented (Swagger)
- [ ] Handoff notes written in COMPLETED.md

### 5. Coordination
- [ ] .tracking/CURRENT_TASKS.md updated
- [ ] .tracking/COMPLETED.md updated
- [ ] Blocked tasks notified (if any)
- [ ] Locked files released
```

### Phase Completion Checklist

```markdown
## Before Marking Phase as COMPLETED

### Phase-Level Verification
- [ ] All tasks in phase marked COMPLETED
- [ ] All tests for this phase pass
- [ ] Integration between components verified
- [ ] No blocking issues for next phase
- [ ] Phase progress in PROGRESS.md = 100%

### Cross-Phase Dependencies
- [ ] Exported types available for dependent phases
- [ ] API endpoints ready for consumers
- [ ] Documentation updated
- [ ] Handoff meeting/notes completed
```

---

## 📊 Observability & Logging

> Log everything for debugging multi-agent systems

### Log File Structure

```
.tracking/
└── logs/
    ├── 2025-01-15.jsonl        # Daily structured logs
    ├── 2025-01-16.jsonl
    └── summary/
        ├── daily-2025-01-15.md  # Human-readable daily summary
        └── weekly-2025-W03.md   # Weekly summary
```

### Structured Log Format

```json
// .tracking/logs/2025-01-15.jsonl (JSON Lines format)

{"ts":"10:30:00","agent":"backend-specialist","action":"START_TASK","task":"BE-003","details":"Implement Auth Service"}
{"ts":"10:30:05","agent":"backend-specialist","action":"READ_FILE","file":"IVM26/src/domain/auth/auth.types.ts"}
{"ts":"10:31:00","agent":"backend-specialist","action":"CREATE_FILE","file":"backend/src/domain/auth/auth.types.ts"}
{"ts":"10:32:00","agent":"backend-specialist","action":"RUN_CMD","cmd":"npm run typecheck","result":"PASS"}
{"ts":"10:35:00","agent":"backend-specialist","action":"RUN_TEST","cmd":"npm test auth","result":"PASS","coverage":"85%"}
{"ts":"10:36:00","agent":"backend-specialist","action":"COMPLETE_TASK","task":"BE-003","files_changed":5}

{"ts":"10:45:00","agent":"frontend-specialist","action":"START_TASK","task":"FE-012"}
{"ts":"10:45:05","agent":"frontend-specialist","action":"CHECK_DEP","task":"BE-003","status":"COMPLETED"}
{"ts":"10:45:10","agent":"frontend-specialist","action":"READ_FILE","file":"backend/src/domain/auth/auth.types.ts","reason":"Get API types"}
{"ts":"10:50:00","agent":"frontend-specialist","action":"ERROR","error":"Type mismatch","file":"login-form.tsx","line":42}
{"ts":"10:51:00","agent":"frontend-specialist","action":"FIX_ERROR","error":"Type mismatch","solution":"Import correct type"}
```

### Daily Summary Template

```markdown
# Daily Summary - 2025-01-15

> Auto-generated from .tracking/logs/2025-01-15.jsonl

## 📈 Metrics

| Metric | Value |
|--------|-------|
| Tasks Started | 8 |
| Tasks Completed | 6 |
| Tasks Blocked | 2 |
| Errors Encountered | 3 |
| Errors Resolved | 3 |
| Files Changed | 45 |

## 🤖 Agent Activity

| Agent | Tasks Started | Completed | Errors | Avg Time/Task |
|-------|---------------|-----------|--------|---------------|
| backend-specialist | 4 | 3 | 1 | 25 min |
| frontend-specialist | 3 | 3 | 2 | 20 min |
| database-architect | 1 | 0 | 0 | - |

## 🔴 Errors Encountered

| Time | Agent | Error | Resolution |
|------|-------|-------|------------|
| 10:50 | frontend-specialist | Type mismatch in login-form.tsx | Fixed - imported correct type |
| 11:20 | backend-specialist | Test failure in auth.service | Fixed - mock dependency |
| 14:30 | frontend-specialist | Build error - missing dep | Fixed - added to package.json |

## 🔄 Handoffs

| From | To | What | Time |
|------|-----|------|------|
| backend-specialist | frontend-specialist | Auth types (BE-003) | 10:36 |
| database-architect | backend-specialist | Users table ready (DB-001) | 09:30 |

## ⏳ Still In Progress

| Task | Agent | Started | Blocker |
|------|-------|---------|---------|
| DB-003 | database-architect | 14:00 | Waiting for schema review |
| BE-007 | backend-specialist | 15:30 | Depends on DB-003 |

## 📝 Notes for Tomorrow

- DB-003 needs human review before proceeding
- Frontend auth flow ready for integration testing
- Consider parallelizing FE-014 and FE-015
```

---

## 🚀 Quick Start for New Session

> Orchestrator đọc phần này khi bắt đầu session mới

### Session Initialization Checklist

```
1. READ .tracking/PROGRESS.md
   └── Understand overall project status

2. READ .tracking/CURRENT_TASKS.md
   └── Check what was in progress

3. READ .tracking/BLOCKED.md
   └── Identify blockers to resolve

4. READ .tracking/logs/[latest].jsonl (last 50 lines)
   └── Understand recent activity

5. DECIDE next actions:
   a. Resume in-progress tasks
   b. Unblock blocked tasks
   c. Start new tasks from queue
   d. Ask user for direction
```

### Session Handoff Template

```markdown
## Session End Summary

**Date:** 2025-01-15
**Duration:** 4 hours
**Orchestrator Session ID:** [session-id]

### Completed This Session
- [x] BE-003: Auth Service
- [x] BE-004: Device Repository
- [x] FE-012: Login Form

### In Progress (Resume Next Session)
- [ ] BE-007: JWT Middleware (70% done)
- [ ] FE-015: Device List (50% done)

### Blocked (Needs Resolution)
- DB-003: Waiting for schema approval
  - **Action needed:** User review migration script

### Recommended Next Steps
1. Get approval for DB-003
2. Resume BE-007 after DB-003 completes
3. Start FE-016 (can parallel with BE-007)

### Files Left Open/Locked
| File | Agent | Task |
|------|-------|------|
| backend/src/middleware/auth.ts | backend-specialist | BE-007 |
```

---

## 🔄 Error Recovery Strategies

> Hướng dẫn xử lý khi agent gặp lỗi không thể tự fix

### Error Classification

| Level | Type | Example | Action |
|-------|------|---------|--------|
| 🟢 **L1 - Self-recoverable** | Syntax error, typo | Missing semicolon | Agent tự fix, không cần log |
| 🟡 **L2 - Retry-able** | Transient error | npm install timeout | Retry max 3 lần, sau đó escalate |
| 🟠 **L3 - Requires Investigation** | Logic error | Test fails unexpectedly | Log error, investigate root cause |
| 🔴 **L4 - Requires Human** | Architectural issue | Design conflict | STOP, document issue, ask user |
| ⚫ **L5 - Critical** | Data loss risk | Migration failure | STOP IMMEDIATELY, rollback |

### Error Handling Flowchart

```
┌─────────────────────────────────────────────────────────────────┐
│                    ERROR HANDLING FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Error Detected                                                  │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────┐                                            │
│  │ Classify Error  │                                            │
│  │ (L1-L5)         │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│     ┌─────┴─────┬─────────┬─────────┬─────────┐                │
│     ▼           ▼         ▼         ▼         ▼                │
│   L1: Fix    L2: Retry  L3: Log   L4: Ask   L5: STOP           │
│   silently   (max 3)    & Debug   Human     & Rollback          │
│     │           │         │         │         │                 │
│     ▼           ▼         ▼         ▼         ▼                │
│  Continue    Success?  Found fix? Approved? Document            │
│     │        Y/N       Y/N        Y/N       in BLOCKED          │
│     │           │         │         │         │                 │
│     └───────────┴─────────┴─────────┴─────────┘                │
│                     │                                            │
│                     ▼                                            │
│              Update tracking files                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Common Error Scenarios & Solutions

```markdown
## Scenario 1: Type Error in Shared Code

**Error:** `Type 'X' is not assignable to type 'Y'`
**Classification:** L3 - Requires Investigation

**Steps:**
1. Check if type changed in another agent's work
2. Read .tracking/COMPLETED.md for recent type changes
3. If type was updated by another agent → Import new type
4. If type conflict → Coordinate with other agent via BLOCKED.md

---

## Scenario 2: Test Failure After Code Change

**Error:** `Test suite failed: auth.service.test.ts`
**Classification:** L3 - Requires Investigation

**Steps:**
1. Check if test was passing before your changes
2. If yes → Your change broke it → Fix your code
3. If no → Pre-existing issue → Document and continue
4. If unclear → Run git diff to see what changed

---

## Scenario 3: Dependency Conflict

**Error:** `npm ERR! peer dep missing`
**Classification:** L2 - Retry-able

**Steps:**
1. Try `npm install` again (transient network issue?)
2. If fails 3x → Check package.json for version conflicts
3. If version conflict → Escalate to orchestrator (L4)

---

## Scenario 4: Database Migration Failure

**Error:** `Migration failed: column already exists`
**Classification:** L5 - Critical

**Steps:**
1. STOP IMMEDIATELY
2. DO NOT run more migrations
3. Document in BLOCKED.md with full error
4. Notify human for review
5. May need manual DB fix
```

### Error Log Format

```json
// When logging errors to .tracking/logs/
{
  "ts": "10:50:00",
  "agent": "backend-specialist",
  "action": "ERROR",
  "level": "L3",
  "error": "TypeError: Cannot read property 'id' of undefined",
  "file": "auth.service.ts",
  "line": 42,
  "context": "getUserById function",
  "attempted_fix": "Added null check",
  "result": "RESOLVED"
}
```

---

## 🔙 Rollback Procedures

> Hướng dẫn undo changes khi cần thiết

### When to Rollback

| Trigger | Action |
|---------|--------|
| L5 Critical error | Immediate rollback |
| 3+ consecutive test failures | Consider rollback |
| User requests revert | Rollback to specified state |
| Breaking change discovered | Rollback affected files |
| Wrong branch/approach | Rollback and restart |

### Rollback Levels

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROLLBACK LEVELS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Level 1: Single File Rollback                                   │
│  └── git checkout HEAD -- <file>                                │
│                                                                  │
│  Level 2: Task Rollback (multiple files)                         │
│  └── git stash or git checkout <commit> -- <files>              │
│                                                                  │
│  Level 3: Phase Rollback                                         │
│  └── git reset --soft <phase-start-commit>                      │
│  └── Requires human approval                                     │
│                                                                  │
│  Level 4: Full Session Rollback                                  │
│  └── git reset --hard <session-start-commit>                    │
│  └── REQUIRES HUMAN APPROVAL                                     │
│  └── Last resort only                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Rollback Checklist

```markdown
## Before Rollback

- [ ] Document reason for rollback in BLOCKED.md
- [ ] Note which files/commits will be affected
- [ ] Check if other agents depend on code being rolled back
- [ ] Get human approval for Level 3+ rollbacks

## During Rollback

- [ ] Use git commands (not manual file editing)
- [ ] Verify rollback was successful
- [ ] Run tests to confirm stable state

## After Rollback

- [ ] Update .tracking/CURRENT_TASKS.md
- [ ] Reset task status to appropriate state
- [ ] Document what was learned
- [ ] Plan corrected approach before retrying
```

### Git Commands for Rollback

```bash
# Level 1: Undo changes to single file
git checkout HEAD -- backend/src/domain/auth/auth.service.ts

# Level 2: Undo uncommitted changes
git stash                           # Save changes temporarily
git stash drop                      # Discard if not needed

# Level 2: Undo last commit (keep changes)
git reset --soft HEAD~1

# Level 3: Undo multiple commits (keep changes)
git reset --soft <commit-hash>

# Level 4: Hard reset (DESTRUCTIVE - requires approval)
git reset --hard <commit-hash>

# View what would be affected
git diff <commit-hash>..HEAD --stat
```

---

## 📛 Task ID Naming Convention

> Quy tắc đặt tên task ID nhất quán cho toàn bộ dự án

### ID Format

```
[PREFIX]-[NUMBER]

Where:
- PREFIX: 2-3 letter code for domain/phase
- NUMBER: 3-digit sequential number (001-999)
```

### Prefix Registry

| Prefix | Domain/Phase | Example |
|--------|--------------|---------|
| `DB` | Database & Infrastructure | DB-001, DB-015 |
| `BE` | Backend Core | BE-001, BE-042 |
| `MQTT` | MQTT & Real-time | MQTT-001, MQTT-012 |
| `FE` | Frontend Core | FE-001, FE-089 |
| `ADV` | Advanced Features | ADV-001, ADV-023 |
| `MOB` | Mobile | MOB-001, MOB-018 |
| `DEV` | DevOps & Deployment | DEV-001, DEV-007 |
| `SEC` | Security | SEC-001, SEC-015 |
| `TEST` | Testing | TEST-001, TEST-033 |
| `DOC` | Documentation | DOC-001, DOC-012 |
| `BUG` | Bug Fixes | BUG-001, BUG-099 |
| `REF` | Refactoring | REF-001, REF-045 |

### Numbering Rules

```
┌─────────────────────────────────────────────────────────────────┐
│  TASK NUMBERING RULES                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  001-099: Phase 0 - Setup & Standards                           │
│  100-199: Phase 1 - Database & Infrastructure                   │
│  200-299: Phase 2 - Backend Core                                │
│  300-399: Phase 3 - MQTT & Time-Series                          │
│  400-499: Phase 4 - Frontend Core                               │
│  500-599: Phase 5 - Advanced Features                           │
│  600-699: Phase 6 - Mobile                                      │
│  700-799: Phase 7 - Deployment & Ops                            │
│  800-899: Reserved for cross-cutting concerns                   │
│  900-999: Reserved for hotfixes & urgent tasks                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Examples

```markdown
## Good Task IDs

- DB-101: Create users table migration
- BE-203: Implement auth service
- FE-412: Create login form component
- MQTT-301: Setup MQTT client connection
- BUG-901: Fix login redirect issue
- SEC-801: Add rate limiting middleware

## Bad Task IDs (Don't use)

- ❌ auth-service (no prefix/number)
- ❌ TASK-1 (too generic)
- ❌ BE-1 (should be BE-001)
- ❌ Backend-Auth (not following format)
```

---

## 📂 Shared Types Location

> Nơi đặt shared interfaces giữa Backend và Frontend

### Type Sharing Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    TYPE SHARING ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Option 1: Backend as Source of Truth (RECOMMENDED)             │
│                                                                  │
│  backend/src/domain/{domain}/types/                             │
│       │                                                          │
│       ├── {domain}.types.ts      ← Entity types                 │
│       ├── {domain}.dto.ts        ← Request/Response DTOs        │
│       └── {domain}.api.ts        ← API contract types           │
│       │                                                          │
│       ▼ (Frontend imports from backend)                         │
│                                                                  │
│  frontend/src/types/api/                                        │
│       └── Re-exports or imports from backend                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
iot-vehicle-tracking-system/
├── backend/src/
│   └── domain/
│       ├── auth/
│       │   └── types/
│       │       ├── auth.types.ts       # User, Role entities
│       │       ├── auth.dto.ts         # LoginDTO, TokenResponse
│       │       └── auth.api.ts         # API endpoint types
│       ├── device/
│       │   └── types/
│       │       ├── device.types.ts     # Device, Session entities
│       │       ├── device.dto.ts       # CreateDeviceDTO, etc.
│       │       └── device.api.ts       # API endpoint types
│       └── shared/
│           └── types/
│               ├── common.types.ts     # Pagination, Error, etc.
│               ├── api-response.ts     # ApiResponse<T>
│               └── index.ts            # Re-exports
│
├── frontend/src/
│   └── types/
│       ├── api/
│       │   ├── auth.ts                 # Import from backend
│       │   ├── device.ts               # Import from backend
│       │   └── index.ts                # Re-export all
│       └── ui/
│           ├── forms.ts                # Frontend-only types
│           └── components.ts           # Component prop types
```

### Import Pattern

```typescript
// backend/src/domain/auth/types/auth.dto.ts
export interface LoginDTO {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// frontend/src/types/api/auth.ts
// Option A: Re-export (if using monorepo/shared package)
export * from '@backend/domain/auth/types/auth.dto';

// Option B: Copy with sync script (if separate repos)
// Types are copied during build process

// Option C: Manual sync (current approach)
// Frontend maintains own copy, synced manually
export interface LoginDTO {
  email: string;
  password: string;
}
```

### Type Sync Protocol

```markdown
## When Backend Changes Types

1. Backend agent updates types
2. Backend agent adds to COMPLETED.md:
   - "Types changed: LoginDTO (added `rememberMe` field)"
3. Frontend agent reads COMPLETED.md
4. Frontend agent updates corresponding frontend types
5. Frontend agent verifies type compatibility

## Conflict Resolution

If types diverge:
1. Backend types are SOURCE OF TRUTH
2. Frontend must adapt to backend types
3. If frontend needs different shape → create transformer/adapter
```

---

## 🚨 Escalation Matrix

> Khi nào escalate vs tự xử lý

### Escalation Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESCALATION DECISION TREE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Can I solve this within my scope?                              │
│       │                                                          │
│       ├── YES → Solve it                                        │
│       │                                                          │
│       └── NO → Is another agent responsible?                    │
│                    │                                             │
│                    ├── YES → Coordinate via tracking files      │
│                    │         (Not escalation)                    │
│                    │                                             │
│                    └── NO → Does it require human decision?     │
│                                  │                               │
│                                  ├── YES → ESCALATE TO HUMAN    │
│                                  │                               │
│                                  └── NO → ESCALATE TO           │
│                                           ORCHESTRATOR           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Escalation Levels

| Level | To Whom | When | How |
|-------|---------|------|-----|
| **L0** | Self | Within my scope | Just do it |
| **L1** | Other Agent | Need their work/coordination | Update .tracking/ files |
| **L2** | Orchestrator | Cross-cutting concern, unclear ownership | Log in BLOCKED.md with `@orchestrator` |
| **L3** | Human | Requires decision, approval, or expertise | STOP, document, ask user |

### Escalate to Human When:

```markdown
## ALWAYS Escalate These Situations

🔴 **Architecture Decisions**
- "Should we use REST or GraphQL?"
- "Should this be a separate service?"
- "Which library should we use?"

🔴 **Security Concerns**
- Potential vulnerability found
- Unsure about auth implementation
- Handling sensitive data

🔴 **Breaking Changes**
- API contract changes
- Database schema modifications
- Removing/renaming public interfaces

🔴 **Unclear Requirements**
- Ambiguous user story
- Missing acceptance criteria
- Conflicting requirements

🔴 **Resource Intensive**
- Task will take >2 hours
- Requires >20 file changes
- Major refactoring needed

🔴 **Conflict with Existing Code**
- Pattern doesn't match codebase
- Would require significant rework
- Existing code seems wrong
```

### Don't Escalate (Handle Yourself):

```markdown
## Handle These Without Escalation

🟢 **Standard Implementation**
- Following established patterns
- Adding new files to existing structure
- Implementing documented requirements

🟢 **Small Fixes**
- Typos, formatting
- Simple bug fixes
- Test fixes

🟢 **Research & Learning**
- Reading documentation
- Understanding existing code
- Checking reference projects

🟢 **Coordination with Other Agents**
- Waiting for dependencies
- Sharing types/interfaces
- Sequential task handoffs
```

### Escalation Template

```markdown
## Escalation Report

**Task ID:** BE-203
**Agent:** backend-specialist
**Escalation Level:** L3 (Human)
**Date/Time:** 2025-01-15 14:30

### Issue Summary
[One sentence description]

### Context
- What was I trying to do?
- What happened?
- What did I try?

### Options Considered
1. Option A: [description] - Pros/Cons
2. Option B: [description] - Pros/Cons
3. Option C: [description] - Pros/Cons

### Recommendation
[If I have one]

### Needed from Human
- [ ] Decision on approach
- [ ] Clarification on requirements
- [ ] Approval to proceed
- [ ] Other: [specify]

### Impact if Blocked
- Which tasks are waiting on this?
- Estimated delay?
```

---

## 🌿 Git Workflow for Agents

> Cách agents handle commits, branches, và coordination

### Branch Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    GIT BRANCH STRATEGY                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  main                                                            │
│    │                                                             │
│    └── feature/phase-{N}-{description}                          │
│             │                                                    │
│             ├── feature/phase-2-backend                         │
│             │       │                                            │
│             │       ├── (All Phase 2 work happens here)         │
│             │       └── Merge to main when phase complete       │
│             │                                                    │
│             ├── feature/phase-4-frontend                        │
│             │       │                                            │
│             │       └── (Can run parallel with Phase 2)         │
│             │                                                    │
│             └── hotfix/bug-{ID}-{description}                   │
│                     │                                            │
│                     └── (Urgent fixes, merge to main directly)  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Commit Message Format

```
[TASK_ID] type: short description

- Detailed change 1
- Detailed change 2

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:**
| Type | When to Use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code refactoring (no behavior change) |
| `test` | Adding/updating tests |
| `docs` | Documentation changes |
| `chore` | Build, config, dependencies |
| `style` | Formatting (no code change) |

**Examples:**
```bash
# Good commits
[BE-203] feat: implement JWT authentication service
[FE-412] fix: resolve login form validation issue
[DB-101] chore: add users table migration
[TEST-033] test: add unit tests for auth service

# Bad commits (don't do this)
"update code"
"fix bug"
"WIP"
```

### Agent Commit Rules

```markdown
## Commit Frequency

- Commit after each sub-task completion
- Never commit broken code
- Each commit should be atomic (one logical change)

## Before Committing

1. Run `npm run typecheck` - must pass
2. Run `npm run lint` - must pass
3. Run `npm run test` - must pass (or document known failures)
4. Review changes: `git diff --staged`

## Commit Checklist

- [ ] Task ID in commit message
- [ ] Type prefix (feat/fix/etc.)
- [ ] Descriptive message
- [ ] Tests pass
- [ ] No secrets/credentials committed
- [ ] No console.log/debug code
- [ ] Co-Authored-By footer included
```

### Multi-Agent Git Coordination

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-AGENT GIT FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ⚠️ RULE: Only ONE agent commits to a branch at a time          │
│                                                                  │
│  Scenario: Backend and Frontend working in parallel              │
│                                                                  │
│  1. Backend works on feature/phase-2-backend                    │
│  2. Frontend works on feature/phase-4-frontend                  │
│  3. NO CONFLICTS - different branches                           │
│                                                                  │
│  Scenario: Two agents need same branch                          │
│                                                                  │
│  1. Agent A claims branch in CURRENT_TASKS.md                   │
│  2. Agent B waits or works on different task                    │
│  3. Agent A commits and releases branch                         │
│  4. Agent B pulls latest and continues                          │
│                                                                  │
│  Merge Strategy:                                                 │
│  - Phase branches merge to main when phase is 100%              │
│  - Use merge commits (not rebase) for traceability              │
│  - Require human approval for main branch merges                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Pull Before Push

```bash
# ALWAYS do this before committing
git fetch origin
git pull origin <current-branch> --rebase

# Then commit and push
git add <files>
git commit -m "[TASK_ID] type: description"
git push origin <current-branch>
```

### Conflict Resolution

```markdown
## If Git Conflict Occurs

1. STOP - Don't force anything
2. Check CURRENT_TASKS.md - Who else is working on this?
3. If another agent's changes:
   - Pull their changes
   - Resolve conflicts carefully
   - Test thoroughly
4. If unsure:
   - Escalate to orchestrator
   - Document in BLOCKED.md
5. Never use `--force` without human approval
```

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
