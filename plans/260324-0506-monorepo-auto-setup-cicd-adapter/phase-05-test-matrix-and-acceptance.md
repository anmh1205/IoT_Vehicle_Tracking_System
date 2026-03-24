# Context links
- Existing workflows: `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/*.yml`
- Adapter/hardening/rollback design: phase 02-04
- Docs baseline: `docs/codebase-summary.md`, `docs/system-architecture.md`

# Overview
- Priority: P1
- Current status: pending
- Brief: Định nghĩa ma trận kiểm thử CI/CD monorepo và tiêu chí nghiệm thu để merge an toàn.

# Key Insights
- Trọng tâm không phải test app logic, mà test đúng/không-đúng trigger behavior.
- Cần cả positive case (đúng path thì chạy) và negative case (khác path thì không chạy).
- Acceptance phải đo được qua run history GitHub Actions.

# Requirements
- Functional:
  - Ma trận changed-files x workflow expected outcome.
  - Checklist xác nhận auto-generated workflow không over-trigger.
  - Tiêu chí pass/fail cho trigger, secret, rollback drill.
- Non-functional:
  - Test plan chạy được với effort thấp, không cần infra mới.
  - Kết quả dễ audit trong PR review.

# Architecture
- Test matrix 4 nhóm:
  1) Root adapter-only changes.
  2) Single-service changes (Backend/Frontend/Mobile/MQTT/Infra).
  3) Multi-service changes.
  4) Docs-only or unrelated changes.
- Mỗi case map expected workflows: run / not-run / manual-check.

# Related code files
- Modify:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/*.yml` (nếu cần tinh chỉnh theo kết quả matrix)
- Create:
  - Test matrix table + acceptance checklist trong file plan này
- Delete:
  - None

# Implementation Steps
1. Tạo bảng test matrix: thay đổi file đại diện cho từng domain.
2. Định nghĩa expected workflows per case, gồm cả negative assertions.
3. Chạy dry-run qua PR thử nghiệm (các commit mẫu nhỏ) và thu evidence.
4. Chạy rollback drill tối thiểu cho 1 service build+deploy và 1 service deploy-only.
5. Chốt acceptance sign-off checklist trước merge.

# Todo list
- [ ] Hoàn thiện matrix changed-files x workflows.
- [ ] Viết acceptance checklist có owner + evidence links.
- [ ] Lập kịch bản rollback drill tối thiểu.
- [ ] Định nghĩa ngưỡng pass/fail rõ ràng.

# Success Criteria
- 100% case trong matrix cho kết quả đúng kỳ vọng trigger.
- 0 workflow không liên quan bị kích hoạt trong docs-only/unrelated changes.
- Rollback drill thành công theo runbook đã định nghĩa.

# Risk Assessment
- Risk: Không đủ case đại diện. Mitigation: lấy mẫu từ toàn bộ nhóm service hiện có.
- Risk: Flaky runs gây nhiễu kết quả. Mitigation: lặp case quan trọng >=2 lần.

# Security Considerations
- Test không dùng secret thật ở local; dùng GitHub-hosted environment controls.
- Log review bắt buộc để xác nhận không lộ secret.

# Next steps
- Sau nghiệm thu: chuyển status plan -> in-progress/completed theo kết quả thực thi implementation.
