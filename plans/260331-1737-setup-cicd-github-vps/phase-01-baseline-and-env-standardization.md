# Phase 01 - GitHub env/secrets baseline (tối giản)

## 1) Context links
- Plan tổng: `./plan.md`
- Repo workflows: `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/*.yml`

## 2) Overview
- Priority: P1
- Status: pending
- Mục tiêu: set đủ env/secrets trên GitHub repo để workflow deploy chạy được.

## 3) Key Insights
- Scope chỉ cần key names tối thiểu cho deploy, không chuẩn hóa toàn bộ hệ thống ở sprint này.

## 4) Requirements
- Functional:
  - Liệt kê required GitHub secrets/env cho deploy `uat`.
  - Khai báo secret names dùng trong workflow.
- Non-functional:
  - Không ghi secret values vào repo/docs.

## 5) Architecture
- Secret source of truth: GitHub repository secrets/environments.
- Workflow đọc secret theo tên cố định; VPS chỉ nhận qua SSH runtime context.

## 6) Related code files
- Files to modify:
  - `.github/workflows/backend-uat.yml`
  - `.github/workflows/frontend-uat.yml`
  - `.github/workflows/mqtt-bridge-uat.yml`
- Files to create:
  - `docs/cicd-required-secrets-and-env.md`
- Files to delete:
  - Không.

## 7) Implementation Steps
1. Chốt danh sách secret/env bắt buộc cho deploy UAT.
2. Đồng bộ tên biến trong workflow.
3. Tạo checklist verify secrets trước khi bật auto deploy.

## 8) Todo List
- [ ] Chốt required secret/env list.
- [ ] Đồng bộ tên biến workflow.
- [ ] Hoàn tất checklist verify.

## 9) Success Criteria
- Workflow đọc đủ biến cần thiết, không hardcode secret.

## 10) Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Thiếu secret | Medium | High | Preflight check trước bước deploy |
| Sai tên biến | Medium | High | Centralized naming trong docs + workflow |

## 11) Security Considerations
- Không commit giá trị secret.
- Rotate nếu phát hiện lộ lọt.

## 12) Next Steps
- Bàn giao secret names cho Phase 02 bootstrap VPS.

## Unresolved questions
- Không.
