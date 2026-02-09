# Execution Guide: IoT Vehicle Tracking System

> **Protocol:** Agent-Driven Development with Human Oversight.
> **Updated:** 2026-02-07 — Hỗ trợ Agent Teams + Subagents.

---

## 1. Workflow Overview

Dự án sử dụng **Multi-Agent** approach. Bạn (User) là **Product Owner**, Main Agent là **Lead Engineer**.

### The Cycle

```
User (Goal) → Lead tạo team → Teammates execute parallel → Lead tổng hợp → User review
```

1. **Define:** User cung cấp high-level goal (ví dụ: "Implement Geofence feature")
2. **Plan:** Lead phân tích `SystemDesign/` và đề xuất plan
3. **Delegate:** Lead spawn teammates hoặc subagents tùy complexity
4. **Execute:** Teammates/subagents thực hiện song song hoặc tuần tự
5. **Verify:** QA teammate hoặc Lead verify kết quả
6. **Review:** User review final output

---

## 2. Chọn Agent Teams hay Subagents?

| Tình huống                 | Dùng            | Lý do                    |
| :------------------------- | :-------------- | :----------------------- |
| Quick fix, single-file     | **Subagent**    | Không cần phối hợp       |
| Research/exploration đơn   | **Subagent**    | Chỉ cần kết quả          |
| Multi-module feature       | **Agent Teams** | Cần phối hợp cross-layer |
| Debug competing hypotheses | **Agent Teams** | Cần tranh luận           |
| Parallel code review       | **Agent Teams** | Nhiều lens khác nhau     |
| Sequential pipeline        | **Subagent**    | Không cần giao tiếp P2P  |

> 📖 Chi tiết về Agent Teams: xem [60-agent-orchestration.md](./60-agent-orchestration.md)

---

## 3. Agent Recommendations

| Task Category               | Recommended Agent                              |
| :-------------------------- | :--------------------------------------------- |
| **New API / DB Schema**     | `backend-specialist` hoặc `database-architect` |
| **New UI Page / Component** | `frontend-specialist`                          |
| **Bug Investigation**       | `Explore` (research) hoặc `debugger` (fix)     |
| **Writing Tests**           | `test-engineer`                                |
| **CI/CD & Docker**          | `devops-engineer`                              |
| **Security Audit**          | `security-auditor`                             |
| **Codebase Research**       | `Explore`                                      |

### Cách trigger
- *"Have the backend specialist implement the Auth API."*
- *"Run a security audit on the new endpoints."*
- *"Tạo team 3 người review PR này: security, performance, test coverage."*

---

## 4. Phase Execution Matrix (Sub-Phase Breakdown)

Tracking tại `.tracking/`. Chi tiết từng sub-phase: xem [60-agent-orchestration.md](./60-agent-orchestration.md) **Section 15**.
**Context Management:** xem **Section 13** (QUAN TRỌNG — tránh context limit).

| Sub-Phase | Focus                               | Agent                      | Deps      | Parallel?           |
| :-------- | :---------------------------------- | :------------------------- | :-------- | :------------------ |
| **1**     | DB Schema + Docker                  | `db-architect` + `devops`  | ✅ Độc lập | —                   |
| **2A**    | Auth Module (6 tasks)               | `backend-specialist`       | Phase 1   | —                   |
| **2B**    | Device Module (6 tasks)             | `backend-specialist`       | 2A        | —                   |
| **2C**    | Dashboard/Firmware/Export (5 tasks) | `backend-specialist` ×2-3  | 2A + 2B   | ✅ Internal parallel |
| **2D**    | Backend Verification                | QA / Lead                  | 2A-2C     | —                   |
| **3**     | MQTT Bridge                         | `backend-specialist`       | Phase 2   | ✅ **∥ Phase 4**     |
| **4A**    | Auth UI + Layout (5 tasks)          | `frontend-specialist`      | 2A        | ✅ **∥ Phase 3**     |
| **4B**    | Device UI (5 tasks)                 | `frontend-specialist`      | 4A + 2B   | —                   |
| **4C**    | Support Pages (4 tasks)             | `frontend-specialist` ×2-3 | 4A + 4B   | ✅ Internal parallel |
| **5A**    | Map + Geofence (3 tasks)            | `frontend-specialist`      | 4B        | ✅ **∥ 5B**          |
| **5B**    | Alerts + Maintenance (3 tasks)      | `frontend-specialist`      | 4A + 2C   | ✅ **∥ 5A**          |
| **6**     | Mobile                              | `mobile-developer`         | Phase 4   | —                   |
| **7**     | Deploy & Ops                        | `devops-engineer`          | All       | —                   |

**Parallel opportunities (tiết kiệm thời gian nhất):**
1. Phase 3 (MQTT) ∥ Phase 4A-4C (Frontend)
2. Phase 2C internal: dashboard ∥ firmware ∥ export (3 teammates)
3. Phase 5A (Map) ∥ Phase 5B (Alerts)

---

## 5. 🤖 Leader Autonomy (Zero-Intervention Mode)

> Khi User nói **"Implement Phase X"**, Lead tự lo toàn bộ mà không cần hỏi thêm.
> Chi tiết: xem [60-agent-orchestration.md](./60-agent-orchestration.md) **Section 14**.

### Quick Start cho User
```
# Lệnh 1 lần — Lead tự điều phối phần còn lại:
"Implement Phase 2"         → Lead tự chia 2A → 2B → 2C → 2D
"Implement Phase 2A"        → Lead tự spawn + verify Auth Module
"Implement Phase 3 + 4"     → Lead tự chạy parallel MQTT ∥ Frontend
```

### Lead tự động thực hiện:
1. Đọc spec + `.tracking/` → Xác định sub-tasks
2. Spawn teammates (max 3 parallel) với **Context Injection Template**
3. Monitor progress → Verify (typecheck + lint)
4. Update `.tracking/` → Chuyển sub-phase tiếp theo
5. Lặp lại đến khi Phase hoàn thành → Báo cáo User

### Lead hỏi User khi:
- 🔴 Architecture change (DB/API contract khác spec)
- 🔴 Verification fail 3 lần liên tục
- 🔴 2 teammates conflict cùng file

---

## 6. Best Practices

### 📚 Read Before Write
Luôn yêu cầu agents **đọc `SystemDesign/coding-plan/` files** trước khi code.

### ⚡ Parallel Execution
- Agent Teams cho multi-module: *"Backend API + Frontend Component + Tests — mỗi teammate 1 layer."*
- Subagent cho single task: *"Research how MQTT messages are handled."*

### 🛡️ Verification
Sau khi teammate hoàn thành → chạy verification: *"Backend done. Run tests to verify."*

### 🚀 Bắt đầu an toàn
1. Bắt đầu với **team 2 người** cho research/review
2. Scale lên 3-5 cho feature build khi đã quen
3. Dùng **Delegate Mode** (`Shift+Tab`) cho parallel implementation

---

## 7. Reference

```
SystemDesign/
├── coding-plan/
│   ├── 00-README.md           # Entry point
│   ├── 03-execution-guide.md  # This file
│   ├── 10-database...
│   ├── 20-backend...
│   ├── 60-agent-orchestration.md  # Handbook (Sections 1-14)
│   │   ├── Sections 1-12: Teams, Patterns, Safety, Git
│   │   ├── Section 13: Leader Autonomy Protocol ← KEY
│   │   └── Section 14: Sub-Phase Breakdown    ← KEY
│   └── ...
└── iot-project-template/
```

