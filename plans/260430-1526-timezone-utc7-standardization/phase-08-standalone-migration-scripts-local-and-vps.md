# Context Links
- phase-03-database-and-query-boundary-standardization.md
- docs/deployment-guide.md (if updated)
- vps-control skill (implementation stage only)

# Overview
- Priority: P1
- Current status: pending
- Brief description: Thiết kế bộ script migration standalone cho local + VPS, dry-run, idempotent, backup-first, không phụ thuộc migration framework.

# Key Insights
- User chấp nhận rollout nhanh nhưng cần an toàn vận hành.
- Script standalone giúp kiểm soát thứ tự và rollback rõ hơn framework migration hiện hữu.

# Requirements
- Functional requirements
  - Có script precheck, backup, migrate, verify, rollback.
  - Hỗ trợ local và VPS cùng chuẩn flags.
  - Dry-run mô phỏng đầy đủ thay đổi.
  - Idempotent rerun không làm hỏng state.
  - Cover historical conversion cho **DB + metrics + logs**, không chỉ app config và SQL patches.

<!-- Updated: Validation Session 1 - metrics and logs historical conversion -->
- Non-functional requirements
  - Logging rõ, fail-fast, exit codes chuẩn.
  - Runtime ngắn, thao tác tối giản.

# Architecture
- System design
  - Script suite đề xuất:
    - 00-precheck-timezone-state.(sh|ps1)
    - 10-backup-db-and-config.(sh|ps1)
    - 20-apply-timezone-db-patches.(sh|ps1)
    - 30-apply-app-tz-config.(sh|ps1)
    - 40-verify-timezone-consistency.(sh|ps1)
    - 90-rollback-timezone-cutover.(sh|ps1)
- Component interactions
  - DB patch + app env TZ + scheduler config + observability config.
- Data flow
  - Snapshot state -> apply -> verify metrics/logs/report parity.

# Related Code Files
- List of files to modify
  - Deployment scripts/ops docs liên quan.
- List of files to create
  - Standalone migration scripts + runbook.
- List of files to delete
  - None.

# Implementation Steps
1. Define script contract flags: --dry-run, --apply, --target, --env local|vps, --backup-dir.
2. Define idempotency markers (state table/file/hash).
3. Define backup-first policy (DB dump + config snapshot + compose/env backup).
4. Define VPS execution strategy: upload bundle, precheck, gated apply, auto-stop on verify fail.
5. Define rollback order: app config rollback -> DB patch rollback/restore -> verify.

# Todo List
- [ ] Script interface spec finalized.
- [ ] Backup/restore checklist approved.
- [ ] Local+VPS runbook ready.

# Success Criteria
- Có thể chạy dry-run và apply lặp lại an toàn.
- Rollback có thể thực thi trong window chấp nhận được.

# Risk Assessment
- Potential issues: rollback DB logic không hoàn toàn reversible.
- Mitigation strategies: mandatory restore point + tested restore drill.

# Security Considerations
- Auth/authorization: principle of least privilege cho DB/SSH.
- Data protection: backup encryption + retention policy + access control.

# Next Steps
- Dependencies: Phase 02, Phase 03, Phase 04.
- Follow-up tasks: Phase 09.