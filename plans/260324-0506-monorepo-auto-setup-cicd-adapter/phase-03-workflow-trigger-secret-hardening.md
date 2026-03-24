# Context links
- Workflows: `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/*.yml`
- Current deploy pattern: `push` on `uat` + `paths` per service
- Root adapter design: phase 02

# Overview
- Priority: P1
- Current status: pending
- Brief: Hardening trigger/secret cho monorepo + tương thích workflow auto-generated từ root auto-detect.

# Key Insights
- Over-trigger là rủi ro lớn nhất khi thêm root artifacts (workflow chạy toàn repo).
- Secrets hiện dùng rộng ở các job deploy; cần thu hẹp quyền theo job/event.
- Không nên thay đổi event model quá mạnh; tối ưu bằng guard điều kiện và path filter.

# Requirements
- Functional:
  - Duy trì trigger path-based cho từng service.
  - Thêm guard cho workflow mới auto-generated: chỉ chạy khi đổi adapter/workflow liên quan.
  - Chuẩn hóa secret contract: secret nào bắt buộc ở build, deploy, notify.
- Non-functional:
  - Không tăng đáng kể thời gian CI.
  - Dễ review diff, dễ rollback.

# Architecture
- Trigger hardening:
  - Dùng `paths` + `paths-ignore` rõ ràng theo domain.
  - Thêm `concurrency` theo workflow-service để tránh race deploy.
  - Dùng `if:` guard ở job deploy khi artifact/build fail.
- Secret hardening:
  - Ưu tiên permissions tối thiểu (`contents: read` mặc định).
  - Tách env secrets deploy khỏi build-only jobs.
  - Không expose secret vào logs; truyền qua action inputs/env scoped.

# Related code files
- Modify:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/backend-uat.yml`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/frontend-uat.yml`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/mqtt-bridge-uat.yml`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/*-uat.yml` (infra deploy-only)
- Create:
  - Optional: policy checklist file inside plan dir (không bắt buộc codebase)
- Delete:
  - None

# Implementation Steps
1. Thiết kế policy chung trigger monorepo: allowed paths map theo service.
2. Áp dụng `concurrency` key theo workflow để tránh chồng deployment.
3. Áp dụng least-privilege permissions cho jobs không cần write/token mở rộng.
4. Chuẩn hóa pattern kiểm tra secret presence trước deploy step.
5. Bổ sung rule cho workflow auto-generated: trigger chỉ root adapter + workflow file.

# Todo list
- [ ] Viết bảng mapping trigger/path chuẩn cho toàn bộ workflows.
- [ ] Đề xuất template hardening tối thiểu cho existing workflows.
- [ ] Đề xuất quy ước secret scope per job.
- [ ] Định nghĩa guard chống over-trigger cho workflow auto-generated.

# Success Criteria
- Mọi workflow chỉ chạy khi đúng vùng code thay đổi.
- Không có deploy job chạy ngoài ý muốn khi đổi docs hoặc file ngoài scope.
- Secret usage được mô tả rõ theo principle least privilege.

# Risk Assessment
- Risk: Siết trigger quá chặt gây miss deploy hợp lệ. Mitigation: test matrix phase 05 với changed-files cases.
- Risk: Cập nhật đồng loạt workflow tạo lỗi syntax. Mitigation: rollout theo batch + validate YAML.

# Security Considerations
- Secret rotation plan cho SSH key / DockerHub token định kỳ.
- Mask logs, không in env nhạy cảm, không dump context toàn cục.

# Next steps
- Sang phase 04 để chuẩn hóa rollback chiến lược per service/workflow.
