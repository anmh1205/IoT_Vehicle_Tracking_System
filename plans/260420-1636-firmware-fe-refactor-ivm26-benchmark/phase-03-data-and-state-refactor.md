# 1. Context links
- Plan tổng: `./plan.md`
- Phase trước: `./phase-02-information-architecture-and-page-skeleton.md`
- API contract refs: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/code-standards.md`, `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/project-overview-pdr.md`
- Current analysis: `./research/researcher-01-current-fe-firmware-analysis.md`

# 2. Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-20
- Description: Refactor data flow và state boundary để page nhẹ hơn, giảm logic trùng, giữ behavior cũ.
- Priority: P0
- Implementation status: pending
- Review status: pending

# 3. Key Insights
- `page.tsx` hiện là điểm nghẽn: query + derived KPI + realtime + columns + dialogs.
- Derived metrics bị tính lặp giữa page và child components.
- Query deployments fan-out theo từng firmware có rủi ro scale và tăng độ trễ UI.

# 4. Requirements
- Functional:
  - Gom query orchestration vào 1 view-model hook hoặc selector layer.
  - Chuẩn hóa derived state (summary, latest deployment, counts) 1 nguồn tính.
  - Giữ nguyên action handlers và API methods hiện tại.
- Non-functional:
  - DRY: không lặp transform logic.
  - KISS: state local chỉ giữ UI intent (open/close/select), không giữ dữ liệu tính lại được.
  - YAGNI: chưa thêm state manager toàn cục mới.

# 5. Architecture
- Đề xuất boundary:
  - `page.tsx`: permission + wiring section props.
  - `use-firmware-page-view-model` (optional file hoặc trong existing util):
    - fetch firmware/devices/deployments
    - expose memoized selectors
    - expose mutation callbacks chuẩn
  - `firmware-utils.ts`: transform pure functions, không side effects.
- Realtime strategy:
  - giữ toast progress theo event để phản hồi tức thời; đồng thời chỉ invalidate scope cần thiết để hạn chế refetch thừa.

<!-- Updated: Validation Session 1 - keep progress toasts -->
- So sánh IVM26:
  - Học: state phân lớp theo nhiệm vụ.
  - Tránh: invalidation rải rác, kiểu dữ liệu lỏng (`any`).

# 6. Related code files (modify/create/delete)
- Modify:
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/page.tsx`
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/components/firmware-utils.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/lib/api/firmware.ts` (nếu cần tối ưu payload normalize)
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/components/providers/socket-provider.tsx` (chỉ khi cần minimal helper)
- Create (tối giản, optional):
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/hooks/use-firmware-page-view-model.ts`
- Delete:
  - None.

# 7. Implementation Steps
1. Inventory toàn bộ state hiện tại: source-of-truth vs derived vs ephemeral UI.
2. Tách transform thuần vào utility selector functions.
3. Gói query + mutation orchestration vào view-model boundary.
4. Refactor child components nhận props đã chuẩn hóa, giảm self-derivation.
5. Rà lại realtime invalidate scope để tránh refetch không cần.

# 8. Todo list
- [ ] Lập bảng state taxonomy (server/derived/ui).
- [ ] Xóa logic tính KPI trùng lặp.
- [ ] Chuẩn hóa props contract giữa page và children.
- [ ] Giảm số chỗ gọi toast từ realtime.
- [ ] Bổ sung typing rõ cho status/action guard.

# 9. Success Criteria
- `page.tsx` giảm đáng kể logic thuần tính toán.
- Một thay đổi dữ liệu chỉ có một nơi transform chính.
- Không regress action upload/deploy/activate/deactivate/delete.

# 10. Risk Assessment
- Risk: Refactor state làm lệch behavior realtime.
  - Mitigation: map event->effect matrix trước khi sửa.
- Risk: Tách view-model quá tay tạo abstraction thừa.
  - Mitigation: giữ tối thiểu, chỉ tách nơi lặp hoặc khó test.

# 11. Security Considerations
- Không log payload nhạy cảm ra toast/console trong flow lỗi.
- Giữ check permission trước khi hiển thị hoặc kích hoạt mutation actions.

# 12. Next steps
- Sang Phase 04 để tái phân bổ component boundaries + progressive disclosure.

## Backlog (P0/P1/P2)
- P0: Tách orchestration + unify derived selectors.
- P1: Tối ưu invalidate/fetch scope cho deployments.
- P2: Đánh giá có cần helper realtime abstraction tái dùng.

## Unresolved questions
- Backend có thể cung cấp summary deployments để bỏ fan-out không?
- Có cần optimistic update cho action nào hay chỉ invalidate là đủ an toàn?