# Context links
- Existing tests: `Tracking_Backend/src/domain/trip/services/__tests__`, `src/domain/violation/services/__tests__`
- Repos/services cần cover: geofence/trip/violation/statistics/iot ingestion
- Docs sync targets: `../../docs/project-changelog.md`, `../../docs/system-architecture.md`, `../../docs/codebase-summary.md`

# Overview
- Priority: P1
- Current status: pending
- Mục tiêu phase: chốt test strategy, acceptance criteria, và kế hoạch release an toàn.

# Key Insights
- Phần khó nhất là edge case biên giới và GPS quality, không phải CRUD API.
- Cần test deterministic replay cho evaluator để bắt duplicate/ordering issues.

# Requirements
- Functional
  - Unit test cho calculators, hysteresis, dwell, grace, quota reset.
  - Integration test cho flow ingest -> state update -> violation creation.
  - API contract test cho policy endpoints và statistics/violations filter.
- Non-functional
  - Performance test ingest burst vừa phải.
  - Migration test forward/backward.

# Architecture
- Test matrix MVP
  - Spatial: inside/outside/on-boundary/near-boundary/hole/multipolygon.
  - <!-- Updated: Validation Session 1 - strict-boundary-test -->
    On-boundary phải assert `OUTSIDE` theo semantics đã chốt.
  - Telemetry: out-of-order timestamp, large gap, GPS missing, jump speed.
  - Quota: near-limit->exceeded, cycle rollover, replay event idempotent.
  - <!-- Updated: Validation Session 1 - saigon-timezone-cycle-test -->
    Cycle rollover test phải dùng timezone `Asia/Saigon` (bao gồm case cận nửa đêm địa phương).
- Observability validation
  - Assert metric increments đúng theo transition.
  - Assert log có reason_code/correlation_id cho mọi decision quan trọng.

# Related code files
- Modify
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/services/__tests__/*`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/violation/services/__tests__/*`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/trip/services/__tests__/*`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/__tests__/*`
- Create
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/services/__tests__/policy-evaluator.service.test.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/services/__tests__/distance-quota-cycle-reset.test.ts`
- Delete
  - None.

# Implementation Steps
1. Viết test fixtures telemetry + boundary edge cases.
2. Viết unit tests cho state transition engine.
3. Viết integration tests với DB transaction rollback per test.
4. Viết migration tests cho schema mới.
5. Chạy quality gates: lint, typecheck, test, build backend.
6. Cập nhật docs bắt buộc sau khi feature hoàn tất.

# Todo list
- [ ] Chốt acceptance checklist cho từng policy.
- [ ] Chốt test data set biên giới VN (điểm inside/outside/border).
- [ ] Chốt ngưỡng p95 latency cho evaluator.
- [ ] Chốt tiêu chí go/no-go rollout full fleet.

# Success Criteria
- Test pass đầy đủ với coverage trọng tâm ở evaluator logic.
- Không có regression với trip/violation/statistics hiện hữu.
- Tài liệu kiến trúc/changelog/codebase summary được cập nhật đồng bộ.

# Risk Assessment
- Risk: test flakiness do time-based dwell/grace.
- Mitigation: dùng fake clock/time control trong test harness.

# Security Considerations
- Test không dùng secret thật.
- Kiểm tra RBAC và audit path trong API tests.
- Verify không lộ dữ liệu nhạy cảm qua error payload.

# Next steps
- Chuyển implementer theo thứ tự phase 02 -> 03 -> 04 -> 05 -> 06, gate mỗi phase bằng test+review.
