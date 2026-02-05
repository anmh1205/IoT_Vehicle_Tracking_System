# Claude Code CLI - Execution Guide

> Kế hoạch thực thi sử dụng Task tool có sẵn của Claude Code CLI

---

## 🎯 Cơ Chế Multi-Agent Có Sẵn

Claude Code CLI sử dụng **Task tool** để spawn subagents:

```typescript
// Claude Code tự động chạy parallel khi gọi nhiều Task trong 1 message
Task({ subagent_type: "backend-specialist", prompt: "..." })
Task({ subagent_type: "frontend-specialist", prompt: "..." })
Task({ subagent_type: "database-architect", prompt: "..." })
// → 3 agents chạy song song
```

### Available Subagent Types

| Type | Use For |
|------|---------|
| `backend-specialist` | API, Express, database integration |
| `frontend-specialist` | React, Next.js, UI components |
| `database-architect` | Schema, migrations, queries |
| `devops-engineer` | Docker, deployment |
| `security-auditor` | Security audit |
| `test-engineer` | Unit/E2E tests |
| `Explore` | Codebase discovery (quick/medium/thorough) |

---

## 📁 Cấu Trúc SystemDesign (Đã Sắp Xếp Theo Phase)

```
SystemDesign/
├── iot-project-template/           # Template generic cho IoT
│   ├── README.md                   # Tổng quan template
│   ├── CUSTOMIZATION.md            # Hướng dẫn customize
│   └── system-design/              # Thiết kế hệ thống generic
│       ├── 01-overview.md
│       ├── 02-requirements.md
│       ├── 03-architecture.md
│       ├── 04-database-design.md
│       ├── 05-api-design.md
│       ├── 06-realtime-design.md
│       ├── 07-frontend-design.md
│       ├── 08-security.md
│       ├── 09-deployment.md
│       └── 10-monitoring.md
│
├── coding-plan/                    # Kế hoạch coding chi tiết
│   │
│   ├── 📋 PHASE 0: OVERVIEW & STANDARDS
│   │   ├── 00-README.md                    ← Index file
│   │   ├── 01-rewrite-plan.md              ← Master plan
│   │   ├── 02-coding-standards.md          ← Naming conventions
│   │   └── 03-execution-guide.md           ← FILE NÀY
│   │
│   ├── 🗄️ PHASE 1: DATABASE & INFRASTRUCTURE
│   │   ├── 10-database-postgresql.md       ← PostgreSQL schema
│   │   ├── 11-database-victoriametrics.md  ← Time-series DB
│   │   └── 12-docker-infrastructure.md     ← Docker setup
│   │
│   ├── ⚙️ PHASE 2: BACKEND
│   │   ├── 20-backend-architecture.md      ← DDD structure
│   │   ├── 21-backend-api-endpoints.md     ← REST API design
│   │   ├── 22-backend-mqtt-bridge.md       ← MQTT integration
│   │   └── 23-backend-security.md          ← Security implementation
│   │
│   ├── 🎨 PHASE 3: FRONTEND
│   │   ├── 30-frontend-architecture.md     ← Feature-Sliced architecture
│   │   ├── 31-frontend-features.md         ← Feature specifications
│   │   └── 32-frontend-implementation.md   ← Detailed implementation
│   │
│   ├── 📱 PHASE 4: MOBILE
│   │   └── 40-mobile-strategy.md           ← Flutter WebView strategy
│   │
│   ├── 🚀 PHASE 5: DEPLOYMENT & OPS
│   │   └── 50-observability.md             ← Prometheus + Logging + Sentry
│   │
│   └── config/                     # Domain configuration
│       ├── sensors.example.ts
│       ├── domains.example.ts
│       └── metrics.example.ts
│
└── iot-vehicle-tracking-report/    # Báo cáo chi tiết dự án
```

---

## 📋 Execution Prompts

### Prompt 1: Foundation (Parallel 3 agents)

