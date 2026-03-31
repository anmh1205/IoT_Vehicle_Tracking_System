## Context links
- Research: `./research/researcher-01-readability-heuristics.md`
- Research: `./research/researcher-02-asset-pipeline-and-qa.md`
- Docs: `../../docs/project-overview-pdr.md`, `../../docs/system-architecture.md`

## Overview
- Priority: P1
- Current status: completed
- Mục tiêu: chốt inventory asset và phạm vi chỉnh sửa, tránh sửa lan rộng.

## Key Insights
- Chỉnh theo lô nhỏ giúp giảm blast radius.
- “Dễ hiểu” phải đo bằng tiêu chí cụ thể, không cảm tính.
- Không đổi bản chất kỹ thuật, chỉ đổi cách diễn đạt/cấu trúc trình bày.

## Requirements
- Functional: lập danh sách asset nguồn + artifact đầu ra; thêm danh sách `docs/` liên quan trực tiếp cần đồng bộ thuật ngữ; phân loại mức độ ưu tiên.
- Non-functional: truy vết được file nào đổi, vì sao đổi, rollback được theo lô.

## Architecture
- Input: thesis markdown + diagram source (Mermaid) + asset render hiện có.
- Process: inventory -> gán nhãn mức độ khó đọc -> chốt scope theo phase.
- Output: scope matrix (must-fix / should-fix / keep).

## Related code files
- Modify: `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-readability-draft.md` (nếu cần cập nhật text tham chiếu)
- Modify: các file `.mmd`/`.svg` trong phạm vi thesis final (xác nhận ở bước audit)
- Create: không bắt buộc
- Delete: không

## Implementation Steps
1. Quét toàn bộ asset thesis final và nhóm theo loại (text, mmd, svg, bảng).
2. Đánh dấu issue readability: jargon, caption mơ hồ, label dài, layout rối.
3. Chấm mức ưu tiên theo impact đọc hiểu (cao/trung bình/thấp).
4. Chốt danh sách file in-scope cho các phase sau.

## Todo list
- [ ] Hoàn tất inventory file theo nhóm.
- [ ] Có bảng issue + mức ưu tiên.
- [ ] Có scope matrix được duyệt nội bộ.

## Success Criteria
- 100% asset mục tiêu có trong inventory.
- Mỗi asset có trạng thái: giữ nguyên / cần chỉnh / bỏ khỏi scope.
- Không có file ngoài scope bị đưa vào.

## Risk Assessment
- Risk: bỏ sót asset quan trọng. Mitigation: đối chiếu inventory với mục lục thesis + folder tree.
- Risk: scope trượt sang chỉnh kỹ thuật sâu. Mitigation: rule cứng “không đổi logic hệ thống”.
- Risk: khối lượng vượt thời gian. Mitigation: ưu tiên must-fix trước, khóa should-fix.

## Security Considerations
- Không đưa secret/env vào tài liệu hoặc ảnh chụp.
- Ẩn thông tin nhạy cảm nếu xuất hiện trong log/screenshot.

## Next steps
- Bàn giao inventory + scope matrix cho Phase 02 để tạo rules/glossary.
