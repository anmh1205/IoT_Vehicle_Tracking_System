## Context links
- Input từ Phase 04: kết quả regenerate + QA pass batches
- Docs: `../../docs/project-changelog.md`, `../../docs/development-roadmap.md`
- Kế hoạch tổng: `./plan.md`

## Overview
- Priority: P2
- Current status: pending
- Mục tiêu: đóng gói thay đổi, xác nhận chất lượng cuối, bàn giao rõ phạm vi và rollback point.

## Key Insights
- Handoff tốt phải nêu rõ “đổi gì/không đổi gì”.
- Cần bằng chứng pass QA thay vì mô tả chung chung.
- Chốt danh sách follow-up tách biệt khỏi phạm vi hiện tại.

## Requirements
- Functional: final review toàn cục; ghi nhận kết quả; bàn giao cho implement/reviewer.
- Non-functional: ngắn gọn, truy vết được, không mập mờ trách nhiệm.

## Architecture
- Input pack: changed files + QA records + glossary/rules.
- Review flow: technical correctness -> readability -> consistency -> sign-off.
- Output pack: handoff note + open items + rollback guidance.

## Related code files
- Modify: `./plan.md` (cập nhật progress/status khi kết thúc)
- Modify: tài liệu thesis/asset trong scope đã pass QA
- Create: không bắt buộc
- Delete: không

## Implementation Steps
1. Tổng hợp danh sách file đã đổi và lý do đổi theo batch.
2. Kiểm tra lần cuối consistency thuật ngữ/caption toàn tài liệu.
3. Xác nhận các gate Phase 04 đều pass và có bằng chứng.
4. Soạn handoff note: scope, kết quả, rủi ro còn lại, rollback point.
5. Đề xuất backlog nhỏ cho phần ngoài scope hiện tại.

## Todo list
- [ ] Có final checklist signed-off.
- [ ] Có handoff note đầy đủ và ngắn gọn.
- [ ] Có danh sách unresolved/follow-up rõ ràng.

## Success Criteria
- Người nhận handoff hiểu ngay cách verify kết quả.
- Không còn issue blocker về readability trong scope (ưu tiên dễ hiểu + đúng kỹ thuật).
- Có rollback point rõ cho từng batch chính.

## Risk Assessment
- Risk: bàn giao thiếu bối cảnh, khó tiếp nhận. Mitigation: dùng template handoff cố định (scope/change/verify/rollback).
- Risk: sót open issue quan trọng. Mitigation: bắt buộc mục unresolved ở cuối handoff.
- Risk: lẫn scope hiện tại với backlog tương lai. Mitigation: tách rõ “done now” và “next backlog”.

## Security Considerations
- Rà soát lần cuối để chắc chắn không có secret/sensitive data trong asset đã bàn giao.
- Chỉ chia sẻ artifact trong phạm vi cho phép của dự án.

## Next steps
- Chuyển sang execution theo đúng thứ tự phase; cập nhật trạng thái plan theo tiến độ thực tế.
