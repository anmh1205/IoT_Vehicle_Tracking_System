# Planner input synthesis report — thesis LaTeX deep audit

- Timestamp: 2026-04-09 17:27 (Asia/Saigon)
- Scope: lập kế hoạch audit sâu cho thesis LaTeX, không sửa nội dung thesis trong vòng này.

## Inputs used
1. Main-agent findings (provided by user):
   - Nhiều dòng `Nguồn: ...` thủ công trong `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`, cần chuẩn hóa citation học thuật.
   - Lỗi hình 4.47 trỏ tới `resources/reports/thesis/final/assets/figures/10-chuong-4-ket-qua-do-luong-hinh-4-38.svg` có text `Syntax error in text`.
   - Nhiều cảnh báo overfull/underfull trong `.log`.
   - Bìa lệch so template chuẩn `2025-04-27...template.tex`.
2. Research report found:
   - `plans/reports/researcher-260409-1725-latex-figure-caption-citation-audit-checklist.md`.
3. Foundation docs read:
   - `docs/codebase-summary.md`
   - `docs/code-standards.md`
   - `docs/system-architecture.md`
   - `docs/project-overview-pdr.md`

## Missing / mismatch input
- File expected by request but not found in repo scan:
  - `researcher-260409-1725-thesis-latex-deep-layout-audit-checklist.md`
- Planning below dùng dữ liệu hiện có + findings main-agent để tránh blocking.

## Planning decisions (KISS/YAGNI/DRY)
- Không mở rộng scope sang rewrite style/template toàn luận văn.
- Chỉ lập pipeline audit: line-number chính xác, severity rubric, matrix đối chiếu `.tex/.log/.assets`, double-check chống sót.
- Ưu tiên tạo output chuẩn cho vòng sửa kế tiếp: issue map có thứ tự fix.

## Deliverables planned
- `plan.md` (<=80 lines, phase links, dependency map).
- 4 phase files với checklist pass/fail, severity rubric, quy trình line-number chuẩn, matrix đối chiếu, cơ chế double-check.
- Không đụng file thesis content.

## Unresolved questions
- Có thể cung cấp file nghiên cứu thiếu `...deep-layout-audit-checklist.md` không?
- Chuẩn citation bắt buộc theo khoa là gì (IEEE/APA/chuẩn nội bộ)?
- “Bìa lệch template” ưu tiên khớp pixel-perfect hay khớp semantic block trước?