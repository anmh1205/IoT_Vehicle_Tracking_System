# Context links
- Research: `./research/researcher-01-report.md`, `./research/researcher-02-report.md`
- DB init hiện có: `Tracking_PostgreSQL/init/07-trips-alerts.sql`, `08-geofences.sql`, `12-violations.sql`
- Repo hiện có: `Tracking_Backend/src/domain/geofence/repositories/geofence.repository.ts`

# Overview
- Priority: P1
- Current status: pending
- Mục tiêu phase: thiết kế schema tối thiểu cho policy config, runtime state, và quota cycle reset.

# Key Insights
- Bảng `geofences` hiện tại chưa đủ cho admin-boundary polygon chuẩn + policy metadata.
- Cần tách config/state để truy vết dễ và tránh lock contention khi ingest cao.
- Distance quota cần cycle window rõ (`cycle_start`, `cycle_end`) để reset deterministic.

# Requirements
- Functional
  - Lưu policy config theo vehicle.
  - Lưu boundary dataset (province polygon multipolygon, source/version/license).
  - Lưu policy runtime state per vehicle-policy.
  - Lưu violation evidence và audit trail.
- Non-functional
  - Spatial query có index.
  - Migration có rollback an toàn.

# Architecture
- Đề xuất data model MVP
  - `vehicle_policies` (id, vehicle_id, policy_type, status, params_json, effective_from/to)
  - `admin_boundaries` (id, province_code, province_name, geom_multipolygon, source, version, license)
  - `vehicle_policy_state` (vehicle_id, policy_id, spatial_state, quota_state, consumed_m, cycle_start_at, cycle_end_at, last_point, last_good_fix_at)
  - `policy_violations` (policy_id, vehicle_id, type, severity, detected_at, confirmed_at, resolved_at, evidence_json, dedupe_key)
  - `policy_audit_logs` (actor, action, before_json, after_json, correlation_id)
- Distance reset
  - Lazy reset trên ingest nếu `now > cycle_end_at`.
  - Optional cron reconciliation (safety net) ở phase sau.
- <!-- Updated: Validation Session 1 - official-vn-source-first -->
  Boundary ingest strategy: ưu tiên nguồn chính thức VN làm source of truth; fallback sang geoBoundaries chỉ khi endpoint/format từ nguồn chính thức không khả dụng tạm thời, và phải ghi audit `source/version/license`.

# Related code files
- Modify
  - `iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL/init/08-geofences.sql`
  - `iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL/init/12-violations.sql`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/repositories/geofence.repository.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/violation/repositories/violation.repository.ts`
- Create
  - `iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL/init/13-vehicle-policies.sql`
  - `iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL/init/14-admin-boundaries.sql`
- Delete
  - None.

# Implementation Steps
1. Thiết kế DDL + index (GiST cho geom, BTree cho vehicle_id/policy_id/status).
2. Thêm constraint/check cho params theo từng policy type.
3. Thiết kế dedupe key unique index cho violation event.
4. Định nghĩa strategy import boundary (raw -> normalized -> validated).
5. Viết migration order và rollback order.

# Todo list
- [ ] Chốt schema và constraints.
- [ ] Chốt source boundary + license.
- [ ] Chốt rule migration backward compatibility.
- [ ] Chốt mapping giữa bảng `violations` cũ và `policy_violations` mới.

# Success Criteria
- Schema đủ hỗ trợ 3 policy, không dư abstraction.
- Query plan dùng index cho spatial và state lookup.
- Có rollback path không mất dữ liệu lõi.

# Risk Assessment
- Risk: boundary data quality không đồng nhất gây false detection.
- Mitigation: ingest pipeline có `ST_IsValid`/`ST_MakeValid`, versioning source.

# Security Considerations
- Kiểm soát quyền import boundary dataset.
- Audit mọi mutation bảng policy và boundary.
- Tránh lộ raw telemetry/PII trong evidence_json.

# Next steps
- Sang Phase 03 để wire evaluator vào luồng telemetry ingest.
