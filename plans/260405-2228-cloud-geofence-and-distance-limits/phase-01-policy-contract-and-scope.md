# Context links
- Research: `./research/researcher-01-report.md`, `./research/researcher-02-report.md`
- Docs: `../../docs/codebase-summary.md`, `../../docs/system-architecture.md`, `../../docs/project-overview-pdr.md`
- Existing backend modules: `Tracking_Backend/src/domain/geofence`, `trip`, `violation`, `statistics`, `iot`

# Overview
- Priority: P1
- Current status: complete
- Mục tiêu phase: chốt contract nghiệp vụ tối giản cho 3 policy để tránh scope creep.

# Key Insights
- Dữ liệu GPS nhiễu ở biên; thiếu hysteresis/dwell sẽ spam violation.
- Quota distance phải tính theo segment telemetry hợp lệ, không dùng “distance-from-center”.
- Boundary source phải tách khỏi runtime logic để thay dataset không đổi code core.

# Requirements
- Functional
  - Định nghĩa 3 policy type: `ADMIN_BOUNDARY`, `RADIUS`, `DISTANCE_QUOTA`.
  - Cho phép gán policy theo vehicle và trạng thái hiệu lực `effective_from/to`.
  - Định nghĩa lifecycle vi phạm: detect -> confirm -> resolve/auto-resolve.
- Non-functional
  - Idempotent theo telemetry event.
  - Độ trễ đánh giá near-realtime (mục tiêu p95 < 5s trong nội bộ backend path).

# Architecture
- Policy contract gồm: scope, threshold, hysteresis, dwell, grace, notification mode.
- Chuẩn state machine dùng chung:
  - Spatial: `INSIDE | OUTSIDE | UNKNOWN | GPS_SUSPECT`
  - Quota: `UNDER_LIMIT | NEAR_LIMIT | EXCEEDED`
- Semantics mặc định
  - Boundary inclusive (điểm nằm trên biên coi là inside).
  - `enter`/`exit` cần dwell để confirm.
  - mất GPS -> `GPS_SUSPECT`, áp dụng grace trước khi đổi state cứng.

# Related code files
- Modify
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/types/geofence.types.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/violation/types/violation.types.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/statistics/types/statistics.types.ts`
- Create
  - Không tạo file mới ở phase này (chỉ chốt design contract trong plan).
- Delete
  - None.

# Implementation Steps
1. Chốt enum policy/state/violation reason code và naming thống nhất.
2. Chốt rule hysteresis/dwell/grace mặc định và range cấu hình.
3. Chốt cycle reset cho quota: `daily|weekly|monthly|lifetime` + timezone handling.
4. Chốt event idempotency key cho evaluator (device_id + timestamp + sequence nếu có).
5. Chốt API-level DTO shape tương thích envelope hiện có.

# Todo list
- [ ] Viết policy matrix (type x trigger x state transition).
- [ ] Chốt threshold defaults cho MVP.
- [ ] Chốt semantics boundary-inclusive vs strict-contains.
- [ ] Chốt SLA cảnh báo và quy tắc dedupe.

# Success Criteria
- Có policy contract ngắn gọn, không mâu thuẫn, đủ cho dev implement.
- Có state diagram text rõ cho spatial và quota policies.
- Không phát sinh requirement ngoài 3 policy mục tiêu.

# Risk Assessment
- Risk: policy mơ hồ gây logic rẽ nhánh phức tạp.
- Mitigation: giữ hợp đồng config tối giản + defaults chặt + reject config invalid.

# Security Considerations
- RBAC: chỉ admin/operator được CRUD policy.
- Audit bắt buộc cho mọi thay đổi policy (before/after).
- Validate input chặt để tránh config injection qua JSON fields.

# Next steps
- Sang Phase 02 để map contract vào schema/migration cụ thể.
