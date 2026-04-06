# Context links
- Metrics/log entry points: `Tracking_Backend/src/api/routes/metrics.routes.ts`, `src/infrastructure/logger`, Victoria/Grafana stack
- Current docs: `../../docs/system-architecture.md`, `../../docs/project-changelog.md`

# Overview
- Priority: P2
- Current status: pending
- Mục tiêu phase: đảm bảo theo dõi được policy engine trước khi bật rộng.

# Key Insights
- Không có observability thì không phân biệt bug logic vs GPS noise.
- Rollout cần read-only shadow mode trước để giảm blast radius.

# Requirements
- Functional
  - Metrics cho evaluator throughput, latency, state transitions, violations.
  - Structured logs có reason_code, policy_type, vehicle_id, correlation_id.
  - Feature flags rollout: per policy type/per vehicle segment.
- Non-functional
  - Dashboard + alert rule đủ để vận hành 24/7.
  - Có runbook rollback nhanh.

# Architecture
- Metrics tối thiểu
  - `policy_eval_total{type,result}`
  - `policy_eval_duration_ms_bucket`
  - `policy_violation_total{type,severity}`
  - `policy_false_positive_suspect_total`
  - `quota_reset_total{cycle}`
- Rollout stages
  1) Shadow mode: chỉ log/metric.
  2) Soft alert: tạo violation severity thấp.
  3) Full enforcement signal: severity theo policy.
- <!-- Updated: Validation Session 1 - per-policy-enforcement-matrix -->
  Enforcement matrix (MVP): xử lý theo từng policy type (ví dụ distance quota có thể alert-first, admin-boundary có thể escalation mạnh hơn), không áp dụng một chế độ chung cho toàn bộ policy.
- Migration strategy
  - Blue/green DB change theo additive schema trước, đọc song song cũ+mới, cutover sau verify.

# Related code files
- Modify
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/logger/*`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/metrics.routes.ts`
  - `iot-vehicle-tracking-system-cloud/Tracking_Grafana/provisioning/**`
  - `iot-vehicle-tracking-system-cloud/Tracking_VictoriaMetrics/docker-compose.yml`
- Create
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/services/policy-rollout-config.service.ts`
- Delete
  - None.

# Implementation Steps
1. Định nghĩa metric schema + label cardinality giới hạn.
2. Thiết kế log format chuẩn cho evaluator decision.
3. Thêm feature flag config và default rollout plan.
4. Thiết kế dashboard panels + alerts (error burst, false positive spike).
5. Viết rollback playbook (disable flags, isolate policy type, backfill state).

# Todo list
- [ ] Chốt SLO/SLA cho evaluator.
- [ ] Chốt threshold alert production.
- [ ] Chốt rollout cohort (internal vehicles -> limited fleet -> full fleet).
- [ ] Chốt runbook incident.

# Success Criteria
- Có thể quan sát đầy đủ từ ingest event tới violation decision.
- Rollout không làm tăng incident nghiêm trọng.
- Có rollback trong vài phút không cần deploy nóng.

# Risk Assessment
- Risk: metric cardinality nổ do label sai.
- Mitigation: chỉ giữ label cần thiết, không gắn raw coordinates vào labels.

# Security Considerations
- Log redaction cho token/PII.
- Chặn truy cập trái phép dashboard ops.
- Audit mọi thay đổi feature flags.

# Next steps
- Sang Phase 06 để khóa test matrix và acceptance gate trước triển khai rộng.
