# Phase 02 - Define minimum contract and profile baseline

## Context links
- Previous: [phase-01-audit-current-state-and-contract-gaps.md](./phase-01-audit-current-state-and-contract-gaps.md)
- Plan: [plan.md](./plan.md)

## Overview
- Priority: P1
- Status: pending
- Brief: chốt contract tối thiểu + baseline profile, chỉ đủ để ship thin-slice.

## Key insights
- Hiện có 4 families rõ (`rawdata/status/events/firmware`) từ topic constants.
- `rawdata` đã có luồng đầy đủ metrics/logs/db, phù hợp chọn làm thin-slice đầu.
- DB schema đã có `devices`, `event_logs`, `firmware_update_log` để map dần.

## Requirements
- Functional:
1. Define `minimum-catalog` cho 1 family (`rawdata`) + envelope fields bắt buộc.
2. Define baseline `uat` profile (retention, auth mode, health checks).
3. Define compatibility rule add-only cho field mới.
- Non-functional:
1. Contract đơn giản, đọc trong <10 phút.
2. Không introduce generator đầy đủ ở phase này.

## Architecture
- Minimum contract blocks:
1. topic pattern
2. payload schema ref
3. sink projection: postgres/metrics/logs
4. cardinality policy (allowed labels)
- Profile baseline:
1. service endpoints
2. retry/backoff defaults
3. SLO placeholders để phase 04 gate.

## Related code files
- Target references:
1. `.../src/constants/topics.ts`
2. `.../src/validators/payload.validator.ts`
3. `.../src/infrastructure/victoriametrics.ts`
4. `.../src/infrastructure/victorialogs.ts`

## Implementation steps
1. Chốt envelope tối thiểu: `device_id`, `timestamp`, `type`, `schema_version`.
2. Chốt policy labels: chỉ `device_id` giai đoạn đầu.
3. Chốt stream fields logs tối thiểu.
4. Chốt profile `uat` defaults + health endpoints.
5. Viết acceptance checklist cho phase 03.

## Todo list
- [ ] Minimum catalog draft.
- [ ] UAT profile baseline draft.
- [ ] Compatibility checklist draft.

## Success criteria
- Một dev mới có thể hiểu contract mà không đọc code handlers.
- Không thêm abstraction dư thừa.

## Risk assessment
- Risk: cố nhét multi-tenant sớm.
- Mitigation: tenant_id optional, chưa bật gate bắt buộc.

## Security considerations
- Quy định token/auth context bắt buộc ở contract metadata.

## Next steps
- Dùng minimum contract để làm phase 03 thin-slice E2E.

## Unresolved questions
- Tenant boundary activate ở phase 03 hay phase 05?
