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
| **Backend Teammate**  | Claude instance | `Tracking_Backend/src/**/*`. API, services, repositories, business logic. |
| **Frontend Teammate** | Claude instance | `Tracking_Frontend/src/**/*`. UI, hooks, state.                           |
| **MQTT/IoT Teammate** | Claude instance | `Tracking_MqttBridge/src/**/*`. MQTT Bridge, VictoriaMetrics integration. |
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

| Teammate    | ✅ Allowed                                         | ❌ Forbidden                             |
| :---------- | :------------------------------------------------ | :-------------------------------------- |
| Backend     | `Tracking_Backend/src/**/*`, backend tests        | `Tracking_Frontend/**/*`, DB schema     |
| Frontend    | `Tracking_Frontend/src/**/*`, frontend tests      | `Tracking_Backend/**/*` (trừ API types) |
| MQTT Bridge | `Tracking_MqttBridge/src/**/*`, MQTT Bridge tests |                                         |
| DevOps      | Docker, CI/CD, infra configs                      | Business logic                          |
| Security    | Read All, Security configs                        | Write application code                  |

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

**Source of Truth:** Backend (`Tracking_Backend/src/domain/*/types/`)

### Synchronization Flow
1. Backend Teammate updates types (e.g., `UserDTO`)
2. Backend Teammate logs change in `COMPLETED.md`
3. Frontend Teammate reads `COMPLETED.md` và updates local types tại `Tracking_Frontend/src/types/api/`

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

---

## 13. 🧠 Context Management & Recovery (QUAN TRỌNG)

> ⚠️ **Bài học thực tế:** 3 parallel agents implement Phase 2 → tất cả đều chạm context limit và bị stop.
> Section này giải quyết vấn đề đó.

### 13.1 Tại sao Context bị đầy?

Mỗi agent/teammate có **~200k token context window**. Context bị đầy khi:

| Nguyên nhân                  | Tác động                                  | Giải pháp                         |
| :--------------------------- | :---------------------------------------- | :-------------------------------- |
| Đọc quá nhiều spec files     | Mỗi file 500-1000 lines → hết 30% context | Chỉ đọc section cần thiết         |
| Print full output (npm, tsc) | 1 lần typecheck = 200+ lines              | Dùng `--silent`, redirect to file |
| Quá nhiều file edits/session | Mỗi file read + edit = context tăng       | Max **6 files chính** per session |
| Agent Teams x3 parallel      | Mỗi teammate poll task list + mailbox     | Dùng Subagent thay vì teammate    |

### 13.2 Context Prevention Rules (BẮT BUỘC)

**Mọi agent (Lead, Teammate, Subagent) PHẢI tuân thủ:**

```markdown
## CONTEXT RULES (Inject vào mỗi agent prompt)
1. KHÔNG đọc toàn bộ file. Chỉ đọc section liên quan.
   - ✅ "Read 20-backend-architecture.md Section 3.1 (Auth Services)"
   - ❌ "Read 20-backend-architecture.md"
2. KHÔNG print output dài.
   - ✅ `npm install --silent`
   - ✅ `npx tsc --noEmit 2>&1 | head -20`
   - ❌ `npm install` (prints hundreds of lines)
3. Max 6 files chính per session. Nếu cần hơn → chia session.
4. Sau mỗi file edit, log 1 dòng summary, KHÔNG show full diff.
5. Nếu cảm thấy context nặng → /compact trước khi tiếp tục.
```

### 13.3 Recovery khi Agent bị Stop (Context Limit Reached)

```
Agent bị stop "Context limit reached"
       │
       ▼
  Option A: /compact → "Continue from where you stopped"
       │    (Nén context, giữ summary, tiếp tục)
       │
       ▼
  Option B: /clear → Session mới (KHUYÊN DÙNG)
       │    "Check .tracking/COMPLETED.md for what's done.
       │     Continue Sub-Phase 2A from task BE-003."
       │
       ▼
  Option C: Agent đã hoàn thành phần lớn
       │    → Verify manually → Mark done in .tracking/
       │    → Chuyển sub-phase tiếp theo
```

### 13.4 Khi nào dùng Agent Teams vs Subagent vs Single (Cập nhật)

> **Bài học:** Agent Teams tốt cho **review/debug**, nhưng **Subagent sequential** ổn định hơn cho **code generation**.

