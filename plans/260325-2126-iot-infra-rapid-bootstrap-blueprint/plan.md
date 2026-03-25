---
title: "Rapid IoT Infra Bootstrap Blueprint"
description: "Bộ plan để agent dựng nhanh EMQX + MQTT Bridge + PostgreSQL + VictoriaMetrics + VictoriaLogs cho mọi project IoT"
status: pending
priority: P0
effort: 3w
branch: feature/cicd
tags: [iot, infra, emqx, mqtt, postgres, victoriametrics, victorialogs, codegen]
created: 2026-03-25
---

# Plan overview

## Mục tiêu
- Tạo bộ quy trình để agent dựng nhanh stack infra IoT cho project mới.
- Cấu hình payload -> MQTT -> DB/metrics/logs theo config, không hard-code.
- Bảo toàn YAGNI/KISS/DRY, rollout an toàn, có test gate và rollback.

## Phương pháp chọn
- **Contract-Driven Ingestion (CDI)**:
1. Khai báo contract trong `message-catalog.yaml` (topic, payload schema, mappings).
2. Agent generate artifacts: EMQX rules/sinks, bridge handlers, SQL migration, metric/log mapping.
3. Agent chạy test replay và gate trước khi deploy.

## Phạm vi
- EMQX broker + MQTT bridge (routing, validation, transform, bridge out/in).
- PostgreSQL schema strategy theo message contract.
- VictoriaMetrics metric projection + VictoriaLogs event projection.
- Agent workflow, template, checklists, runbook.

## Phases
| Phase | Status | Progress | File |
|---|---|---:|---|
| 01. Define canonical contract and mapping DSL | pending | 0% | [phase-01-define-canonical-contract-and-mapping-dsl.md](./phase-01-define-canonical-contract-and-mapping-dsl.md) |
| 02. Bootstrap infra runtime profiles | pending | 0% | [phase-02-bootstrap-infra-runtime-profiles.md](./phase-02-bootstrap-infra-runtime-profiles.md) |
| 03. Generate routing and storage pipelines | pending | 0% | [phase-03-generate-routing-and-storage-pipelines.md](./phase-03-generate-routing-and-storage-pipelines.md) |
| 04. Add verification and safety gates | pending | 0% | [phase-04-add-verification-and-safety-gates.md](./phase-04-add-verification-and-safety-gates.md) |
| 05. Package agent workflow and rollout playbook | pending | 0% | [phase-05-package-agent-workflow-and-rollout-playbook.md](./phase-05-package-agent-workflow-and-rollout-playbook.md) |

## Dependency chain
- Phase 02 blocked by Phase 01.
- Phase 03 blocked by Phase 02.
- Phase 04 blocked by Phase 03.
- Phase 05 blocked by Phase 04.

## Milestones (3w)
- W1: Contract + DSL + baseline profiles.
- W2: Codegen pipeline + EMQX/Bridge/DB/VM/VL mapping.
- W3: Validation harness + runbook + adoption docs.

## Output artifacts
- `resources/templates/iot-infra/message-catalog.yaml`
- `resources/templates/iot-infra/payload-schemas/*.json`
- `resources/templates/iot-infra/infra-profile.yaml`
- `resources/templates/iot-infra/mappings/*.yaml`
- `tools/iot-infra-codegen/*` (generator + validators)
- `plans/.../reports/research-synthesis.md`

## Exit criteria
- Agent có thể bootstrap stack cho project mới trong <= 60 phút.
- Thêm topic/payload mới chỉ cần sửa contract + rerun generator.
- Có test replay payload và go/no-go gate cho deploy.
- Có rollback script và runbook rõ.

## Evidence
- Research: [research-synthesis.md](./reports/research-synthesis.md)

## Unresolved questions
- Mục tiêu throughput ingest (msg/s) cho baseline và peak là bao nhiêu?
- Chọn hướng ưu tiên cho ingestion logic: EMQX-heavy hay Bridge-heavy?
- Cần hỗ trợ multi-tenant ngay phase đầu hay để phase 2?
