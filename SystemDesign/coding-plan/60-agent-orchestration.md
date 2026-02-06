# Agent Team Orchestration Handbook

> **Role:** Single Source of Truth for Multi-Agent Operations.
> **Scope:** Strategy, Protocols, Task Tracking, and Safety Rules.

---

## 1. The "Agent Team" Structure

We utilize a **Hierarchical (Manager-Worker)** pattern where the Main Agent acts as the **Orchestrator**, delegating specific domains to specialized Sub-Agents via the `Task` tool.

### 🎭 Roles & Responsibilities

| Role | Agent Type | Responsibility |
| :--- | :--- | :--- |
| **Orchestrator** | *(Main Session)* | Project manager. Maintains the `SystemDesign/coding-plan` state, coordinates handoffs, and resolves conflicts. |
| **Architect** | `Plan` / `database-architect` | Designs schemas, implementation plans, and architectural decisions. |
| **Backend Lead** | `backend-specialist` | Implements API endpoints, services, repositories, and business logic. |
| **Frontend Lead** | `frontend-specialist` | Builds UI components, pages, hooks, and manages state. |
| **QA Engineer** | `test-engineer` / `qa-automation` | Writes tests, verifies fixes, and ensures quality. |
| **DevOps** | `devops-engineer` | Manages Docker, CI/CD, and deployment configuration. |
| **Researcher** | `Explore` / `general-purpose` | Analyzes existing code, searches for patterns, and explains logic. |

---

## 2. Core Orchestration Patterns

### 🔄 Pattern A: The "Feature Factory" (Parallel)
Used when implementing independent vertical features. Orchestrator launches Backend and Frontend agents simultaneously using `Task` tool.

### ⛓️ Pattern B: The "Assembly Line" (Sequential)
Used for tasks with strict dependencies (e.g., DB Migration → Backend Update → Test Update).

### 🧠 Pattern C: The "Investigator" (Bug Fixes)
Explorer (Map) → Debugger (Reproduce) → Specialist (Fix) → QA (Verify).

---

## 3. 📁 Task Tracking System

### Folder Structure
```
.tracking/
├── PROGRESS.md              # High-level project status
├── CURRENT_TASKS.md         # Active tasks & locked files
├── COMPLETED.md             # Completed task log
├── BLOCKED.md               # Blockers & Issues
└── logs/                    # Daily execution logs
```

### Task ID Naming Convention
Format: `[PREFIX]-[NUMBER]` (e.g., `BE-001`, `FE-102`)

| Prefix | Domain |
|:---|:---|
| `DB` | Database |
| `BE` | Backend |
| `FE` | Frontend |
| `MQTT` | IoT/Realtime |
| `DEV` | DevOps |
| `BUG` | Bug Fixes |

### Task Status Lifecycle
1.  **Pending**: In Queue.
2.  **In Progress**: Added to `CURRENT_TASKS.md`. File locks acquired.
3.  **Blocked**: Moved to `BLOCKED.md` if dependencies fail.
4.  **Completed**: Moved to `COMPLETED.md` with "Files Changed" log.

---

## 4. 🔧 Tool Scoping & Permissions

To prevent context pollution and accidental damage, agents must adhere to these scopes.

| Agent | ✅ Allowed Scope | ❌ Forbidden |
|:---|:---|:---|
| `database-architect` | SQL files, migrations, Docker (DB) | Application code, Frontend |
| `backend-specialist` | `backend/src/**/*`, backend tests | `frontend/**/*`, DB schema changes |
| `frontend-specialist` | `frontend/src/**/*`, frontend tests | `backend/**/*` (except types) |
| `devops-engineer` | Docker, CI/CD, Infra configs | Business logic |
| `security-auditor` | Read All, Security Configs | Write application code |

### Memory Isolation
*   **Backend Agents** should NOT read Frontend UI code.
*   **Frontend Agents** should NOT read Backend Service logic (only API Types).

---

## 5. 🛡️ Safety & Error Protocols

### Error Classification & Recovery

| Level | Type | Action |
|:---|:---|:---|
| 🟢 **L1** | Syntax/Typos | Self-fix silently. |
| 🟡 **L2** | Transient (Network) | Retry max 3 times. |
| 🟠 **L3** | Logic/Test Fail | Log error, investigate, fix. |
| 🔴 **L4** | Architectural | **STOP**. Ask User/Orchestrator. |
| ⚫ **L5** | Data Loss Risk | **STOP IMMEDIATELY**. Rollback. |

### Rollback Strategy
1.  **Level 1 (File):** `git checkout HEAD -- <file>`
2.  **Level 2 (Commit):** `git revert <commit>`
3.  **Level 3 (Phase):** Requires Human Approval.

---

## 6. 🌿 Git Workflow for Agents

### Branch Strategy
*   `main`: Production-ready code.
*   `feature/phase-{N}-{name}`: Active development branches.
*   `hotfix/...`: Urgent fixes.

### Commit Rules
*   **Format:** `[TASK_ID] type: description`
*   **Example:** `[BE-003] feat: implement auth controller`
*   **Checklist:**
    *   [ ] `npm run typecheck` passes
    *   [ ] `npm run lint` passes
    *   [ ] `npm test` passes
    *   [ ] No secrets committed

---

## 7. 📂 Shared Types Protocol

**Source of Truth:** Backend (`backend/src/domain/*/types/`)

### Synchronization Flow
1.  Backend Agent updates types (e.g., `UserDTO`).
2.  Backend Agent logs change in `COMPLETED.md`.
3.  Frontend Agent reads `COMPLETED.md` and updates local types in `frontend/src/types/api/`.

---

## 8. 🚨 Escalation Matrix

**Escalate to Human (L3) when:**
*   🔴 Architecture decisions (REST vs GraphQL?)
*   🔴 Security vulnerabilities found
*   🔴 Breaking API/DB changes
*   🔴 Conflict with existing legacy code (IVM26)

**Handle Internally (L0-L2) when:**
*   🟢 Standard implementation
*   🟢 Small bug fixes
*   🟢 Waiting for another agent (Use `BLOCKED.md`)
