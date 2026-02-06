# IoT Vehicle Tracking System - Coding Plan & Execution Dashboard

> **⚠️ AGENT ALERT:** This is your **Primary Entry Point**. Read this file FIRST before taking any action.

---

## 🚨 MANDATORY PROTOCOLS (READ FIRST)

Before writing a single line of code, you **MUST** verify:

1.  **Check Status:** Read `.tracking/PROGRESS.md` to see active phases.
2.  **Check Tasks:** Read `.tracking/CURRENT_TASKS.md` to avoid conflicts.
3.  **Read Rules:** Consult `60-agent-orchestration.md` for:
    *   Git Branching (`feature/phase-N`)
    *   Task ID Naming (`BE-001`, `FE-010`)
    *   Error Handling (L1-L5 classification)
4.  **Read Specs:** Never guess. Read the `SystemDesign/*.md` files listed below.

---

## 🏗️ Project Architecture Overview

**Goal:** Build a scalable IoT Vehicle Tracking System (Monorepo).

| Layer | Tech Stack | Root Path |
| :--- | :--- | :--- |
| **Backend** | Express, TypeScript, DDD | `Tracking_Backend/` |
| **Frontend** | Next.js 15, FSD, Shadcn | `Tracking_Frontend/` |
| **IoT/Realtime** | MQTT (EMQX), Socket.IO | `Tracking_MqttBridge/` |
| **Database** | PostgreSQL, VictoriaMetrics | `Tracking_PostgreSQL/`, `Tracking_VictoriaMetrics/` |
| **Mobile** | Flutter (WebView Hybrid) | `Tracking_Mobile/` |

---

## 📋 Execution Roadmap (The Master Plan)

### 🔴 Phase 1: Foundation (Database & Infra)
> *Status: See PROGRESS.md*
*   **Agents:** `database-architect`, `devops-engineer`
*   **Specs:**
    *   [10-database-postgresql.md](./10-database-postgresql.md) (Schema)
    *   [11-database-victoriametrics.md](./11-database-victoriametrics.md) (Time-series)
    *   [12-docker-infrastructure.md](./12-docker-infrastructure.md) (Docker Compose)

### 🟠 Phase 2: Backend Core (API & Logic)
> *Status: See PROGRESS.md*
*   **Agents:** `backend-specialist`
*   **Specs:**
    *   [20-backend-architecture.md](./20-backend-architecture.md) (DDD Setup)
    *   [21-backend-api-endpoints.md](./21-backend-api-endpoints.md) (API Contract)
    *   [23-backend-security.md](./23-backend-security.md) (Auth & Security)

### 🟡 Phase 3: Real-time & IoT (High Throughput)
> *Status: See PROGRESS.md*
*   **Agents:** `backend-specialist`
*   **Specs:**
    *   [22-backend-mqtt-bridge.md](./22-backend-mqtt-bridge.md) (Ingestion)

### 🟢 Phase 4: Frontend Core (UI & Features)
> *Status: See PROGRESS.md*
*   **Agents:** `frontend-specialist`
*   **Specs:**
    *   [30-frontend-architecture.md](./30-frontend-architecture.md) (FSD Rules)
    *   [31-frontend-features.md](./31-frontend-features.md) (Feature Specs)

### 🔵 Phase 5: Advanced Features
> *Status: See PROGRESS.md*
*   **Agents:** `frontend-specialist`, `backend-specialist`
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

**To Start a Phase:**
1.  Read the "Specs" files listed above.
2.  Create tasks in `.tracking/CURRENT_TASKS.md`.
3.  Execute using the **[Execution Guide](./03-execution-guide.md)**.

**To Fix a Bug:**
1.  Read `60-agent-orchestration.md` -> "Pattern C: The Investigator".
2.  Use `Explore` to map the code.
3.  Create task `BUG-XXX` in tracking.

---

## 📚 Essential Reference Configs

*   **Sensors:** `config/sensors.example.ts`
*   **Domains:** `config/domains.example.ts`
*   **Metrics:** `config/metrics.example.ts`
*   **Coding Standards:** [02-coding-standards.md](./02-coding-standards.md) (Naming, TS patterns)

---

> **Note to Agents:** If you are unsure, STOP and ask the Orchestrator. Do not guess architecture.
