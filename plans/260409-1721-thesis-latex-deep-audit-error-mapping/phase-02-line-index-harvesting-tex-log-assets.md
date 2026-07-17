# Context links
- Rulebook output from Phase 01
- Target tex/log/assets:
  - `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`
  - `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.log`
  - `resources/reports/thesis/final/assets/figures/10-chuong-4-ket-qua-do-luong-hinh-4-38.svg`

# Overview
- Priority: P1
- Current status: completed
- Brief: quét và thu bằng chứng lỗi theo line-number chuẩn, không bỏ sót.

# Key Insights
- Cần line-number nhất quán để vòng sửa sau thao tác nhanh.
- Lỗi figure 4.47 là anchor tốt để kiểm tra chuỗi tex->asset->log.
- Overfull/underfull cần gom theo vị trí, tránh đếm trùng.

# Requirements
- Functional:
  - Trích xuất issue candidates từ tex/log/assets theo rule_id.
  - Lưu evidence gồm file + line + snippet + cross-ref.
- Non-functional:
  - Reproducible: cùng input cho cùng output.
  - Traceable: mỗi issue truy ngược được nguồn gốc.
  - Gate layout: mọi `Overfull \hbox` > 5pt phải được đánh cờ FAIL và harvest vào evidence.

# Architecture
- Scanner A (`.tex`): figure blocks, `Nguồn:`, citation macros, label/ref.
- Scanner B (`.log`): overfull/underfull/warning/error và line refs.
- Scanner C (`.svg/assets`): text lỗi, missing/broken linkage.
- Merger: chuẩn hóa vào 1 bảng issue tạm.

# Related code files
- Files to modify:
  - `plans/260409-1721-thesis-latex-deep-audit-error-mapping/reports/*`
- Files to create:
  - `reports/audit-raw-line-index.md`
  - `reports/audit-raw-issues.md`
- Files to delete:
  - none

# Implementation Steps
1. Quét `.tex` theo block-level (begin/end figure, caption, label, source, cite).
2. Quét `.log` lấy warning/error + map về line gốc khi có.
3. Quét `.svg` mục tiêu và assets liên quan để bắt literal lỗi text.
4. Chuẩn hóa evidence theo schema Phase 01.
5. Khử trùng lặp theo khóa: `rule_id + file + line + evidence_hash`.

# Todo List
- [x] Thu full danh sách issue candidate từ `.tex`.
- [x] Thu full danh sách warning/error từ `.log`.
- [x] Thu full lỗi assets liên quan figure tham chiếu.
- [x] Merge và deduplicate evidence.

# Success Criteria
- Mỗi issue có line-number hoặc anchor vị trí cụ thể.
- Lỗi đã biết (Nguồn thủ công, figure 4.47 SVG text lỗi, over/underfull, cover lệch) đều có evidence record.
- Không có issue trùng bản chất sau deduplicate.

# Risk Assessment
- Risk: `.log` không đủ thông tin line trực tiếp.
  - Mitigation: map ngược qua context snippet trong `.tex`.
- Risk: macro LaTeX làm ẩn nguồn lỗi.
  - Mitigation: thêm bước kiểm macro wrapper/call-site.

# Security Considerations
- Không xử lý dữ liệu nhạy cảm; chỉ text/log/asset nội bộ.
- Không chạy command ghi đè tài liệu thesis.

# Next Steps
- Xuất bộ issue thô làm đầu vào cho Phase 03 severity triage và cross-matrix.

<!-- Updated: Validation Session 1 - enforced overfull >5pt fail harvesting -->