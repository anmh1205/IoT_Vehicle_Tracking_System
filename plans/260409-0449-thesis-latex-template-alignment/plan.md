---
title: "Thesis LaTeX Template Alignment 1:1"
description: "Chuẩn hóa 99-bao-cao-thesis-hoan-chinh-latex.tex theo template mẫu 1:1, không đổi nội dung học thuật, compile chuẩn XeLaTeX."
status: pending
priority: P1
effort: 14h
branch: feature/cicd
tags: [thesis, latex, template-alignment, xelatex, formatting-only]
created: 2026-04-09
---

# Mục tiêu & phạm vi
- Mục tiêu: đưa file thesis hiện tại về đúng style/structure của template tham chiếu theo mức bám 1:1.
- Phạm vi: chỉ chỉnh trình bày, cấu trúc, style LaTeX; **không** chỉnh nội dung học thuật.
- Engine chuẩn: **XeLaTeX**.

# Pha triển khai
1. [Phase 01 - Audit current thesis LaTeX](./phase-01-audit-current-thesis-latex.md) — `pending` (0%)
2. [Phase 02 - Align preamble and macros](./phase-02-align-preamble-and-macros.md) — `pending` (0%)
3. [Phase 03 - Align frontmatter structure](./phase-03-align-frontmatter-structure.md) — `pending` (0%)
4. [Phase 04 - Align mainmatter chapter layout](./phase-04-align-mainmatter-chapter-layout.md) — `pending` (0%)
5. [Phase 05 - Align appendix bibliography and assets](./phase-05-align-appendix-bibliography-and-assets.md) — `pending` (0%)
6. [Phase 06 - Compile and visual diff checks](./phase-06-compile-and-visual-diff-checks.md) — `pending` (0%)

# Deliverables
- File mục tiêu sau chuẩn hóa:  
  `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`
- Báo cáo audit + checklist compile/diff pass.
- Không đổi semantic học thuật, không thêm/chém chương mục.

# Dependencies
- Template tham chiếu `.tex`:  
  `resources/reports/thesis/final/2025-04-27.MEM710071_Thuyết minh đồ án tốt nghiệp_Template_VIE_Final_ISO template.tex`
- Template tham chiếu `.pdf`: cùng thư mục trên.
- Asset hình: `resources/reports/thesis/final/assets/figures/*`.

# Acceptance gates
- Gate A: preamble + macro khớp strategy template (không còn block pandoc dư thừa nếu không cần).
- Gate B: frontmatter/mainmatter/appendix theo layout template.
- Gate C: XeLaTeX compile thành công ít nhất 2 pass, không lỗi fatal.
- Gate D: pixel-diff tự động + checklist, sai lệch chỉ chấp nhận khi do nội dung khác, không do style drift.

# Nguyên tắc thực thi
- YAGNI: không thêm package/macro mới nếu template không cần.
- KISS: ưu tiên copy cấu trúc template rồi map nội dung vào.
- DRY: gom style dùng chung, tránh định nghĩa lặp.
- Không chạm dữ liệu học thuật (đoạn văn, số liệu, luận điểm, trích dẫn nội dung).

# Context links
- Research reports: `./research/researcher-01-template-gap-report.md`, `./research/researcher-02-xelatex-compile-diff-report.md`
- Scout: `./scout/scout-01-skip-report.md`

# Unresolved questions
- Không có.