| Task Type                           | Chiến lược                             | Lý do                                  |
| :---------------------------------- | :------------------------------------- | :------------------------------------- |
| **Implement 1 sub-phase** (6 files) | **Single agent** hoặc **Subagent**     | Context đủ, không overhead             |
| **Implement 2 sub-phases độc lập**  | **2 Subagents** (không phải teammates) | Mỗi subagent context riêng, không poll |
| **Code review PR**                  | **Agent Teams** (2-3 teammates)        | Cần tranh luận real-time               |
| **Debug complex bug**               | **Agent Teams** (competing hypotheses) | Cần share findings P2P                 |
| **Research/explore**                | **Agent Teams** hoặc **Subagent**      | Tùy complexity                         |
| **Implement toàn bộ Phase**         | ❌ **KHÔNG BAO GIỜ 1 session**          | Context chắc chắn đầy                  |

**Rule mới:**
- 🔵 **Implement code → Subagent sequential** (1 sub-phase → /clear → next sub-phase)
- 🔴 **Review/Debug → Agent Teams** (parallel OK vì tasks nhẹ context)

### 13.5 Practical Workflow (Đã kiểm chứng)

```
# Session 1: Auth Module (Sub-Phase 2A)
"Implement Sub-Phase 2A: Auth Module.
 Read 20-backend-architecture.md Section 3.1 only.
 Max 6 files. Do NOT run full typecheck."
→ Agent xong → /clear

# Session 2: Device Module (Sub-Phase 2B)
"Check .tracking/COMPLETED.md. Auth is done.
 Implement Sub-Phase 2B: Device Module.
 Read 20-backend-architecture.md Section 3.2 only."
→ Agent xong → /clear

# Session 3: Support Modules (Sub-Phase 2C)
"Check .tracking/COMPLETED.md. Auth + Device done.
 Implement dashboard services only (BE-020)."
→ Agent xong → /clear

# Session 4: Verify toàn bộ
"Run npm run typecheck and npm run lint on backend.
 Fix any errors. Update .tracking/PROGRESS.md."
```

---

## 14. 🤖 Leader Autonomy Protocol (Tự động điều phối)

> **Mục tiêu:** Lead tự phân tích → phân công → monitor → tổng hợp mà KHÔNG cần User can thiệp.
> User chỉ cần ra lệnh 1 lần (VD: "Implement Phase 2B"), Lead tự lo phần còn lại.
>
> ⚠️ **Context-Aware:** Lead PHẢI tuân thủ Section 13 — mỗi agent chỉ xử lý 1 sub-phase per session.

### 14.1 Auto-Dispatch Loop (Lead thực hiện tự động)

```
┌──────────────────────────────────────────────────────────┐
│                LEADER AUTO-DISPATCH LOOP                  │
│                                                           │
│  1. READ   → Đọc sub-phase spec + .tracking/PROGRESS.md  │
│  2. PLAN   → Xác định sub-tasks + dependencies           │
│  3. SPAWN  → Subagent (implement) hoặc Teammate (review) │
│  4. INJECT → Context Injection + Context Rules (Sec 13)  │
│  5. MONITOR→ Poll task status mỗi cycle                   │
│  6. VERIFY → Chạy typecheck + lint sau mỗi sub-task      │
│  7. MERGE  → Tổng hợp kết quả, update .tracking/         │
│  8. NEXT   → Chuyển sang sub-phase tiếp theo              │
│                                                           │
│  Repeat 1-8 cho đến khi Phase hoàn thành                 │
│  → Báo cáo tổng hợp cho User                             │
└──────────────────────────────────────────────────────────┘
```

### 14.2 Context Injection Template (Lead gửi cho mỗi agent)

Mỗi lần spawn agent, Lead **BẮT BUỘC** gửi kèm context này:

```markdown
## Task Assignment
- **Sub-Phase:** [VD: 2A - Auth Module]
- **Task ID:** [VD: BE-001]
- **Objective:** [1-2 câu mô tả rõ ràng]

## File Ownership (CHỈ đụng các files này)
- [Danh sách files cụ thể]

## Reference Specs (ĐỌC trước khi code)
- [Link tới plan files cụ thể]

## Dependencies
- **Cần hoàn thành trước:** [VD: DB-001 đã done]
- **Teammate khác đang chờ:** [VD: FE-101 cần types từ task này]

## Context Rules (BẮT BUỘC — Section 13.2)
- Chỉ đọc spec sections liên quan, KHÔNG đọc toàn bộ file
- `npm install --silent`, `tsc --noEmit 2>&1 | head -20`
- Max 6 files chính. Nếu hơn → /compact hoặc chia session

## Verification (Chạy sau khi xong)
- [ ] `npx tsc --noEmit 2>&1 | head -20`
- [ ] `npm run lint -- --quiet`
- [ ] Test manual: [mô tả cụ thể]

## Reporting
- Update `.tracking/COMPLETED.md` khi xong
- Gửi message cho Lead qua Mailbox: "BE-001 DONE: [summary]"
```

### 14.3 Decision Tree (Lead tự quyết định)

```
User nói: "Implement Phase X"
       │
       ▼
   ┌─ Đọc spec của Phase X
   │  Đọc .tracking/PROGRESS.md
   │  Đọc .tracking/CURRENT_TASKS.md
   │
   ▼
   Phase có sub-phases không?
   ├── CÓ → Chọn sub-phase tiếp theo chưa done
   │         │
   │         ▼
   │    Sub-phase có dependencies chưa done?
   │    ├── CÓ  → Thực hiện dependency trước (Assembly Line)
   │    └── KHÔNG → Tiếp tục
   │         │
   │         ▼
   │    Sub-phase cần bao nhiêu files?
   │    ├── ≤ 3 files → Dùng Subagent (tiết kiệm token)
   │    ├── 4-8 files, cùng layer → Dùng 1 Teammate
   │    └── > 8 files hoặc cross-layer → Dùng 2-3 Teammates
   │
   └── KHÔNG → Dùng single agent, proceed bình thường
```

### 14.4 Parallel vs Sequential (Lead tự quyết — Context-Aware)

| Tình huống                         | Strategy                                     | Ví dụ                          |
| :--------------------------------- | :------------------------------------------- | :----------------------------- |
| **Implement** 2 sub-phases độc lập | **2 Subagents sequential** (KHÔNG teammates) | 2A → /clear → 2B               |
| **Implement** sub-phase phụ thuộc  | Sequential, 1 agent per session              | 2A → verify → 2B               |
| **Review** code                    | Agent Teams (2-3 teammates OK)               | Security + Performance + Tests |
| **Debug** complex                  | Agent Teams (competing hypotheses)           | 2 teammates debate             |
| Bug fix 1 file                     | Single subagent                              | BUG-001 quick fix              |

### 14.5 Auto-Verification Gate

Sau **mỗi sub-phase**, Lead tự động chạy:
1. `npx tsc --noEmit 2>&1 | head -30` (chỉ xem top errors)
2. `npm run lint -- --quiet`
3. Kiểm tra `.tracking/COMPLETED.md` đã được update
4. Nếu FAIL → rollback + retry (max 2 lần) → FAIL lần 3 → **hỏi User**

### 14.6 Khi nào Lead PHẢI hỏi User (Escalation Triggers)

- 🔴 **Architecture change**: DB schema khác spec, API contract thay đổi
- 🔴 **Verification fail 3 lần**: Không tự fix được
- 🔴 **Scope creep**: Task cần thêm files ngoài ownership
- 🔴 **Conflict**: 2 teammates sửa cùng file
- 🟡 **Ambiguous spec**: Plan file không rõ ràng, nhiều cách hiểu

### 14.7 Sustained Loop (Tự động chuyển task — Context-Aware)

```
Lead hoàn thành Sub-Phase 2A
       │
       ▼
Update .tracking/PROGRESS.md
Update .tracking/COMPLETED.md
       │
       ▼
Context còn đủ? (< 70% used)
├── CÓ  → Tiếp sub-phase tiếp theo (quay lại 14.1)
└── KHÔNG → /compact hoặc /clear → Session mới → Tiếp tục
       │
       ▼
Còn sub-phase chưa done?
├── CÓ  → Tự động bắt đầu sub-phase tiếp theo
└── KHÔNG → Phase hoàn thành → Báo cáo cho User
```

---

## 15. 📋 Sub-Phase Breakdown (Task chia nhỏ)

> **Nguyên tắc:** Mỗi sub-phase ≤ 8 files chính, có verification point rõ ràng.
> Thời gian mỗi sub-phase ≈ 1 agent session (tránh mất context).

### Phase 1: Foundation (giữ nguyên — đã đủ nhỏ)