```
Thực hiện Phase 1 - Foundation cho IoT Vehicle Tracking System.

Working directory: E:\anmh1205\IoT_Vehicle_Tracking_System

Chạy 3 agents song song:

1. database-architect:
   - Đọc: SystemDesign/coding-plan/10-database-postgresql.md
   - Đọc: SystemDesign/iot-project-template/system-design/04-database-design.md
   - Reference: E:\anmh1205\IVM26\IVM26_PostgreSQL\
   - Output: docker/postgres/init/*.sql (schema files)

2. devops-engineer:
   - Đọc: SystemDesign/coding-plan/12-docker-infrastructure.md
   - Đọc: SystemDesign/iot-project-template/system-design/09-deployment.md
   - Output: docker-compose.yml, .env.example, docker/nginx/, docker/emqx/

3. Explore (quick):
   - Phân tích cấu trúc: E:\anmh1205\IVM26\IVM26_Backend\src\
   - Tóm tắt patterns và naming conventions
```

---

### Prompt 2: Backend Core (Parallel 3 agents)

```
Thực hiện Phase 2 - Backend Core cho IoT Vehicle Tracking System.

Working directory: E:\anmh1205\IoT_Vehicle_Tracking_System

Đọc trước: SystemDesign/coding-plan/02-coding-standards.md

Chạy 3 backend-specialist agents song song:

1. Auth Domain:
   - Đọc: SystemDesign/coding-plan/21-backend-api-endpoints.md Section 2
   - Reference: E:\anmh1205\IVM26\IVM26_Backend\src\domain\auth\
   - Output: backend/src/domain/auth/ (types, validator, repository, service, controller, routes)
   - Output: backend/src/middleware/auth.middleware.ts

2. Device Domain:
   - Đọc: SystemDesign/coding-plan/21-backend-api-endpoints.md Section 3
   - Reference: E:\anmh1205\IVM26\IVM26_Backend\src\domain\device\
   - Output: backend/src/domain/device/ (full domain files)

3. IoT Domain:
   - Đọc: SystemDesign/coding-plan/21-backend-api-endpoints.md Section 4
   - Reference: E:\anmh1205\IVM26\IVM26_Backend\src\domain\iot\
   - Output: backend/src/domain/iot/ (full domain files)
```

---

### Prompt 3: Backend Advanced (Parallel 2 agents)

```
Thực hiện Phase 3 - Backend Advanced.

Working directory: E:\anmh1205\IoT_Vehicle_Tracking_System

Chạy 2 backend-specialist agents song song:

1. MQTT Bridge:
   - Đọc: SystemDesign/coding-plan/22-backend-mqtt-bridge.md
   - Đọc: SystemDesign/coding-plan/11-database-victoriametrics.md
   - Reference: E:\anmh1205\IVM26\IVM26_Backend\src\mqtt-bridge\
   - Output: backend/src/mqtt-bridge/ (client, handlers, batch, cache)
   - Output: backend/src/infrastructure/victoriametrics/

2. Dashboard + Socket.IO:
   - Đọc: SystemDesign/coding-plan/21-backend-api-endpoints.md Section 5
   - Đọc: SystemDesign/iot-project-template/system-design/06-realtime-design.md
   - Reference: E:\anmh1205\IVM26\IVM26_Backend\src\realtime\
   - Output: backend/src/domain/dashboard/
   - Output: backend/src/realtime/ (socket server, namespaces, event-bus)
```

---

### Prompt 4: Frontend Core (Parallel 3 agents)

```
Thực hiện Phase 4 - Frontend Core.

Working directory: E:\anmh1205\IoT_Vehicle_Tracking_System

Đọc trước: SystemDesign/coding-plan/30-frontend-architecture.md

Chạy 3 frontend-specialist agents song song:

1. Setup + Auth:
   - Đọc: SystemDesign/coding-plan/31-frontend-features.md Section 2
   - Đọc: SystemDesign/iot-project-template/system-design/07-frontend-design.md
   - Reference: E:\anmh1205\IVM26\IVM26_Frontend\src\
   - Output: frontend/src/app/ (layouts, pages)
   - Output: frontend/src/features/auth/
   - Output: frontend/src/lib/ (api client, stores)
   - Output: frontend/src/components/ui/ (shadcn)

2. Devices Feature:
   - Đọc: SystemDesign/coding-plan/31-frontend-features.md Section 3
   - Reference: E:\anmh1205\IVM26\IVM26_Frontend\src\features\devices\
   - Output: frontend/src/features/devices/ (components, hooks)
   - Output: frontend/src/app/dashboard/devices/

3. Overview Feature:
   - Đọc: SystemDesign/coding-plan/31-frontend-features.md Section 5
   - Reference: E:\anmh1205\IVM26\IVM26_Frontend\src\features\overview\
   - Output: frontend/src/features/overview/
   - Output: frontend/src/app/dashboard/page.tsx
```

