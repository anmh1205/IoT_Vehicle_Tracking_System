# Phase 03 - Generate Routing and Storage Pipelines

## Context links
- Plan: [plan.md](./plan.md)
- Previous phase: [phase-02-bootstrap-infra-runtime-profiles.md](./phase-02-bootstrap-infra-runtime-profiles.md)

## Overview
- Priority: P0
- Status: pending
- Description: Từ contract và profile, generate routing/mapping artifacts cho EMQX + Bridge + PostgreSQL + VictoriaMetrics + VictoriaLogs.

## Key insights
- EMQX sink SQL templates cho phép map field trực tiếp vào PostgreSQL.
- Bridge hiện tại đang hard-code schema/handler; cần chuyển sang config-driven dispatch.
- VictoriaMetrics cần giới hạn label cardinality; mapping cần enforce label policy.
- VictoriaLogs ingest APIs cho phép set stream/message/time fields declarative.

## Requirements
- Functional:
1. Generate EMQX rule SQL + sink/source config cho mỗi message family.
2. Generate bridge dispatch config + validators.
3. Generate PostgreSQL DDL/migrations từ mapping.
4. Generate metrics and logs projection config.
5. Generate dead-letter topic + invalid payload sink.
- Non-functional:
1. Regeneration idempotent.
2. Delta update không làm mất dữ liệu đã có.

## Architecture
- Codegen outputs:
1. `generated/emqx/*` (rules, sinks, bridge connectors)
2. `generated/bridge/*` (topic dispatch map, validator map)
3. `generated/postgres/*` (tables, indexes, partition DDL)
4. `generated/observability/*` (metrics mapping, log projection)
- Runtime strategy:
1. EMQX làm gate/filter/routing.
2. Bridge làm business-specific enrichment + side effects.
3. Storage projections theo catalog mappings.

## Related code files
- Files to modify:
1. `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/handlers/rawdata.handler.ts`
2. `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/handlers/event.handler.ts`
3. `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/handlers/status.handler.ts`
4. `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/infrastructure/victoriametrics.ts`
5. `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/infrastructure/victorialogs.ts`
- Files to create:
1. `tools/iot-infra-codegen/src/generate-emqx.ts`
2. `tools/iot-infra-codegen/src/generate-bridge.ts`
3. `tools/iot-infra-codegen/src/generate-postgres.ts`
4. `tools/iot-infra-codegen/src/generate-observability.ts`
5. `resources/templates/iot-infra/generated/.gitkeep`
- Files to delete: none

## Implementation steps
1. Build parser từ catalog -> internal AST.
2. Implement generator EMQX rules + sink templates.
3. Implement generator Bridge dispatch + validator registry.
4. Implement generator SQL migration (raw + typed projection + indexes).
5. Implement generator metrics/log mappings with cardinality guard.
6. Add command: `iot-infra generate --catalog ... --profile ...`.

## Todo list
- [ ] Hoàn tất AST model cho catalog.
- [ ] Hoàn tất 4 generator modules.
- [ ] Hoàn tất generated output snapshot tests.
- [ ] Hoàn tất migration safety checks.

## Success criteria
- Thêm 1 message type mới: update catalog, run generate, pass tests, deploy.
- Không cần tạo handler hard-code mới cho luồng mapping chuẩn.

## Risk assessment
- Risk: generated SQL không tối ưu cho workload lớn.
- Mitigation: cho phép custom override files + benchmark gate trước merge.

## Security considerations
- SQL templates dùng prepared placeholders, không string concat tay.
- Logs mapping mặc định mask nhóm fields nhạy cảm.

## Next steps
- Bàn giao generated outputs cho Phase 04 để test replay, parity, canary gate.
