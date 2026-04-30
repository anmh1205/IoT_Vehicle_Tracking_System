# Context Links
- phase-08-standalone-migration-scripts-local-and-vps.md
- README.md quality gates

# Overview
- Priority: P1
- Current status: pending
- Brief description: Validation toàn stack, rollout nhanh có kiểm soát, rollback sẵn sàng.

# Key Insights
- Timezone bugs hay lộ ở boundary times và cross-system reconciliation.
- Validation Session 1 đã chốt **đổi đồng loạt một lần**, nên phase này phải tăng preflight rehearsal và rollback gates thay cho canary mặc định.

<!-- Updated: Validation Session 1 - one-shot scheduler cutover -->

# Requirements
- Functional requirements
  - Test matrix cover backend/DB/frontend/firmware/MQTT/cron/report/export/analytics.
  - Preflight rehearsal bắt buộc (local full dry-run) + one-shot cutover criteria.
  - Rollback trigger conditions rõ ràng.
- Non-functional requirements
  - MTTR thấp nếu rollback.
  - Observability đủ để quyết định trong cutover window.

# Architecture
- System design
  - 2-stage rollout: local preflight rehearsal -> production one-shot cutover.
- Component interactions
  - Validate consistency: MQTT ingest timestamp == DB == API == UI/export.
- Data flow
  - Synthetic + real samples around UTC midnight and UTC+7 midnight.

# Related Code Files
- List of files to modify
  - Test suites, CI checks, runbooks, monitoring alerts.
- List of files to create
  - Validation checklist + rollback decision tree.
- List of files to delete
  - Temporary compatibility checks sau stabilization.

# Implementation Steps
1. Build test matrix (critical scenarios + expected outcomes).
2. Define cutover KPIs: skew rate, out-of-order rate, report parity, cron punctuality.
3. Execute local preflight rehearsal end-to-end (mandatory go/no-go gate).
4. Go/no-go decision theo objective thresholds.
5. One-shot full cutover; keep heightened monitoring period.
6. If thresholds fail -> execute rollback runbook immediately.

# Todo List
- [ ] Test matrix approved.
- [ ] Canary thresholds approved.
- [ ] Rollback drill completed.

# Success Criteria
- Zero critical timezone defects sau stabilization window.
- Business reports/day-boundaries chính xác và nhất quán.

# Risk Assessment
- Potential issues: silent skew nhỏ khó phát hiện sớm.
- Mitigation strategies: parity dashboards + anomaly alerts + manual spot checks.

# Security Considerations
- Auth/authorization: giới hạn người được phép cutover/rollback.
- Data protection: đảm bảo backup/restore trails đầy đủ audit.

# Next Steps
- Dependencies: Phases 03–08.
- Follow-up tasks: cập nhật docs roadmap/changelog/architecture khi implementation xong.