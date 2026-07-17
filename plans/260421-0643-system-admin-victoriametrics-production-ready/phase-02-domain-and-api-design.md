# 1. Context links
- `phase-01-research-synthesis.md`
- `Tracking_Backend/src/api/routes/system-admin.routes.ts`
- `Tracking_Backend/src/api/controllers/system-admin.controller.ts`
- `Tracking_Backend/src/middleware/auth.middleware.ts`
- `Tracking_Frontend/src/lib/api/system-admin.ts`

# 2. Overview
- Priority: P2
- Status: pending
- Mục tiêu: thiết kế domain + contract production-ready, ổn định cho triển khai BE/FE.

# 3. Key Insights
- API envelope đã chuẩn `{ data, requestId, meta? }` + RFC7807 lỗi, cần giữ nguyên.
- CRUD admin cần revision + idempotency ngay từ thiết kế, không retrofit muộn.
- Permission phải action-scoped để phục vụ audit/compliance.

# 4. Requirements
<!-- Updated: Validation Session 1 - enforce runtime vmalert/vmauth + action-level RBAC + deploy-window retention + full-tenant live validation -->
- Resource groups:
  1) datasource + query templates
  2) alert rules + recording rules
  3) tenant + retention + access control
- Runtime scope bắt buộc phase này:
  - đưa `vmalert` và `vmauth` vào runtime chính thức (không defer).
- Contracts:
  - `POST/PUT/PATCH/DELETE` idempotent qua idempotency key + revision checks (If-Match/etag-style).
  - `validate`, `activate`, `rollback`, `backfill-preview` endpoints tách riêng mutation cơ bản.
  - Rule activation bắt buộc `full live check all tenants` trước khi cho phép activate.
- RBAC:
  - roles: viewer, operator, admin, superadmin.
  - action-level theo resource, tối thiểu gồm `view/query/manage/activate/rollback/delete`.
  - permissions ví dụ: `vm.datasource.manage`, `vm.rule.activate`, `vm.retention.change`, `vm.access.manage`.
- Retention policy:
  - chỉ apply qua deploy/restart window; không hot-apply runtime.

# 5. Architecture
<!-- Updated: Validation Session 1 - runtime integration + strict validation gate -->
- Entities: `DatasourceConfig`, `QueryTemplate`, `RulePack`, `TenantPolicy`, `RetentionPolicy`, `AccessPolicy`, `ConfigRevision`.
- Runtime integration:
  - `vmalert` và `vmauth` là thành phần chính thức trong kiến trúc phase này.
- Workflows:
  - Draft CRUD → Validate → Approve (optional lightweight) → Activate.
  - Validate gate cho rules bắt buộc full live check all tenants trước activate.
  - Rollback: promote revision cũ thành current revision mới (không sửa lịch sử).
  - Backfill recording rule: preview historical window, tạo output mới, switch có kiểm soát.
- Trade-offs:
  - Option A: approval optional (nhanh, phù hợp low-resource).
  - Option B: bắt buộc dual-control (an toàn hơn, chậm hơn).

# 6. Related code files
- Modify:
  - `Tracking_Backend/src/api/controllers/system-admin.controller.ts`
  - `Tracking_Backend/src/api/routes/system-admin.routes.ts`
  - `Tracking_Backend/src/domain/system-admin/services/system-admin.service.ts`
  - `Tracking_Backend/src/api/validators/*.ts` (mở rộng validator hiện có)
  - `Tracking_Frontend/src/lib/api/system-admin.ts`
- Create (likely):
  - backend: resource-specific DTO/validator/type files trong module system-admin.
  - frontend: typed request/response models cho từng resource.
- Delete: none.

# 7. Implementation Steps
1. Định nghĩa schema + invariants cho từng entity.
2. Thiết kế endpoint matrix + error taxonomy + idempotency behavior.
3. Chốt RBAC matrix và mapping role→permission.
4. Thiết kế audit event schema (actor, tenant, resource, action, diff, requestId, outcome).

# 8. Todo list
- [ ] Chốt endpoint list và HTTP semantics.
- [ ] Chốt optimistic locking strategy.
- [ ] Chốt retention safety policy (min/max + irreversible warning).

# 9. Success Criteria
- API spec đủ chi tiết để coder implement không cần đoán.
- RBAC + audit + idempotency có acceptance criteria rõ ràng.

# 10. Risk Assessment
- Risk: contract quá rộng gây chậm delivery.
- Mitigation: MVP production-ready theo 3 nhóm bắt buộc, defer tính năng phụ.

# 11. Security Considerations
- Input validation strict bằng schema; reject unknown fields.
- Secret/token không trả ra UI trừ khi có permission explicit.
- Destructive actions bắt buộc confirm token + audit trace.

# 12. Next steps
- Handover spec sang phase-03 backend implementation.

## Unresolved questions
- Có cần dual-approval cho retention giảm mạnh hoặc xóa rule pack không?