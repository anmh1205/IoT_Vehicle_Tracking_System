# Phase 02 - GitHub Actions validation and sequenced rollout

## 1) Context links
- Overview plan: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260407-1740-cicd-uat-end-to-end-activation/plan.md`
- Research 01: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260407-1740-cicd-uat-end-to-end-activation/research/researcher-01-github-actions-rollout.md`
- Workflow folder: `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/`

## 2) Overview
- Date: 2026-04-07
- Description: Validate workflow UAT bằng pilot runs, rollout tuần tự theo dependency chain.
- Priority: P1
- Implementation status: in-progress
- Review status: reviewed

## 3) Key Insights
- Rollout đồng loạt tăng blast radius; cần kích hoạt theo chain phụ thuộc.
- `concurrency` bắt buộc cho deploy `uat` để tránh chồng run.
- Mobile build độc lập khỏi runtime chain để tránh chặn release hạ tầng.

## 4) Requirements
- Functional:
  - Pilot chạy tay từng workflow trên `uat`.
  - Kích hoạt rollout theo thứ tự: `postgresql -> emqx -> backend -> mqtt-bridge -> frontend -> grafana`.
  - Mobile workflow chạy độc lập.
- Non-functional:
  - Mỗi bước có evidence run log + artifact.
  - Chỉ sang service kế tiếp khi service trước đạt pass.

## 5) Architecture
- Deployment orchestration bởi GitHub Actions per-service.
- Chain runtime cố định (critical path):
  1) postgresql
  2) emqx
  3) backend
  4) mqtt-bridge
  5) frontend
  6) grafana
- Mobile: lane riêng, không block runtime Go/No-Go.

## 6) Related code files
- Modify (expected):
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/postgresql-uat.yml`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/emqx-uat.yml`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/backend-uat.yml`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/mqtt-bridge-uat.yml`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/frontend-uat.yml`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/grafana-uat.yml`
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/mobile-uat.yml`
- Create: none.
- Delete: none.

## 7) Implementation Steps
1. Preflight trước pilot:
   - `gh workflow list`
   - `gh run list --branch uat --limit 20`
2. Pilot trigger tuần tự từng service trên `uat`:
   - `gh workflow run "postgresql-uat.yml" --ref uat`
   - `gh workflow run "emqx-uat.yml" --ref uat`
   - `gh workflow run "backend-uat.yml" --ref uat`
   - `gh workflow run "mqtt-bridge-uat.yml" --ref uat`
   - `gh workflow run "frontend-uat.yml" --ref uat`
   - `gh workflow run "grafana-uat.yml" --ref uat`
3. Theo dõi từng run trước khi sang bước kế:
   - `gh run list --branch uat --limit 20`
   - `gh run watch <run-id>`
   - `gh run view <run-id> --log`
4. Mobile lane độc lập:
   - `gh workflow run "mobile-uat.yml" --ref uat`
5. Nếu fail:
   - `gh run cancel <run-id>`
   - `gh run rerun <run-id> --failed`
   - Nếu fail lặp: `gh workflow disable "<workflow>"` để freeze.
   - <!-- Updated: Validation Session 1 - freeze threshold -->
   - Auto-freeze policy: freeze khi cùng workflow fail liên tiếp **3 lần** trên `uat`.

## 8) Todo List
- [ ] Pilot 6 workflow runtime theo đúng thứ tự.
- [ ] Theo dõi log và lưu evidence từng run.
- [ ] Kích hoạt mobile lane độc lập.
- [ ] Thiết lập/kiểm tra concurrency cho deploy job.
- [ ] Freeze + rerun policy khi fail lặp.

## 9) Success Criteria
- 6 workflow runtime pass ít nhất 1 chu kỳ tuần tự đầy đủ.
- Không có deploy run song song ngoài chủ đích trên `uat`.
- Mobile workflow chạy độc lập thành công hoặc fail không chặn runtime lane.

## 10) Risk Assessment
- Risk: Out-of-order deploy gây lỗi dependency.
  - Mitigation: hard gate tuần tự theo chain.
- Risk: Run treo/chồng chéo.
  - Mitigation: concurrency + cancel run cũ.

## 11) Security Considerations
- Chỉ dùng secrets ở scope `environment: uat` khi cần.
- Log masking bắt buộc cho secret-like values.
- Ràng buộc workflow dispatch ref về `uat`.

## 12) Next Steps
- Sang Phase 03 để verify VPS sâu theo service-level pass/fail gates.
