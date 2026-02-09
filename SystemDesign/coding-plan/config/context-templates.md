# Context Injection Templates

> Agent Leader sử dụng templates này khi spawn workers cho từng sub-phase.
> 
> ⚠️ **QUAN TRỌNG:** Teammates KHÔNG inherit conversation history của Lead. 
> Phải include đủ background trong spawn prompt.

---

## 1. Task Assignment Template (Chuẩn)

```markdown
## Task Assignment: [Sub-Phase ID]

### Objective
[1-2 câu mô tả mục tiêu]

### Background (QUAN TRỌNG - Teammates không có conversation history!)
- **Project state:** [Phase/sub-phase hiện tại, dependencies đã hoàn thành]
- **Tech stack:** [Stack liên quan cho task này]
- **Blockers/Notes:** [Nếu có issue cần lưu ý]

### Context File (BẮT BUỘC đọc trước)
Read: `phases/[phase-folder]/[sub-phase].md` (~XKB)

### File Ownership (CHỈ đụng files này)
- `[path/to/file1.ts]`
- `[path/to/file2.ts]`
- ...

### Context Rules
1. ĐỌC compact context file trước, KHÔNG đọc full spec
2. Max 6 files chính per session
3. Chỉ đọc full spec sections khi cần chi tiết (có link trong compact file)

### Checkpoint (cho risky tasks)
- [ ] **Generate plan TRƯỚC khi code** — outline approach, confirm với Lead nếu cần

### Verification
- [ ] `npx tsc --noEmit 2>&1 | head -20` — no errors
- [ ] [Specific test commands]

### On Completion
- Update `.tracking/COMPLETED.md` with task IDs done
```


---

## 2. Backend Task Example

```markdown
## Task Assignment: 2A - Auth Module

### Objective
Implement authentication: login/logout, session tokens, auth middleware.

### Background
- **Project state:** Phase 1 done (PostgreSQL, Docker). Starting Phase 2 Backend.
- **Tech stack:** Express, TypeScript, Zod, PostgreSQL, Session-based auth
- **Blockers/Notes:** Session tokens hashed with SHA-256, no JWT

### Context File (BẮT BUỘC đọc trước)
Read: `phases/phase-2-backend/2A-auth-module.md` (~4KB)

### File Ownership
- `Tracking_Backend/src/api/controllers/auth.controller.ts`
- `Tracking_Backend/src/api/routes/auth.routes.ts`
- `Tracking_Backend/src/domain/auth/services/*.service.ts`
- `Tracking_Backend/src/domain/auth/repositories/*.repository.ts`
- `Tracking_Backend/src/middleware/auth.middleware.ts`

### Context Rules
1. Compact context có DB schema, API contract — không cần đọc 20-backend-architecture.md
2. Chỉ đọc 23-backend-security.md#session-tokens nếu cần chi tiết về token hashing

### Checkpoint
- [ ] Generate approach outline trước khi implement

### Verification
- [ ] `npx tsc --noEmit 2>&1 | head -20`
- [ ] Login API: `curl -X POST http://localhost:3000/api/v1/auth/login`
- [ ] Auth middleware: protected routes return 401 without token

### On Completion
- Mark BE-001 → BE-007 as done in `.tracking/COMPLETED.md`
```

---

## 3. Frontend Task Example

```markdown
## Task Assignment: 4B - Device UI

### Objective
Implement Device management UI: list, detail modal, CRUD, real-time updates.

### Background
- **Project state:** Phase 4A done (Auth context, Layout). Backend Phase 2B done (Device API ready).
- **Tech stack:** Next.js 15, React 19, Tailwind, TanStack Query, Socket.IO client
- **Blockers/Notes:** REST polling disabled khi WebSocket connected

### Context File (BẮT BUỘC đọc trước)
Read: `phases/phase-4-frontend/4B-device-ui.md` (~4KB)

### File Ownership
- `Tracking_Frontend/app/(dashboard)/devices/page.tsx`
- `Tracking_Frontend/components/devices/*.tsx`
- `Tracking_Frontend/hooks/useDevices.ts`
- `Tracking_Frontend/hooks/useDeviceRealtime.ts`

### Context Rules
1. Compact context có API contract từ BE Phase 2B — không cần đọc 21-backend-api-endpoints.md
2. Compact context có WebSocket events — không cần đọc 24-websocket-events.md full

### Checkpoint
- [ ] Generate component structure outline trước khi implement

### Verification
- [ ] `npm run build`
- [ ] Device list loads with pagination
- [ ] Real-time status updates work

### On Completion
- Mark FE-010 → FE-017 as done in `.tracking/COMPLETED.md`
```

---

## 4. MQTT Bridge Task Example

```markdown
## Task Assignment: 3A - MQTT Bridge Service

### Objective
Implement standalone MQTT Bridge: EMQX subscriber, data processing, internal event publishing.

### Background
- **Project state:** Phase 1 done (EMQX, VictoriaMetrics running). Phase 2C IoT APIs ready to consume.
- **Tech stack:** Standalone TypeScript service, MQTT.js, PostgreSQL pool, VictoriaMetrics HTTP API
- **Blockers/Notes:** Dùng `clean: false` + stable `clientId` cho persistent sessions

### Context File (BẮT BUỘC đọc trước)
Read: `phases/phase-3-mqtt/3A-mqtt-bridge.md` (~4KB)

### File Ownership
- `Tracking_MqttBridge/src/**/*`

### Context Rules
1. Compact context có MQTT topics, payload schema, circuit breaker pattern
2. CHÚ Ý: `clean: false` + stable `clientId` cho persistent sessions

### Checkpoint
- [ ] Generate message flow outline trước khi implement

### Verification
- [ ] `npx tsc --noEmit`
- [ ] MQTT connection: Bridge connects to EMQX
- [ ] Publish test message → appears in VictoriaMetrics

### On Completion
- Mark MQTT-001 → MQTT-008 as done
```

---

## 5. Context Recovery Protocol

Khi agent báo context gần đầy (>70%):

```markdown
## Recovery Steps

1. **Log Progress**
   - Ghi task IDs đã hoàn thành vào `.tracking/COMPLETED.md`
   - Ghi task ID đang làm dở vào `.tracking/CURRENT_TASKS.md`

2. **Clear Context**
   - `/compact` hoặc `/clear`

3. **Resume**
   - Session mới prompt: "Check `.tracking/`. Continue from [task-id]."
   - Đọc compact context file tương ứng
   - Tiếp tục từ task đang dở
```

---

## 6. What NOT to Do

❌ **KHÔNG:**
```markdown
"Read 20-backend-architecture.md full"
"Read all files in SystemDesign/coding-plan/"
"Output entire file content to context"
```

✅ **CÓ:**
```markdown
"Read phases/phase-2-backend/2A-auth-module.md (4KB compact context)"
"Read 20-backend-architecture.md#section-3.1 only if need detail on auth patterns"
"Log progress to .tracking/ when context > 70%"
```
