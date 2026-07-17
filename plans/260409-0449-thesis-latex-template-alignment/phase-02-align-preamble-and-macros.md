# Context links
- Parent plan: `./plan.md`
- Audit backlog: `./reports/01-audit-gap-checklist.md`
- Source: `../../resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`
- Template: `../../resources/reports/thesis/final/2025-04-27.MEM710071_Thuyết minh đồ án tốt nghiệp_Template_VIE_Final_ISO template.tex`

# Overview
- Date: 2026-04-09
- Description: Đồng bộ documentclass, package, font, macro theo template strategy, engine XeLaTeX.
- Priority: P1
- Implementation status: pending
- Review status: pending

# Key Insights
- XeLaTeX cần `fontspec` làm trục chính, tránh song song nhánh `ifPDFTeX` không cần thiết.
- Macro pandoc/highlighting có thể gây noise format, cần loại phần không dùng.
- YAGNI: chỉ giữ package thật sự phục vụ layout template.

# Requirements
- Functional:
  - Chốt engine XeLaTeX và bộ font giống template.
  - Chuẩn hóa geometry, line spacing, paragraph spacing, heading format.
  - Giữ macro phục vụ nội dung hiện có (figure/table/svg) nhưng loại macro chết.
- Non-functional:
  - Không đổi text học thuật.
  - Preamble dễ đọc, không trùng định nghĩa.

# Architecture
- Layer 1: engine + font stack.
- Layer 2: page layout + spacing rules.
- Layer 3: utility macro cho figure/table/heading.
- Layer 4: hyperref/bookmark an toàn compile.

# Related code files
- Files to modify:
  - `../../resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`
- Files to create: none
- Files to delete: none

# Implementation Steps
1. Chốt preamble target snapshot theo template.
2. Chuẩn hóa `documentclass`, `geometry`, `fontspec`, `setspace`, `titlesec`.
3. Rà macro trùng/lỗi thời và cắt bỏ phần không dùng.
4. Giữ lại macro cần cho SVG/longtable/caption nếu đang dùng thực tế.
5. Build nhanh 1 pass XeLaTeX để bắt lỗi preamble sớm.

# Todo list
- [ ] Chốt font stack XeLaTeX
- [ ] Loại macro dư, không phá nội dung
- [ ] Build smoke-test preamble

# Success Criteria
- Compile không lỗi từ preamble.
- Font/margin/spacing khớp checklist template.
- Không còn nhánh compile không dùng.

# Risk Assessment
- Risk: bỏ nhầm macro đang dùng ngầm trong body.
- Mitigation: grep macro usage trước khi xóa.

# Security Considerations
- Không ingest file ngoài; giữ local deterministic build.

# Next steps
- Sang Phase 03 căn frontmatter.

# Unresolved questions
- Template yêu cầu chính xác bộ font hệ thống nào khi thiếu Times New Roman?