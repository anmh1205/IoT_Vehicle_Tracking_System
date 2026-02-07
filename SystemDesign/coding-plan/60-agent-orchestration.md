# Agent Team Orchestration Handbook

> **Role:** Single Source of Truth for Multi-Agent Operations.
> **Scope:** Strategy, Protocols, Task Tracking, Safety Rules, và Agent Teams.
> **Updated:** 2026-02-07 — Tích hợp Agent Teams (Claude Code experimental).

---

## 1. Kiến trúc Agent Teams

### Agent Teams vs Subagents — Khi nào dùng cái nào?

| Tiêu chí         | **Agent Teams**                                        | **Subagents**            |
| :--------------- | :----------------------------------------------------- | :----------------------- |
| **Khi nào dùng** | Workers cần nói chuyện với nhau                        | Chỉ cần kết quả trả về   |
| **Giao tiếp**    | Teammates msg qua **Mailbox**                          | Chỉ report về Main Agent |
| **Context**      | Mỗi teammate có context window riêng + project context | Chia sẻ context main     |
| **Chi phí**      | ~5x token cho team 5                                   | Thấp hơn                 |
| **Use case**     | Multi-module, competing debug, parallel review         | Quick fix, research đơn  |

**Rule of thumb:**
- 🔵 Task đơn lẻ, kết quả rõ ràng → **Subagent**
- 🔴 Nhiều phần cần phối hợp, tranh luận, hoặc song song → **Agent Teams**

### Kiến trúc 4 thành phần (Agent Teams)

```
┌────────────────────────────────────────────────────┐
│                  AGENT TEAMS                        │
├────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐          ┌──────────────────┐    │
│  │  Team Lead   │◄────────►│  Shared Task List │    │
│  │  (Session    │          │  pending/in-prog/ │    │
│  │   chính)     │          │  completed + deps │    │
│  └──────┬───────┘          └──────────────────┘    │
│         │                                           │
│    spawn│ & manage                                  │
│         │                                           │
│  ┌──────▼───────┐     ┌─────────┐                  │
│  │  Teammates   │◄───►│ Mailbox │                  │
│  │  (Instances  │     │ (Msg    │                  │
│  │   độc lập)   │     │  P2P)   │                  │
│  └──────────────┘     └─────────┘                  │
│                                                     │
│  Data: ~/.claude/teams/ & ~/.claude/tasks/          │
└────────────────────────────────────────────────────┘
```

### 🎭 Roles & Responsibilities

| Role                  | Assignment      | Responsibility                                                            |
| :-------------------- | :-------------- | :------------------------------------------------------------------------ |
| **Team Lead**         | Session chính   | Delegate mode: spawn teammates, messaging, quản lý tasks. **KHÔNG code.** |
| **Backend Teammate**  | Claude instance | `backend_v1/src/**/*`. API, services, repositories, business logic.       |
| **Frontend Teammate** | Claude instance | `IVM26_Frontend/src/**/*`. UI, hooks, state.                              |
| **MQTT/IoT Teammate** | Claude instance | MQTT Bridge, VictoriaMetrics integration.                                 |
| **QA Teammate**       | Claude instance | Tests, verify fixes, quality gates.                                       |
| **DevOps Teammate**   | Claude instance | Docker, CI/CD, deployment configs.                                        |
| **Researcher**        | Claude instance | Codebase analysis, pattern discovery, documentation.                      |

---

## 2. Chế độ hiển thị & Setup

### Bật Agent Teams

