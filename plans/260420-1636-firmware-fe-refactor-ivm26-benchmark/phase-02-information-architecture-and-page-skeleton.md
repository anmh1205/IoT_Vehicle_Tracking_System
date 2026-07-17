# 1. Context links
- Plan tổng: `./plan.md`
- Phase trước: `./phase-01-current-state-and-target-ux.md`
- Scout: `./scout/scout-01-firmware-fe-scope.md`
- Research: `./research/researcher-01-current-fe-firmware-analysis.md`, `./research/researcher-02-ivm26-firmware-patterns.md`
- Standards: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/code-standards.md`

# 2. Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-20
- Description: Thiết kế IA và skeleton page firmware theo luồng thao tác chính, học pattern IVM26 nhưng giữ contract của dự án hiện tại.
- Priority: P0
- Implementation status: pending
- Review status: pending

# 3. Key Insights
- Current page có quá nhiều panel đồng mức, user khó biết bắt đầu từ đâu.
- IVM26 cho thấy section stack tuyến tính giúp giảm cognitive load.
- Dự án hiện tại cần giữ các capability hiện có (upload, activate/deactivate, delete, deploy, history), chỉ thay layout/priority.

# 4. Requirements
- Functional:
  - Định nghĩa section order cố định: Summary+CTA -> Firmware List -> Deploy Context/History.
  - Tách “default visible” và “expanded details” cho metadata dày.
  - Đảm bảo entrypoint vẫn ở `dashboard/firmware/page.tsx`.
- Non-functional:
  - KISS: tối đa 3 vùng chính trên màn hình mặc định.
  - DRY: section dùng shared `PageContainer`, `stat-card`, `data-table` thay vì pattern riêng.
  - YAGNI: chưa thêm tab system mới nếu chưa có bằng chứng cần thiết.

# 5. Architecture
- IA mục tiêu:
  - Section A: Dual-focus summary (operational + monitoring snapshot) + primary actions (upload/deploy).
  - Section B: Firmware inventory table + row actions.
  - Section C: Deployment execution snapshot + condensed history.

<!-- Updated: Validation Session 1 - dual-focus section A -->
- Component boundaries (định hướng):
  - Page shell giữ routing/permission/wire-up.
  - Section components giữ render + local UI state nhẹ.
  - Derived selectors nằm ở utility/hook để tái dùng.
- So sánh IVM26:
  - Áp dụng: tuyến section stack + dialog-gated actions.
  - Không áp dụng: naming lifecycle `stable/fixed` và action icon-only mơ hồ.

# 6. Related code files (modify/create/delete)
- Modify:
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/page.tsx`
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/components/firmware-summary-cards.tsx`
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/components/firmware-deployment-history.tsx`
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/components/layout/PageContainer.tsx` (nếu cần tối ưu slot/layout)
- Create (chỉ khi cần và tối giản):
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/components/firmware-page-sections.tsx` (optional)
- Delete:
  - None.

# 7. Implementation Steps
1. Vẽ IA final với 3 section chính và xác định fold boundaries.
2. Thiết kế skeleton render order, khoảng cách, heading/action anchors.
3. Chốt vị trí empty/loading/error cho từng section.
4. Chốt quy tắc collapse/expand cho history chi tiết.
5. Review IA với stakeholder trước khi chuyển sang data/state refactor.

# 8. Todo list
- [ ] Chốt section order cuối cùng.
- [ ] Chốt first-fold content cap (số card, số action).
- [ ] Chốt UX rule cho deployment history (default collapsed hay condensed list).
- [ ] Chốt guideline action hierarchy (primary/secondary/destructive).

# 9. Success Criteria
- Layout mới giúp user nhận ra luồng thao tác trong 1 lần quét.
- Không mất feature cũ trong firmware page.
- Loading/empty/error states xuất hiện nhất quán giữa sections.

# 10. Risk Assessment
- Risk: IA mới làm thiếu visibility cho một số metadata hiếm dùng.
  - Mitigation: dùng expand drawer/accordion thay vì remove hẳn.
- Risk: tái cấu trúc section gây lệch responsive behavior.
  - Mitigation: define breakpoint behavior sớm và test manual trước.

# 11. Security Considerations
- Không làm lộ thông tin firmware artifact nhạy cảm ở first fold.
- Giữ guard thao tác destructive qua xác nhận rõ ràng.

# 12. Next steps
- Sang Phase 03 để tách orchestration data/state khỏi render layer.

## Backlog (P0/P1/P2)
- P0: Chốt IA 3 section + action hierarchy.
- P1: Chốt collapsible history + error/loading/empty placement.
- P2: Cân nhắc optional section wrapper component để giảm duplication.

## Unresolved questions
- History mặc định nên hiển thị bao nhiêu item để cân bằng signal/noise?
- Có cần giữ context cards riêng hay merge vào summary?