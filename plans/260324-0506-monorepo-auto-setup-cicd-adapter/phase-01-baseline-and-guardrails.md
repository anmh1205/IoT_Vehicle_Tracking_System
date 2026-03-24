# Context links
- README: `E:/anmh1205/IoT_Vehicle_Tracking_System/README.md`
- Workflows hiện tại: `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/*.yml`
- Kiến trúc/tổng quan: `docs/codebase-summary.md`, `docs/system-architecture.md`, `docs/project-overview-pdr.md`

# Overview
- Priority: P1
- Current status: pending
- Brief: Chốt baseline trigger-path của monorepo và đặt guardrails “không phá workflow UAT hiện tại”.

# Key Insights
- Hiện tại mỗi service đã có workflow tách biệt, trigger theo `branches: [uat]` + `paths` cụ thể.
- Root repo chưa có `docker-compose.yml`; đây là gap cho tool auto-detect quét root.
- Hệ thống deploy đang phụ thuộc secret SSH + DockerHub; thay đổi trigger sai dễ bắn deploy ngoài ý muốn.

# Requirements
- Functional:
  - Lập inventory trigger/path/secrets theo từng workflow hiện hữu.
  - Xác định workflow nào có build, workflow nào chỉ deploy config.
- Non-functional:
  - Không thay đổi hành vi pipeline hiện tại ở phase baseline.
  - Tài liệu hóa rollback point trước mọi thay đổi.

# Architecture
- Tạo “compatibility layer” ở root cho auto-detect, nhưng cô lập khỏi runtime path của service.
- Giữ nguyên kiến trúc workflow theo service; chỉ thêm guard và policy tối thiểu.

# Related code files
- Modify:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/*.yml` (phase sau)
- Create:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260324-0506-monorepo-auto-setup-cicd-adapter/*`
- Delete:
  - None

# Implementation Steps
1. Snapshot trigger hiện tại: branch, paths, job graph, secrets dùng trong từng workflow.
2. Phân loại workflow: build+deploy (backend/frontend/mqtt), deploy-only (infra stacks), build-only (mobile).
3. Chốt nguyên tắc: “không mở rộng trigger scope”, “không đổi contract secret hiện tại”.
4. Viết baseline checklist để dùng làm gate cho phase sau.

# Todo list
- [ ] Lập bảng inventory workflow hiện tại.
- [ ] Xác nhận danh sách secrets bắt buộc theo workflow.
- [ ] Chốt guardrails anti over-trigger.
- [ ] Tạo baseline acceptance checklist.

# Success Criteria
- Có bảng baseline đầy đủ cho toàn bộ workflow UAT + diagram-pack.
- Có guardrails rõ ràng, dùng được trong review PR.

# Risk Assessment
- Risk: Bỏ sót một workflow edge-case. Mitigation: review toàn bộ `.github/workflows/*.yml`.
- Risk: Hiểu sai trigger path. Mitigation: đối chiếu path với tree service thực tế.

# Security Considerations
- Không expose secret values trong plan/report.
- Chỉ mô tả secret contract (tên + mục đích + phạm vi dùng).

# Next steps
- Sang phase 02 để thiết kế root adapter compose tối thiểu, an toàn default.
