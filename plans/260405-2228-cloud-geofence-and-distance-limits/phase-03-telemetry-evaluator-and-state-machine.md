# Context links
- Ingestion hiện có: `Tracking_Backend/src/domain/iot/services/iot-ingestion.service.ts`
- Trip flow: `Tracking_Backend/src/domain/trip/services/trip-auto.service.ts`
- Geofence/Violation repos: `src/domain/geofence/repositories/*`, `src/domain/violation/repositories/*`
- Research logic: `./research/researcher-01-report.md`

# Overview
- Priority: P1
- Current status: in-progress
- Mục tiêu phase: thiết kế evaluator flow theo event telemetry, có hysteresis/dwell/grace và quota reset.

# Key Insights
- Cần quality gate trước mọi decision để giảm false positives.
- Hysteresis + dwell giải quyết rung biên; grace giải quyết mất GPS ngắn hạn.
- Evaluator phải idempotent để chịu retry/replay từ ingest path.

# Requirements
- Functional
  - Trigger evaluator khi telemetry mới có `lat/lon/timestamp`.
  - Evaluate cả 3 policy cho vehicle active.
  - Sinh/đóng violation theo transition rule, có dedupe.
- Non-functional
  - Exactly-once effect ở DB level bằng idempotency key.
  - Bounded latency, không block ingest pipeline lâu.

# Architecture
- Evaluator flow (MVP)
  1) `quality_gate`: validate timestamp monotonic, speed jump, accuracy (nếu có).
  2) `load_context`: policy active + state hiện tại + boundary cache/key.
  3) `evaluate_spatial`:
     - ADMIN_BOUNDARY: point-in-polygon (PostGIS), dùng buffer/hysteresis.
     - <!-- Updated: Validation Session 1 - strict-boundary-semantics -->
       Điểm nằm đúng trên biên polygon được xử lý là `OUTSIDE` (strict semantics).
     - RADIUS: geodesic distance from center, dùng `R_in/R_out`.
  4) `evaluate_quota`:
     - <!-- Updated: Validation Session 1 - saigon-cycle-timezone -->
       `cycle_expired` được xác định theo timezone `Asia/Saigon` cho MVP, rồi reset state trước khi cộng.
     - cộng segment distance khi prev/curr hợp lệ, gap <= max_gap.
  5) `state_transition`: UNKNOWN/GPS_SUSPECT xử lý grace, confirm bằng dwell.
  6) `persist`: update state + upsert violation/audit atomically.
- Rule defaults đề xuất
  - hysteresis: 10m (configurable)
  - dwell: 30-60s
  - grace khi mất GPS: 120s
  - quota near-limit threshold: 90%

# Related code files
- Modify
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/iot/services/iot-ingestion.service.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/services/geofence-crud.service.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/trip/services/trip-auto.service.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/violation/services/violation-crud.service.ts`
- Create
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/services/policy-evaluator.service.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/repositories/policy-state.repository.ts`
- Delete
  - None.

# Implementation Steps
1. Thiết kế interface evaluator input/output + reason codes.
2. Thêm quality-gate util và idempotency guard.
3. Implement spatial calculators (PostGIS query wrappers + radius calc).
4. Implement quota accumulator + cycle reset logic.
5. Implement transition engine (dwell/grace/hysteresis).
6. Persist state + violation + audit trong transaction.

# Todo list
- [ ] Chốt quality-gate thresholds theo telemetry thực tế.
- [ ] Chốt transaction boundary và lock strategy.
- [ ] Chốt dedupe window và reopen policy cho violation.
- [ ] Chốt retry/replay semantics khi ingest lỗi một phần.

# Success Criteria
- Evaluator deterministic với cùng input sequence.
- Không tạo duplicate violation khi retry cùng event.
- Mất GPS ngắn hạn không gây exit/quota false alarm.

# Risk Assessment
- Risk: ingest path bị nặng khi evaluate nhiều policy/xe.
- Mitigation: policy cache ngắn TTL, query tối ưu index, fallback async queue nếu vượt ngưỡng.

# Security Considerations
- Không trust telemetry field chưa validate.
- Sanitize evidence payload trước khi log/audit.
- Giới hạn quyền trigger re-evaluation hàng loạt.

# Next steps
- Sang Phase 04 để expose API/admin/reporting cho policy operations.
