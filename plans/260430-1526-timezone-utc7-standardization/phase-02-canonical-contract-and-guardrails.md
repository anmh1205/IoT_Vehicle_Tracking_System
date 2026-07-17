# Context Links
- phase-01-repo-wide-timezone-surface-audit-freeze.md
- docs/code-standards.md

# Overview
- Priority: P1
- Current status: pending
- Brief description: Chuẩn hóa policy canonical time model + guardrails để chặn regression.

# Key Insights
- Full UTC+7 runtime everywhere tạo rủi ro drift + lock-in.
- Model ổn định nhất: UTC canonical nội bộ + UTC+7 business/display boundary.

# Requirements
- Functional requirements
  - Ban hành contract timestamp chuẩn cho payload/API/DB/report.
  - Define chuẩn parse/serialize/format timezone explicit.
- Non-functional requirements
  - Dễ enforce qua lint/checklist/review.
  - Rõ ràng cho backend/frontend/firmware teams.

# Architecture
- System design
  - Canonical fields: event_time_utc (epoch/ISO Z), business_time_zone fixed Asia/Ho_Chi_Minh.
- Component interactions
  - Convert chỉ ở presentation/business-boundary layer.
- Data flow
  - Ingestion normalize once, downstream read normalized.

# Related Code Files
- List of files to modify
  - docs/code-standards.md
  - API contract docs liên quan.
- List of files to create
  - timezone-contract checklist doc (under plan reports).
- List of files to delete
  - None.

# Implementation Steps
1. Viết timezone policy v1 (allowed formats, forbidden patterns).
2. Define day-boundary rule: [00:00, 24:00) Asia/Ho_Chi_Minh mapped to UTC range.
3. Define scheduler rule: cron intent local Asia/Ho_Chi_Minh explicit timezone config.
4. Define acceptance checks cho PR/release.

# Todo List
- [ ] Canonical contract signed off.
- [ ] Guardrail checklist ready.
- [ ] Regression rules published.

# Success Criteria
- Mọi team dùng chung 1 rulebook timezone.

# Risk Assessment
- Potential issues: Ambiguous field naming kéo dài migration.
- Mitigation strategies: chuẩn naming bắt buộc ngay đầu rollout.

# Security Considerations
- Auth/authorization: N/A.
- Data protection: giữ audit logs không chứa PII/time-correlated sensitive combos.

# Next Steps
- Dependencies: Phase 01.
- Follow-up tasks: Phase 03–08.