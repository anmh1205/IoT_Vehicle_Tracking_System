# Phase 03 - Auto deploy khi push nhánh uat

## 1) Context links
- Plan tổng: `./plan.md`
- Bootstrap: `./phase-02-pr-gate-and-branch-protection.md`

## 2) Overview
- Priority: P1
- Status: pending
- Mục tiêu: sau khi push `uat`, workflow tự SSH deploy theo luồng bootstrap đã chốt.

## 3) Key Insights
- User chọn trigger auto `push uat`, không ưu tiên manual-only.

## 4) Requirements
- Functional:
  - Trigger workflow khi push `uat`.
  - Pull/update và redeploy dịch vụ cần thiết.
  - Có bước verify sau deploy.
- Non-functional:
  - Fail-fast, log rõ nguyên nhân để xử lý nhanh.

## 5) Architecture
- Trigger: `on.push.branches=[uat]`.
- Job deploy gọi SSH script (reuse bootstrap/update logic), rồi health check.

## 6) Related code files
- Files to modify:
  - `.github/workflows/backend-uat.yml`
  - `.github/workflows/frontend-uat.yml`
  - `.github/workflows/mqtt-bridge-uat.yml`
- Files to create:
  - `scripts/deploy/update-and-redeploy.sh`
- Files to delete:
  - Không.

## 7) Implementation Steps
1. Bật trigger `push uat` cho deploy jobs.
2. Tách logic update/redeploy thành script dùng lại.
3. Thêm verify step sau deploy (`/health` hoặc container status).

## 8) Todo List
- [ ] Bật trigger `push uat`.
- [ ] Hoàn tất script update/redeploy.
- [ ] Thêm verify sau deploy.

## 9) Success Criteria
- Push vào `uat` tự deploy thành công.
- Lỗi deploy trả fail status rõ trên GitHub Actions.

## 10) Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Deploy loop/fail liên tục | Medium | Medium | Guard điều kiện chạy + kiểm tra thay đổi |
| Downtime ngắn khi restart | Medium | Medium | Deploy theo thứ tự dịch vụ |

## 11) Security Considerations
- Dùng secrets từ GitHub, không hardcode token/password.
- Giới hạn quyền token registry/SSH ở mức tối thiểu.

## 12) Next Steps
- Chốt nghiệm thu UAT và theo dõi ổn định runtime.

## Unresolved questions
- Không.