| Sub  | Focus              | Files chính          | Agent                           |
| :--- | :----------------- | :------------------- | :------------------------------ |
| 1    | DB Schema + Docker | `10-*.md`, `12-*.md` | `database-architect` + `devops` |

### Phase 2: Backend Core → 4 Sub-Phases

#### Sub-Phase 2A: Auth Module
| Task ID | Mô tả                                     | Files                                                             |
| :------ | :---------------------------------------- | :---------------------------------------------------------------- |
| BE-001  | Auth controller + routes                  | `api/controllers/auth.controller.ts`, `api/routes/auth.routes.ts` |
| BE-002  | Auth service (login, logout, session)     | `domain/auth/services/auth.service.ts`                            |
| BE-003  | User management service                   | `domain/auth/services/user-management.service.ts`                 |
| BE-004  | User session repository                   | `domain/auth/repositories/user-session.repository.ts`             |
| BE-005  | Auth middleware (requireAuth, attachUser) | `middleware/auth.middleware.ts`                                   |
| BE-006  | Auth types + helpers                      | `domain/auth/types/`, `domain/auth/helpers/`                      |

**Deps:** Phase 1 done (DB exists)
**Verify:** Login/logout API works, session token validation passes

#### Sub-Phase 2B: Device Module
| Task ID | Mô tả                         | Files                                                                            |
| :------ | :---------------------------- | :------------------------------------------------------------------------------- |
| BE-010  | Device controller + routes    | `api/controllers/device.controller.ts`                                           |
| BE-011  | Device CRUD service           | `domain/device/services/device-crud.service.ts`                                  |
| BE-012  | Device list + details service | `domain/device/services/device-list.service.ts`, `device-details.service.ts`     |
| BE-013  | Device sessions + runtime     | `domain/device/services/device-sessions.service.ts`, `device-runtime.service.ts` |
| BE-014  | Device repositories           | `domain/device/repositories/`                                                    |
| BE-015  | Device types                  | `domain/device/types/`                                                           |

**Deps:** 2A done (auth middleware needed)
**Verify:** Device CRUD APIs work with auth

#### Sub-Phase 2C: Support Modules (Dashboard, Firmware, Export, Admin)
| Task ID | Mô tả                           | Files                |
| :------ | :------------------------------ | :------------------- |
| BE-020  | Dashboard controller + services | `domain/dashboard/`  |
| BE-021  | Firmware controller + services  | `domain/firmware/`   |
| BE-022  | Export controller + services    | `domain/export/`     |
| BE-023  | Admin system settings           | `domain/admin/`      |
| BE-024  | Error code management           | `domain/error-code/` |

**Deps:** 2A done (auth), 2B done (device types)
**Parallel:** CÓ THỂ chạy song song 2-3 teammates (dashboard + firmware + export)

#### Sub-Phase 2D: Backend Integration Verification
| Task ID | Mô tả                          | Files                    |
| :------ | :----------------------------- | :----------------------- |
| BE-030  | Typecheck toàn bộ backend      | —                        |
| BE-031  | Lint + fix                     | —                        |
| BE-032  | API smoke test (all endpoints) | Manual/Postman           |
| BE-033  | Update .tracking/              | `.tracking/COMPLETED.md` |

**Deps:** 2A + 2B + 2C done
**Agent:** QA Teammate hoặc Lead tự chạy

#### Sub-Phase 2E: Vehicle Tracking Core Domains
| Task ID | Description                       | Files                      |
| :------ | :-------------------------------- | :------------------------- |
| BE-040  | Vehicle controller + routes       | `domain/vehicle/`          |
| BE-041  | Vehicle CRUD service              | `domain/vehicle/services/` |
| BE-042  | Customer controller + services    | `domain/customer/`         |
| BE-043  | Trip controller + services        | `domain/trip/`             |
| BE-044  | Alert controller + services       | `domain/alert/`            |
| BE-045  | Geofence controller + services    | `domain/geofence/`         |
| BE-046  | Maintenance controller + services | `domain/maintenance/`      |
| BE-047  | Notification service              | `domain/notification/`     |

**Deps:** Phase 2A + 2B done
**Parallel:** 2-3 teammates (vehicle+customer || trip+alert || geofence+maintenance)

---

### Phase 3: Realtime/MQTT (giữ nguyên — domain riêng biệt)

