---
title: "IoT Infra Blueprint Audit Improvement Plan"
description: "Đối chiếu blueprint với codebase hiện tại, khóa gap/risk và rollout cải tiến theo thin-slice."
status: pending
priority: P1
effort: 2w
branch: feature/cicd
tags: [iot, infra, audit, mqtt-bridge, emqx, postgresql, observability]
created: 2026-03-25
---

# Plan overview

## Mục tiêu
- Đối chiếu `plans/260325-2126-iot-infra-rapid-bootstrap-blueprint` với hiện trạng code.
- Chỉ ra gap/risk thực tế, ưu tiên theo impact.
- Chốt lộ trình progressive disclosure: mỏng trước, mở rộng sau.

## Phases
| Phase | Status | Progress | File |
|---|---|---:|---|
| 01. Audit current state and contract gaps | pending | 0% | [phase-01-audit-current-state-and-contract-gaps.md](./phase-01-audit-current-state-and-contract-gaps.md) |
| 02. Define minimum contract and profile baseline | pending | 0% | [phase-02-define-minimum-contract-and-profile-baseline.md](./phase-02-define-minimum-contract-and-profile-baseline.md) |
| 03. Thin slice generate and wire single message family | pending | 0% | [phase-03-thin-slice-generate-and-wire-single-message-family.md](./phase-03-thin-slice-generate-and-wire-single-message-family.md) |
| 04. Add CI gates and rollout safety | pending | 0% | [phase-04-add-ci-gates-and-rollout-safety.md](./phase-04-add-ci-gates-and-rollout-safety.md) |
| 05. Scale out and operationalize playbook | pending | 0% | [phase-05-scale-out-and-operationalize-playbook.md](./phase-05-scale-out-and-operationalize-playbook.md) |

## Progressive disclosure strategy
1. Audit + boundary decisions trước, tránh design lớn chưa cần.
2. Chốt minimum contract cho 1 family (`rawdata`) + 1 profile (`uat`).
3. Ship thin-slice end-to-end có đo được quality/safety.
4. Bật CI gates trước khi scale family/tenant.
5. Mở rộng theo checklist, không big-bang.

## Key evidence snapshots
- Hard-code dispatch theo suffix: `Tracking_MqttBridge/src/index.ts:35-58`.
- Topic contract hiện static: `Tracking_MqttBridge/src/constants/topics.ts:1-6`.
- Validation theo schema code-only: `Tracking_MqttBridge/src/validators/payload.validator.ts:3-50`.
- CI deploy infra rời rạc, thiếu gate contract chung: `.github/workflows/emqx-uat.yml:10-37`, `.github/workflows/postgresql-uat.yml:10-37`.

## Deliverables
- Audit gap/risk report: `plans/reports/audit-260325-2325-iot-infra-blueprint-gap-risk.md`.
- 5 phase plans chi tiết để implementation team execute.

## Unresolved questions
- Owner nào final sign-off cho boundary EMQX vs Bridge?
- SLO ingest baseline/peak cần khóa số nào cho gate phase 04?
