# End-to-End Edge Case Audit Report

**Scope:** Firmware → MQTT/EMQX → MQTT Bridge → Backend API/Realtime/DB → Frontend → Infra/CI  
**Work context:** `E:/anmh1205/IoT_Vehicle_Tracking_System`  
**Branch:** `uat`  
**Date:** 2026-04-29  
**Mode:** Read-only audit, no code changes

## 1. Executive Summary

Đã rà soát codebase end-to-end theo hướng edge cases và clean architecture/protocol consistency. Kết quả chính:

- **Total edge cases reviewed:** 35
- **Handled:** 10
- **Unhandled:** 9
- **Partial / needs review:** 16

Nhận định tổng quan:

1. Hệ thống có cấu trúc domain tương đối rõ: firmware componentized, bridge có validator/handler/service, backend có domain/repository/controller, frontend chia hooks/components.
2. Rủi ro lớn nhất nằm ở **contract drift** giữa các tầng, không phải lỗi compile đơn lẻ.
3. Một số đường dữ liệu có guard cơ bản nhưng thiếu hardening production: retry/requeue, TTL cleanup, rate-limit theo device, reconnect rejoin, CI integration gate.
4. Có vài điểm dễ gây lỗi dữ liệu thật: batch writer mất dữ liệu khi DB fail, API ingestion tạo duplicate session, mapping telemetry không thống nhất.

## 2. Architecture Path Audited

```text
Firmware
  -> MQTT topics v1/{device_id}/rawdata|status|events|firmware
  -> EMQX
  -> Tracking_MqttBridge validators/handlers
  -> PostgreSQL + VictoriaMetrics + VictoriaLogs + internal MQTT events
  -> Tracking_Backend REST/realtime/domain services
  -> Tracking_Frontend hooks/components/dashboard
  -> Infra/CI observability/deployment
```

Primary files reviewed by agents:

