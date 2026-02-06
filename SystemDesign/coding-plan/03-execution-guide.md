# Execution Guide: IoT Vehicle Tracking System

> **Protocol:** Agent-Driven Development with Human Oversight.
> **Updated:** To support `Task` tool and specialized Sub-Agents.

---

## 1. Workflow Overview

This project uses a **Multi-Agent** approach. You (the User) act as the **Product Owner**, while the Main Agent acts as the **Lead Engineer/Orchestrator**.

### The Cycle
1.  **Define:** User provides a high-level goal (e.g., "Implement the Geofence feature").
2.  **Plan:** Main Agent (or `Plan` agent) analyzes `SystemDesign/` and proposes a plan.
3.  **Delegate:** Main Agent uses `Task` to spawn `backend-specialist`, `frontend-specialist`, etc.
4.  **Verify:** Main Agent (or `test-engineer`) verifies the result.
5.  **Review:** User reviews the final output.

---

## 2. Using Specialized Agents

The Main Agent has access to the `Task` tool. Use this to offload complex work.

| Task Category | Recommended Agent |
| :--- | :--- |
| **New API / DB Schema** | `backend-specialist` or `database-architect` |
| **New UI Page / Component** | `frontend-specialist` |
| **Bug Investigation** | `Explore` (research) or `debugger` (fix) |
| **Writing Tests** | `test-engineer` |
| **CI/CD & Docker** | `devops-engineer` |
| **Security Audit** | `security-auditor` |
| **Codebase Research** | `Explore` |

### How to Trigger
Simply ask the Main Agent in natural language.
*   *"Have the backend specialist implement the Auth API."*
*   *"Run a security audit on the new endpoints."*
*   *"Research how we handle MQTT messages using the Explore agent."*

---

## 3. Project Phases & Tracking

We track progress in `.tracking/`.

*   **`PROGRESS.md`**: High-level phase tracking (Foundation -> Backend -> Frontend...).
*   **`CURRENT_TASKS.md`**: What is happening *right now*.

### Phase Execution Matrix

| Phase | Focus Area | Primary Agents | Plan Files |
| :--- | :--- | :--- | :--- |
| **1** | Database & Infra | `database-architect`, `devops-engineer` | `10-*.md`, `12-*.md` |
| **2** | Backend Core | `backend-specialist` | `20-*.md`, `21-*.md` |
| **3** | Realtime/MQTT | `backend-specialist` | `22-*.md` |
| **4** | Frontend Core | `frontend-specialist` | `30-*.md`, `31-*.md` |
| **5** | Advanced Features | `frontend-specialist`, `backend-specialist` | `32-*.md` |
| **6** | Mobile | `mobile-developer` | `40-*.md` |
| **7** | Deploy & Ops | `devops-engineer` | `50-*.md` |

---

## 4. Best Practices

### 📚 Read Before Write
Always instruct agents to **read the relevant `SystemDesign/coding-plan/` files** before writing code. This ensures they follow the project's architectural standards.

### ⚡ Parallel Execution
The Main Agent can launch multiple sub-agents at once.
*   *Example:* "Implement the Backend API for Vehicles AND the Frontend List Component in parallel."

### 🛡️ Verification
After an agent completes a task, it is good practice to run a quick verification or test.
*   *"Backend is done. Now run the tests to verify."*

---

## 5. Directory Structure Reference

```
SystemDesign/
├── coding-plan/          # The Instructions (READ THIS)
│   ├── 10-database...
│   ├── 20-backend...
│   └── ...
└── iot-project-template/ # Generic Reference
```
