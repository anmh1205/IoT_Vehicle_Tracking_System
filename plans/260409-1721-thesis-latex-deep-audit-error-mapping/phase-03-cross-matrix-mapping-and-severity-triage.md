# Context links
- Raw outputs from Phase 02
- Research citation checklist report
- Main-agent findings baseline

# Overview
- Priority: P1
- Current status: completed
- Brief: tạo ma trận đối chiếu `.tex/.log/.assets` + chấm severity + checklist pass/fail.

# Key Insights
- Một lỗi có thể xuất hiện ở 2-3 nguồn; cần matrix để tránh bỏ sót hoặc sửa sai điểm.
- Severity phải phản ánh impact hội đồng: tính học thuật > tính thẩm mỹ.

# Requirements
- Functional:
  - Tạo matrix `issue_id -> tex_ref/log_ref/asset_ref/rule_id/severity`.
  - Tạo checklist pass/fail theo nhóm lỗi.
- Non-functional:
  - DRY: một issue_id dùng lại ở mọi báo cáo.
  - Ưu tiên rõ để vòng sửa không lãng phí.

# Architecture
- Matrix table (master truth).
- Severity engine theo rubric:
  - Critical: sai nguồn/citation, reference hỏng, lỗi chặn tính hợp lệ.
  - High: lệch template lớn, lỗi figure hiển thị sai nội dung.
  - Medium: warning layout ảnh hưởng đọc nhưng chưa phá nghĩa.
  - Low: style consistency nhỏ.
- Checklist summary: PASS/FAIL theo chương + toàn luận văn.
- Layout threshold policy: mọi overfull >5pt được đánh dấu FAIL cho triage.

# Related code files
- Files to modify:
  - `plans/260409-1721-thesis-latex-deep-audit-error-mapping/reports/*`
- Files to create:
  - `reports/audit-cross-matrix.md`
  - `reports/audit-severity-triage.md`
  - `reports/audit-pass-fail-checklist.md`
- Files to delete:
  - none

# Implementation Steps
1. Sinh issue_id duy nhất cho toàn bộ issue đã thu.
2. Dựng matrix đối chiếu 3 nguồn (`tex/log/assets`).
3. Áp severity theo rubric cố định.
4. Tổng hợp pass/fail checklist theo rule group.
5. Soát tay top critical/high để xác nhận không false-positive.

# Todo List
- [x] Hoàn thành matrix đầy đủ cột bắt buộc.
- [x] Chấm severity cho 100% issue.
- [x] Xuất checklist pass/fail theo nhóm lỗi.
- [x] Soát tay critical/high.

# Success Criteria
- 100% issue có severity và evidence cross-source.
- Có bảng top-priority issue cho vòng sửa.
- Checklist cho thấy rõ fail điểm nào, pass điểm nào.

# Risk Assessment
- Risk: severity thiếu nhất quán giữa reviewer.
  - Mitigation: khóa rubric bằng ví dụ điển hình trong report.
- Risk: issue chồng chéo nhiều root causes.
  - Mitigation: thêm `root-cause-tag` trong matrix.

# Security Considerations
- Dữ liệu audit không chứa secret.
- Không đưa link ngoài không kiểm chứng vào evidence chính.

# Next Steps
- Bàn giao matrix + triage cho Phase 04 để chốt thứ tự xử lý và cơ chế double-check.

<!-- Updated: Validation Session 1 - applied >5pt overfull fail policy in triage -->