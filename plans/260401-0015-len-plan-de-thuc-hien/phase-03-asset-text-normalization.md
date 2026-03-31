## Context links
- Input từ Phase 01: scope matrix
- Input từ Phase 02: rulebook + glossary
- Research: `./research/researcher-01-readability-heuristics.md`

## Overview
- Priority: P1
- Current status: pending
- Mục tiêu: normalize text trên markdown/caption/diagram label theo canonical rules.

## Key Insights
- Chỉnh theo lô nhỏ (theo chương/chủ đề) giúp review và rollback nhanh.
- Ưu tiên sửa phần “đọc khó nhưng impact cao” trước.
- Không chỉnh đồng thời quá nhiều loại lỗi trong một commit logic.

## Requirements
- Functional: thay thế thuật ngữ lệch chuẩn; rút gọn câu/label; chuẩn hóa caption.
- Non-functional: giữ đúng nghĩa kỹ thuật, không phá liên kết chéo tham chiếu.

## Architecture
- Batch strategy: theo domain nội dung (ví dụ kiến trúc, data flow, vận hành).
- Edit strategy: text first -> diagram labels -> caption alignment.
- Traceability: mỗi lô có change note ngắn “đổi gì, vì sao”.

## Related code files
- Modify: markdown thesis final trong scope
- Modify: `.mmd` files trong scope
- Modify: caption liên quan trong tài liệu tham chiếu
- Modify: `docs/*.md` liên quan trực tiếp để đồng bộ thuật ngữ song ngữ
- Create: không
- Delete: không

## Implementation Steps
1. Chia asset thành các batch nhỏ, độc lập.
2. Áp glossary map để thay thế thuật ngữ không chuẩn.
3. Rút câu dài thành câu ngắn, một ý chính mỗi câu.
4. Chuẩn caption theo mẫu đã chốt ở Phase 02.
5. Soát liên kết tham chiếu hình/bảng sau khi đổi text.

## Todo list
- [ ] Hoàn tất normalize batch 1 (ưu tiên cao).
- [ ] Hoàn tất normalize batch 2 (ưu tiên trung bình).
- [ ] Soát consistency toàn cục sau mỗi batch.

## Success Criteria
- Tỷ lệ thuật ngữ lệch chuẩn trong scope về 0.
- Caption của mọi hình/bảng/sơ đồ chính đạt tiêu chí tự-đứng-được.
- Không có thay đổi làm sai nghĩa kỹ thuật.

## Risk Assessment
- Risk: thay chữ làm lệch nghĩa chuyên môn. Mitigation: bắt buộc review chéo với glossary + context kỹ thuật.
- Risk: sửa tay gây thiếu nhất quán. Mitigation: checklist pass/fail theo rulebook.
- Risk: đụng nhầm ngoài scope. Mitigation: chỉ xử lý file đã whitelisted từ Phase 01.

## Security Considerations
- Không thêm dữ liệu nhạy cảm vào ví dụ minh họa.
- Duy trì nguyên tắc không công khai cấu hình bí mật trong nội dung mới.

## Next steps
- Bàn giao bộ file đã normalize cho Phase 04 để regenerate + QA gates.
