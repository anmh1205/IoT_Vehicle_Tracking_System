# Context links
- Parent plan: `./plan.md`
- Source output: `../../resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`
- Template PDF: `../../resources/reports/thesis/final/2025-04-27.MEM710071_Thuyết minh đồ án tốt nghiệp_Template_VIE_Final_ISO template.pdf`

# Overview
- Date: 2026-04-09
- Description: Chạy compile chuẩn XeLaTeX và kiểm tra chênh lệch hiển thị bằng pixel-diff tự động + checklist accept.
- Priority: P1
- Implementation status: pending
- Review status: pending

# Key Insights
- Chỉ compile pass chưa đủ; cần visual parity check với template.
- So diff nên theo block ưu tiên: cover/frontmatter/chapter header/table/appendix/reference.

# Requirements
- Functional:
  - Compile tối thiểu 2 pass bằng XeLaTeX.
  - Xuất log lỗi/cảnh báo chính và quyết định xử lý.
  - Chạy visual checklist và ghi pass/fail.
- Non-functional:
  - Build deterministic tại local repo.
  - Không sửa nội dung học thuật để “né” warning layout.

# Architecture
- Build pipeline:
  1) Clean aux
  2) XeLaTeX pass #1
  3) XeLaTeX pass #2
  4) Optional pass #3 nếu còn cross-ref warning
  5) Visual review checklist

# Related code files
- Files to modify: none (phase verify)
- Files to create:
  - `./reports/06-compile-checklist-and-visual-diff.md`
- Files to delete: none

# Implementation Steps
1. Dọn file phụ trợ (`.aux`, `.toc`, `.out`, `.log`) có kiểm soát.
2. Chạy compile: `xelatex -interaction=nonstopmode -halt-on-error <file>.tex` (2 lần).
3. Nếu có chỉ mục/tham chiếu lỗi, chạy pass bổ sung.
4. So PDF output với template theo checklist.
5. Ghi nhận mismatch và phân loại: style mismatch vs content mismatch.

# Todo list
- [ ] XeLaTeX pass #1 thành công
- [ ] XeLaTeX pass #2 thành công
- [ ] Hoàn tất visual diff checklist
- [ ] Chốt accept/reject

# Success Criteria
- Không lỗi fatal sau 2 pass XeLaTeX.
- Checklist accept đạt:
  - [ ] Font family/size khớp template
  - [ ] Margin/header/footer khớp template
  - [ ] Cover/frontmatter order khớp template
  - [ ] Chapter/section style khớp template
  - [ ] Figure/table/caption style khớp template
  - [ ] Appendix/bibliography style khớp template
- Sai lệch còn lại (nếu có) phải được giải trình là do khác nội dung, không do format.

# Risk Assessment
- Risk: môi trường thiếu font làm lệch render.
- Mitigation: khóa font fallback policy và ghi rõ trong report.

# Security Considerations
- Không dùng shell escape/remote include khi compile.

# Next steps
- Nếu pass: bàn giao cho implementer chạy theo phase order.
- Nếu fail: quay lại phase tương ứng theo loại mismatch.

# Unresolved questions
- Bộ font hệ thống trên máy build chính có đúng bản Times New Roman tương thích template không?