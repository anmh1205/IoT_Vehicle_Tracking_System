# 1. Context links
- `phase-02-domain-and-api-design.md`
- `Tracking_Backend/src/api/routes/system-admin.routes.ts`
- `Tracking_Backend/src/api/controllers/system-admin.controller.ts`
- `Tracking_Backend/src/domain/system-admin/services/system-admin.service.ts`
- `Tracking_Backend/src/domain/audit/services/audit-log.service.ts`

# 2. Overview
- Priority: P1
- Status: pending
- Mục tiêu: triển khai backend CRUD và governance đầy đủ cho 3 nhóm resource.

# 3. Key Insights
- Đường đi ngắn nhất: mở rộng route/controller/service/repo hiện hữu.
- Audit phải đi cùng mọi mutation; không để “best effort logging”.
- Validation trước activate giảm rollback cost và incident rate.

# 4. Requirements
<!-- Updated: Validation Session 1 - full-tenant live validation + runtime services integration -->
- CRUD endpoints theo resource + revisioned storage model.
- Validate endpoints:
  - query template safety/cost guardrails
  - alert/recording rules syntax + datasource/tenant existence
  - full live validation all tenants cho rule activation gate.
- Activation endpoints có preflight checks và blast-radius summary.
- Runtime integration bắt buộc với `vmalert` + `vmauth` (service health + config sync paths).
- Rollback/backfill endpoints có idempotency key + stale revision protection.

# 5. Architecture
- Layering:
  - Controller: authz + request parsing + response envelope.
  - Service: business rules, revision lifecycle, orchestrate validation/activate/rollback.
  - Repository: VM/VL/vmauth integration + internal persistence.
- Idempotency:
  - lưu request hash + result snapshot cho mutation nhạy cảm.
- Rollback model:
  - immutable revisions; rollback = create revision mới từ snapshot cũ.
- Trade-offs:
  - DB-backed idempotency store (bền, chính xác) vs in-memory cache (rẻ nhưng không an toàn sau restart).

# 6. Related code files
- Modify:
  - `Tracking_Backend/src/api/routes/system-admin.routes.ts`
  - `Tracking_Backend/src/api/controllers/system-admin.controller.ts`
  - `Tracking_Backend/src/domain/system-admin/services/system-admin.service.ts`
  - `Tracking_Backend/src/domain/system-admin/repositories/victoriametrics.repository.ts`
  - `Tracking_Backend/src/domain/system-admin/repositories/victorialogs.repository.ts`
  - `Tracking_Backend/src/domain/audit/services/audit-log.service.ts`
  - `Tracking_Backend/src/middleware/auth.middleware.ts`
- Create (minimal): resource validators/types/service helpers trong module system-admin.
- Delete: none.

# 7. Implementation Steps
<!-- Updated: Validation Session 1 - add runtime integration and strict activation gate -->
1. Implement resource-specific validators + DTO mapping.
2. Add CRUD + validate + activate + rollback + backfill-preview endpoints.
3. Implement full live validation all tenants trước rule activation.
4. Enforce RBAC permission checks per action.
5. Integrate runtime adapters cho `vmalert` + `vmauth` (health, sync, error mapping).
6. Integrate audit events cho mọi mutation + activation flow.
7. Add idempotency + optimistic locking handling.
8. Add compile/type checks sau mỗi cụm thay đổi.

# 8. Todo list
- [ ] Hoàn tất datasource/template CRUD.
- [ ] Hoàn tất alert/recording lifecycle APIs.
- [ ] Hoàn tất tenant/retention/access CRUD + constraints.
- [ ] Hoàn tất audit/idempotency/rollback primitives.

# 9. Success Criteria
- Tất cả mutation endpoints có audit log + requestId trace.
- Re-submit request giống nhau không tạo side-effect kép.
- Rollback tạo revision mới và phục hồi config hiệu lực đúng.

# 10. Risk Assessment
- Risk: coupling mạnh với VM runtime endpoints gây fail dây chuyền.
- Mitigation: adapter/repository isolation + retry policy bounded + circuit fallback.

# 11. Security Considerations
- Enforce admin boundary server-side, không dựa frontend RBAC.
- Rate-limit validate/query endpoints để tránh abuse.
- Redact secrets trong logs/audit payload.

# 12. Next steps
- Bàn giao API ổn định cho phase-04 frontend.

## Unresolved questions
- Nguồn persistence revision hiện dùng bảng nào, mở rộng bảng cũ hay tạo bảng mới?