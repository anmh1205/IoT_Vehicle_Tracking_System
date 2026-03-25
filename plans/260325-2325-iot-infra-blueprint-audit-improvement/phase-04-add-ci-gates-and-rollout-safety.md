# Phase 04 - Add CI gates and rollout safety

## Context links
- Previous: [phase-03-thin-slice-generate-and-wire-single-message-family.md](./phase-03-thin-slice-generate-and-wire-single-message-family.md)
- Plan: [plan.md](./plan.md)

## Overview
- Priority: P1
- Status: pending
- Brief: thêm gate kiểm chứng contract + replay + rollout safety trước khi scale.

## Key insights
- `mqtt-bridge-uat.yml` có typecheck/build nhưng chưa có contract/replay gate (`:24-43`).
- Infra workflows (EMQX/PG/VM) là deploy trực tiếp, thiếu go/no-go chung.

## Requirements
- Functional:
1. Gate validate contract (lint + compatibility).
2. Gate replay rawdata fixture -> verify sink outputs.
3. Rollout safety: canary %, rollback checklist, abort conditions.
- Non-functional:
1. Tổng gate thêm <= 20 phút.
2. Fail reason rõ và actionable.

## Architecture
- 3 lớp gate:
1. Static: contract/schema.
2. Dynamic: replay integration.
3. Runtime: canary health SLO.
- Go/no-go metrics:
1. invalid payload rate
2. sink write failure rate
3. ingest-to-store latency p95

## Related code files
- CI references:
1. `.github/workflows/mqtt-bridge-uat.yml`
2. `.github/workflows/emqx-uat.yml`
3. `.github/workflows/postgresql-uat.yml`

## Implementation steps
1. Add pre-deploy contract job trong pipeline bridge.
2. Add replay fixture job với artifact report.
3. Add rollout checklist + manual approval step cho infra changes.
4. Define rollback trigger rõ theo ngưỡng.

## Todo list
- [ ] Contract gate spec.
- [ ] Replay gate spec.
- [ ] Rollback trigger matrix.

## Success criteria
- Không deploy thin-slice nếu fail contract/replay.
- Có thể rollback trong 1 runbook.

## Risk assessment
- Risk: gate quá chậm làm team bypass.
- Mitigation: chạy fast static gate trước, dynamic gate theo changed paths.

## Security considerations
- Gate phải check secret leakage cơ bản ở generated config.

## Next steps
- Pass phase 04 mới cho phép mở rộng families phase 05.

## Unresolved questions
- Owner duyệt manual gate: Platform lead hay SRE on-call?