---

### Prompt 5: Frontend Advanced (Parallel 2 agents)

```
Thực hiện Phase 5 - Frontend Advanced.

Working directory: E:\anmh1205\IoT_Vehicle_Tracking_System

Chạy 2 frontend-specialist agents song song:

1. Map Feature:
   - Đọc: SystemDesign/coding-plan/31-frontend-features.md Section 4
   - Đọc: SystemDesign/coding-plan/32-frontend-implementation.md
   - Reference: E:\anmh1205\IVM26\IVM26_Frontend\src\features\map\
   - Output: frontend/src/features/map/ (Leaflet components)
   - Output: frontend/src/app/dashboard/map/

2. Firmware + Alerts:
   - Đọc: SystemDesign/coding-plan/31-frontend-features.md Section 6, 7
   - Đọc: SystemDesign/coding-plan/32-frontend-implementation.md
   - Output: frontend/src/features/firmware/
   - Output: frontend/src/features/alerts/
   - Output: frontend/src/features/notifications/
```

---

### Prompt 6: Security & Testing (Parallel 2 agents)

```
Thực hiện Phase 6 - Security & Testing.

Working directory: E:\anmh1205\IoT_Vehicle_Tracking_System

Chạy 2 agents song song:

1. security-auditor:
   - Đọc: SystemDesign/coding-plan/23-backend-security.md
   - Đọc: SystemDesign/iot-project-template/system-design/08-security.md
   - Audit: JWT, password hashing, validation, SQL injection, rate limiting
   - Output: backend/src/middleware/rate-limit.middleware.ts
   - Output: backend/src/middleware/security.middleware.ts

2. test-engineer:
   - Test critical paths: Auth, Device CRUD, IoT ingestion
   - Output: backend/tests/unit/*.test.ts
   - Output: backend/tests/integration/*.test.ts
   - Output: frontend/tests/e2e/*.spec.ts
```

---

### Prompt 7: Deployment (Single agent)

```
Thực hiện Phase 7 - Finalize Deployment.

Working directory: E:\anmh1205\IoT_Vehicle_Tracking_System

Chạy devops-engineer:
- Đọc: SystemDesign/coding-plan/12-docker-infrastructure.md
- Đọc: SystemDesign/coding-plan/50-observability.md
- Đọc: SystemDesign/iot-project-template/system-design/10-monitoring.md
- Output: backend/Dockerfile
- Output: frontend/Dockerfile
- Output: docker/nginx/nginx.prod.conf
- Output: docker/grafana/dashboards/
- Verify: docker-compose up -d hoạt động
```

---

## ⚡ One-Shot Full Build Prompt

```
Build IoT Vehicle Tracking System.

Working directory: E:\anmh1205\IoT_Vehicle_Tracking_System

SOURCES (tất cả trong SystemDesign/):
- Template: iot-project-template/ (generic IoT patterns)
- Coding Plan: coding-plan/ (vehicle tracking specific)
- Config: coding-plan/config/ (sensors, domains, metrics)
- Reference: E:\anmh1205\IVM26\ (existing implementation)

PHASES (chạy tuần tự, mỗi phase chạy agents parallel):

Phase 1 - Foundation (parallel):
- database-architect: PostgreSQL schema từ coding-plan/10-database-postgresql.md
- devops-engineer: Docker Compose từ coding-plan/12-docker-infrastructure.md
- Explore: Analyze IVM26 patterns

Phase 2 - Backend Core (parallel):
- 3x backend-specialist: Auth, Device, IoT domains
- Đọc: coding-plan/02-coding-standards.md, coding-plan/21-backend-api-endpoints.md

Phase 3 - Backend Advanced (parallel):
- 2x backend-specialist: MQTT Bridge, Dashboard + Socket.IO
- Đọc: coding-plan/22-backend-mqtt-bridge.md, coding-plan/11-database-victoriametrics.md

Phase 4 - Frontend Core (parallel):
- 3x frontend-specialist: Auth/Setup, Devices, Overview
- Đọc: coding-plan/30-frontend-architecture.md, coding-plan/31-frontend-features.md

Phase 5 - Frontend Advanced (parallel):
- 2x frontend-specialist: Map, Firmware/Alerts
- Đọc: coding-plan/32-frontend-implementation.md

Phase 6 - Security & Testing (parallel):
- security-auditor: Đọc coding-plan/23-backend-security.md
- test-engineer: Write tests

Phase 7 - Deployment:
- devops-engineer: Dockerfiles, final config, observability

OUTPUT: Hệ thống IoT Vehicle Tracking hoàn chỉnh, chạy với docker-compose up -d
```

