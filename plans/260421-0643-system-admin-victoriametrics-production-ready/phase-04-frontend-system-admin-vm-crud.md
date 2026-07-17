# 1. Context links
- `phase-02-domain-and-api-design.md`
- `phase-03-backend-system-admin-vm-crud.md`
- `Tracking_Frontend/src/app/dashboard/system-admin/page.tsx`
- `Tracking_Frontend/src/features/system-admin/hooks/use-system-admin.ts`
- `Tracking_Frontend/src/lib/api/system-admin.ts`

# 2. Overview
- Priority: P1
- Status: pending
- Mục tiêu: hoàn thiện UX system-admin CRUD production-ready, rõ quyền hạn và an toàn thao tác.

# 3. Key Insights
- UI hiện có nền tab/panel và hooks; có thể mở rộng thay vì viết lại.
- Cần tách rõ trải nghiệm “edit draft” và “activate live”.
- Destructive actions phải có confirm + impact summary.

# 4. Requirements
<!-- Updated: Validation Session 1 - enforce action-level capability matrix -->
- UI cho 3 nhóm resource với bảng, form, filters, revision history.
- Validate/preview trước activate; hiển thị blast radius (tenant/rules/datasource bị ảnh hưởng).
- RBAC UI:
  - action-level capability matrix theo resource (`view/query/manage/activate/rollback/delete`).
  - hide/disable actions theo permission.
  - read-only incident mode.
- Chống submit trùng + xử lý conflict revision thân thiện người dùng.

# 5. Architecture
- Data layer: mở rộng `system-admin.ts` + React Query hooks theo resource.
- Presentation: giữ `page.tsx` làm shell, tách panel theo domain để DRY/KISS.
- State: local form state + server state tách biệt.
- Trade-offs:
  - Single-page all tabs (đồng bộ, ít chuyển ngữ cảnh) vs multi-route (deep link tốt hơn nhưng tăng complexity).

# 6. Related code files
- Modify:
  - `Tracking_Frontend/src/app/dashboard/system-admin/page.tsx`
  - `Tracking_Frontend/src/features/system-admin/hooks/use-system-admin.ts`
  - `Tracking_Frontend/src/lib/api/system-admin.ts`
  - `Tracking_Frontend/src/features/system-admin/components/*.tsx`
  - `Tracking_Frontend/src/hooks/use-role-access.ts`
  - `Tracking_Frontend/src/config/dashboard-route-registry.ts`
- Create (minimal): component files mới chỉ khi panel hiện có quá tải >200 lines.
- Delete: none.

# 7. Implementation Steps
1. Ánh xạ API mới vào typed client methods.
2. Tạo hooks CRUD/validate/activate/rollback/backfill-preview.
3. Refactor panels theo 3 nhóm resource.
4. Thêm revision diff view + confirm dialogs cho destructive ops.
5. Enforce UI permissions và read-only mode.

# 8. Todo list
- [ ] Hoàn tất datasource/template screens.
- [ ] Hoàn tất rule lifecycle screens.
- [ ] Hoàn tất tenant/retention/access screens.
- [ ] Hoàn tất error/empty/loading/a11y states.

# 9. Success Criteria
- Người có quyền thao tác end-to-end không cần rời system-admin page.
- Người không quyền không thấy hoặc không thực thi được action nhạy cảm.
- Conflict/idempotency errors hiển thị rõ và hướng dẫn recovery.

# 10. Risk Assessment
- Risk: UI quá dày gây khó dùng.
- Mitigation: progressive disclosure, mặc định hiển thị actions quan trọng nhất.

# 11. Security Considerations
- Không render secret values mặc định.
- Không tin frontend role; mọi lỗi authz phải map đúng từ backend.
- Confirm dialog bắt buộc cho retention giảm/xóa rule/xóa datasource.

# 12. Next steps
- Chuyển qua phase-05 để khóa test matrix + quality gates.

## Unresolved questions
- Có cần audit timeline view ngay trong UI phase này hay defer sang phase sau?