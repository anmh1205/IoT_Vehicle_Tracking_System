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

## 4. Phase Execution Matrix

Tracking tại `.tracking/`. Xem [60-agent-orchestration.md](./60-agent-orchestration.md) Section 6 cho chi tiết.

| Phase | Focus Area        | Primary Agents                 | Plan Files           | Deps      |
| :---- | :---------------- | :----------------------------- | :------------------- | :-------- |
| **1** | Database & Infra  | `database-architect`, `devops` | `10-*.md`, `12-*.md` | ✅ Độc lập |
| **2** | Backend Core      | `backend-specialist`           | `20-*.md`, `21-*.md` | ⚠️ Phase 1 |
| **3** | Realtime/MQTT     | `backend-specialist`           | `22-*.md`            | ⚠️ Phase 2 |
| **4** | Frontend Core     | `frontend-specialist`          | `30-*.md`, `31-*.md` | ⚠️ Phase 2 |
| **5** | Advanced Features | `frontend` + `backend`         | `32-*.md`            | ⚠️ Phase 4 |
| **6** | Mobile            | `mobile-developer`             | `40-*.md`            | ⚠️ Phase 4 |
| **7** | Deploy & Ops      | `devops-engineer`              | `50-*.md`            | ⚠️ All     |

**Parallel opportunities:** Phase 3 + Phase 4 có thể chạy song song (cả hai phụ thuộc Phase 2, nhưng độc lập nhau). Dùng Agent Teams cho việc này.

---

## 5. Best Practices

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

## 6. Reference

```
SystemDesign/
├── coding-plan/          # Instructions (READ THIS)
│   ├── 00-README.md      # Entry point
│   ├── 03-execution-guide.md  # This file
│   ├── 10-database...
│   ├── 20-backend...
│   ├── 60-agent-orchestration.md  # Agent Teams handbook (SSOT)
│   └── ...
└── iot-project-template/ # Generic Reference
```