---

## 📊 Execution Summary

| Phase | Agents | Parallel | Key Output |
|-------|--------|----------|------------|
| 1 | 3 | ✅ | Schema, Docker, Patterns |
| 2 | 3 | ✅ | Auth, Device, IoT APIs |
| 3 | 2 | ✅ | MQTT Bridge, Socket.IO |
| 4 | 3 | ✅ | Login, Device List, Dashboard |
| 5 | 2 | ✅ | Map, Firmware, Alerts |
| 6 | 2 | ✅ | Security, Tests |
| 7 | 1 | ❌ | Dockerfiles, Deploy |

**Total: 16 agent tasks in 7 phases**

---

## 🔧 Tips Cho Claude Code

### Chạy Parallel

```
// Claude Code tự động parallel khi bạn yêu cầu nhiều agents trong 1 prompt
"Chạy 3 agents song song: backend-specialist cho Auth, Device, IoT"
→ Claude sẽ gọi 3 Task tool calls trong 1 message
```

### Background Agents

```
// Dùng run_in_background cho tasks lâu
Task({
  subagent_type: "test-engineer",
  run_in_background: true,
  prompt: "Run all tests..."
})
// Có thể tiếp tục work khác trong khi tests chạy
```

### Thoroughness Levels (Explore)

```
// Explore agent có 3 levels
"Explore (quick)": Tìm nhanh files/patterns
"Explore (medium)": Phân tích moderate
"Explore (very thorough)": Deep analysis toàn bộ codebase
```

---

## 📁 File References

### Coding Plan (Vehicle Tracking Specific)

| File | Nội dung |
|------|----------|
| `coding-plan/00-README.md` | Index và hướng dẫn |
| `coding-plan/01-rewrite-plan.md` | Master rewrite plan |
| `coding-plan/02-coding-standards.md` | Naming conventions |
| `coding-plan/03-execution-guide.md` | AI agent execution guide |
| `coding-plan/10-database-postgresql.md` | PostgreSQL schema |
| `coding-plan/11-database-victoriametrics.md` | Time-series DB |
| `coding-plan/12-docker-infrastructure.md` | Docker Compose |
| `coding-plan/20-backend-architecture.md` | Backend DDD structure |
| `coding-plan/21-backend-api-endpoints.md` | REST API endpoints |
| `coding-plan/22-backend-mqtt-bridge.md` | MQTT integration |
| `coding-plan/23-backend-security.md` | Security implementation |
| `coding-plan/30-frontend-architecture.md` | Frontend structure |
| `coding-plan/31-frontend-features.md` | Feature modules |
| `coding-plan/32-frontend-implementation.md` | Detailed frontend guide |
| `coding-plan/40-mobile-strategy.md` | Flutter WebView Hybrid |
| `coding-plan/50-observability.md` | Prometheus + Logging + Sentry |

### IoT Template (Generic Patterns)

| File | Nội dung |
|------|----------|
| `iot-project-template/system-design/03-architecture.md` | System architecture |
| `iot-project-template/system-design/06-realtime-design.md` | Socket.IO + MQTT |
| `iot-project-template/system-design/07-frontend-design.md` | UI/UX patterns |
| `iot-project-template/system-design/08-security.md` | Security guidelines |
| `iot-project-template/system-design/10-monitoring.md` | Monitoring setup |

### Config Files

| File | Nội dung |
|------|----------|
| `coding-plan/config/sensors.example.ts` | Sensor types config |
| `coding-plan/config/domains.example.ts` | Domain entity config |
| `coding-plan/config/metrics.example.ts` | VictoriaMetrics config |

---

## ✅ Verification Checklist

Sau mỗi phase, verify:

```bash
# Phase 1
ls docker/postgres/init/*.sql
docker-compose config

# Phase 2-3
cd backend && npm run typecheck
curl http://localhost:3000/health

# Phase 4-5
cd frontend && npm run build
curl http://localhost:3002

# Phase 6
cd backend && npm test
cd frontend && npm run test:e2e

# Phase 7
docker-compose up -d
docker-compose ps
```