| Sub  | Focus                         | Files chính                       | Agent                |
| :--- | :---------------------------- | :-------------------------------- | :------------------- |
| 3    | MQTT Bridge + VictoriaMetrics | `22-*.md`, `Tracking_MqttBridge/` | `backend-specialist` |

**Deps:** Phase 1 done + Phase 2A done (auth infrastructure for device token validation)
**Note:** Phase 3 does NOT need Phase 2B-2E. Can run parallel with Phase 4A.
**Parallel với Phase 4:** ✅ CÓ THỂ (độc lập)

---

### Phase 4: Frontend Core → 3 Sub-Phases

#### Sub-Phase 4A: Foundation + Auth UI
| Task ID | Mô tả                           | Files                          |
| :------ | :------------------------------ | :----------------------------- |
| FE-001  | Layout shell (sidebar, header)  | `shared/layout/`               |
| FE-002  | Login page + auth flow          | `app/login/`, `features/auth/` |
| FE-003  | API client + HTTP lib           | `lib/api/`                     |
| FE-004  | Theme + design tokens           | `app/globals.css`, `config/`   |
| FE-005  | Route guards + protected routes | `middleware.ts`                |

**Deps:** Phase 2A done (Auth API exists)
**Verify:** Login works, layout renders, route protection works

#### Sub-Phase 4B: Device Management UI
| Task ID | Mô tả                                | Files                                         |
| :------ | :----------------------------------- | :-------------------------------------------- |
| FE-010  | Device list page                     | `features/devices/components/device-list.tsx` |
| FE-011  | Device detail modal (tabs)           | `features/devices/components/device-detail/`  |
| FE-012  | Device hooks (useDevices, useDevice) | `features/devices/hooks/`                     |
| FE-013  | Dashboard overview page              | `features/dashboard/`                         |
| FE-014  | Real-time connection (Socket.IO)     | `hooks/realtime/`                             |

**Deps:** 4A done + Phase 2B done (Device API exists)
**Verify:** Device list loads, detail modal opens, realtime updates work

#### Sub-Phase 4C: Support Pages
| Task ID | Mô tả                      | Files                     |
| :------ | :------------------------- | :------------------------ |
| FE-020  | Settings page (functional) | `app/dashboard/settings/` |
| FE-021  | User management page       | `features/users/`         |
| FE-022  | Notifications page         | `features/notifications/` |
| FE-023  | System admin pages         | `features/admin/`         |

**Deps:** 4A + 4B done
**Parallel:** CÓ THỂ chạy 2-3 teammates (settings + users + notifications)

---

### Phase 5: Advanced Features → 2 Sub-Phases

#### Sub-Phase 5A: Map + Geofence
| Task ID | Mô tả                        | Files                 |
| :------ | :--------------------------- | :-------------------- |
| FE-030  | Map view (Leaflet, real GPS) | `features/map/`       |
| FE-031  | Geofence CRUD + map editor   | `features/geofences/` |
| FE-032  | Trip replay on map           | `features/trips/`     |

**Deps:** Phase 4B done
**Agent:** `frontend-specialist` (1 focused teammate)

#### Sub-Phase 5B: Alerts + Maintenance + Firmware
| Task ID | Mô tả                  | Files                   |
| :------ | :--------------------- | :---------------------- |
| FE-040  | Alert rules engine UI  | `features/alerts/`      |
| FE-041  | Maintenance calendar   | `features/maintenance/` |
| FE-042  | Firmware management UI | `features/firmware/`    |

**Deps:** Phase 4A done + Phase 2C done (APIs exist)
**Parallel với 5A:** ✅ CÓ THỂ (độc lập)

---

### Dependency Graph (Tổng quan)

```
Phase 1 (DB + Docker)
    │
    ▼
Phase 2A (Auth) ──────────────────────┐
    │                                  │
    ▼                                  ▼
Phase 2B (Device) ──┐            Phase 4A (Auth UI + Layout)
    │                │                 │
    ▼                ▼                 ▼
Phase 2C (Support)  Phase 3 ║    Phase 4B (Device UI)
    │               (MQTT)  ║         │
    ▼                  ║    ║         ▼
Phase 2D (BE verify)  ║    ║    Phase 4C (Support UI)
                       ║    ║         │
          ═════════════╝    ║         ▼
          (Parallel OK)     ║    Phase 5A ║ Phase 5B
                            ║    (Map)    ║ (Alerts)
                            ║         ════╝ (Parallel OK)
                            ▼
                       Phase 6 (Mobile)
                            │
                            ▼
                       Phase 7 (Deploy)
```

