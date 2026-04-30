# Context Links
- phase-02-canonical-contract-and-guardrails.md
- researcher-01-app-timezone-audit.md

# Overview
- Priority: P1
- Current status: pending
- Brief description: Đồng bộ backend time handling + cron/scheduler chạy đúng wall-clock Asia/Ho_Chi_Minh.

# Key Insights
- Lỗi thường gặp: implicit Date parse và cron phụ thuộc TZ process mặc định.
- Fix scheduler sớm giảm rủi ro vận hành ngay.

# Requirements
- Functional requirements
  - Parse/serialize timestamp explicit format.
  - Scheduler jobs khai báo timezone explicit.
  - API response time fields thống nhất naming/format.
- Non-functional requirements
  - Backward compatibility trong migration window.
  - Observable (log raw vs normalized trong thời gian ngắn).

# Architecture
- System design
  - Time utility layer dùng chung backend.
- Component interactions
  - Service/domain/report modules gọi utility thay vì tự convert.
- Data flow
  - Incoming UTC -> normalize once -> store -> render by timezone at edge.

# Related Code Files
- List of files to modify
  - Backend time utils, scheduler modules, report services.
- List of files to create
  - Time handling test cases for boundary windows.
- List of files to delete
  - Legacy duplicate date utilities (nếu có).

# Implementation Steps
1. Chuẩn hóa helper parse/format trong backend.
2. Refactor scheduler config để timezone explicit.
3. Sửa endpoints/report transforms theo canonical contract.
4. Add guard logs/metrics cho skew detection ngắn hạn.

# Todo List
- [ ] Scheduler timezone explicit toàn bộ jobs.
- [ ] API timestamp contract ổn định.
- [ ] Boundary tests pass.

# Success Criteria
- Cron chạy đúng giờ VN; API/UI không lệch ngày.

# Risk Assessment
- Potential issues: job chạy trùng/lỡ khi đổi cron semantics.
- Mitigation strategies: freeze window + runbook reconcile + one-time backfill.

# Security Considerations
- Auth/authorization: audit quyền endpoint admin scheduler.
- Data protection: tránh log payload nhạy cảm khi debug skew.

# Next Steps
- Dependencies: Phase 02.
- Follow-up tasks: Phase 09.