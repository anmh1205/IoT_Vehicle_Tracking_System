# Context Links
- researcher-01-app-timezone-audit.md
- Tracking_Frontend/src/lib/utils/date/format.ts

# Overview
- Priority: P1
- Current status: pending
- Brief description: Đồng bộ frontend + report/export/analytics để hiển thị và tính toán theo business timezone UTC+7 nhất quán.

# Key Insights
- Đã có shared formatter frontend, leverage cao.
- Rủi ro chính: double conversion và mismatch DB/API/UI day-boundary.

# Requirements
- Functional requirements
  - Chuẩn hóa hiển thị timestamp với zone label rõ (Asia/Ho_Chi_Minh).
  - Chuẩn hóa report/export timezone semantics.
  - Analytics grouping theo business-day UTC+7.
- Non-functional requirements
  - Output phải deterministic giữa máy người dùng khác timezone.
  - Không phá backward compatibility trong API response.

# Architecture
- System design
  - Presentation layer formatter duy nhất cho web/mobile/report exports.
- Component interactions
  - Backend trả canonical UTC + optional display-ready fields theo policy.
- Data flow
  - API UTC timestamps -> formatter UTC+7 -> UI/export.

# Related Code Files
- List of files to modify
  - Frontend date format utilities + report components.
  - Backend report/export serialization.
  - Analytics queries/jobs liên quan.
- List of files to create
  - Snapshot test cases cho boundary dates.
- List of files to delete
  - Duplicate/legacy formatters.

# Implementation Steps
1. Rà soát điểm dùng Date/toLocale trực tiếp ngoài formatter shared.
2. Refactor về utility thống nhất và explicit timezone.
3. Cập nhật export/report pipeline timezone policy.
4. Add cross-check UI vs export vs DB aggregates.

# Todo List
- [ ] Frontend formatter adoption complete.
- [ ] Report/export timezone aligned.
- [ ] Analytics day-boundary validated.

# Success Criteria
- Người dùng xem cùng dữ liệu sẽ thấy cùng mốc thời gian business UTC+7.

# Risk Assessment
- Potential issues: trình duyệt locale khác nhau gây format khác.
- Mitigation strategies: fixed locale/format policy ở formatter.

# Security Considerations
- Auth/authorization: giữ quyền truy cập report/export hiện tại.
- Data protection: tránh lộ dữ liệu nhạy cảm qua file export khi test.

# Next Steps
- Dependencies: Phase 03, Phase 04, Phase 05.
- Follow-up tasks: Phase 09.