- `iot-vehicle-tracking-system-firmware/components/contracts-device-cloud/src/data_formatter.c`
- `iot-vehicle-tracking-system-firmware/components/domain-connectivity/src/command_handler.c`
- `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/validators/payload.validator.ts`
- `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/handlers/rawdata.handler.ts`
- `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/services/batch-writer.service.ts`
- `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/cache/device-state.cache.ts`
- `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/publishers/internal-event.publisher.ts`
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/mqtt-event-listener.ts`
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/iot/services/iot-ingestion.service.ts`
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/middleware/rate-limit.middleware.ts`
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/components/providers/socket-provider.tsx`
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/hooks/use-realtime-subscription.ts`
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/devices/hooks/use-device-tracking-telemetry.ts`
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/lib/utils/query-invalidation.ts`
- `iot-vehicle-tracking-system-cloud/Tracking_EMQX/`
- `iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL/init/`
- `.github/workflows/*.yml`

## 3. Verification Summary

| Status | Count | Meaning |
|---|---:|---|
| Handled | 10 | Code has adequate guard/handling for audited edge case |
| Unhandled | 9 | Missing or unsafe handling likely needs fix |
| Partial | 16 | Basic handling exists, but production behavior/policy incomplete |

## 4. Unhandled Edge Cases

### 4.1 Invalid metadata silently dropped

**Status:** Unhandled  
**Severity:** Medium  
**Area:** MQTT Bridge validation  
**Files:**

- `Tracking_MqttBridge/src/validators/payload.validator.ts:173-176`

**Finding:**  
Invalid `metadata` is converted to `undefined` by `normalizeMetadata` without log, metric, reject, or quarantine path.

**Why it matters:**

- Metadata contains observability and ordering context such as schema version, message id, sequence number, boot id.
- Silent drop makes protocol defects hard to diagnose.
- Downstream may believe payload has no metadata rather than malformed metadata.

**Recommended fix:**

- Prefer: ingest payload but emit structured warning/metric for invalid metadata.
- For stricter mode: reject payload if metadata exists but invalid.
- Add tests for valid metadata, missing metadata, invalid UUID, invalid schema version, invalid `sent_at`.

### 4.2 `ruleCooldownUntil` map can grow without TTL

**Status:** Unhandled  
**Severity:** Medium  
**Area:** MQTT Bridge long-running memory  
**Files:**

- `Tracking_MqttBridge/src/handlers/rawdata.handler.ts:46`
- `Tracking_MqttBridge/src/handlers/rawdata.handler.ts:205-213`
- `Tracking_MqttBridge/src/handlers/rawdata.handler.ts:497-499`

**Finding:**  
`ruleCooldownUntil` is a global map. It is set per `deviceId:ruleId`, but only high vibration path clears its key. Other rule keys can remain forever.

**Why it matters:**

- Long-running bridge + many devices/rules can grow memory indefinitely.
- Stale cooldown state can influence future devices if identifiers are reused.

**Recommended fix:**

- Add TTL sweep based on `blockedUntil < now`.
- Run cleanup opportunistically inside `canEmitRule` or scheduled interval.
- Avoid over-engineering: a simple bounded cleanup every N calls is enough.

### 4.3 Batch writer drops data on DB failure

**Status:** Unhandled  
**Severity:** High  
**Area:** MQTT Bridge durability  
**Files:**

- `Tracking_MqttBridge/src/services/batch-writer.service.ts:47`
- `Tracking_MqttBridge/src/services/batch-writer.service.ts:138-152`

**Finding:**  
Batch writer removes items from buffer using `splice` before write. If write fails, the batch is not requeued. After repeated failures, circuit opens and new updates are dropped.

**Why it matters:**

- DB outage causes confirmed data loss.
- Current design favors memory safety but does not make loss explicit enough.
- For telemetry, loss may be acceptable, but session/status/critical event derived data may not be.

**Recommended fix:**

- Decide policy per data type:
  - Raw high-frequency telemetry: allow controlled drop with metric.
  - Session/status/critical derived data: retry/requeue or dead-letter.
- Minimal improvement: log dropped batch count + expose metric.
- Stronger improvement: requeue failed batch at front with max retry/backoff.

### 4.4 API ingestion and MQTT realtime use different telemetry mapping

**Status:** Unhandled  
**Severity:** High  
**Area:** Backend data contract / clean architecture  
**Files:**

- `Tracking_Backend/src/domain/iot/services/iot-ingestion.service.ts:57-74`
- `Tracking_Backend/src/infrastructure/realtime/mqtt-event-listener.ts:189-203`

**Finding:**  
Backend API ingestion and MQTT internal listener normalize telemetry with different assumptions and different key aliases.

**Why it matters:**

- Same device payload can produce different stored/realtime semantics depending on ingestion path.
- This violates DRY and clean architecture boundary: mapping rules are duplicated in infrastructure/application services.
- Bugs become hard to detect because tests may cover one path only.

**Recommended fix:**

- Extract a shared telemetry normalization function/module in backend domain/shared layer.
- Use it from both API ingestion and MQTT listener.
- Add contract tests for alias mapping: `lat|latitude`, `lon|longitude`, `spd|speed`, `err|error_code`, battery fields.

### 4.5 API ingestion session creation race

**Status:** Unhandled  
**Severity:** High  
**Area:** Backend DB consistency  
**Files:**

- `Tracking_Backend/src/domain/iot/services/iot-ingestion.service.ts:76-117`

**Finding:**  
API ingestion uses select-then-insert to create running sessions without transaction lock or uniqueness guard. Bridge DB helper has stronger transaction/`FOR UPDATE` behavior, but API path does not.

**Why it matters:**

- Concurrent ingest requests can create duplicate running sessions.
- Duplicate active sessions can break trip/session analytics and frontend status.

**Recommended fix:**

- Reuse the safer session creation pattern from bridge or move session handling into one repository method.
- Add DB partial unique index if schema supports it: one active/running session per device.
- Add concurrency test.

### 4.6 Rate limiter not device-aware

**Status:** Unhandled  
**Severity:** Medium  
**Area:** Backend security / abuse protection  
**Files:**

- `Tracking_Backend/src/middleware/rate-limit.middleware.ts:14-32`

**Finding:**  
Rate limiting appears to use default IP-based keying. It does not include `device_id`, auth identity, or token fingerprint for ingest/simulator-sensitive paths.

**Why it matters:**

- Many devices behind same NAT can affect each other.
- One compromised device may flood using one IP/device identity without proper per-device isolation.
- Simulator endpoints can amplify telemetry load if only admin boundary exists.

**Recommended fix:**

- Add specialized limiter for ingest/simulator endpoints.
- Key by `IP + device_id` or authenticated principal where available.
- Keep simple: do not replace global limiter; layer route-specific limiter.

### 4.7 External `tracking-network` dependency not bootstrapped

**Status:** Unhandled  
**Severity:** Medium  
**Area:** DevOps/deployment reliability  
**Files:**

- `iot-vehicle-tracking-system-cloud/**/docker-compose.yml`
- `.github/workflows/*-uat.yml`

**Finding:**  
Compose services rely on external `tracking-network`. Workflows mostly run compose up and may fail if network is missing.

**Why it matters:**

- Fresh VPS or recreated Docker environment can fail deployment.
- This is a common UAT bootstrap footgun.

**Recommended fix:**

- Add preflight command in deploy workflow/script:
  - `docker network inspect tracking-network >/dev/null 2>&1 || docker network create tracking-network`
- Keep external network if multi-compose topology requires it.

### 4.8 EMQX per-device topic ACL not proven

**Status:** Unhandled  
**Severity:** High  
**Area:** MQTT security boundary  
**Files:**

- `Tracking_EMQX/docker-compose.yml`
- `Tracking_EMQX/etc/emqx.conf`

**Finding:**  
Auth/default deny exists, but no verified ACL mapping proves a device can only publish/subscribe to its own `v1/{device_id}/...` topics.

**Why it matters:**

- A compromised device credential may publish as another device if ACL is coarse.
- Device topic isolation is fundamental for fleet telemetry integrity.

**Recommended fix:**

- Define ACL rules based on username/client id/device id.
- Explicitly allow device publish only to:
  - `v1/${device_id}/rawdata`
  - `v1/${device_id}/status`
  - `v1/${device_id}/events`
  - `v1/${device_id}/firmware`
- Allow subscribe only to its own commands topic if needed.
- Add EMQX ACL smoke test.

### 4.9 CI lacks integration/e2e gate

**Status:** Unhandled  
**Severity:** Medium  
**Area:** CI/CD confidence  
**Files:**

- `.github/workflows/*-uat.yml`

**Finding:**  
Workflows cover lint/typecheck/unit/build/deploy style checks, but no integration/e2e gate verifies broker → bridge → backend → frontend runtime path.

**Why it matters:**

- Protocol drift can pass unit/typecheck.
- Edge cases found in this report are mostly integration-contract problems.

**Recommended fix:**

- Add minimal smoke test before deploy or after deploy:
  - backend health
  - EMQX reachable
  - bridge connected
  - publish sample telemetry to test topic/device
  - verify backend realtime/API sees it
- Keep initial gate small to avoid CI complexity.

## 5. Partial Edge Cases

### 5.1 Metadata optional/missing

**Status:** Partial  
**Files:** `payload.validator.ts`, `payload.types.ts`

Missing metadata currently passes because metadata is optional. This can be valid for backward compatibility, but production observability benefits from requiring metadata once firmware protocol stabilizes.

**Recommendation:** keep optional short-term, but log/metric when missing from firmware versions expected to support metadata.

### 5.2 Timestamp future/unsynced

**Status:** Partial  
**Files:**

- `payload.validator.ts`
- `rawdata.handler.ts`
- `data_formatter.c`

There is timestamp normalization and firmware has `timestamp_trusted`/fallback behavior. However, validator only enforces positive numeric timestamp and does not enforce future skew or too-old data window.

**Recommendation:** add policy:

- Future > 5 minutes: log/reject or clamp depending on product choice.
- Older than 7 days: log/reject for realtime path.
- Always preserve original timestamp source for diagnostics.

### 5.3 cJSON allocation failure

**Status:** Partial  
**Files:** `data_formatter.c`

Firmware checks several object creation failures, but many `cJSON_Add*` calls are not checked individually.

**Recommendation:** for required fields, use small helper to add/check required JSON fields. Avoid huge abstraction; target payload root required fields first.

### 5.4 `idleAnomalyStartedAt` cleanup

**Status:** Partial  
**Files:** `rawdata.handler.ts`

Map cleanup exists when diagnostics disappear or condition resets, but no TTL when device disappears permanently.

**Recommendation:** share TTL cleanup pattern with `ruleCooldownUntil`.

### 5.5 Concurrent same-device MQTT message ordering

**Status:** Partial  
**Files:**

- `rawdata.handler.ts`
- `device-state.cache.ts`

Some stale/race guards exist, especially geofence timestamp checks. But cache/status/session side effects are not serialized per device.

**Recommendation:** add per-device processing queue only if real race observed; first add sequence/timestamp stale checks and tests. Keep YAGNI.

### 5.6 Internal MQTT schema mismatch

**Status:** Partial  
**Files:**

- `internal-event.publisher.ts`
- `mqtt-event-listener.ts`

Publisher event types and listener union are not fully aligned. Listener supports event types not clearly emitted by publisher.

**Recommendation:** centralize internal event schema/types or add runtime validation in listener.

### 5.7 Alert sync / DB contention

**Status:** Partial  
**Files:**

- `rawdata.handler.ts`
- `database.ts`
- `mqtt-event-listener.ts`

Async errors are caught, but no clear backpressure policy for alert flood/DTC burst.

**Recommendation:** cap per-device alert emission and add metric for suppressed/failed alert writes.

### 5.8 VictoriaMetrics failure/backpressure

**Status:** Partial  
**Files:** writer path needs deeper verification

Reviewer did not find sufficient evidence of retry/backpressure in scoped files.

**Recommendation:** audit `victoriametrics.ts` separately, define acceptable loss policy for metrics writes.

### 5.9 Auth secret rotation

**Status:** Partial  
**Files:** auth module outside current scoped evidence

No evidence of dual-secret/key-ring rotation strategy in scoped files.

**Recommendation:** if sessions/JWT are production-facing, support key rotation or document redeploy/logout behavior.

### 5.10 OpenAPI drift

**Status:** Partial  
**Files:** `api/openapi/spec.ts`, route/controller files

OpenAPI spec appears manually maintained. This is vulnerable to drift as controllers evolve.

**Recommendation:** add contract smoke tests for high-value routes or generate schemas from validators later.

### 5.11 Simulator boundary

**Status:** Partial  
**Files:** `simulator.controller.ts`

Controller has RBAC and validation, but no obvious telemetry volume/rate guard.

**Recommendation:** add simulator-specific rate/volume limits if simulator is enabled outside local/dev.

### 5.12 Socket reconnect stale room/data

**Status:** Partial  
**Files:** `socket-provider.tsx`

Socket reconnect exists, but joined rooms are not persisted and replayed after reconnect.

**Recommendation:** store joined rooms in a `Set`, re-emit joins on socket `connect`.

### 5.13 Telemetry chart unbounded memory

**Status:** Partial  
**Files:**

- `use-device-tracking-telemetry.ts`
- `use-device-vibration-chart.ts`

Hooks map full datasets and derived arrays. No max points/downsampling observed.

**Recommendation:** cap points per chart or downsample by period.

### 5.14 Query invalidation stale cache

**Status:** Partial  
**Files:**

- `query-invalidation.ts`
- telemetry/snapshot hooks

Invalidation keys do not fully match new hook keys such as `device-tracking-telemetry` and `device-position-snapshot`.

**Recommendation:** update invalidation helper to include real query keys or use prefix invalidation consistently.

### 5.15 Postgres init re-run safety

**Status:** Partial  
**Files:** `Tracking_PostgreSQL/init/*.sql`

Many scripts use `IF NOT EXISTS`, but trigger/constraint creation may still fail on raw re-run.

**Recommendation:** wrap trigger/constraint creation in guarded DO blocks or rely only on migration script that tracks applied files.

### 5.16 Victoria retention disk exhaustion

**Status:** Partial  
**Files:**

- `Tracking_VictoriaMetrics/docker-compose.yml`
- `Tracking_VictoriaLogs/docker-compose.yml`

Retention by time exists, but disk capacity guard/alert threshold was not verified.

**Recommendation:** add disk monitoring alert or explicit storage capacity strategy.

## 6. Handled Edge Cases

| # | Edge case | Evidence / reason |
|---|---|---|
| 1 | Topic payload device mismatch | `rawdata.handler.ts` compares topic device id with payload device id and returns on mismatch. |
| 2 | OBD `MONITOR_STATUS_UNKNOWN` | Firmware does not serialize UNKNOWN; validator accepts only known statuses. |
| 3 | Command callback blocking | Queue/lock behavior is bounded; callback path avoids long blocking. |
| 4 | Unknown diagnostics keys | Zod strips unknown keys; unexpected keys do not propagate downstream. |
| 5 | Geofence throw | Caller catches async geofence failures and prevents rawdata pipeline crash. |
| 6 | GNSS 0,0 + speed | Firmware and bridge both guard null-island coordinates and suppress speed when coordinates invalid. |
| 7 | Subscription cleanup | `use-realtime-subscription.ts` registers listener and cleans it up using same reference. |
| 8 | NaN/null lat/lng | Frontend normalizes and validates coordinates before map route generation. |
| 9 | Unhandled promise rejection in realtime side effects | Listener uses `void promise.catch(...)` pattern for fire-and-forget async effects. |
| 10 | Firmware deploy SHA256 | Upload computes hash; deploy validates format/size and sends SHA256 to OTA command. |

## 7. Clean Architecture Observations

### 7.1 Strong points

- Firmware code is componentized by concern: connectivity, cloud contract, modem adapter, telemetry, OTA, storage.
- MQTT Bridge has visible separation: validators, handlers, services, infrastructure, publishers.
- Backend uses layered folders: API controllers/routes, domain services/repositories, infrastructure, middleware.
- Frontend has feature-based folders and hooks/components split.

### 7.2 Architecture smells

1. **Contract duplication across layers**  
   Telemetry fields are mapped in multiple places with aliases. This creates drift.

2. **Infrastructure event schema not strongly owned**  
   Internal MQTT event types exist in publisher/listener but do not appear enforced by one shared runtime schema.

3. **Policy hidden in implementation**  
   Batch writer silently trades durability for memory safety. Metadata invalid silently trades correctness for tolerance. These are product/ops policies and should be explicit.

4. **Runtime state in global maps**  
   Bridge maps are simple and fast but need TTL cleanup to be safe in long-running production.

5. **Manual API documentation**  
   `spec.ts` being hand-maintained increases drift risk.

## 8. Prioritized Fix Plan

### P0 — data correctness / data loss

1. **Fix batch writer failure behavior**
   - Add dropped batch metric/log at minimum.
   - Prefer requeue with bounded retry for important data.

2. **Fix API ingestion session race**
   - Use transaction/lock or unique partial index.
   - Reuse bridge session creation behavior.

3. **Unify telemetry mapper**
   - Extract shared backend mapper.
   - Use same mapper in API ingestion and MQTT listener.

### P1 — production hardening

4. **Metadata invalid policy**
   - Log/metric invalid metadata or reject.

5. **TTL cleanup for bridge maps**
   - `ruleCooldownUntil`
   - `idleAnomalyStartedAt`

6. **Device-aware rate limiting**
   - Add route-specific limiter for ingest/simulator.

7. **Timestamp skew policy**
   - Define accepted future/past window.

### P2 — ops/frontend confidence

8. **Socket room replay on reconnect**
9. **Telemetry chart cap/downsample**
10. **Query invalidation key alignment**
11. **EMQX per-device ACL**
12. **Deploy bootstrap for `tracking-network`**
13. **Minimal integration/e2e smoke test**
14. **Postgres init idempotency cleanup**
15. **Victoria disk monitoring/alerts**

## 9. Suggested First Fix Batch

Recommended first batch is small and high-impact:

1. `batch-writer.service.ts`
   - Add explicit dropped batch metric/log.
   - Optional bounded requeue.

2. `iot-ingestion.service.ts`
   - Fix session creation race.
   - Introduce shared normalization helper if limited scope allows.

3. `payload.validator.ts`
   - Log invalid metadata instead of silent drop.

4. `rawdata.handler.ts`
   - Add TTL cleanup for rule maps.

This batch targets data correctness and production memory safety without touching frontend/infra yet.

## 10. Validation Recommendations

After fixes:

### MQTT Bridge

- `npm run typecheck`
- `npm run build`
- Unit tests for:
  - invalid metadata
  - future timestamp
  - batch writer failure/requeue/drop metric
  - cooldown TTL cleanup

### Backend

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- Concurrency test for session creation.
- Contract test for telemetry mapper aliases.

### Frontend

- `npm run typecheck`
- `npm run build`
- Manual/dev-server check for socket reconnect if room replay is changed.

### Infra

- Docker preflight on clean host:
  - network create/check
  - compose up core services
  - publish test telemetry
  - verify backend receives event

## 11. Unresolved Questions

1. Invalid metadata policy: reject payload or ingest with warning/metric?
2. Batch writer outage policy: prefer durability or memory safety?
3. Timestamp skew window: use future > 5 minutes and past > 7 days?
4. Should simulator endpoints be available in UAT/production, or admin-only local/dev?
5. Should EMQX ACL bind device identity to username, client id, or DB-backed auth?
6. Which path should be canonical for ingestion: MQTT only, or both API ingestion and MQTT bridge?
