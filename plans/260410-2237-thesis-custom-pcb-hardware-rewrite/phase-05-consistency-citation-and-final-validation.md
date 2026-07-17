# Phase 05 — Consistency, citation, and final validation

## Context links
- [Plan overview](./plan.md)
- [Phase 04](./phase-04-rewrite-implementation-bom-and-test-related-hardware-sections.md)
- [Thesis LaTeX](../../resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex)

## Overview
- Priority: P0
- Status: Planned
- Goal: Đóng gói bản sửa hoàn chỉnh, đảm bảo nhất quán thuật ngữ, trích dẫn, và logic kỹ thuật phần cứng.

## Key insights
- Lỗi thường sót ở bước cuối: caption/hình đúng nhưng text cũ chưa đổi hết.
- Cần checklist đóng gói riêng cho thesis hardware để tránh regressions thuật ngữ.

## Requirements
### Functional
1. Chạy checklist nhất quán toàn bộ hardware sections.
2. Kiểm tra citation claim theo mức chứng cứ.
3. Chuẩn bị changelog ngắn các nhóm sửa chính.

### Non-functional
- File tex biên dịch được (không vỡ cấu trúc latex).
- Nội dung mạch lạc, không tự mâu thuẫn.

## Architecture
- Validation pipeline:
  1) terminology sweep
  2) figure/table/caption sweep
  3) claim-evidence sweep
  4) final compile check

## Related code files
### Modify
- `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`

### Create
- `reports/final-validation-checklist.md`

## Implementation steps
1. Dùng grep sweep cho từ khóa gây hiểu sai (“module” theo nghĩa hardware mua sẵn, “ghép sẵn”, v.v.).
2. Soát caption và bảng với nội dung đã rewrite.
3. Chạy compile latex và xử lý lỗi nếu có.
4. Xuất danh sách unresolved questions còn lại (nếu có).

## Todo list
- [ ] Thuật ngữ sweep toàn file
- [ ] Soát figure/table/caption
- [ ] Validate claim-evidence
- [ ] Compile check

## Success criteria
- Bản thesis hardware đúng bản chất custom PCB, nhất quán từ đầu đến cuối.
- Không còn lỗi kỹ thuật trọng yếu hoặc hiểu nhầm kiến trúc phần cứng.

## Risk assessment
- Rủi ro: line shift sau nhiều lần sửa làm khó trace.
- Giảm thiểu: trace theo section label + heading.

## Security considerations
- Không áp dụng.

## Next steps
- Trình bạn review diff theo từng cụm section trước khi chốt final bản PDF.
