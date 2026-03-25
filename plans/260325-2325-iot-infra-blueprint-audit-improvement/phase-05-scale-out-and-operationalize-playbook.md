# Phase 05 - Scale out and operationalize playbook

## Context links
- Previous: [phase-04-add-ci-gates-and-rollout-safety.md](./phase-04-add-ci-gates-and-rollout-safety.md)
- Plan: [plan.md](./plan.md)

## Overview
- Priority: P2
- Status: pending
- Brief: mở rộng từ rawdata sang status/events/firmware + chuẩn hóa vận hành.

## Key insights
- `status/event/firmware` handlers có khác biệt business side-effects, không nên ép đồng nhất sớm.
- DB tables đã tách domain, cho phép rollout theo family.

## Requirements
- Functional:
1. Scale contract-driven từ 1 -> 4 message families.
2. Chuẩn hóa playbook vận hành (deploy, monitor, rollback, incident).
3. Chốt owner sign-off matrix cross-team.
- Non-functional:
1. Onboarding mới < 1 ngày cho flow chuẩn.
2. Change failure rate giảm theo sprint.

## Architecture
- Expansion waves:
1. Wave A: `status`
2. Wave B: `events`
3. Wave C: `firmware`
- Mỗi wave phải pass phase 04 gates trước khi bật default.

## Related code files
- References:
1. `.../src/handlers/status.handler.ts`
2. `.../src/handlers/event.handler.ts`
3. `.../src/handlers/firmware.handler.ts`
4. `.../init/04-event-logs.sql`
5. `.../init/05-firmware.sql`

## Implementation steps
1. Apply cùng pattern thin-slice cho từng family.
2. Track KPI: pass rate gates, rollback count, MTTR.
3. Xuất playbook ngắn cho on-call.
4. Định kỳ review cardinality/retention policy.

## Todo list
- [ ] Scale status.
- [ ] Scale events.
- [ ] Scale firmware.
- [ ] Freeze playbook v1.

## Success criteria
- 4 families chạy contract-driven ổn định.
- Team có runbook + owner rõ khi incident.

## Risk assessment
- Risk: cardinality bùng nổ khi scale.
- Mitigation: policy cứng + alert sớm ở VM/VL.

## Security considerations
- Validate masking rules cho fields nhạy cảm mỗi family.

## Next steps
- Chuyển từ project-specific sang platform blueprint reusable.

## Unresolved questions
- Multi-tenant hard isolation có cần trước khi reusable cross-project?
