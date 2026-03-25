# Phase 05 - Package Agent Workflow and Rollout Playbook

## Context links
- Plan: [plan.md](./plan.md)
- Previous phase: [phase-04-add-verification-and-safety-gates.md](./phase-04-add-verification-and-safety-gates.md)

## Overview
- Priority: P1
- Status: pending
- Description: Đóng gói workflow để agent có thể thực thi end-to-end bootstrap mọi project IoT theo checklist có sẵn.

## Key insights
- Repo đã có workflow/rules orchestration; cần map chúng thành "infra bootstrap playbook".
- Dùng contract + codegen + gates sẽ giảm phụ thuộc trí nhớ cá nhân.

## Requirements
- Functional:
1. Có 1 command sequence chuẩn cho agent: assess -> contract -> generate -> bootstrap -> verify -> handover.
2. Có prompt templates cho 3 mode: greenfield, migration, hardening.
3. Có RACI và owner matrix cho sign-off.
4. Có adoption docs + checklist cho team mới.
- Non-functional:
1. Onboarding engineer mới <= 1 ngày.
2. Runbook sự cố có MTTR target rõ.

## Architecture
- Workflow pack:
1. `playbook/bootstrap-greenfield.md`
2. `playbook/bootstrap-from-existing-stack.md`
3. `playbook/incident-and-rollback.md`
- Agent states:
1. `DISCOVER` -> collect constraints
2. `CONFIGURE` -> update catalog/profile
3. `GENERATE` -> build artifacts
4. `VERIFY` -> run gates
5. `DEPLOY` -> staged rollout
6. `OPERATE` -> monitor + improve

## Related code files
- Files to modify:
1. `.claude/rules/primary-workflow.md`
2. `.claude/rules/orchestration-protocol.md`
- Files to create:
1. `resources/docs/iot-infra-bootstrap-playbook.md`
2. `resources/docs/iot-infra-contract-guidelines.md`
3. `resources/docs/iot-infra-rollout-checklist.md`
4. `resources/docs/iot-infra-raci.md`
- Files to delete: none

## Implementation steps
1. Viết playbook end-to-end theo 6 states.
2. Define prompt templates và expected outputs từng state.
3. Define sign-off matrix: Platform, Backend, Firmware, SRE.
4. Add handover checklist và incident response checklist.
5. Chốt KPI rollout (time-to-bootstrap, change failure rate, MTTR).

## Todo list
- [ ] Hoàn tất 3 playbook docs.
- [ ] Hoàn tất prompt templates cho greenfield/migration/hardening.
- [ ] Hoàn tất RACI + sign-off gate.
- [ ] Hoàn tất KPI dashboard basics.

## Success criteria
- Team có thể lắp stack project mới theo playbook mà không phụ thuộc tác giả.
- Agent chạy workflow đầy đủ và sinh report đầy đủ mỗi lần bootstrap.

## Risk assessment
- Risk: playbook dài, khó áp dụng.
- Mitigation: tách quickstart 1 trang + checklist ngắn cho mode thông dụng.

## Security considerations
- Có security gate bắt buộc trước deploy: secrets, TLS, ACL, audit logs.
- Có quy trình rotate credential sau bootstrap.

## Next steps
- Đóng phase, move sang implementation sprint theo priority P0 -> P1.
