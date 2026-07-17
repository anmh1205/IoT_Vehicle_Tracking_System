# 1. Context links
- Plan tổng: `./plan.md`
- Phase trước: `./phase-04-progressive-disclosure-and-component-boundaries.md`
- Standards: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/code-standards.md`
- Architecture/PDR: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md`, `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/project-overview-pdr.md`

# 2. Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-20
- Description: Lộ trình migrate từng bước để refactor firmware FE mà không break chức năng production.
- Priority: P0
- Implementation status: pending
- Review status: pending

# 3. Key Insights
- Firmware page có nhiều action rủi ro (deploy/delete/activate) nên migration phải incremental.
- Hiện chưa có test coverage riêng cho firmware FE, nên verification cần checklist chặt.
- Realtime và query invalidation là vùng dễ regression nhất.

# 4. Requirements
- Functional:
  - Migrate theo lát cắt nhỏ: layout -> state -> disclosure -> polish.
  - Mỗi lát cắt giữ parity behavior với flow hiện tại.
  - Có rollback strategy cho từng bước nếu regression.
- Non-functional:
  - An toàn release: quality gate bắt buộc là lint + typecheck + build + manual critical path.
  - Quan sát được: có checklist realtime + error states + permission matrix.

<!-- Updated: Validation Session 1 - merge quality gate locked -->
# 5. Architecture
- Migration strategy:
  - Step-gated changes, mỗi PR một mục tiêu rõ.
  - Không đổi contract API/realtime event; chỉ refactor FE organization/UX.
  - Sử dụng feature-parity checkpoints thay vì big-bang rewrite.
- Verification architecture:
  - Unit cho pure transforms/selectors.
  - Integration cho page orchestration + dialogs.
  - Manual UI cho role/accessibility/responsive/realtime.

# 6. Related code files (modify/create/delete)
- Modify (dự kiến):
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/page.tsx`
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/components/*.tsx`
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/lib/api/firmware.ts` (nếu cần)
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/lib/validations/firmware.schema.ts` (nếu cần)
- Create (test-focused, ưu tiên cần thiết):
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/components/__tests__/...` (unit/integration)
- Delete:
  - None planned.

# 7. Implementation Steps
1. Chia rollout thành 3-4 PR nhỏ, mỗi PR có acceptance riêng.
2. Sau mỗi PR: chạy `lint -> typecheck -> build` frontend.
3. Viết test unit cho selectors/status mapping/action guard.
4. Viết integration test cho flow upload/deploy dialog và refresh behavior.
5. Chạy manual regression checklist trên role admin/non-admin + responsive + keyboard.
6. Chuẩn bị rollback notes: file/commit boundaries rõ để revert nhanh.

# 8. Todo list
- [ ] Định nghĩa PR slicing plan cụ thể.
- [ ] Viết test checklist trước khi bắt đầu refactor.
- [ ] Bổ sung test tối thiểu cho vùng rủi ro cao.
- [ ] Chạy đầy đủ quality gates mỗi increment.
- [ ] Tổng kết parity trước khi kết thúc refactor.

# 9. Success Criteria
- Không break các flow cốt lõi: upload, deploy, activate/deactivate, delete, history view.
- UX rõ hơn: first fold có CTA rõ, history scan nhanh hơn.
- Test suite + manual checklist xác nhận parity và không regress accessibility chính.

# 10. Risk Assessment
- Risk: Regression hidden do thiếu test trước đó.
  - Mitigation: tạo baseline checklist và chụp expected behaviors trước khi refactor.
- Risk: PR quá lớn khó review/revert.
  - Mitigation: enforce small-slice PR strategy.
- Risk: Realtime race gây UI stale.
  - Mitigation: xác định event handling matrix và verify bằng manual scenario.

# 11. Security Considerations
- Kiểm tra role gating sau refactor: non-admin không thấy/không trigger action firmware.
- Đảm bảo error message không lộ thông tin nhạy cảm của artifact/deployment internals.

# 12. Next steps
- Bàn giao plan này cho implementation agent theo thứ tự phase 01 -> 05.

## Backlog (P0/P1/P2)
- P0: PR slicing + regression checklist + quality gates.
- P1: Unit/integration test coverage cho vùng refactor mới.
- P2: Theo dõi post-merge feedback để tinh chỉnh disclosure/microcopy.

## Checklist test (unit/integration/manual UI)
- Unit:
  - [ ] Status mapping function.
  - [ ] Summary/derived selector outputs.
  - [ ] Action guard theo role/state.
- Integration:
  - [ ] Upload flow success/fail.
  - [ ] Deploy flow confirm/cancel/fail.
  - [ ] Realtime event xử lý milestone/error và refresh đúng vùng.
- Manual UI:
  - [ ] First-fold CTA clarity.
  - [ ] History progressive disclosure usability.
  - [ ] Responsive tablet/mobile.
  - [ ] Keyboard navigation + focus order + aria labels.
  - [ ] Role matrix admin/non-admin.

## Unresolved questions
- Có yêu cầu bắt buộc về ngưỡng coverage cho firmware FE tests không?
- Môi trường UAT có đủ dữ liệu realtime để test tình huống deployment thật không?