**Parallel opportunities chính:**
- Phase 3 (MQTT) ∥ Phase 4A-4C (Frontend) — **tiết kiệm nhiều thời gian nhất**
- Phase 2C: dashboard ∥ firmware ∥ export — **3 teammates song song**
- Phase 5A (Map) ∥ Phase 5B (Alerts) — **2 teammates song song**

---

## 16. Context Management Protocol (BẮT BUỘC)

> ⚠️ **CRITICAL:** Section này định nghĩa cách agents đọc và sử dụng context để tránh bị đầy giữa chừng.

### 16.1 Compact Context Files

Thay vì đọc full spec files (20-40KB mỗi file), agents **PHẢI** sử dụng compact context files (~3-5KB):

```
coding-plan/phases/
├── phase-1-foundation/
│   ├── 1A-db-schema.md        # DB setup tasks
│   └── 1B-docker-infra.md     # Docker setup tasks
├── phase-2-backend/
│   ├── 2A-auth-module.md      # Auth tasks with API contract
│   ├── 2B-device-module.md    # Device tasks with WS events
│   ├── 2C-iot-processing.md   # IoT data processing
│   ├── 2D-support-modules.md  # Dashboard, Firmware, Export
│   └── 2E-vehicle-tracking.md # Vehicle, Trip, Alert domains
├── phase-3-mqtt/
│   └── 3A-mqtt-bridge.md      # MQTT Bridge service
├── phase-4-frontend/
│   ├── 4A-foundation-auth.md  # FE setup + auth
│   ├── 4B-device-ui.md        # Device UI with API contract
│   └── 4C-support-pages.md    # Dashboard, Firmware UI
└── phase-5-advanced/
    ├── 5A-map-geofence.md     # Map + Geofence
    └── 5B-alerts-trips-maintenance.md
```

### 16.2 Khi nào đọc file nào?

| Tình huống            | Đọc                             | KHÔNG đọc                            |
| --------------------- | ------------------------------- | ------------------------------------ |
| Implement sub-phase X | `phases/phase-X/*.md`           | Full spec files                      |
| Cần chi tiết API      | Link trong compact file         | Toàn bộ `20-backend-architecture.md` |
| Debug issue           | Chỉ file liên quan              | Tất cả plan files                    |
| FE cần BE contract    | Compact file đã có API contract | `21-backend-api-endpoints.md` full   |

### 16.3 Context Injection cho Workers

Leader spawn worker với prompt pattern:

```markdown
## Task Assignment: [Sub-Phase ID]

### Context File (BẮT BUỘC đọc trước)
Read: `phases/[phase-folder]/[sub-phase].md` (~XKB)

### File Ownership (CHỈ đụng files này)
- [list of files]

### Context Rules
1. ĐỌC compact context file trước, KHÔNG đọc full spec
2. Max 6 files chính per session
3. Chỉ đọc full spec sections khi cần chi tiết (có link trong compact file)
```

Chi tiết templates: `config/context-templates.md`

### 16.4 Clear Conversion Protocol

Khi context đầy (>70%), agent **PHẢI**:

1. **Log progress:**
   ```bash
   # .tracking/COMPLETED.md
   - [x] BE-001: Auth controller + routes
   - [x] BE-002: Auth session service
   - [/] BE-003: User management service (in progress)
   ```

2. **Ghi summary:**
   ```bash
   # .tracking/CURRENT_TASKS.md
   Current: BE-003 (user-management.service.ts line 45)
   Next: BE-004, BE-005
   Blockers: None
   ```

3. **Clear và resume:**
   - `/compact` hoặc `/clear`
   - Session mới prompt: "Check `.tracking/`. Continue from BE-003."
   - Đọc compact context file tương ứng

### 16.5 Rules Tóm Tắt

| DO ✅                             | DON'T ❌                   |
| -------------------------------- | ------------------------- |
| Read compact file (~3-5KB)       | Read full spec (20-40KB)  |
| Follow links khi cần detail      | Read entire document      |
| Log to `.tracking/` before clear | Lose progress on clear    |
| Max 6 files per session          | Open 20+ files            |
| Output `head -20` khi test       | Output entire test result |


