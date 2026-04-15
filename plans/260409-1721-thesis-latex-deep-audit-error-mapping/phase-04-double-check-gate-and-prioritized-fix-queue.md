# Context links
- Matrix + triage từ Phase 03
- Known anchors: citation-source thủ công, figure 4.47 SVG text error, over/underfull, cover-template drift

# Overview
- Priority: P1
- Current status: completed
- Brief: thiết kế cổng double-check chống bỏ sót và hàng đợi sửa ưu tiên cho vòng implementation kế tiếp.

# Key Insights
- Nếu không có gate kiểm hai lượt, lỗi dễ quay lại sau khi sửa chéo.
- Fix order quyết định tốc độ hội tụ: xử lý root cause trước symptom.

# Requirements
- Functional:
  - Thiết lập cơ chế double-check 2 pass độc lập.
  - Xuất prioritized fix queue theo severity + dependency.
  - Định nghĩa Definition of Ready cho vòng sửa.
  - Gate cover compliance: mức khớp gần như tuyệt đối với template chuẩn.
- Non-functional:
  - Queue gọn, rõ, không dư việc ngoài scope.

# Architecture
- Pass A (machine/regex-led): quét lại toàn bộ theo rulebook.
- Pass B (manual-spot-check): kiểm trọng điểm per chapter + known anchors.
- Reconciliation: chỉ close issue khi A và B cùng pass.
- Fix queue model: `order | issue_id | severity | dependency | expected impact`.

# Related code files
- Files to modify:
  - `plans/260409-1721-thesis-latex-deep-audit-error-mapping/plan.md`
  - `plans/260409-1721-thesis-latex-deep-audit-error-mapping/reports/*`
- Files to create:
  - `reports/audit-double-check-gate.md`
  - `reports/audit-prioritized-fix-queue.md`
  - `reports/audit-handoff-definition-of-ready.md`
- Files to delete:
  - none

# Implementation Steps
1. Chốt protocol double-check (vai trò, thứ tự, tiêu chí close/open issue).
2. Dựng fix queue theo nguyên tắc:
   - critical không dependency xử lý trước;
   - critical có dependency theo chain;
   - high sau khi critical về 0.
3. Gắn expected outcome từng item (ví dụ: giảm warning, chuẩn hóa citation).
4. Chốt Definition of Ready cho vòng sửa nội dung thesis.

# Todo List
- [x] Hoàn thiện protocol double-check 2 pass.
- [x] Hoàn thiện prioritized queue có dependency.
- [x] Hoàn thiện handoff/DoR cho implementation round.
- [x] Cập nhật trạng thái phase trong `plan.md`.

# Success Criteria
- Có tài liệu gate đủ để reviewer khác chạy lại và ra kết quả tương đương.
- Queue có thứ tự thực thi rõ, không ambiguity.
- Vòng sửa kế tiếp có thể bắt đầu ngay không cần tái phân tích lớn.

# Risk Assessment
- Risk: queue quá dài, khó thực thi.
  - Mitigation: tách must-fix (before submission) vs should-fix.
- Risk: double-check tốn thời gian.
  - Mitigation: giới hạn spot-check theo risk hotspot.

# Security Considerations
- Không chỉnh nội dung thesis ở phase này.
- Không thay đổi asset gốc; chỉ ghi nhận và ưu tiên xử lý.

# Next Steps
- Bàn giao full audit package cho agent implementation để bước vào vòng sửa có kiểm soát.

<!-- Updated: Validation Session 1 - enforced near pixel-perfect cover compliance gate -->