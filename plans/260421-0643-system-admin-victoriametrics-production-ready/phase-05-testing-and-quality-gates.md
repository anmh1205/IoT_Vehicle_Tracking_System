# 1. Context links
- `phase-03-backend-system-admin-vm-crud.md`
- `phase-04-frontend-system-admin-vm-crud.md`
- `README.md` quality gate commands
- Existing backend/frontend test structure

# 2. Overview
- Priority: P1
- Status: pending
- Mục tiêu: xác nhận tính đúng đắn, an toàn, khả năng vận hành trước rollout.

# 3. Key Insights
- Không cần full e2e nặng ngay; ưu tiên risk-based tests cho mutation paths.
- Validate/activate/rollback là critical path cần coverage cao.
- Low-resource: chạy test theo tầng, tránh suite thừa.

# 4. Requirements
<!-- Updated: Validation Session 1 - strict validation and action-level auth testing -->
- Backend tests:
  - validator/service/controller tests cho CRUD + RBAC action-level + idempotency + rollback/backfill.
  - test bắt buộc cho full live validation all tenants trước activate.
  - test runtime integration paths với `vmalert` + `vmauth`.
- Frontend tests:
  - hooks/api client behavior + permission-driven UI states theo action-level matrix.
- Integration tests:
  - contract tests giữa FE client và BE envelope/problem-details.
  - activation gate tests xác nhận không bypass live validation.
- Quality gates:
  - backend lint/typecheck/test/build.
  - frontend lint/typecheck/build.

# 5. Architecture
- Test pyramid tối giản:
  - nhiều unit/service tests,
  - vừa đủ integration tests,
  - ít smoke tests cho critical flows.
- Trade-offs:
  - Nhiều e2e cho chắc hơn nhưng tốn tài nguyên và dễ flaky.

# 6. Related code files
- Modify:
  - `Tracking_Backend/src/**/__tests__/*` (system-admin domain)
  - `Tracking_Frontend/src/**/__tests__/*` hoặc test files tương ứng
  - test config nếu cần mapping endpoint mới
- Create: test files mới cho flows chưa có coverage.
- Delete: obsolete tests chỉ khi thay đổi contract làm mất hiệu lực.

# 7. Implementation Steps
1. Viết test matrix theo resource/action/risk.
2. Implement backend tests trước, sau đó frontend contract tests.
3. Chạy quality gates theo service.
4. Fix regression đến khi pass ổn định.

# 8. Todo list
- [ ] Hoàn tất backend critical-path tests.
- [ ] Hoàn tất frontend permission + error-state tests.
- [ ] Hoàn tất integration contract checks.
- [ ] Pass đầy đủ lint/typecheck/test/build.

# 9. Success Criteria
- Không còn lỗi compile/syntax.
- Critical paths pass ổn định qua nhiều lần chạy.
- Không có regression ở API envelope/error contract.

# 10. Risk Assessment
- Risk: flaky test do phụ thuộc runtime services.
- Mitigation: mock boundary hợp lý ở unit level; giữ integration tests bounded.

# 11. Security Considerations
- Test cases bắt buộc có unauthorized/forbidden/tenant-cross-access scenarios.
- Verify audit log được ghi cho mọi mutation thành công/thất bại.

# 12. Next steps
- Chuẩn bị phase-06 rollout checklist + runbook.

## Unresolved questions
- Mức coverage mục tiêu chính thức bao nhiêu cho module system-admin?