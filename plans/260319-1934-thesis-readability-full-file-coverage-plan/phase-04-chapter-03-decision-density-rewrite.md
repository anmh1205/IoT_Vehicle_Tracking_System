# Phase 04 — Chapter 03 decision-density rewrite

## Context Links
- Source files:
  - `resources/reports/thesis/chapters/03-chuong-3-giai-phap-phan-cung.md`
  - `resources/reports/thesis/chapters/04-chuong-3-giai-phap-firmware.md`
  - `resources/reports/thesis/chapters/05-chuong-3-giai-phap-backend.md`
  - `resources/reports/thesis/chapters/06-chuong-3-giai-phap-frontend.md`
- Validation artifact: `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md`
- Covers: toàn bộ Chương 3, gồm hardware, firmware, backend/cloud, frontend, kết luận chương.

## Overview
- Priority: Very High
- Status: Ready
- Mục tiêu: giảm độ nặng kỹ thuật của Chương 3 mà vẫn giữ đủ rationale chọn giải pháp.

## Execution order inside phase
1. `03-chuong-3-giai-phap-phan-cung.md`
2. `04-chuong-3-giai-phap-firmware.md`
3. `05-chuong-3-giai-phap-backend.md`
4. `06-chuong-3-giai-phap-frontend.md`
5. QA continuity Chương 3 trong assembled artifact

## Key Insights
- Chương 3 là vùng có mật độ quyết định kỹ thuật lớn nhất, nhưng taxonomy mới đã tách nó thành bốn source files; đây là cơ hội tốt để rewrite theo domain thay vì dump liên tục trong một file lớn.
- Các tiểu mục hiện có xu hướng trộn vấn đề, lựa chọn, thông số, lợi ích trong cùng đoạn.
- Cần giữ logic đọc liên tục khi ráp lại trong bản assembled, tránh cảm giác như bốn báo cáo rời.

## Requirements
- Giữ nguyên mọi quyết định công nghệ cốt lõi và lý do kỹ thuật chính.
- Không bỏ phần so sánh, nhưng phải giảm tải nhận thức bằng intro/outro rõ ràng.
- Mỗi file nguồn của Chương 3 phải có kết luận cục bộ đủ đọc và đồng thời không phá nhịp kết luận chương khi assembled.
- Thuật ngữ lần đầu xuất hiện phải được giải thích đủ để người không chuyên theo được ý chính.

## Related Code Files
- Source of truth: `resources/reports/thesis/chapters/03-chuong-3-giai-phap-phan-cung.md` → `resources/reports/thesis/chapters/06-chuong-3-giai-phap-frontend.md`
- Validation artifact: `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md`

## Implementation Steps
1. Rewrite `03` theo pattern: vấn đề → phương án → chọn → tác động.
2. Rewrite `04`, ưu tiên state machine, BLE, modem, config theo luồng hoạt động.
3. Rewrite `05`, ưu tiên luồng dữ liệu và rationale backend/cloud trước stack chi tiết.
4. Rewrite `06`, ưu tiên value-to-reader trước framework terms.
5. Chạy QA continuity trên assembled artifact cho nhịp nối `03 → 04 → 05 → 06`.

## File handoff checklist
- [ ] Mở đầu file đã trả lời rõ file này giải quyết gì.
- [ ] Các bảng so sánh lớn có intro + takeaway.
- [ ] Các đoạn dense đã được tách ý.
- [ ] Đoạn cuối nối tự nhiên sang file kế tiếp.

## Todo List
- [ ] Rewrite `03` phần hardware.
- [ ] Rewrite `04` phần firmware/state machine/config.
- [ ] Rewrite `05` phần backend/cloud/database/API/security.
- [ ] Rewrite `06` phần frontend/UX/realtime map.
- [ ] QA kết luận chương 3 trong bản assembled.

## Success Criteria
- Chương 3 không còn cảm giác là chuỗi dump quyết định công nghệ.
- Người đọc hiểu được logic chọn giải pháp mà không cần biết sâu từng stack.
- Tất cả cụm bảng/so sánh quan trọng đều có takeaway.
- Khi ráp lại ở file final, bốn source files vẫn cho cảm giác là một chương thống nhất.

## Definition of Done
- 4 source files `03-06` hoàn tất theo đúng execution order.
- Mỗi file pass file handoff checklist.
- QA continuity Chương 3 pass trong assembled artifact.

## Risk Assessment
- Cắt quá mạnh làm mất rationale thiết kế.
- Giải thích quá tay làm Chương 3 dài hơn đáng kể.
- Sửa không đồng đều giữa 4 source files làm chương lệch nhịp.

## Security Considerations
- Giữ nguyên ý bảo mật ở các phần session-based auth, transport security, MQTT security, alerts.
- Không đơn giản hóa tới mức làm sai bản chất các quyết định bảo mật.

## Next Steps
- Sang Phase 05 để làm source files `07-10` của Chương 4 theo nguyên tắc narrative trước, reference sau.
