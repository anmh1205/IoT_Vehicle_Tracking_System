# Context links
- Parent plan: `./plan.md`
- Source: `../../resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`
- Assets: `../../resources/reports/thesis/final/assets/figures/`

# Overview
- Date: 2026-04-09
- Description: Chuẩn hóa phụ lục, tài liệu tham khảo, đường dẫn asset theo template.
- Priority: P2
- Implementation status: pending
- Review status: pending

# Key Insights
- Bibliography thường lệch style mạnh khi đổi template.
- Asset path phải ổn định để XeLaTeX compile lặp lại được.

# Requirements
- Functional:
  - Đồng bộ heading phụ lục và numbering scheme.
  - Đồng bộ style danh mục tài liệu tham khảo theo template.
  - Xác nhận tất cả hình tham chiếu tồn tại và render đúng.
- Non-functional:
  - Không đổi nội dung reference entries (trừ format trình bày).
  - Không di chuyển asset nếu chưa cần.

# Architecture
- Appendix layer: section wrappers + table conventions.
- Bibliography layer: style engine (`thebibliography`/BibTeX/BibLaTeX tùy trạng thái thực tế).
- Asset layer: path validation + fallback policy.

# Related code files
- Files to modify:
  - `../../resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`
- Files to create:
  - `./reports/05-asset-and-bibliography-validation.md`
- Files to delete: none

# Implementation Steps
1. Audit cơ chế bibliography hiện tại.
2. Căn style tham khảo theo template (indent, spacing, heading).
3. Chuẩn hóa section phụ lục và phân tách các phụ lục.
4. Rà tồn tại asset, sửa path/reference lỗi nếu có.
5. Build toàn tài liệu để xác nhận không missing figure.

# Todo list
- [ ] Chốt bibliography style
- [ ] Align appendix heading
- [ ] Validate tất cả asset references

# Success Criteria
- Không còn lỗi missing asset.
- Bibliography render đúng format template.
- Phụ lục có bố cục đồng nhất.

# Risk Assessment
- Risk: đổi cơ chế bibliography gây thay đổi thứ tự tài liệu.
- Mitigation: giữ nguyên thứ tự học thuật, chỉ đổi trình bày.

# Security Considerations
- Không tải tài nguyên ngoài qua URL lúc build.

# Next steps
- Sang Phase 06 compile + visual diff.

# Unresolved questions
- Template dùng chuẩn trích dẫn nào (IEEE-like hay biến thể nội bộ)?