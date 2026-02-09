# IoT Vehicle Tracking System - Coding Plan & Execution Dashboard

> **⚠️ AGENT ALERT:** This is your **Primary Entry Point**. Read this file FIRST before taking any action.

---

## 🚨 MANDATORY PROTOCOLS (READ FIRST)

Before writing a single line of code, you **MUST** verify:

1.  **Check Status:** Read `.tracking/PROGRESS.md` to see active phases.
2.  **Check Tasks:** Read `.tracking/CURRENT_TASKS.md` to avoid conflicts.
3.  **Read Orchestration Rules:** Consult [60-agent-orchestration.md](./60-agent-orchestration.md) for:
    *   Agent Teams vs Subagents (Section 1)
    *   Delegate Mode & Setup (Section 2)
    *   Use Cases & Patterns (Section 3-4)
    *   Git Branching, Task ID, Error Handling (Section 6-9)
    *   **Leader Autonomy Protocol (Section 13)** ← Agent Lead PHẢI đọc
    *   **Sub-Phase Breakdown (Section 14)** ← Task chia nhỏ với file ownership
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

### 🟠 Phase 2: Backend Core → Sub-Phases 2A/2B/2C/2D
> *Status: See PROGRESS.md* | *Sub-phases: See [60-agent-orchestration.md](./60-agent-orchestration.md) Section 14*
*   **2A:** Auth Module (6 tasks) → **2B:** Device Module (6 tasks) → **2C:** Support Modules (5 tasks) → **2D:** Verification
*   **Specs:**
    *   [20-backend-architecture.md](./20-backend-architecture.md) (DDD Setup)
    *   [21-backend-api-endpoints.md](./21-backend-api-endpoints.md) (API Contract)
    *   [23-backend-security.md](./23-backend-security.md) (Auth & Security)

### 🟡 Phase 3: Real-time & IoT (High Throughput)
> *Status: See PROGRESS.md*
*   **Agents:** `backend-specialist`
*   **Specs:**
    *   [22-backend-mqtt-bridge.md](./22-backend-mqtt-bridge.md) (Ingestion)

### 🟢 Phase 4: Frontend Core → Sub-Phases 4A/4B/4C
> *Status: See PROGRESS.md* | *Sub-phases: See [60-agent-orchestration.md](./60-agent-orchestration.md) Section 14*
*   **4A:** Auth UI + Layout (5 tasks) → **4B:** Device UI (5 tasks) → **4C:** Support Pages (4 tasks)
*   **Specs:**
    *   [30-frontend-architecture.md](./30-frontend-architecture.md) (FSD Rules)
    *   [31-frontend-features.md](./31-frontend-features.md) (Feature Specs)

### 🔵 Phase 5: Advanced Features → Sub-Phases 5A/5B
> *Status: See PROGRESS.md* | *Sub-phases: See [60-agent-orchestration.md](./60-agent-orchestration.md) Section 14*
*   **5A:** Map + Geofence (3 tasks) ∥ **5B:** Alerts + Maintenance (3 tasks) — **chạy song song**
*   **Specs:**
    *   [32-frontend-implementation.md](./32-frontend-implementation.md) (Map, Alerts, etc.)

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
1.  Đọc **[60-agent-orchestration.md](./60-agent-orchestration.md) Section 13** (Leader Autonomy Protocol)
2.  Đọc **Section 14** để biết sub-phases + file ownership
3.  Đọc `.tracking/PROGRESS.md` để biết sub-phase nào tiếp theo
4.  Tự động dispatch: spawn teammates → inject context → verify → next sub-phase
5.  **CHỈ hỏi User khi:** architecture change, verify fail 3 lần, file conflict

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
