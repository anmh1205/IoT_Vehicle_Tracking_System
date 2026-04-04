# Phase 06 — Quality Gates and Risk Register

## Context links
- Parent plan: [plan.md](plan.md)
- Drafting phase: [phase-05-drafting-core-guides.md](phase-05-drafting-core-guides.md)

## Overview
- Date: 2026-04-04
- Description: định nghĩa cổng chất lượng bắt buộc trước khi chấp nhận bộ tài liệu.
- Priority: P1
- Implementation status: pending
- Review status: pending

## Key Insights
- Không có quality gates thì tài liệu dễ đúng cục bộ nhưng sai hệ thống.
- Risk register phải đi kèm owner/action, không chỉ liệt kê rủi ro.

## Requirements
- Quality gates bắt buộc:
  1) correctness gate
  2) consistency gate
  3) traceability gate
  4) confidence gate (A/B/C)
  5) unresolved-questions gate
- Risk register bắt buộc có:
  - risk_id, description, impact, likelihood, owner, mitigation, status

## Architecture
- Review board 2-pass:
  - Pass A: technical validity
  - Pass B: documentation coherence and usability

## Related code files
- Modify: none (planning only)
- Create: quality checklist + risk register templates
- Reference-only:
  - `docs/code-standards.md`
  - `docs/project-overview-pdr.md`

## Implementation Steps
1. Define measurable criteria for each gate.
2. Define failure handling workflow for each gate.
3. Create risk register initial entries (vendor conflict, version drift, variant mismatch).
4. Define exit criteria for unresolved questions.

## Todo list
- [ ] Freeze quality gate checklist.
- [ ] Freeze risk register schema.
- [ ] Seed initial risks from research reports.

## Success Criteria
- Mỗi gate có pass/fail criteria rõ.
- Risk register có owner + action cho mọi risk high/medium.
- Unresolved questions tracking có closure rule.

## Risk Assessment
- Risk: gate quá nặng làm chậm tiến độ.
  - Mitigation: keep gate metrics minimal but strict.
- Risk: confidence inflation do pressure deadline.
  - Mitigation: confidence cap rules by evidence class.

## Security Considerations
- Review riêng các mục liên quan power/reset/OTA command safety.

## Next steps
- Move to Phase 07: final review package + implementation handover.
