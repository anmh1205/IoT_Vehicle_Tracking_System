# Context links
- Parent plan: `./plan.md`
- Gap checklist: `./reports/01-audit-gap-checklist.md`
- Source: `../../resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`

# Overview
- Date: 2026-04-09
- Description: Căn chỉnh phần đầu báo cáo (bìa, nhận xét, cam đoan, tóm tắt, mục lục/thuật ngữ) theo template 1:1.
- Priority: P1
- Implementation status: pending
- Review status: pending

# Key Insights
- Frontmatter là nơi sai lệch style dễ thấy nhất khi so PDF.
- Phải giữ nguyên nội dung, chỉ đổi cấu trúc bao quanh, khoảng cách, căn lề, numbering.

# Requirements
- Functional:
  - Đồng bộ thứ tự block frontmatter theo template.
  - Đồng bộ style heading/center block/rule line.
  - Chuẩn hóa số trang roman trước mainmatter.
- Non-functional:
  - Không chỉnh câu chữ phần cam đoan/tóm tắt.
  - Không thêm hoặc xóa phần học thuật.

# Architecture
- Block-based layout:
  - Cover pages
  - Evaluation forms
  - Declaration + abstract VN/EN
  - TOC/LOF/LOT/glossary (nếu template có)

# Related code files
- Files to modify:
  - `../../resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`
- Files to create: none
- Files to delete: none

# Implementation Steps
1. Đóng băng text frontmatter hiện tại.
2. Map từng block sang thứ tự template.
3. Đồng bộ macro heading/rule/spacing cho frontmatter.
4. Chuẩn hóa pagenumbering roman + reset hợp lệ.
5. Build và so visual 5–8 trang đầu.

# Todo list
- [ ] Map block frontmatter 1:1
- [ ] Chuẩn hóa roman numbering
- [ ] So visual first pages

# Success Criteria
- Thứ tự + style frontmatter khớp template.
- Không có thay đổi nội dung học thuật.

# Risk Assessment
- Risk: page break lệch gây dồn trang.
- Mitigation: cố định clearpage tại ranh giới block.

# Security Considerations
- Không có bề mặt security mới.

# Next steps
- Sang Phase 04 cho mainmatter chapter layout.

# Unresolved questions
- Template có yêu cầu bắt buộc mục lục tự động hay giữ bản thủ công hiện tại?