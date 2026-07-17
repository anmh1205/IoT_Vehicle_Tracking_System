# 1. Context links
- `docs/codebase-summary.md`
- `docs/code-standards.md`
- `docs/system-architecture.md`
- `docs/project-overview-pdr.md`
- `research/researcher-01-ivm26-system-admin-vm-crud.md`
- `research/researcher-02-victoriametrics-production-best-practices.md`
- `scout/scout-01-system-admin-vm-crud.md`

# 2. Overview
- Priority: P2
- Status: pending
- Mục tiêu: hợp nhất findings thành implementation baseline production-ready, tránh over-engineering.

# 3. Key Insights
- Nền hiện có đủ “khung” system-admin (route/controller/service/repo + UI tab + hooks).
- Gap lớn: thiếu domain CRUD first-class cho datasource/template/rules/tenant/retention.
- Cần chuyển từ static file ops sang revisioned lifecycle: draft → validate → activate → rollback.
- Security cần nâng từ coarse RBAC sang action-scoped permissions + audit bắt buộc.

# 4. Requirements
- Functional: CRUD cho 3 nhóm tài nguyên; validate trước activate; revision history; rollback.
- Non-functional: idempotent mutation, optimistic locking, low-cardinality metrics, bounded query cost.

# 5. Architecture
- Chọn phương án A (khuyến nghị): mở rộng `system-admin` module hiện tại, thêm resource services/repositories riêng.
- Phương án B: tạo module mới `observability-admin` (tách tốt hơn nhưng nặng scope, tăng chi phí tích hợp).
- Trade-off: A nhanh, ít rủi ro regression, phù hợp YAGNI/KISS trong phase này.

# 6. Related code files
- Modify (expected):
  - `Tracking_Backend/src/api/routes/system-admin.routes.ts`
  - `Tracking_Backend/src/api/controllers/system-admin.controller.ts`
  - `Tracking_Backend/src/domain/system-admin/services/system-admin.service.ts`
  - `Tracking_Backend/src/domain/system-admin/repositories/victoriametrics.repository.ts`
  - `Tracking_Frontend/src/app/dashboard/system-admin/page.tsx`
  - `Tracking_Frontend/src/features/system-admin/hooks/use-system-admin.ts`
  - `Tracking_Frontend/src/lib/api/system-admin.ts`
- Create (minimal, only if needed): resource-scoped validators/types/services under existing module.
- Delete: none planned.

# 7. Implementation Steps
1. Chuẩn hóa scope/resources và mapping vào module hiện có.
2. Chốt glossary + naming thống nhất giữa BE/FE/infra.
3. Khóa decision log: contract-first, revision-first, activate-gated.

# 8. Todo list
- [ ] Chốt boundary từng resource và ownership.
- [ ] Chốt mức rollout (feature-flag/canary/full).
- [ ] Chốt constraints môi trường low-resource.

# 9. Success Criteria
- Có synthesis doc rõ gap, decision, trade-offs và dependency chain.
- Không còn mơ hồ về phạm vi CRUD và guardrails production.

# 10. Risk Assessment
- Risk: scope trượt sang “infra re-platform”.
- Mitigation: giữ focus CRUD contract + governance, không tái kiến trúc stack.

# 11. Security Considerations
- Xác nhận trust boundary: browser → backend admin API → VM/VMAUTH endpoints.
- Không cho browser gọi trực tiếp VM internal endpoints.

# 12. Next steps
- Chuyển sang phase-02 để đóng domain model, API contracts, RBAC matrix.

## Unresolved questions
- Cần mức backward compatibility nào với `system_settings` key-value hiện tại?