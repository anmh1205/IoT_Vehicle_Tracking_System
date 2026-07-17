# Context links
- Parent plan: `./plan.md`
- Source: `../../resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`
- Audit: `./reports/01-audit-gap-checklist.md`

# Overview
- Date: 2026-04-09
- Description: Đồng bộ bố cục chương, tiêu đề, subsection, hình/bảng, caption trong thân báo cáo.
- Priority: P1
- Implementation status: pending
- Review status: pending

# Key Insights
- File hiện dùng `\chapterheading` tự định nghĩa; cần kiểm soát nhất quán với section/subsection.
- Hình SVG và longtable là điểm hay vỡ layout khi đổi spacing/font.

# Requirements
- Functional:
  - Chuẩn hóa style heading chương/mục/tiểu mục theo template.
  - Chuẩn hóa caption, khoảng cách trước/sau figure-table.
  - Giữ nguyên số thứ tự và nội dung mọi chương.
- Non-functional:
  - Không chạm logic học thuật, trích dẫn, số liệu.
  - Không tạo macro mới nếu không bắt buộc.

# Architecture
- Structural wrapper giữ nguyên nội dung bên trong:
  - Chapter header wrapper
  - Section typography wrapper
  - Figure/table wrapper

# Related code files
- Files to modify:
  - `../../resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`
- Files to create: none
- Files to delete: none

# Implementation Steps
1. Chuẩn hóa chapter header style và page break policy.
2. Chuẩn hóa section/subsection typography + spacing.
3. Rà toàn bộ figure/table blocks để đồng nhất caption/rule.
4. Build sampling theo từng chương lớn để bắt regressions.

# Todo list
- [ ] Align heading hierarchy
- [ ] Align figure/table spacing
- [ ] Verify chapter-by-chapter render

# Success Criteria
- Chương 1..6 render theo cùng hệ style, không drift.
- Caption và khung bảng/hình nhất quán toàn tài liệu.

# Risk Assessment
- Risk: overfull/underfull tăng khi thay font/spacing.
- Mitigation: xử lý cục bộ, tránh vá toàn cục làm méo layout.

# Security Considerations
- Không có yêu cầu bảo mật đặc thù.

# Next steps
- Sang Phase 05: appendix, bibliography, assets.

# Unresolved questions
- Không có.