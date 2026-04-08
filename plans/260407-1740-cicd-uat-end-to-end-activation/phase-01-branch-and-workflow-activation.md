# Phase 01 - Branch and workflow activation

## 1) Context links
- Overview plan: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260407-1740-cicd-uat-end-to-end-activation/plan.md`
- Research 01: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260407-1740-cicd-uat-end-to-end-activation/research/researcher-01-github-actions-rollout.md`
- README CI/CD + startup order: `E:/anmh1205/IoT_Vehicle_Tracking_System/README.md`
- Workflow directory: `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/`

## 2) Overview
- Date: 2026-04-07
- Description: Kích hoạt branch/deploy control-plane cho UAT với gián đoạn tối thiểu.
- Priority: P1
- Implementation status: pending
- Review status: pending

## 3) Key Insights
- GitHub chỉ hiển thị workflow trên default branch `main`; workflow `*-uat.yml` phải hiện diện trên `main` để quản trị/trigger ổn định.
- `uat` đang thiếu; cần tạo branch deploy tách biệt để không ảnh hưởng flow phát triển trên `main`.
- Guardrails phải bật trước rollout runtime: branch protection + environment `uat` + concurrency.

## 4) Requirements
- Functional:
  - Tạo nhánh `uat` từ commit ổn định trên `main`.
  - Đảm bảo workflow `*-uat.yml` xuất hiện trên `main`.
  - Chỉ cho deploy runtime trigger trên `uat`.
- Non-functional:
  - Không gián đoạn pipeline hiện có của `main`.
  - Thao tác có thể audit bằng `gh` command history.

## 5) Architecture
- Control plane:
  - `main`: source of truth, review/merge.
  - `uat`: runtime deployment branch.
- Trigger plane:
  - `push: uat` + path filters cho từng service.
- Protection plane:
  - Branch protection `uat` + environment protection `uat`.

## 6) Related code files
- Modify (expected):
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/backend-uat.yml`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/frontend-uat.yml`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/mqtt-bridge-uat.yml`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/postgresql-uat.yml`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/emqx-uat.yml`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/grafana-uat.yml`
- Create: none (plan-only phase).
- Delete: none.

## 7) Implementation Steps
1. Baseline repo/workflow state:
   - `gh auth status`
   - `gh repo view --json nameWithOwner,defaultBranchRef`
   - `gh workflow list`
2. Tạo nhánh `uat` từ `main` và push upstream:
   - `git fetch origin`
   - `git checkout main && git pull --ff-only`
   - `git checkout -b uat`
   - `git push -u origin uat`
3. Đưa workflow UAT lên `main` qua PR (không deploy trực tiếp):
   - Mở PR chứa `*-uat.yml` vào `main`.
   - Merge sau review.
4. Thiết lập guardrails GitHub:
   - Branch protection cho `uat`: required checks, no force-push, no delete.
   - Environment `uat`: required reviewer, prevent self-review.
5. Xác nhận workflow đã visible + triggerable:
   - `gh workflow list`
   - `gh workflow view "backend-uat.yml"`

## 8) Todo List
- [ ] Tạo `uat` branch từ `main`.
- [ ] Merge workflow UAT vào `main`.
- [ ] Bật protection cho `uat`.
- [ ] Bật environment gate `uat`.
- [ ] Chụp baseline evidence bằng `gh`.

## 9) Success Criteria
- `uat` branch tồn tại remote và được bảo vệ.
- Workflow UAT hiện trong `gh workflow list`.
- Không có deploy runtime chạy trên `main` ngoài policy.

## 10) Risk Assessment
- Risk: Workflow chưa trên `main` -> không thấy/khó trigger.
  - Mitigation: Merge workflow definition vào `main` trước rollout.
- Risk: Push nhầm `main` kích hoạt deploy.
  - Mitigation: Trigger branch filter chỉ `uat`.

## 11) Security Considerations
- Duy trì least-privilege cho GITHUB_TOKEN (`permissions` tối thiểu).
- Không lộ secrets trong logs hoặc artifact.
- Chặn self-approval cho deployment environment.

## 12) Next Steps
- Sang Phase 02 để chạy pilot workflow theo thứ tự dịch vụ.
