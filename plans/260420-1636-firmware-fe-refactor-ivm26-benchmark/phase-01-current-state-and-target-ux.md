# 1. Context links
- Plan tổng: `./plan.md`
- Docs: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/codebase-summary.md`, `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/code-standards.md`, `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md`, `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/project-overview-pdr.md`
- Scout: `./scout/scout-01-firmware-fe-scope.md`
- Research: `./research/researcher-01-current-fe-firmware-analysis.md`, `./research/researcher-02-ivm26-firmware-patterns.md`

# 2. Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-20
- Description: Chốt baseline hiện trạng firmware FE, persona chính, và target UX cho first fold.
- Priority: P0
- Implementation status: pending
- Review status: pending

# 3. Key Insights
- Current page đang ôm quá nhiều concern: fetch + realtime + KPI + table actions + dialog state.
- IVM26 mạnh ở IA tuyến tính (stats -> list -> assignment/log), giúp scan nhanh.
- IVM26 có điểm không phù hợp: lifecycle naming mơ hồ (`stable/fixed`), không nên copy.
- Với code standards hiện tại, cần giữ accessibility/keyboard/touch-target và feedback state tường minh.
- Persona đã chốt: cân bằng vận hành + giám sát, không nghiêng hẳn một phía.

<!-- Updated: Validation Session 1 - persona dual-focus -->
# 4. Requirements
- Functional:
  - Định nghĩa target UX flow: First fold, primary actions, secondary actions.
  - Chốt thông tin phải hiển thị mặc định vs đưa vào progressive disclosure.
  - Chốt trạng thái lifecycle hiển thị ở UI, map đúng contract backend hiện tại.
- Non-functional:
  - KISS: giảm mật độ thông tin mặc định.
  - DRY: không tính KPI/derived state trùng ở nhiều component.
  - YAGNI: không thêm panel mới nếu chưa có nhu cầu vận hành rõ.

# 5. Architecture
- Thiết kế mục tiêu cho page-level:
  - Layer 1 (Dual-focus): Summary có cả CTA upload/deploy và monitoring signal cốt lõi.
  - Layer 2 (Inventory focus): Firmware list + row actions.
  - Layer 3 (Execution focus): Deployment status/history (rút gọn mặc định).

<!-- Updated: Validation Session 1 - dual-focus first fold architecture -->
- Event flow:
  - Realtime ưu tiên milestone + error, giảm spam progress toast liên tục.
- Contract boundary:
  - Giữ API envelope/realtime event naming hiện có, chỉ đổi cách trình bày và tổ chức state FE.

# 6. Related code files (modify/create/delete)
- Modify (ưu tiên):
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/page.tsx`
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/components/firmware-summary-cards.tsx`
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/components/firmware-deployment-history.tsx`
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/components/firmware-deploy-dialog.tsx`
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/components/firmware-utils.ts`
- Create:
  - None by default (chỉ tạo nếu tách nhỏ cần thiết để giảm page complexity).
- Delete:
  - None.

# 7. Implementation Steps
1. Audit UI blocks theo mục tiêu operator workflow, xác định khối “always visible”.
2. Gắn nhãn rõ primary vs secondary action cho first fold.
3. Chốt matrix trạng thái firmware/deployment hiển thị ở UI (không đổi backend contract).
4. Chốt tiêu chuẩn giảm nhiễu realtime (milestone/error ưu tiên).
5. Review với stakeholder để đóng băng scope UX trước khi vào refactor kỹ thuật.

# 8. Todo list
- [ ] Chốt persona chính: release operator hay support.
- [ ] Chốt first-fold content bắt buộc.
- [ ] Chốt action priority (upload/deploy/activate/deactivate/delete).
- [ ] Chốt rules progressive disclosure cho history/deploy metadata.
- [ ] Chốt status vocabulary thống nhất cho UI labels.

# 9. Success Criteria
- Team thống nhất 1 UX flow đơn giản, không mâu thuẫn giữa section.
- First fold trả lời được: “cần làm gì tiếp theo” trong <10 giây.
- Không có metadata dư trong màn hình mặc định gây nhiễu quyết định.

# 10. Risk Assessment
- Risk: Scope UX trượt do muốn hiển thị quá nhiều context.
  - Mitigation: freeze first-fold scope và dùng “expand for details”.
- Risk: Tranh cãi naming trạng thái với backend.
  - Mitigation: map UI label riêng, không đổi raw backend state.

# 11. Security Considerations
- Không đưa dữ liệu nhạy cảm firmware artifact/url vào vùng hiển thị không cần thiết.
- Giữ nguyên role gate `canManageFirmware`; không nới quyền qua UI refactor.

# 12. Next steps
- Sang Phase 02 để đóng IA và page skeleton theo target UX đã chốt.

## Backlog (P0/P1/P2)
- P0:
  - Freeze target UX first fold + CTA chính.
  - Chốt status vocabulary và mapping thống nhất.
- P1:
  - Chốt realtime noise policy (toast/update card/table).
  - Chốt quy tắc ẩn/hiện metadata deployment.
- P2:
  - Ước lượng nhu cầu phân trang/virtualization theo data growth.

## Unresolved questions
- Persona quyết định cuối cùng là ai?
- Có giữ full deployment metadata ở main page không?
- Mốc nào của progress cần realtime ngay, mốc nào có thể tổng hợp?