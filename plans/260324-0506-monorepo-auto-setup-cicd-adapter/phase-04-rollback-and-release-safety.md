# Context links
- Deploy actions hiện tại: SCP + SSH + `docker compose pull && up -d`
- Artifacts workflow: compose files upload/download
- Hardening baseline: phase 03

# Overview
- Priority: P1
- Current status: pending
- Brief: Định nghĩa rollback nhanh cho monorepo, giảm blast radius khi workflow/adapter có sự cố.

# Key Insights
- Luồng deploy hiện tại chưa có explicit rollback gate trong workflow.
- Với monorepo, lỗi trigger có thể ảnh hưởng nhiều service nếu không cô lập.
- Rollback thực tế nên dựa “image tag last-known-good + compose rollback command”.

# Requirements
- Functional:
  - Có rollback runbook cho từng nhóm service (app, infra, mobile build pipeline).
  - Có cơ chế tạm khóa deploy tự động khi phát hiện failure pattern.
- Non-functional:
  - MTTR mục tiêu thấp, thao tác rollback <= 15 phút/service.
  - Không thay đổi kiến trúc deploy cốt lõi.

# Architecture
- Rollback model 2 tầng:
  1) Workflow-level: stop/re-run previous successful workflow artifact/tag.
  2) Runtime-level: SSH vào host, pin tag stable, `docker compose up -d`.
- Release safety:
  - Manual approval gate cho production-like environments (nếu mở rộng sau).
  - UAT vẫn auto nhưng có emergency switch (disable workflow / env protection).

# Related code files
- Modify:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/*-uat.yml`
- Create:
  - Runbook trong plan: `rollback-checklist` (nội bộ plan)
- Delete:
  - None

# Implementation Steps
1. Chuẩn hóa cách lấy last-success tag/artifact cho backend/frontend/mqtt.
2. Thiết kế rollback checklist theo service ownership và dependency order.
3. Thêm safety controls: concurrency cancel-in-progress phù hợp từng workflow.
4. Mô tả quy trình emergency disable cho workflow gây lỗi trigger.
5. Định nghĩa post-rollback verification tối thiểu (health endpoint/container status).

# Todo list
- [ ] Viết rollback procedure cho build+deploy services.
- [ ] Viết rollback procedure cho deploy-only infra services.
- [ ] Định nghĩa tiêu chí “rollback bắt buộc” vs “retry an toàn”.
- [ ] Bổ sung danh sách lệnh verify sau rollback.

# Success Criteria
- Có runbook rollback nhất quán cho toàn bộ workflow chính.
- Team có thể rollback không cần sửa code mới.

# Risk Assessment
- Risk: Tag `latest` gây mơ hồ rollback. Mitigation: ưu tiên immutable tag theo SHA trong chiến lược kế tiếp.
- Risk: Rollback infra thứ tự sai gây downtime. Mitigation: định nghĩa dependency order rõ trong runbook.

# Security Considerations
- Rollback qua SSH vẫn tuân thủ secret scope tối thiểu.
- Không dùng shared admin credential cho nhiều service nếu có thể tách.

# Next steps
- Sang phase 05 để xác nhận bằng test matrix + acceptance criteria đo được.
