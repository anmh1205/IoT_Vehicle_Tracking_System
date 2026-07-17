# Context links
- Parent plan: `./plan.md`
- Source cần chuẩn hóa: `../../resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`
- Template tham chiếu: `../../resources/reports/thesis/final/2025-04-27.MEM710071_Thuyết minh đồ án tốt nghiệp_Template_VIE_Final_ISO template.tex`
- Research: `./research/researcher-01-template-gap-report.md`

# Overview
- Date: 2026-04-09
- Description: Audit chênh lệch format/style/structure giữa thesis hiện tại và template.
- Priority: P1
- Implementation status: pending
- Review status: pending

# Key Insights
- File hiện tại đang mang dấu vết pandoc preamble + macro dư cho syntax highlighting.
- Template `.tex` có dấu hiệu fixed-position (picture/tikz), cần xác định phần nào là style token tái sử dụng.
- Main structure hiện có frontmatter/mainmatter thủ công, thuận lợi để map 1:1.

# Requirements
- Functional:
  - Lập bảng gap theo nhóm: preamble, frontmatter, heading, bảng/hình, appendix, bibliography.
  - Đánh dấu mục nào chỉnh style-only, mục nào “cấm đổi” vì là nội dung học thuật.
- Non-functional:
  - Không sửa file mục tiêu ở phase audit.
  - Bảng gap ngắn, rõ, hành động được.

# Architecture
- Input: template `.tex/.pdf` + thesis `.tex`.
- Process: scan token định dạng → mapping token → tạo backlog thay đổi.
- Output: checklist thay đổi theo thứ tự an toàn (ít phá vỡ nhất trước).

# Related code files
- Files to modify: none (phase audit only)
- Files to create:
  - `./reports/01-audit-gap-checklist.md`
- Files to delete: none

# Implementation Steps
1. Chốt baseline hash/timestamp của file mục tiêu và template.
2. Audit preamble/package/macro theo nhóm chức năng.
3. Audit khối frontmatter (trang bìa, nhận xét, cam đoan, tóm tắt).
4. Audit khối mainmatter/appendix/bibliography.
5. Xuất gap checklist có mức ưu tiên High/Med/Low.

# Todo list
- [ ] Chốt baseline trước mọi chỉnh sửa
- [ ] Hoàn tất gap table theo 6 nhóm
- [ ] Gắn tag “style-only” cho từng hạng mục

# Success Criteria
- Có checklist gap đầy đủ và không chứa tác vụ chỉnh nội dung học thuật.
- Xác định rõ dependency giữa các thay đổi để tránh vòng lặp compile-fix.

# Risk Assessment
- Risk: nhầm ranh giới style vs nội dung trong heading/caption.
- Mitigation: khóa nguyên văn đoạn học thuật, chỉ đổi wrapper/macro/spacing.

# Security Considerations
- Không có dữ liệu nhạy cảm; không thêm external input.

# Next steps
- Sang Phase 02 để căn chỉnh preamble/macro theo backlog.

# Unresolved questions
- Template `.tex` có phải nguồn gốc biên tập hay bản convert từ PDF?