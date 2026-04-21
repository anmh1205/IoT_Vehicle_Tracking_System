# 1. Context links
- `phase-05-testing-and-quality-gates.md`
- `Tracking_VictoriaMetrics/docker-compose.yml`
- `Tracking_Grafana/provisioning/**`
- CI workflows liên quan backend/frontend/victoriametrics

# 2. Overview
- Priority: P1
- Status: pending
- Mục tiêu: rollout an toàn, có rollback/backfill rõ ràng, quan sát được.

# 3. Key Insights
- Rollout thành công phụ thuộc nhiều vào sequencing và feature flags.
- Retention/rule changes có blast radius lớn, cần canary + guardrails.
- Audit + metrics là nguồn sự thật để quyết định promote/rollback.

# 4. Requirements
- Rollout stages: dev → uat canary → uat full → production staged.
- Feature flags cho nhóm tài nguyên mới và activation actions.
- Runbook rollback:
  - API rollback revision,
  - infra rollback compose/config snapshot,
  - backfill control cho recording rules.

# 5. Architecture
<!-- Updated: Validation Session 1 - include runtime services and deploy-window retention policy -->
- Strategy khuyến nghị: progressive rollout theo tenant/rule-pack subset.
- Runtime rollout scope gồm `vmalert` + `vmauth` với health gates trước promote.
- Retention change policy: chỉ áp qua deploy/restart window; cấm hot-apply trực tiếp.
- Observability:
  - metrics: mutation rate, validation fail rate, activation fail rate, rollback count.
  - logs/audit correlation qua requestId + revisionId.
- Trade-offs:
  - Big-bang nhanh hơn nhưng rủi ro cao; staged rollout chậm hơn nhưng an toàn.

# 6. Related code files
- Modify:
  - backend/frontend config cho feature flags
  - deployment/workflow files liên quan nếu cần gate rollout
  - docs vận hành trong `docs/` sau khi implementation hoàn tất
- Create: runbook/checklist artifacts trong plan folder trước, sau đó chuẩn hóa vào docs khi release.
- Delete: none.

# 7. Implementation Steps
<!-- Updated: Validation Session 1 - runtime sequencing and retention maintenance window -->
1. Chuẩn hóa rollout checklist + rollback decision tree.
2. Triển khai sequencing runtime `vmalert` + `vmauth` với preflight health gates.
3. Chỉ apply retention changes trong maintenance deploy window đã chốt.
4. Bật feature flag theo cohort nhỏ.
5. Theo dõi SLO/error budget và audit anomalies.
6. Promote dần hoặc rollback ngay theo ngưỡng định sẵn.
7. Post-rollout review và cập nhật docs roadmap/changelog.

# 8. Todo list
- [ ] Chốt canary cohort và thời lượng quan sát.
- [ ] Chốt rollback trigger thresholds.
- [ ] Diễn tập rollback + backfill trên UAT.
- [ ] Chốt handover vận hành cho team.

# 9. Success Criteria
- Rollout không tạo incident severity cao.
- Rollback/backfill thao tác được trong thời gian mục tiêu.
- Audit trail đầy đủ cho mọi thay đổi production.

# 10. Risk Assessment
- Risk: sai cấu hình tenant/retention gây mất dữ liệu hoặc query degradation.
- Mitigation: preflight validation + irreversible warnings + staged activation.

# 11. Security Considerations
- Rotate/admin tokens theo window rollout.
- Tăng giám sát hành vi admin bất thường trong thời gian rollout.
- Khoá truy cập direct VM endpoints từ public surface.

# 12. Next steps
- Đóng plan, chuyển execution cho implementation chain (backend → frontend → test → review).

## Unresolved questions
- Cần maintenance window chính thức cho retention changes ở production không?