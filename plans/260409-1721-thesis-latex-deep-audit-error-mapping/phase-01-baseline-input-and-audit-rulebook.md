# Context links
- Input synthesis: `./reports/planner-260409-1727-thesis-latex-deep-audit-input-synthesis.md`
- Research checklist: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/reports/researcher-260409-1725-latex-figure-caption-citation-audit-checklist.md`
- Main files: `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`, `.log`, template bìa 2025-04-27

# Overview
- Priority: P1
- Current status: completed
- Brief: chốt bộ rule audit thống nhất để tránh quét thiếu/sai scope.

# Key Insights
- Nhiều `Nguồn:` thủ công => cần chuẩn rule citation-source.
- Có lỗi asset rõ ràng (SVG text syntax) => cần rule link tex→asset→render log.
- Overfull/underfull nhiều => cần taxonomy layout warning để không lẫn với lỗi học thuật.

# Requirements
- Functional:
  - Định nghĩa checklist pass/fail cho citation, caption, source, reference, cover-layout.
  - Định nghĩa severity rubric chuẩn (critical/high/medium/low).
  - Khóa chuẩn citation toàn luận văn theo IEEE style.
  - Khóa rule: hình tự dựng không ghi nguồn.
- Non-functional:
  - Rule ngắn gọn, không trùng lặp (DRY), dễ áp dụng thủ công hoặc script.

# Architecture
- Layer 1: Rule definitions (rule_id, condition, pass/fail).
- Layer 2: Evidence schema (file, line, snippet, asset, log_ref).
- Layer 3: Severity mapping (rule_id -> severity).

# Related code files
- Files to modify (future audit artifacts):
  - `plans/260409-1721-thesis-latex-deep-audit-error-mapping/reports/*`
- Files to create:
  - `reports/audit-rulebook-thesis-latex.md`
- Files to delete:
  - none

# Implementation Steps
1. Chuẩn hóa danh sách rule theo nhóm: citation/source, figure/caption/label, layout/cover, asset/link.
2. Gán rule_id cố định (`CIT-*`, `FIG-*`, `LAY-*`, `AST-*`).
3. Chốt tiêu chí pass/fail từng rule + ví dụ evidence tối thiểu.
4. Gán severity cho từng rule theo impact nộp thesis.
5. Chốt định dạng bảng lỗi dùng xuyên suốt Phase 02-04.

# Todo List
- [x] Định nghĩa đầy đủ rule_id và mô tả.
- [x] Chốt pass/fail cho mọi rule.
- [x] Chốt severity mapping.
- [x] Chốt schema evidence thống nhất.

# Success Criteria
- 100% lỗi mục tiêu (nguồn/citation/figure/layout/asset) có rule tương ứng.
- Không có rule trùng ý nghĩa.
- Có rubric severity áp dụng được ngay cho triage.

# Risk Assessment
- Risk: rule quá rộng gây nhiễu.
  - Mitigation: giới hạn đúng phạm vi input bắt buộc.
- Risk: thiếu rule cover-layout.
  - Mitigation: thêm nhóm `LAY-COVER-*` riêng.

# Security Considerations
- Không chứa secret/runtime credential.
- Chỉ xử lý tài liệu nội bộ thesis; không đẩy dữ liệu ra ngoài repo.

# Next Steps
- Bàn giao rulebook làm đầu vào bắt buộc cho Phase 02 line-index harvesting.

<!-- Updated: Validation Session 1 - locked IEEE citation and self-authored figure source policy -->