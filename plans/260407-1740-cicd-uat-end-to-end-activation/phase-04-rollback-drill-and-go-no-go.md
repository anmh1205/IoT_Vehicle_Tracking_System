# Phase 04 - Rollback drill and Go/No-Go

## 1) Context links
- Overview plan: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260407-1740-cicd-uat-end-to-end-activation/plan.md`
- Research 02 rollback playbook: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260407-1740-cicd-uat-end-to-end-activation/research/researcher-02-vps-verify-rollback.md`
- Phase 03 gates: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260407-1740-cicd-uat-end-to-end-activation/phase-03-vps-deploy-verification-and-observability-gates.md`

## 2) Overview
- Date: 2026-04-07
- Description: Diễn tập rollback có kiểm soát và chốt quyết định vận hành UAT.
- Priority: P1
- Implementation status: pending
- Review status: pending

## 3) Key Insights
- Rollback hiệu quả nhất: pin image tag + backup compose/env trước deploy.
- Khi fail lặp phải freeze workflow trước, không retry mù.
- Go/No-Go phải dựa evidence kỹ thuật, không dựa cảm tính.

## 4) Requirements
- Functional:
  - Thực hiện 1 rollback drill đầy đủ (tag rollback hoặc compose/env rollback).
  - Verify lại sau rollback theo Gate A..F.
  - Ra quyết định Go/No-Go có biên bản.
- Non-functional:
  - MTTR rollback mục tiêu ban đầu: <= 20 phút cho runtime chain.
  - Không làm mất dữ liệu cấu hình vận hành.

## 5) Architecture
- Rollback paths:
  1) Image tag rollback (ưu tiên)
  2) Compose/env file rollback (khi config drift)
- Verification sau rollback dùng lại cùng gating logic để DRY, tránh check kép khác chuẩn.

## 6) Related code files
- Modify (expected):
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/*-uat.yml` (thêm/siết job rollback orchestration nếu thiếu)
- Create: none.
- Delete: none.

## 7) Implementation Steps
1. Pre-rollback snapshot trên VPS:
   - `cp "$COMPOSE_FILE" "$COMPOSE_FILE.bak.$(date +%Y%m%d%H%M%S)"`
   - `cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%Y%m%d%H%M%S)"`
2. Simulate failure condition (an toàn, kiểm soát).
3. Rollback path 1 (image tag):
   - Sửa image pin về bản stable trong release manifest dùng **immutable digest**.
   - `docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull`
   - `docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d`
   - <!-- Updated: Validation Session 1 - immutable digest -->
4. Nếu path 1 không phục hồi, rollback path 2 (config):
   - `cp "$COMPOSE_FILE.bak.<timestamp>" "$COMPOSE_FILE"`
   - `cp "$ENV_FILE.bak.<timestamp>" "$ENV_FILE"`
   - `docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d`
5. Re-verify Gate A..F + service pass/fail matrix.
6. Workflow control khi incident:
   - `gh workflow disable "<deploy-workflow>"`
   - `gh run cancel <run-id>`
   - ổn định xong mới `gh workflow enable "<deploy-workflow>"`.

## 8) Todo List
- [ ] Chụp backup compose/env trước drill.
- [ ] Thực thi rollback path 1.
- [ ] Thực thi path 2 nếu cần.
- [ ] Đo MTTR thực tế.
- [ ] Lập biên bản Go/No-Go cuối cùng.

## 9) Success Criteria
- Rollback drill phục hồi toàn bộ runtime chain theo đúng thứ tự service.
- Sau rollback, toàn bộ pass/fail matrix ở Phase 03 đều PASS.
- MTTR <= mục tiêu chấp nhận nội bộ.

## 10) Risk Assessment
- Risk: rollback thành công một phần, bỏ sót service downstream.
  - Mitigation: verify bắt buộc theo chain chuẩn từ postgresql đến grafana.
- Risk: rollback bằng mutable tag gây bất định.
  - Mitigation: ưu tiên immutable digest hoặc release manifest cố định.

## 11) Security Considerations
- Backup file không chứa secret plaintext trong artifact công khai.
- Audit trail bắt buộc cho thao tác disable/enable workflow.
- Chỉ người có quyền release mới được chốt Go/No-Go.

## 12) Next Steps
- Nếu GO: chuyển sang steady-state vận hành UAT, theo dõi failure rate/MTTR hàng tuần.
- Nếu NO-GO: freeze deploy lane, mở incident RCA, sửa workflow/config trước khi thử lại.
