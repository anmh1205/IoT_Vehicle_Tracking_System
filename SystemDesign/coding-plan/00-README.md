# IoT Vehicle Tracking System - Coding Plan & Execution Dashboard

> **⚠️ AGENT ALERT:** This is your **Primary Entry Point**. Read this file FIRST before taking any action.

---

## 🚨 MANDATORY PROTOCOLS (READ FIRST)

Before writing a single line of code, you **MUST** verify:

### ⚠️ CRITICAL FRONTEND RULES (Áp dụng cho Phase 4, 5)

1. **IVM26 Template Compliance**: Frontend PHẢI follow UI pattern từ IVM26 reference project (based on `next-shadcn-dashboard-starter`). Reference: `E:\anmh1205\IVM26\`
2. **shadcn/ui Only**: Dùng EXCLUSIVELY shadcn/ui components (Radix UI primitives). KHÔNG hand-roll Dropdown, Pagination, Modal, SkeletonRow, DataTable
3. **Zero Placeholder**: TUYỆT ĐỐI KHÔNG được viết "Coming Soon", "future update", "will be available", "TODO", hoặc bất kỳ placeholder text nào trong code
4. **100% Feature Complete**: MỌI page listed trong plan PHẢI fully functional với real API integration, form validation (Zod), CRUD operations, error handling, loading states
5. **IVM26 Layout Pattern**: Dùng `SidebarProvider` + `AppSidebar` + `SidebarInset` + `PageContainer` + `Breadcrumbs` + `DataTable` — ĐÚNG pattern IVM26
6. **Sub-plan là AUTHORITATIVE**: Agent ĐỌC sub-plan TRƯỚC (4A, 4B, etc.), sub-plan chứa inline code patterns đầy đủ — KHÔNG cần cross-reference file khác
7. **Auth**: Zustand store (memory-only). KHÔNG localStorage, KHÔNG React Context. Cookie chỉ cho middleware
8. **Charts**: recharts ONLY. KHÔNG ECharts
9. **UI Enhancement Plans**: Xem `SystemDesign/enhance/` cho kế hoạch nâng cấp UI chi tiết dựa trên IVM26 reference
9. **Geofence editor**: `@geoman-io/leaflet-geoman-free`. KHÔNG `react-leaflet-draw`
10. **Icons**: lucide-react. KHÔNG `@tabler/icons-react`

### 🔄 AGENT EXECUTION STRATEGY (Backend vs Frontend)

> **⚠️ QUAN TRỌNG:** Đọc kỹ trước khi bắt đầu implement.

#### Backend Agent (Phase 2, 3)
```
STRATEGY: PRESERVE — Giữ nguyên code hiện tại
```
- Backend (`Tracking_Backend/`) và MQTT Bridge (`Tracking_MqttBridge/`) ĐÃ ĐƯỢC implement
- **KHÔNG viết lại** nếu code đã tồn tại và hoạt động
- Chỉ **thêm mới** các endpoint/service chưa có (ví dụ: `/statistics/*` endpoints)
- Chỉ **sửa** khi có bug hoặc cần bổ sung tính năng thiếu
- **Kiểm tra trước**: Đọc file → Đã có code? → SKIP. Chưa có? → Implement theo spec

#### Frontend Agent (Phase 4, 5)
```
STRATEGY: CLEAN SLATE — Xóa toàn bộ, viết lại từ đầu
```
- **XÓA** toàn bộ thư mục `Tracking_Frontend/` trước khi bắt đầu
- **Viết lại từ đầu** theo sub-plan instructions (4A → 4B → 4C → 4D → 5A → 5B → 5C → 5D)
- Bắt đầu từ `4A-foundation-auth.md` Task FE-001: `npx create-next-app`
- Mỗi sub-plan là **self-contained** — chỉ cần đọc 1 file sub-plan để implement phase đó
- **KHÔNG tham khảo code frontend cũ** — code cũ có nhiều lỗi pattern

#### Quy trình cho Frontend Agent:
```bash
# Step 1: Xóa frontend cũ
rm -rf Tracking_Frontend/

# Step 2: Tạo thư mục mới
mkdir Tracking_Frontend && cd Tracking_Frontend

# Step 3: Bắt đầu từ 4A-foundation-auth.md
# Theo thứ tự: 4A → 4B → 4C → 4D → 5A → 5B → 5C → 5D
```

---

1.  **Check Status:** Read `.tracking/PROGRESS.md` to see active phases.
2.  **Check Tasks:** Read `.tracking/CURRENT_TASKS.md` to avoid conflicts.
3.  **Read Orchestration Rules:** Consult [60-agent-orchestration.md](./60-agent-orchestration.md) for:
    *   Agent Teams vs Subagents (Section 1)
    *   Delegate Mode & Setup (Section 2)
    *   Use Cases & Patterns (Section 3-4)
    *   Git Branching, Task ID, Error Handling (Section 6-9)
    *   **Leader Autonomy Protocol (Section 14)** ← Agent Lead PHẢI đọc
    *   **Sub-Phase Breakdown (Section 15)** ← Task chia nhỏ với file ownership
    *   **Context Management (Section 13)** ← Tránh context limit
4.  **Read Specs:** Never guess. Read the `SystemDesign/*.md` files listed below.

---

## 🏗️ Project Architecture Overview

**Goal:** Build a scalable IoT Vehicle Tracking System (Monorepo).

| Layer            | Tech Stack                  | Root Path                                           |
| :--------------- | :-------------------------- | :-------------------------------------------------- |
| **Backend**      | Express, TypeScript, DDD    | `Tracking_Backend/`                                 |
| **Frontend**     | Next.js 15, FSD, Shadcn     | `Tracking_Frontend/`                                |
| **IoT/Realtime** | MQTT (EMQX), Socket.IO      | `Tracking_MqttBridge/`                              |
| **Database**     | PostgreSQL, VictoriaMetrics | `Tracking_PostgreSQL/`, `Tracking_VictoriaMetrics/` |
| **Mobile**       | Flutter (WebView Hybrid)    | `Tracking_Mobile/`                                  |

---

## 📋 Execution Roadmap (The Master Plan)

### 🔴 Phase 1: Foundation (Database & Infra)
> *Status: See PROGRESS.md*
*   **Agents:** `database-architect`, `devops-engineer`
*   **Specs:**
    *   [10-database-postgresql.md](./10-database-postgresql.md) (Schema)
    *   [11-database-victoriametrics.md](./11-database-victoriametrics.md) (Time-series)
    *   [12-docker-infrastructure.md](./12-docker-infrastructure.md) (Docker Compose)

### 🟠 Phase 2: Backend Core → Sub-Phases 2A/2B/2C/2D/2E
> *Status: See PROGRESS.md* | *Sub-phases: See [60-agent-orchestration.md](./60-agent-orchestration.md) Section 15*
*   **2A:** Auth Module (6 tasks) → **2B:** Device Module (6 tasks) → **2C:** Support Modules (5 tasks) → **2D:** Verification → **2E:** Vehicle Tracking Core Domains (8 tasks)
*   **Specs:**
    *   [20-backend-architecture.md](./20-backend-architecture.md) (DDD Setup)
    *   [21-backend-api-endpoints.md](./21-backend-api-endpoints.md) (API Contract, plural REST URLs)
    *   [23-backend-security.md](./23-backend-security.md) (Session-based Auth & Security)
    *   [24-websocket-events.md](./24-websocket-events.md) (WebSocket Event Contract)

### 🟡 Phase 3: Real-time & IoT (High Throughput)
> *Status: See PROGRESS.md*
> **Deps:** Phase 1 + Phase 2A only. Can run parallel with Phase 2C/2D/2E and Phase 4A.
*   **Agents:** `backend-specialist`
*   **Specs:**
    *   [22-backend-mqtt-bridge.md](./22-backend-mqtt-bridge.md) (Standalone Tracking_MqttBridge/)
    *   [24-websocket-events.md](./24-websocket-events.md) (Event Contract)

### 🟢 Phase 4: Frontend Core → Sub-Phases 4A/4B/4C/4D
> *Status: See PROGRESS.md* | *Sub-plans: `phases/phase-4-frontend/`*
*   **4A:** Foundation + Auth + Layout (23 tasks) → **4B:** Device UI (14 tasks) → **4C:** Dashboard + Settings + Users (19 tasks) → **4D:** Vehicle & Customer (17 tasks)
*   **Sub-plans (AUTHORITATIVE):**
    *   [4A-foundation-auth.md](./phases/phase-4-frontend/4A-foundation-auth.md)
    *   [4B-device-ui.md](./phases/phase-4-frontend/4B-device-ui.md)
    *   [4C-support-pages.md](./phases/phase-4-frontend/4C-support-pages.md)
    *   [4D-vehicle-customer.md](./phases/phase-4-frontend/4D-vehicle-customer.md)
*   **Reference Specs:** [30](./30-frontend-architecture.md), [31](./31-frontend-features.md), [32](./32-frontend-implementation.md)

### 🔵 Phase 5: Advanced Features → Sub-Phases 5A/5B/5C/5D
> *Status: See PROGRESS.md* | *Sub-plans: `phases/phase-5-advanced/`*
*   **5A:** Map + Geofence (22 tasks) ∥ **5B:** Alerts + Trips + Maintenance + Violations (32 tasks) → **5C:** Real-time + Notifications (9 tasks) → **5D:** Reports + Firmware + Export + System (31 tasks)
*   **Sub-plans (AUTHORITATIVE):**
    *   [5A-map-geofence.md](./phases/phase-5-advanced/5A-map-geofence.md)
    *   [5B-alerts-trips-maintenance.md](./phases/phase-5-advanced/5B-alerts-trips-maintenance.md)
    *   [5C-realtime-integration.md](./phases/phase-5-advanced/5C-realtime-integration.md)
    *   [5D-reports-firmware-export.md](./phases/phase-5-advanced/5D-reports-firmware-export.md)
*   **Reference Specs:** [32](./32-frontend-implementation.md)

### 🟣 Phase 6: Mobile (Hybrid)
> *Status: See PROGRESS.md*
*   **Agents:** `mobile-developer`
*   **Specs:**
    *   [40-mobile-strategy.md](./40-mobile-strategy.md)

### ⚪ Phase 7: Deployment (Ops)
> *Status: See PROGRESS.md*
*   **Agents:** `devops-engineer`
*   **Specs:**
    *   [50-observability.md](./50-observability.md)

---

## 🛠️ Quick Actions for Agents

**To Start a Phase (Agent Lead — Zero-Intervention Mode):**
1.  Đọc **[60-agent-orchestration.md](./60-agent-orchestration.md) Section 14** (Leader Autonomy Protocol)
2.  Đọc **Section 15** để biết sub-phases + file ownership
3.  Đọc **Section 13** để tránh context limit (QUAN TRỌNG)
4.  Đọc `.tracking/PROGRESS.md` để biết sub-phase nào tiếp theo
5.  Tự động dispatch: spawn teammates → inject context → verify → next sub-phase
6.  **CHỈ hỏi User khi:** architecture change, verify fail 3 lần, file conflict

**Quick commands cho User:**
```
"Implement Phase 2"         → Lead tự chia 2A → 2B → 2C → 2D
"Implement Phase 2A"        → Lead tự spawn + verify Auth Module
"Implement Phase 3 + 4"     → Lead tự chạy parallel MQTT ∥ Frontend
```

**To Fix a Bug:**
1.  Read `60-agent-orchestration.md` → "Pattern C: The Investigator" (Section 4).
2.  Use `Explore` to map the code.
3.  Create task `BUG-XXX` in tracking.
4.  For complex bugs: dùng **Competing Hypotheses** (Agent Teams UC2).

---

## 📚 Essential Reference Configs

*   **Sensors:** `config/sensors.example.ts`
*   **Domains:** `config/domains.example.ts`
*   **Metrics:** `config/metrics.example.ts`
*   **Coding Standards:** [02-coding-standards.md](./02-coding-standards.md) (Naming, TS patterns)

---

> **Note to Agents:** If you are unsure, STOP and ask the Orchestrator. Do not guess architecture.

---

## 🐛 Errata & Known Issues (Fixed 2026-02-09)

> **Các lỗi đã phát hiện và fix trong quá trình implement. Agents PHẢI đọc section này để tránh lặp lại.**

| #   | Lỗi gốc                                                                                            | Fix                                                         | Files đã sửa                                                                              |
| --- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | **VictoriaLogs image `v1.0.0` không tồn tại** trên Docker Hub                                      | Đổi thành `v1.3.1-victorialogs`                             | `Tracking_VictoriaLogs/docker-compose.yml`, 5 spec files                                  |
| 2   | **EMQX crash** khi mount `./etc:/opt/emqx/etc:ro` — ghi đè toàn bộ default configs                 | Bỏ custom config mount, dùng environment variables thay thế | `Tracking_EMQX/docker-compose.yml`, `04-project-structure.md`                             |
| 3   | **Frontend chiếm port 3000** (conflict với Backend) — Next.js mặc định dùng port 3000              | Thêm `-p 3002` vào `next dev` command trong package.json    | `Tracking_Frontend/package.json`                                                          |
| 4   | **VictoriaMetrics/VictoriaLogs healthcheck "unhealthy"** — dùng `wget` nhưng image không có `wget` | Đổi healthcheck sang `curl -sf`                             | `Tracking_VictoriaMetrics/docker-compose.yml`, `Tracking_VictoriaLogs/docker-compose.yml` |
| 5   | **Không có tài khoản admin mặc định** — không thể login sau khi setup                              | Thêm seed INSERT vào `01-users.sql` (admin / Admin@2026)    | `Tracking_PostgreSQL/init/01-users.sql`                                                   |

### Default Credentials (Development Only)

| Service            | Username   | Password            | URL                    |
| ------------------ | ---------- | ------------------- | ---------------------- |
| **Web App**        | `admin`    | `Admin@2026`        | http://localhost:3002  |
| **EMQX Dashboard** | `admin`    | `emqx_dev_2026`     | http://localhost:18083 |
| **PostgreSQL**     | `postgres` | `tracking_dev_2026` | localhost:5432         |

> **⚠️ CHANGE ALL PASSWORDS before deploying to production!**
