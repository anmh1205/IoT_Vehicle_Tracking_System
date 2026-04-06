# Context links
- API layer: `Tracking_Backend/src/api/controllers`, `src/api/routes`, `src/api/validators`
- Existing modules: `geofence.routes.ts`, `violation.routes.ts`, `statistics.routes.ts`
- API contract rule: `{ data, requestId, meta? }` + RFC7807 errors

# Overview
- Priority: P2
- Current status: in-progress
- Mục tiêu phase: thiết kế bề mặt API/admin tối giản để cấu hình policy và xem vi phạm.

# Key Insights
- Reuse route/module hiện có để DRY, không mở service mới nếu không cần.
- Cần tách “config APIs” và “runtime evidence APIs” để UX rõ.

# Requirements
- Functional
  - CRUD policy + assign/unassign vehicle.
  - API tra cứu state hiện tại per vehicle/policy.
  - API list violations có filter theo policy type/state/time.
  - API thống kê quota consumption theo cycle.
- Non-functional
  - Backward compatible với route hiện có.
  - Validation chặt bằng schema hiện hành.

# Architecture
- Đề xuất endpoint nhóm
  - `/api/v1/geofences/policies/*` cho config.
  - `/api/v1/violations?policyType=...` cho monitoring.
  - `/api/v1/statistics/policy-limits` cho aggregated views.
- Quyết định trade-off
  - Không tách microservice policy engine ở MVP; giữ trong backend monolith.
  - Không push realtime command enforcement ở phase này; chỉ alert/violation.

# Related code files
- Modify
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/geofence.routes.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/geofence.controller.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/violation.routes.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/violation.controller.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/statistics.routes.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/statistics/services/statistics.service.ts`
- Create
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/validators/policy.validator.ts`
- Delete
  - None.

# Implementation Steps
1. Định nghĩa DTO request/response cho policy CRUD và state query.
2. Thêm validator cho từng policy type (admin/radius/quota).
3. Map controller -> service/repository theo domain boundaries hiện tại.
4. Bổ sung pagination/filter cho violation/policy state.
5. Bổ sung OpenAPI spec cho endpoint mới/chỉnh sửa.

# Todo list
- [ ] Chốt endpoint naming và versioning.
- [ ] Chốt pagination/filter contract.
- [ ] Chốt OpenAPI examples cho 3 policy.
- [ ] Chốt error code map cho config invalid/state conflict.

# Success Criteria
- API rõ, nhất quán contract hiện có, không duplicate surface.
- Admin thao tác full lifecycle policy mà không cần DB manual edits.
- Violation/state query đủ cho dashboard triển khai.

# Risk Assessment
- Risk: mở quá nhiều endpoint gây phình API.
- Mitigation: ưu tiên reuse geofence/violation/statistics routes hiện có.

# Security Considerations
- RBAC theo role admin/operator/viewer.
- Rate-limit cho endpoint mutation.
- Audit + requestId trace cho mọi mutation.

# Next steps
- Sang Phase 05 để hoàn thiện metrics, logs, alerting và rollout controls.