**Cách 1 — Persistent (recommend):** Thêm vào `~/.claude/settings.json`:
```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

**Cách 2 — Session only:**
```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
claude
```

### Chế độ hiển thị

**In-process mode (mặc định — RECOMMEND cho Windows/VS Code):**
- Tất cả teammates chạy trong terminal chính
- `Shift+Up/Down` — chọn teammate
- `Enter` — xem session
- `Escape` — interrupt
- `Ctrl+T` — toggle task list

**Split-pane mode (chỉ tmux/iTerm2 — KHÔNG dùng trên Windows Terminal/VS Code):**
```bash
claude --teammate-mode tmux
```

> ⚠️ **IVM26 Project dùng Windows + VS Code → Luôn dùng In-process mode.**

### Delegate Mode

Bật bằng `Shift+Tab` sau khi tạo team. Lead chỉ được phép:
- ✅ Spawn teammates
- ✅ Messaging giữa teammates
- ✅ Shutdown teammates
- ✅ Quản lý task list
- ❌ **KHÔNG được đụng vào code**

**Khi nào bật:** Parallel implementation (>2 teammates). Tránh Lead tự ôm task.

---

## 3. 5 Use Cases chính cho IVM26

### UC1: Parallel Code Review (3 teammates)
```
Tạo team review PR:
- Teammate 1: focus security (token handling, input validation, auth)
- Teammate 2: focus performance (N+1 queries, memory leaks)  
- Teammate 3: focus test coverage (gaps, edge cases)
So sánh findings khi xong.
```

### UC2: Debug với Competing Hypotheses (2-5 teammates)
- Spawn N teammates, mỗi thằng investigate 1 hypothesis khác nhau
- Cho chúng tranh luận qua Mailbox để disprove theory của nhau
- **Killer use case**: single agent tìm 1 lời giải rồi dừng, multi-agent tìm lời giải **đúng**

### UC3: Multi-module Feature (3 teammates, Cross-layer)
```
Implement feature Geofence:
- Teammate 1: Backend API + DB schema
- Teammate 2: Frontend components + state
- Teammate 3: E2E tests + integration tests
Phối hợp qua shared task list. Không file conflict.
```

### UC4: Research & Exploration (2-3 teammates)
- Nhiều teammates investigate các khía cạnh khác nhau đồng thời
- Share và challenge findings qua Mailbox

### UC5: Cross-layer Coordination (2-3 teammates)
- Thay đổi trải dài frontend → backend → tests
- Mỗi layer 1 teammate, phối hợp qua shared task list

---

## 4. Orchestration Patterns

### 🔄 Pattern A: "Feature Factory" (Parallel)
Dùng cho independent vertical features. Lead launch Backend + Frontend teammates đồng thời.

### ⛓️ Pattern B: "Assembly Line" (Sequential)
Dùng cho strict dependencies: DB Migration → Backend Update → Test Update.

### 🧠 Pattern C: "Investigator" (Bug Fixes)
Researcher (Map) → Debugger (Reproduce) → Specialist (Fix) → QA (Verify).

### 🔍 Pattern D: "Evaluator-Optimizer" (Quality)
Generator tạo code → Critic review → Iterate cho đến khi pass quality gates.

---

## 5. Memory Frontmatter (Subagent Persistent Memory)

> Feature riêng biệt, **không phải Agent Teams** mà là **subagent memory**. Ship cùng thời điểm.

### 3 Scopes

| Scope       | Path                          | Dùng cho                                  | Commit git? |
| :---------- | :---------------------------- | :---------------------------------------- | :---------- |
| **User**    | `~/.claude/agent-memory/`     | Kiến thức across tất cả projects          | Không       |
| **Project** | `.claude/agent-memory/`       | Kiến thức project-specific, share qua git | **Có**      |
| **Local**   | `.claude/agent-memory-local/` | Project-specific, không share             | Không       |

### Ứng dụng cho IVM26
- **Code Reviewer** nhớ common mistakes qua nhiều lần review
- **Security Auditor** map attack surface theo thời gian
- **Backend Specialist** tích lũy debugging insights cho session tracking, MQTT
- **Frontend Specialist** học component patterns, FSD conventions

**Khác với CLAUDE.md:**
- `CLAUDE.md` = "đây là rules" (static, bạn viết, agent đọc)
- Agent Memory = "đây là những gì tôi đã tìm ra" (dynamic, agent tự quản lý)

---

## 6. Task Tracking System

### Native Task List (Agent Teams)
- Tự động quản lý bởi Agent Teams: `~/.claude/teams/`, `~/.claude/tasks/`
- Task có trạng thái: `pending` → `in-progress` → `completed`
- Hỗ trợ **dependency** giữa tasks

### `.tracking/` (Bổ sung — Visibility Layer)
Giữ lại vì commit được lên git, review offline, và là nguồn truth cho human:

```
.tracking/
├── PROGRESS.md              # High-level project status
├── CURRENT_TASKS.md         # Active tasks & locked files
├── COMPLETED.md             # Completed task log
├── BLOCKED.md               # Blockers & Issues
└── logs/                    # Daily execution logs
```

### Task ID Convention
Format: `[PREFIX]-[NUMBER]` (e.g., `BE-001`, `FE-102`)

| Prefix | Domain       |
| :----- | :----------- |
| `DB`   | Database     |
| `BE`   | Backend      |
| `FE`   | Frontend     |
| `MQTT` | IoT/Realtime |
| `DEV`  | DevOps       |
| `BUG`  | Bug Fixes    |

---

## 7. Tool Scoping & Permissions

Mỗi teammate chỉ được làm việc trong scope được giao:

| Teammate | ✅ Allowed                                 | ❌ Forbidden                       |
| :------- | :---------------------------------------- | :-------------------------------- |
| Backend  | `backend_v1/src/**/*`, backend tests      | `IVM26_Frontend/**/*`, DB schema  |
| Frontend | `IVM26_Frontend/src/**/*`, frontend tests | `backend_v1/**/*` (trừ API types) |
| DevOps   | Docker, CI/CD, infra configs              | Business logic                    |
| Security | Read All, Security configs                | Write application code            |

**Memory Isolation:**
- Backend KHÔNG đọc Frontend UI code
- Frontend KHÔNG đọc Backend service logic (chỉ API Types)

---

## 8. Safety & Error Protocols

### Error Classification

| Level    | Type                | Action                         |
| :------- | :------------------ | :----------------------------- |
| 🟢 **L1** | Syntax/Typos        | Self-fix silently              |
| 🟡 **L2** | Transient (Network) | Retry max 3 lần                |
| 🟠 **L3** | Logic/Test Fail     | Log error, investigate, fix    |
| 🔴 **L4** | Architectural       | **STOP**. Hỏi User/Lead        |
| ⚫ **L5** | Data Loss Risk      | **STOP IMMEDIATELY**. Rollback |

### Bài học từ Stress Test (Carlini — 16 agents, C Compiler)
- **Viết test chất lượng cao**: Nếu test verifier sai, agent sẽ giải quyết sai vấn đề
- **Context cho agent**: Mỗi agent drop vào không có context → Cần README + progress files cập nhật
- **Tránh context pollution**: Không in output dài. Log quan trọng ra file. Error dễ grep
- **Time management**: Agent có thể chạy test hàng giờ vô ích. Dùng `--fast` option hoặc random sample
- **Parallelism hiệu quả khi nhiều independent tasks**: 1 task duy nhất + 16 agents = conflict. Chia nhỏ task

### Rollback Strategy
1. **Level 1 (File):** `git checkout HEAD -- <file>`
2. **Level 2 (Commit):** `git revert <commit>`
3. **Level 3 (Phase):** Requires Human Approval

---

## 9. Git Workflow

### Branch Strategy
- `main`: Production-ready
- `feature/phase-{N}-{name}`: Active development
- `hotfix/...`: Urgent fixes

### Commit Rules
- **Format:** `[TASK_ID] type: description`
- **Example:** `[BE-003] feat: implement auth controller`
- **Checklist:**
  - [ ] `npm run typecheck` passes
  - [ ] `npm run lint` passes
  - [ ] `npm test` passes
  - [ ] No secrets committed

---

## 10. Shared Types Protocol

**Source of Truth:** Backend (`backend_v1/src/domain/*/types/`)

### Synchronization Flow
1. Backend Teammate updates types (e.g., `UserDTO`)
2. Backend Teammate logs change in `COMPLETED.md`
3. Frontend Teammate reads `COMPLETED.md` và updates local types tại `IVM26_Frontend/src/types/api/`

---

## 11. Escalation Matrix

**Escalate to Human (L3+) khi:**
- 🔴 Architecture decisions (REST vs GraphQL?)
- 🔴 Security vulnerabilities
- 🔴 Breaking API/DB changes
- 🔴 Conflict với legacy code (IVM26)

**Handle Internally (L0-L2) khi:**
- 🟢 Standard implementation
- 🟢 Small bug fixes
- 🟢 Waiting for another teammate (dùng Mailbox hoặc `BLOCKED.md`)

---

## 12. Limitations & Trade-offs (Experimental)

> ⚠️ Agent Teams vẫn là **experimental**. Cần biết trước khi dùng:

**Hạn chế kỹ thuật:**
- `/resume` và `/rewind` KHÔNG restore in-process teammates
- Task status có thể lag — teammates đôi khi quên mark completed
- Shutdown chậm — teammates cần thời gian trước khi tắt
- Một team per session — cleanup team cũ trước khi tạo mới
- Không nested teams — teammates không spawn team riêng
- Lead cố định — không promote teammate lên Lead
- Split panes chỉ tmux/iTerm2 — **KHÔNG** VS Code, Windows Terminal

**Chi phí:**
- Team 5 ≈ **5x token cost** so với single session
- Mỗi teammate có full context window riêng
- Mỗi message + task list polling đều tốn token

**Khuyến nghị cho IVM26:**
- Bắt đầu với **team 2** cho research/review tasks
- Scale lên 3-5 cho multi-module features khi đã quen
- **KHÔNG** dùng cho sequential tasks hoặc quick fixes — single agent đủ
